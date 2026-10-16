import hashlib
import json
from typing import Annotated

from eth_utils import keccak
from fastapi import APIRouter, Depends, File, Form, Header, Query, Request, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field, HttpUrl
from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapped, mapped_column
from starlette.concurrency import run_in_threadpool

from app.auth import DB, csrf_guard, current_user
from app.db import Base
from app.errors import ApiError
from app.models import User, new_id
from app.storage import clean_image, validate_archive

router = APIRouter(prefix="/api/v1", tags=["projects"])
Actor = Annotated[User, Depends(csrf_guard)]
Reader = Annotated[User, Depends(current_user)]


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    creator_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text)
    stack: Mapped[str] = mapped_column(String(160))
    demo_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    price_wei: Mapped[str] = mapped_column(String(78))
    license_terms: Mapped[str] = mapped_column(Text)
    terms_hash: Mapped[str] = mapped_column(String(66))
    resale_allowed: Mapped[bool] = mapped_column(Boolean)
    derivative_allowed: Mapped[bool] = mapped_column(Boolean)
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    chain_listing_id: Mapped[str | None] = mapped_column(String(78), unique=True, nullable=True)
    created_at: Mapped[int] = mapped_column(Integer)


class Release(Base):
    __tablename__ = "project_releases"
    __table_args__ = (
        UniqueConstraint("project_id", "version"),
        UniqueConstraint("project_id", "idempotency_key"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    version: Mapped[str] = mapped_column(String(80))
    idempotency_key: Mapped[str] = mapped_column(String(128))
    request_hash: Mapped[str] = mapped_column(String(64))
    storage_key: Mapped[str] = mapped_column(String(1024))
    wrapped_key: Mapped[str] = mapped_column(Text)
    nonce: Mapped[str] = mapped_column(String(32))
    sha256: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[int] = mapped_column(Integer)


class Media(Base):
    __tablename__ = "media"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"), nullable=True)
    storage_key: Mapped[str] = mapped_column(String(128))
    content_type: Mapped[str] = mapped_column(String(32))


class TermsSnapshot(Base):
    __tablename__ = "license_terms_snapshots"
    terms_hash: Mapped[str] = mapped_column(String(66), primary_key=True)
    license_terms: Mapped[str] = mapped_column(Text)
    resale_allowed: Mapped[bool] = mapped_column(Boolean)
    derivative_allowed: Mapped[bool] = mapped_column(Boolean)


def remember_terms(db, project):
    if not db.get(TermsSnapshot, project.terms_hash):
        db.add(
            TermsSnapshot(
                terms_hash=project.terms_hash,
                license_terms=project.license_terms,
                resale_allowed=project.resale_allowed,
                derivative_allowed=project.derivative_allowed,
            )
        )


class ProjectInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1, max_length=10000)
    stack: str = Field(min_length=1, max_length=160)
    demo_url: HttpUrl | None = None
    price_wei: str = Field(pattern=r"^[1-9][0-9]{0,76}$")
    license_terms: str = Field(min_length=1, max_length=10000)
    resale_allowed: bool = False
    derivative_allowed: bool = False


class ProjectPatch(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, min_length=1, max_length=10000)
    stack: str | None = Field(default=None, min_length=1, max_length=160)
    demo_url: HttpUrl | None = None
    price_wei: str | None = Field(default=None, pattern=r"^[1-9][0-9]{0,76}$")
    license_terms: str | None = Field(default=None, min_length=1, max_length=10000)
    resale_allowed: bool | None = None
    derivative_allowed: bool | None = None


class PublishInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    chain_listing_id: str = Field(pattern=r"^[1-9][0-9]{0,76}$")


def terms_digest(project):
    terms = {
        "license_terms": project.license_terms,
        "resale_allowed": project.resale_allowed,
        "derivative_allowed": project.derivative_allowed,
    }
    return "0x" + keccak(text=json.dumps(terms, sort_keys=True, separators=(",", ":"))).hex()


def project_view(project):
    return {
        key: getattr(project, key)
        for key in (
            "id",
            "creator_id",
            "title",
            "description",
            "stack",
            "demo_url",
            "price_wei",
            "license_terms",
            "terms_hash",
            "resale_allowed",
            "derivative_allowed",
            "published",
            "chain_listing_id",
            "created_at",
        )
    }


def release_view(release):
    return {
        "id": release.id,
        "project_id": release.project_id,
        "version": release.version,
        "sha256": release.sha256,
        "created_at": release.created_at,
        "storage_mode": release.storage_key.split(":", 1)[0],
    }


def owned_project(db, identifier, user):
    project = db.get(Project, identifier)
    if not project:
        raise ApiError(404, "PROJECT_NOT_FOUND", "Project was not found.")
    if project.creator_id != user.id:
        raise ApiError(403, "ACCESS_DENIED", "Only the creator can modify this project.")
    return project


def readable_project(db, identifier, request):
    project = db.get(Project, identifier)
    if project and project.published:
        return project
    from app.auth import digest
    from app.models import Session

    token = request.cookies.get("utopia_session", "")
    session = db.get(Session, digest(token))
    if (
        project
        and session
        and session.expires_at > request.app.state.clock()
        and session.user_id == project.creator_id
    ):
        return project
    raise ApiError(404, "PROJECT_NOT_FOUND", "Project was not found.")


@router.post("/projects", status_code=201)
def create_project(body: ProjectInput, request: Request, db: DB, user: Actor):
    values = body.model_dump()
    values["demo_url"] = str(body.demo_url) if body.demo_url else None
    if values["demo_url"] and len(values["demo_url"]) > 2048:
        raise ApiError(422, "VALIDATION_ERROR", "Demo URL is too long.")
    project = Project(**values, creator_id=user.id, created_at=request.app.state.clock())
    project.terms_hash = terms_digest(project)
    remember_terms(db, project)
    db.add(project)
    db.commit()
    return {"data": project_view(project)}


@router.get("/projects")
def list_projects(
    db: DB,
    q: str = Query(default="", max_length=200),
    stack: str = Query(default="", max_length=160),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    creator_id: str | None = None,
):
    conditions = [Project.published.is_(True)]
    if q:
        conditions.append(
            Project.title.icontains(q, autoescape=True)
            | Project.description.icontains(q, autoescape=True)
        )
    if stack:
        conditions.append(Project.stack.icontains(stack, autoescape=True))
    if creator_id:
        conditions.append(Project.creator_id == creator_id)
    rows = db.scalars(
        select(Project)
        .where(*conditions)
        .order_by(Project.created_at.desc(), Project.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    total = db.scalar(select(func.count()).select_from(Project).where(*conditions))
    project_ids = [row.id for row in rows]
    creator_ids = {row.creator_id for row in rows}
    creator_names = {
        user.id: user.name or "Creator"
        for user in db.scalars(select(User).where(User.id.in_(creator_ids))).all()
    }
    images_by_project = {identifier: [] for identifier in project_ids}
    for image in db.scalars(select(Media).where(Media.project_id.in_(project_ids))).all():
        images_by_project[image.project_id].append(f"/api/v1/media/{image.id}")
    return {
        "data": [
            {
                **project_view(row),
                "creator_name": creator_names.get(row.creator_id, "Creator"),
                "images": images_by_project[row.id],
            }
            for row in rows
        ],
        "meta": {"page": page, "page_size": page_size, "total": total},
    }


@router.get("/me/projects")
def my_projects(db: DB, user: Reader):
    return {
        "data": [
            project_view(p)
            for p in db.scalars(
                select(Project)
                .where(Project.creator_id == user.id)
                .order_by(Project.created_at.desc())
            ).all()
        ]
    }


@router.get("/projects/{identifier}")
def get_project(identifier: str, request: Request, db: DB):
    project = readable_project(db, identifier, request)
    return {
        "data": {
            **project_view(project),
            "creator_name": (db.get(User, project.creator_id).name or "Creator"),
            "images": [
                f"/api/v1/media/{m.id}"
                for m in db.scalars(select(Media).where(Media.project_id == project.id)).all()
            ],
        }
    }


@router.patch("/projects/{identifier}")
def update_project(identifier: str, body: ProjectPatch, db: DB, user: Actor):
    project = owned_project(db, identifier, user)
    for key in body.model_fields_set:
        value = getattr(body, key)
        if value is None and key != "demo_url":
            raise ApiError(422, "VALIDATION_ERROR", "Only demo_url may be cleared.")
        if key == "demo_url" and value is not None:
            value = str(value)
            if len(value) > 2048:
                raise ApiError(422, "VALIDATION_ERROR", "Demo URL is too long.")
        setattr(project, key, value)
    project.terms_hash = terms_digest(project)
    remember_terms(db, project)
    # Changing an offer requires fresh chain matching before it is buyable again.
    if body.model_fields_set & {
        "price_wei",
        "license_terms",
        "resale_allowed",
        "derivative_allowed",
    }:
        project.published = False
    db.commit()
    return {"data": project_view(project)}


@router.post("/projects/{identifier}/chain-transaction")
def prepare_chain_listing(identifier: str, request: Request, db: DB, user: Actor):
    project = owned_project(db, identifier, user)
    return {
        "data": request.app.state.chain_gateway.prepare_listing(
            project, update=project.chain_listing_id is not None
        )
    }


@router.post("/projects/{identifier}/publish")
def publish(identifier: str, body: PublishInput, request: Request, db: DB, user: Actor):
    project = owned_project(db, identifier, user)
    if not db.scalar(select(Release).where(Release.project_id == project.id)):
        raise ApiError(
            409, "SOURCE_REQUIRED", "Upload a complete source release before publishing."
        )
    existing = db.scalar(
        select(Project).where(
            Project.chain_listing_id == body.chain_listing_id, Project.id != project.id
        )
    )
    if existing or (project.chain_listing_id and project.chain_listing_id != body.chain_listing_id):
        raise ApiError(409, "LISTING_CONFLICT", "This chain listing is already linked.")
    offer = request.app.state.chain_gateway.listing(body.chain_listing_id)
    if (
        offer["creator"].lower() != user.address.lower()
        or offer["price_wei"] != project.price_wei
        or offer["terms_hash"].lower() != project.terms_hash.lower()
        or offer["resale_allowed"] != project.resale_allowed
        or offer["derivative_allowed"] != project.derivative_allowed
    ):
        raise ApiError(
            409, "LISTING_MISMATCH", "On-chain offer must match this creator, price and terms."
        )
    project.chain_listing_id, project.published = body.chain_listing_id, True
    try:
        db.commit()
    except IntegrityError:
        raise ApiError(409, "LISTING_CONFLICT", "This chain listing is already linked.") from None
    return {"data": project_view(project)}


@router.post("/projects/{identifier}/releases", status_code=201)
async def upload_release(
    identifier: str,
    request: Request,
    db: DB,
    user: Actor,
    file: Annotated[UploadFile, File()],
    version: Annotated[str, Form(min_length=1, max_length=80)],
    key: Annotated[str, Header(alias="Idempotency-Key", min_length=1, max_length=128)],
):
    project = owned_project(db, identifier, user)
    raw = await file.read(request.app.state.settings.max_upload_bytes + 1)
    await file.close()
    validate_archive(raw, request.app.state.settings)
    fingerprint = hashlib.sha256(version.encode() + b"\0" + raw).hexdigest()
    old = db.scalar(
        select(Release).where(Release.project_id == project.id, Release.idempotency_key == key)
    )
    if old:
        if old.request_hash != fingerprint:
            raise ApiError(409, "IDEMPOTENCY_CONFLICT", "This key was used with different source.")
        return {"data": release_view(old)}
    if db.scalar(
        select(Release).where(Release.project_id == project.id, Release.version == version)
    ):
        raise ApiError(409, "VERSION_EXISTS", "Choose a new release version.")
    identifier = new_id()
    stored = await run_in_threadpool(request.app.state.storage.put_source, raw, identifier)
    release = Release(
        id=identifier,
        project_id=project.id,
        version=version,
        idempotency_key=key,
        request_hash=fingerprint,
        created_at=request.app.state.clock(),
        **stored,
    )
    db.add(release)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.scalar(
            select(Release).where(Release.project_id == project.id, Release.idempotency_key == key)
        )
        if existing and existing.request_hash == fingerprint:
            return {"data": release_view(existing)}
        raise ApiError(409, "VERSION_EXISTS", "This release was already submitted.") from None
    return {"data": release_view(release)}


@router.get("/projects/{identifier}/releases")
def releases(identifier: str, request: Request, db: DB):
    readable_project(db, identifier, request)
    return {
        "data": [
            release_view(r)
            for r in db.scalars(
                select(Release)
                .where(Release.project_id == identifier)
                .order_by(Release.created_at, Release.id)
            ).all()
        ]
    }


def source_rights(request, db, user, project):
    if project.creator_id == user.id:
        return {"has_access": True, "derivative_allowed": True, "terms_hash": project.terms_hash}
    if not project.chain_listing_id:
        raise ApiError(403, "ACCESS_DENIED", "This wallet has no source entitlement.")
    rights = request.app.state.chain_gateway.access_rights(project.chain_listing_id, user.address)
    if not rights["has_access"]:
        raise ApiError(403, "ACCESS_DENIED", "This wallet has no current source entitlement.")
    return rights


def authorized_release(request, db, user, project_id, release_id=None):
    project = db.get(Project, project_id)
    if not project:
        raise ApiError(404, "PROJECT_NOT_FOUND", "Project was not found.")
    rights = source_rights(request, db, user, project)
    if release_id:
        release = db.get(Release, release_id)
    else:
        release = db.scalar(
            select(Release)
            .where(Release.project_id == project.id)
            .order_by(Release.created_at.desc(), Release.id.desc())
        )
    if not release or release.project_id != project.id:
        raise ApiError(404, "RELEASE_NOT_FOUND", "Source release was not found.")
    return project, release, rights


@router.get("/projects/{project_id}/releases/{release_id}/download")
def download_source(project_id: str, release_id: str, request: Request, db: DB, user: Reader):
    _, release, _ = authorized_release(request, db, user, project_id, release_id)
    return Response(
        request.app.state.storage.get_source(release),
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="source.zip"'},
    )


@router.post("/me/avatar", status_code=201)
async def upload_avatar(request: Request, db: DB, user: Actor, file: Annotated[UploadFile, File()]):
    raw = await file.read(request.app.state.settings.max_image_bytes + 1)
    await file.close()
    clean, content_type = clean_image(raw, request.app.state.settings)
    media = Media(
        user_id=user.id,
        storage_key=request.app.state.storage.put_private(clean),
        content_type=content_type,
    )
    db.add(media)
    db.flush()
    prefix = request.app.state.settings.public_api_url or str(request.base_url).rstrip("/")
    user.avatar_url = f"{prefix}/api/v1/media/{media.id}"
    db.commit()
    return {"data": {"id": media.id, "url": user.avatar_url}}


@router.post("/projects/{identifier}/images", status_code=201)
async def upload_image(
    identifier: str, request: Request, db: DB, user: Actor, file: Annotated[UploadFile, File()]
):
    project = owned_project(db, identifier, user)
    raw = await file.read(request.app.state.settings.max_image_bytes + 1)
    await file.close()
    clean, content_type = clean_image(raw, request.app.state.settings)
    media = Media(
        user_id=user.id,
        project_id=project.id,
        storage_key=request.app.state.storage.put_private(clean),
        content_type=content_type,
    )
    db.add(media)
    db.commit()
    return {"data": {"id": media.id, "url": f"/api/v1/media/{media.id}"}}


@router.get("/media/{identifier}")
def get_media(identifier: str, request: Request, db: DB):
    media = db.get(Media, identifier)
    if not media:
        raise ApiError(404, "FILE_NOT_FOUND", "Image was not found.")
    if media.project_id:
        readable_project(db, media.project_id, request)
    return Response(
        request.app.state.storage.read_private(media.storage_key), media_type=media.content_type
    )
