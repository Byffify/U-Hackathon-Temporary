"""Durable U-Bot planning, account token reservations and owner-only job APIs."""

import hashlib
import json
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import (
    JSON,
    Boolean,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    select,
    update,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapped, mapped_column

from app.auth import DB, csrf_guard, current_user
from app.db import Base
from app.errors import ApiError
from app.models import User, new_id

router = APIRouter(prefix="/api/v1", tags=["gemini"])
Reader = Annotated[User, Depends(current_user)]
Writer = Annotated[User, Depends(csrf_guard)]
Key = Annotated[str | None, Header(alias="Idempotency-Key", max_length=128)]


class Conversation(Base):
    __tablename__ = "gemini_conversations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    sources: Mapped[list] = mapped_column(JSON, default=list)
    version: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[int] = mapped_column(Integer)


class Message(Base):
    __tablename__ = "gemini_messages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("gemini_conversations.id"), index=True)
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text)
    sources: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[int] = mapped_column(Integer)


class Estimate(Base):
    __tablename__ = "gemini_estimates"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("gemini_conversations.id"), index=True)
    source_version: Mapped[int] = mapped_column(Integer)
    budget: Mapped[int] = mapped_column(Integer)
    expires_at: Mapped[int] = mapped_column(Integer)


class Plan(Base):
    __tablename__ = "gemini_plans"
    __table_args__ = (UniqueConstraint("conversation_id", "revision"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("gemini_conversations.id"), index=True)
    revision: Mapped[int] = mapped_column(Integer)
    source_version: Mapped[int] = mapped_column(Integer)
    sources: Mapped[list] = mapped_column(JSON)
    requirements: Mapped[str] = mapped_column(Text)
    target_stack: Mapped[str] = mapped_column(String(160))
    content: Mapped[dict] = mapped_column(JSON, default=dict)
    state: Mapped[str] = mapped_column(String(32), default="planning")
    generation_budget: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[int] = mapped_column(Integer)


class Quota(Base):
    __tablename__ = "gemini_quotas"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    allocation: Mapped[int] = mapped_column(Integer)
    used: Mapped[int] = mapped_column(Integer, default=0)
    reserved: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[int] = mapped_column(Integer)


class Job(Base):
    __tablename__ = "gemini_jobs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("gemini_conversations.id"))
    plan_id: Mapped[str | None] = mapped_column(ForeignKey("gemini_plans.id"), nullable=True)
    generation_plan_id: Mapped[str | None] = mapped_column(
        ForeignKey("gemini_plans.id"), nullable=True, unique=True
    )
    operation: Mapped[str] = mapped_column(String(16))
    status: Mapped[str] = mapped_column(String(32), default="queued", index=True)
    phase: Mapped[str] = mapped_column(String(32))
    sources: Mapped[list] = mapped_column(JSON)
    payload: Mapped[dict] = mapped_column(JSON)
    budget: Mapped[int] = mapped_column(Integer)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    settled: Mapped[bool] = mapped_column(Boolean, default=False)
    provider_started: Mapped[bool] = mapped_column(Boolean, default=False)
    lease_until: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    validation: Mapped[dict] = mapped_column(JSON, default=dict)
    error: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[int] = mapped_column(Integer)


class Output(Base):
    __tablename__ = "gemini_outputs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("gemini_jobs.id"), unique=True)
    storage_key: Mapped[str] = mapped_column(String(1024))
    sources: Mapped[list] = mapped_column(JSON)
    provenance: Mapped[list] = mapped_column(JSON)
    derivative_allowed: Mapped[bool] = mapped_column(Boolean)


class OperationKey(Base):
    __tablename__ = "gemini_operation_keys"
    __table_args__ = (UniqueConstraint("user_id", "operation", "key"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    operation: Mapped[str] = mapped_column(String(100))
    key: Mapped[str] = mapped_column(String(128))
    fingerprint: Mapped[str] = mapped_column(String(64))
    job_id: Mapped[str] = mapped_column(ForeignKey("gemini_jobs.id"))


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ConversationInput(Input):
    title: str = Field(default="New conversation", min_length=1, max_length=160)


class SourceRef(Input):
    project_id: str = Field(min_length=1, max_length=100)
    release_id: str | None = Field(default=None, min_length=1, max_length=100)


class SourcesInput(Input):
    sources: list[SourceRef]


class MessageInput(Input):
    content: str = Field(min_length=1, max_length=16000)
    estimate_id: str


class PlanInput(Input):
    estimate_id: str
    requirements: str = Field(min_length=1, max_length=16000)
    target_stack: str = Field(default="Preserve source stacks", min_length=1, max_length=160)
    generation_budget: int | None = Field(default=None, gt=0)


class ConfirmInput(Input):
    revision: int = Field(ge=1)


def unavailable():
    return ApiError(503, "GEMINI_UNAVAILABLE", "Gemini is not configured for this trial.")


def service(app, *, generation=False):
    settings = app.state.settings
    required = (
        "gemini_model",
        "gemini_initial_quota",
        "gemini_trial_end",
        "gemini_analysis_budget",
        "gemini_generation_budget",
    )
    if not all(getattr(settings, name, None) for name in required) or not getattr(
        settings, "gemini_free_tier_enabled", False
    ):
        raise unavailable()
    if any(getattr(settings, key) <= 0 for key in required[1:]):
        raise unavailable()
    if app.state.clock() >= settings.gemini_trial_end:
        raise ApiError(403, "TRIAL_ENDED", "The Gemini trial has ended.")
    provider = getattr(app.state, "gemini_provider", None)
    if provider is None:
        key = getattr(settings, "gemini_api_key", None)
        if not key:
            raise unavailable()
        from app.gemini_provider import GoogleGeminiProvider

        key = key.get_secret_value() if hasattr(key, "get_secret_value") else key
        try:
            provider = GoogleGeminiProvider(key, settings.gemini_model)
        except Exception:
            raise unavailable() from None
    if generation and not getattr(app.state, "storage", None):
        raise ApiError(503, "STORAGE_UNAVAILABLE", "Private output storage is unavailable.")
    return provider


def quota_for(db, user, app):
    quota = db.get(Quota, user.id)
    if quota is None:
        try:
            with db.begin_nested():
                quota = Quota(
                    user_id=user.id,
                    allocation=app.state.settings.gemini_initial_quota,
                    expires_at=app.state.settings.gemini_trial_end,
                )
                db.add(quota)
                db.flush()
        except IntegrityError:
            quota = db.get(Quota, user.id)
    return quota


def reserve(db, user, app, budget):
    quota_for(db, user, app)
    result = db.execute(
        update(Quota)
        .where(
            Quota.user_id == user.id,
            Quota.expires_at > app.state.clock(),
            Quota.allocation - Quota.used - Quota.reserved >= budget,
        )
        .values(reserved=Quota.reserved + budget)
    )
    if result.rowcount != 1:
        raise ApiError(429, "QUOTA_EXHAUSTED", "Revise the plan to fit your remaining trial quota.")


def settle(db, job, *, unknown=False):
    if job.settled:
        return
    # Unknown outcomes retain a reservation for manual reconciliation, never a free retry.
    if unknown:
        return
    used = job.input_tokens + job.output_tokens
    db.execute(
        update(Quota)
        .where(Quota.user_id == job.user_id)
        .values(reserved=Quota.reserved - job.budget, used=Quota.used + used)
    )
    job.settled = True


def owned(db, model, identifier, user):
    record = db.get(model, identifier)
    if not record or record.user_id != user.id:
        raise ApiError(404, "NOT_FOUND", "Resource not found.")
    return record


def resolve_sources(app, db, user, refs):
    if not refs:
        return []
    resolver = getattr(app.state, "source_service", None)
    if not resolver:
        raise ApiError(503, "SOURCE_UNAVAILABLE", "Source authorization is unavailable.")
    resolved, total, file_count = [], 0, 0
    for ref in refs:
        src = resolver.resolve(db, user, ref)
        total += sum(len(f["content"].encode()) for f in src["files"])
        file_count += len(src["files"])
        if total > 1_000_000 or file_count > 2000:
            raise ApiError(422, "CONTEXT_LIMIT", "Select smaller source releases or fewer files.")
        resolved.append(src)
    for ref, src in zip(refs, resolved, strict=True):
        if src.get("project_id") != ref["project_id"] or (
            ref.get("release_id") and src.get("release_id") != ref["release_id"]
        ):
            raise ApiError(403, "SOURCE_MISMATCH", "Source release could not be verified.")
    return resolved


def snapshot(sources):
    return [{"project_id": s["project_id"], "release_id": s["release_id"]} for s in sources]


def conversation_for(db, cid, user, app):
    conv = owned(db, Conversation, cid, user)
    resolve_sources(app, db, user, conv.sources)
    return conv


def job_view(job):
    return {
        key: getattr(job, key)
        for key in (
            "id",
            "conversation_id",
            "plan_id",
            "operation",
            "status",
            "phase",
            "output_id",
            "validation",
            "error",
            "created_at",
            "input_tokens",
            "output_tokens",
        )
    }


def plan_view(plan):
    return {
        key: getattr(plan, key)
        for key in (
            "id",
            "revision",
            "state",
            "sources",
            "requirements",
            "target_stack",
            "content",
            "generation_budget",
            "created_at",
        )
    }


def estimate_for(db, identifier, conv, app):
    estimate = db.get(Estimate, identifier)
    if (
        not estimate
        or estimate.conversation_id != conv.id
        or estimate.source_version != conv.version
        or estimate.expires_at <= app.state.clock()
    ):
        raise ApiError(409, "ESTIMATE_STALE", "Review a fresh estimate before analysis.")
    return estimate


def duplicate(db, user, operation, key, payload):
    if not key:
        raise ApiError(422, "IDEMPOTENCY_KEY_REQUIRED", "Supply an Idempotency-Key header.")
    fingerprint = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    record = db.scalar(
        select(OperationKey).where(
            OperationKey.user_id == user.id,
            OperationKey.operation == operation,
            OperationKey.key == key,
        )
    )
    if record:
        if record.fingerprint != fingerprint:
            raise ApiError(
                409, "IDEMPOTENCY_CONFLICT", "This key was used for a different request."
            )
        return db.get(Job, record.job_id), fingerprint
    return None, fingerprint


def enqueue(db, app, user, conv, operation, payload, budget, key, fingerprint, plan=None):
    reserve(db, user, app, budget)
    job = Job(
        user_id=user.id,
        conversation_id=conv.id,
        operation=operation,
        plan_id=plan.id if plan else None,
        generation_plan_id=plan.id if operation == "generate" else None,
        phase={"chat": "analyzing", "plan": "planning", "generate": "generating"}[operation],
        sources=conv.sources,
        payload=payload,
        budget=budget,
        created_at=app.state.clock(),
    )
    db.add(job)
    db.flush()
    if key:
        db.add(
            OperationKey(
                user_id=user.id,
                operation=payload["operation_key"],
                key=key,
                fingerprint=fingerprint,
                job_id=job.id,
            )
        )
    db.commit()
    return {"data": job_view(job)}


@router.post("/gemini/conversations", status_code=201)
def create_conversation(body: ConversationInput, request: Request, db: DB, user: Writer):
    conv = Conversation(user_id=user.id, title=body.title, created_at=request.app.state.clock())
    db.add(conv)
    db.commit()
    return {"data": {"id": conv.id, "title": conv.title, "sources": []}}


@router.get("/gemini/conversations")
def list_conversations(db: DB, user: Reader, page: int = 1, page_size: int = 20):
    if page < 1 or page_size < 1 or page_size > 100:
        raise ApiError(422, "PAGINATION_INVALID", "Use page >= 1 and page_size 1 to 100.")
    rows = db.scalars(
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.created_at.desc(), Conversation.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {
        "data": [{"id": c.id, "title": c.title, "created_at": c.created_at} for c in rows],
        "meta": {"page": page, "page_size": page_size},
    }


@router.get("/gemini/conversations/{cid}")
def get_conversation(cid: str, request: Request, db: DB, user: Reader):
    conv = conversation_for(db, cid, user, request.app)
    plans = db.scalars(
        select(Plan).where(Plan.conversation_id == cid).order_by(Plan.revision)
    ).all()
    # Earlier history may include sources removed from the current conversation.
    for plan in plans:
        resolve_sources(request.app, db, user, plan.sources)
    return {
        "data": {
            "id": conv.id,
            "title": conv.title,
            "sources": conv.sources,
            "source_version": conv.version,
            "plans": [plan_view(p) for p in plans],
        }
    }


@router.put("/gemini/conversations/{cid}/sources")
def set_sources(cid: str, body: SourcesInput, request: Request, db: DB, user: Writer):
    conv = owned(db, Conversation, cid, user)
    refs = snapshot(
        resolve_sources(
            request.app, db, user, [ref.model_dump(exclude_none=True) for ref in body.sources]
        )
    )
    db.execute(
        update(Conversation)
        .where(Conversation.id == cid)
        .values(sources=refs, version=Conversation.version + 1)
    )
    db.execute(update(Plan).where(Plan.conversation_id == cid).values(state="stale"))
    db.commit()
    return {"data": {"id": conv.id, "sources": conv.sources, "source_version": conv.version}}


@router.get("/gemini/conversations/{cid}/messages")
def get_messages(cid: str, request: Request, db: DB, user: Reader):
    conversation_for(db, cid, user, request.app)
    rows = db.scalars(
        select(Message)
        .where(Message.conversation_id == cid)
        .order_by(Message.created_at, Message.id)
        .limit(500)
    ).all()
    for msg in rows:
        resolve_sources(request.app, db, user, msg.sources)
    return {
        "data": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "sources": m.sources,
                "created_at": m.created_at,
            }
            for m in rows
        ]
    }


@router.get("/gemini/quota")
def get_quota(request: Request, db: DB, user: Reader):
    service(request.app)
    quota = quota_for(db, user, request.app)
    db.commit()
    return {
        "data": {
            "allocation": quota.allocation,
            "used": quota.used,
            "reserved": quota.reserved,
            "remaining": max(0, quota.allocation - quota.used - quota.reserved),
            "expires_at": quota.expires_at,
            "unit": "tokens",
            "resets": False,
        }
    }


@router.post("/gemini/conversations/{cid}/estimates")
def estimate(cid: str, request: Request, db: DB, user: Writer):
    service(request.app)
    conv = conversation_for(db, cid, user, request.app)
    record = Estimate(
        conversation_id=cid,
        source_version=conv.version,
        budget=request.app.state.settings.gemini_analysis_budget,
        expires_at=request.app.state.clock() + 600,
    )
    db.add(record)
    db.commit()
    return {
        "data": {
            "id": record.id,
            "analysis_budget": record.budget,
            "generation_budget": request.app.state.settings.gemini_generation_budget,
            "unit": "tokens",
            "analysis_consumes_quota": True,
            "expires_at": record.expires_at,
        }
    }


@router.post("/gemini/conversations/{cid}/messages", status_code=202)
def post_message(
    cid: str, body: MessageInput, request: Request, db: DB, user: Writer, key: Key = None
):
    service(request.app)
    conv = conversation_for(db, cid, user, request.app)
    operation = f"chat:{cid}"
    existing, fingerprint = duplicate(db, user, operation, key, body.model_dump())
    if existing:
        return {"data": job_view(existing)}
    estimated = estimate_for(db, body.estimate_id, conv, request.app)
    db.execute(
        update(Plan)
        .where(Plan.conversation_id == cid, Plan.state.in_(["planning", "awaiting_confirmation"]))
        .values(state="stale")
    )
    db.execute(
        update(Conversation).where(Conversation.id == cid).values(version=Conversation.version + 1)
    )
    db.add(
        Message(
            conversation_id=cid,
            role="user",
            content=body.content,
            sources=conv.sources,
            created_at=request.app.state.clock(),
        )
    )
    return enqueue(
        db,
        request.app,
        user,
        conv,
        "chat",
        {"content": body.content, "operation_key": operation},
        estimated.budget,
        key,
        fingerprint,
    )


def queue_plan(cid, body, request, db, user, key):
    service(request.app)
    conv = conversation_for(db, cid, user, request.app)
    operation = f"plan:{cid}"
    existing, fingerprint = duplicate(db, user, operation, key, body.model_dump())
    if existing:
        return {"data": job_view(existing)}
    estimated = estimate_for(db, body.estimate_id, conv, request.app)
    if not conv.sources:
        raise ApiError(422, "SOURCE_REQUIRED", "Select at least one authorized source project.")
    # Serialize revisions with source changes and other plan requests.
    claimed = db.execute(
        update(Conversation)
        .where(Conversation.id == cid, Conversation.version == conv.version)
        .values(version=Conversation.version + 1)
    )
    if claimed.rowcount != 1:
        raise ApiError(409, "PLAN_CHANGED", "Refresh the conversation before revising the plan.")
    db.execute(update(Plan).where(Plan.conversation_id == cid).values(state="stale"))
    last = (
        db.scalar(
            select(Plan.revision)
            .where(Plan.conversation_id == cid)
            .order_by(Plan.revision.desc())
            .limit(1)
        )
        or 0
    )
    plan = Plan(
        conversation_id=cid,
        revision=last + 1,
        source_version=conv.version,
        sources=conv.sources,
        requirements=body.requirements,
        target_stack=body.target_stack,
        generation_budget=min(
            body.generation_budget or request.app.state.settings.gemini_generation_budget,
            request.app.state.settings.gemini_generation_budget,
        ),
        created_at=request.app.state.clock(),
    )
    db.add(plan)
    db.flush()
    return enqueue(
        db,
        request.app,
        user,
        conv,
        "plan",
        {
            "requirements": body.requirements,
            "target_stack": body.target_stack,
            "operation_key": operation,
        },
        estimated.budget,
        key,
        fingerprint,
        plan,
    )


@router.post("/gemini/conversations/{cid}/plans", status_code=202)
def create_plan(cid: str, body: PlanInput, request: Request, db: DB, user: Writer, key: Key = None):
    return queue_plan(cid, body, request, db, user, key)


@router.post("/gemini/plans/{pid}/revisions", status_code=202)
def revise_plan(pid: str, body: PlanInput, request: Request, db: DB, user: Writer, key: Key = None):
    plan = db.get(Plan, pid)
    if not plan:
        raise ApiError(404, "NOT_FOUND", "Resource not found.")
    return queue_plan(plan.conversation_id, body, request, db, user, key)


@router.post("/gemini/plans/{pid}/confirm", status_code=202)
def confirm_plan(
    pid: str, body: ConfirmInput, request: Request, db: DB, user: Writer, key: Key = None
):
    service(request.app, generation=True)
    plan = db.get(Plan, pid)
    if not plan:
        raise ApiError(404, "NOT_FOUND", "Resource not found.")
    conv = conversation_for(db, plan.conversation_id, user, request.app)
    operation = f"confirm:{pid}"
    existing, fingerprint = duplicate(db, user, operation, key, body.model_dump())
    if existing:
        return {"data": job_view(existing)}
    if body.revision != plan.revision:
        raise ApiError(409, "PLAN_STALE", "Confirm the latest plan revision.")
    previous = db.scalar(select(Job).where(Job.generation_plan_id == pid))
    if previous:
        return {"data": job_view(previous)}
    if plan.source_version != conv.version or plan.state != "awaiting_confirmation":
        raise ApiError(409, "PLAN_STALE", "Review the latest plan before confirming.")
    if plan.content.get("conflicts"):
        raise ApiError(409, "PLAN_CONFLICTS", "Resolve the plan conflicts before generation.")
    resolve_sources(request.app, db, user, plan.sources)
    # CAS prevents two concurrent confirmations from both reserving a plan.
    claimed = db.execute(
        update(Plan)
        .where(Plan.id == pid, Plan.state == "awaiting_confirmation")
        .values(state="confirmed")
    )
    if claimed.rowcount != 1:
        raise ApiError(409, "PLAN_CHANGED", "Reload the confirmed job.")
    return enqueue(
        db,
        request.app,
        user,
        conv,
        "generate",
        {
            "plan": plan.content,
            "requirements": plan.requirements,
            "target_stack": plan.target_stack,
            "revision": plan.revision,
            "operation_key": operation,
        },
        plan.generation_budget,
        key,
        fingerprint,
        plan,
    )


@router.get("/jobs/{jid}")
def get_job(jid: str, request: Request, db: DB, user: Reader):
    job = owned(db, Job, jid, user)
    resolve_sources(request.app, db, user, job.sources)
    return {"data": job_view(job)}


@router.get("/outputs/{oid}/download")
def download(oid: str, request: Request, db: DB, user: Reader):
    output = owned(db, Output, oid, user)
    resolve_sources(request.app, db, user, output.sources)
    storage = getattr(request.app.state, "storage", None)
    if not storage:
        raise ApiError(503, "STORAGE_UNAVAILABLE", "Private output storage is unavailable.")
    return Response(
        storage.read_private(output.storage_key),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="utopia-{oid}.zip"',
            "Cache-Control": "no-store",
        },
    )
