"""Licensed public source snapshots and derivative output publishing."""

import hashlib
from typing import Annotated

from fastapi import APIRouter, File, Form, Header, Request, UploadFile
from pydantic import HttpUrl, TypeAdapter
from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text, select
from sqlalchemy.orm import Mapped, mapped_column

from app.auth import DB
from app.db import Base
from app.errors import ApiError
from app.gemini import Job, Output, owned, resolve_sources
from app.models import new_id
from app.projects import (
    Actor,
    Project,
    ProjectInput,
    Release,
    project_view,
    release_view,
    remember_terms,
    terms_digest,
)
from app.storage import validate_archive

router = APIRouter(prefix="/api/v1", tags=["source-intake"])


class ImportedSource(Base):
    __tablename__ = "imported_sources"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    origin: Mapped[str] = mapped_column(String(2048))
    license_id: Mapped[str] = mapped_column(String(80))
    license_evidence: Mapped[str] = mapped_column(Text)
    verified: Mapped[bool] = mapped_column(Boolean)
    release_id: Mapped[str] = mapped_column(String(36))
    storage_key: Mapped[str] = mapped_column(String(1024))
    wrapped_key: Mapped[str] = mapped_column(Text)
    nonce: Mapped[str] = mapped_column(String(32))
    sha256: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[int] = mapped_column(Integer)


class DerivativeProvenance(Base):
    __tablename__ = "derivative_provenance"
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), primary_key=True)
    output_id: Mapped[str] = mapped_column(ForeignKey("gemini_outputs.id"), unique=True)
    sources: Mapped[list] = mapped_column(JSON)


@router.post("/gemini/source-imports", status_code=201)
async def import_source(
    request: Request,
    db: DB,
    user: Actor,
    file: Annotated[UploadFile, File()],
    origin: Annotated[str, Form(max_length=2048)],
    license_id: Annotated[str, Form(max_length=80)],
    license_evidence: Annotated[str, Form(min_length=1, max_length=30000)],
):
    try:
        origin = str(TypeAdapter(HttpUrl).validate_python(origin))
    except ValueError:
        raise ApiError(422, "INVALID_ORIGIN", "Supply the public source origin URL.") from None
    raw = await file.read(request.app.state.settings.max_upload_bytes + 1)
    await file.close()
    files = validate_archive(raw, request.app.state.settings)
    # Conservative intake: retain exact evidence; unknown licenses require manual resolution.
    license_files = [
        content.decode("utf-8", errors="replace")
        for path, content in files
        if path.rsplit("/", 1)[-1].lower() in {"license", "license.txt", "license.md", "copying"}
    ]
    markers = {
        "MIT": "Permission is hereby granted, free of charge",
        "Apache-2.0": "Apache License",
        "BSD-3-Clause": "Redistribution and use in source and binary forms",
        "BSD-2-Clause": "Redistribution and use in source and binary forms",
        "ISC": "Permission to use, copy, modify, and/or distribute",
    }
    verified = (
        hashlib.sha256(raw).hexdigest() in request.app.state.settings.approved_open_source_hashes
        and license_id in markers
        and any(
            license_evidence.strip() == text.strip() and markers[license_id] in text
            for text in license_files
        )
    )
    identifier = new_id()
    stored = request.app.state.storage.put_source(raw, identifier)
    row = ImportedSource(
        id=identifier,
        user_id=user.id,
        origin=origin,
        license_id=license_id,
        license_evidence=license_evidence,
        verified=verified,
        release_id=identifier,
        created_at=request.app.state.clock(),
        **stored,
    )
    db.add(row)
    db.commit()
    return {
        "data": {
            "project_id": f"import:{row.id}",
            "release_id": row.id,
            "sha256": row.sha256,
            "license_status": "recognized" if verified else "needs_review",
            "notice": (
                "License evidence is retained; this is not a legal determination "
                "of provenance or compatibility."
            ),
        }
    }


@router.post("/outputs/{output_id}/project-draft", status_code=201)
def derivative_draft(
    output_id: str,
    body: ProjectInput,
    request: Request,
    db: DB,
    user: Actor,
    key: Annotated[str, Header(alias="Idempotency-Key", min_length=1, max_length=128)],
):
    output = owned(db, Output, output_id, user)
    job = db.get(Job, output.job_id)
    if job.validation.get("build") == "failed":
        raise ApiError(
            409, "OUTPUT_VALIDATION_FAILED", "Resolve the failed build before selling this output."
        )
    sources = resolve_sources(request.app, db, user, output.sources)
    if not output.derivative_allowed or not all(src["derivative_allowed"] for src in sources):
        raise ApiError(
            403, "DERIVATIVE_FORBIDDEN", "Every source must allow selling this derivative."
        )
    previous = db.scalar(
        select(DerivativeProvenance).where(DerivativeProvenance.output_id == output.id)
    )
    if previous:
        return {"data": project_view(db.get(Project, previous.project_id))}
    raw = request.app.state.storage.read_private(output.storage_key)
    validate_archive(raw, request.app.state.settings)
    # Create draft only; ordinary publish still verifies the new independent on-chain listing.
    values = body.model_dump()
    values["demo_url"] = str(body.demo_url) if body.demo_url else None
    project = Project(
        id=new_id(), **values, creator_id=user.id, created_at=request.app.state.clock()
    )
    project.terms_hash = terms_digest(project)
    remember_terms(db, project)
    db.add(project)
    project_id = project.id
    release_id = new_id()
    stored = request.app.state.storage.put_source(raw, release_id)
    # Flush the parent before child inserts while preserving the transaction boundary.
    db.flush()
    release = Release(
        id=release_id,
        project_id=project_id,
        version="1.0.0",
        idempotency_key=key,
        request_hash=hashlib.sha256(raw).hexdigest(),
        created_at=request.app.state.clock(),
        **stored,
    )
    db.add(release)
    db.add(
        DerivativeProvenance(project_id=project_id, output_id=output.id, sources=output.provenance)
    )
    db.commit()
    return {"data": {**project_view(project), "release": release_view(release)}}
