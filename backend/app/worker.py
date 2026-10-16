"""Durable Gemini queue; never execute source or blindly retry model requests."""

import argparse
import io
import json
import time
import zipfile

from sqlalchemy import or_, select, update

from app.errors import ApiError
from app.gemini import Conversation, Job, Message, Output, Plan, resolve_sources, service, settle
from app.gemini_provider import ProviderFailure
from app.models import User, new_id
from app.storage import validate_archive


def package_output(content, sources, settings, validation=None):
    files = content.get("files")
    if (
        not isinstance(files, dict)
        or not files
        or len(files) > settings.max_archive_files
        or any(not isinstance(k, str) or not isinstance(v, str) for k, v in files.items())
    ):
        raise ApiError(422, "OUTPUT_INVALID", "Gemini did not return valid project files.")
    if sum(len(v.encode()) for v in files.values()) > settings.max_upload_bytes:
        raise ApiError(422, "OUTPUT_INVALID", "Generated output exceeds the file budget.")
    provenance = [
        {"project_id": s["project_id"], "release_id": s["release_id"], **s.get("provenance", {})}
        for s in sources
    ]
    files = {
        **files,
        "UTOPIA_PROVENANCE.json": json.dumps(provenance, indent=2),
        "UTOPIA_RUN.md": str(content.get("instructions", "Run instructions not supplied.")),
        "UTOPIA_VALIDATION.json": json.dumps(
            validation
            or {
                "archive": "passed",
                "build": "not-run",
                "reason": "Isolated build adapter not configured; code was not executed.",
            }
        ),
    }
    files["UTOPIA_LICENSE_NOTICES.txt"] = "\n\n".join(
        str(s.get("provenance", {}).get("license_terms", "")) for s in sources
    )
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, text in files.items():
            archive.writestr(name, text)
    raw = buffer.getvalue()
    validate_archive(raw, settings)
    return raw, provenance


def run_once(app):
    now = app.state.clock()
    with app.state.sessions() as db:
        job = db.scalar(
            select(Job)
            .where(or_(Job.status == "queued", (Job.status == "running") & (Job.lease_until < now)))
            .order_by(Job.created_at, Job.id)
            .limit(1)
        )
        if not job:
            return False
        conditions = [Job.id == job.id, Job.status == job.status]
        if job.status == "running":
            conditions.append(Job.lease_until < now)
        claimed = db.execute(
            update(Job).where(*conditions).values(status="running", lease_until=now + 300)
        )
        if claimed.rowcount != 1:
            db.rollback()
            return True
        job_id = job.id
        db.commit()
        if job.provider_started:
            job.status, job.error = "failed", "PROVIDER_OUTCOME_UNKNOWN"
            db.commit()
            return True
        try:
            user = db.get(User, job.user_id)
            sources = resolve_sources(app, db, user, job.sources)
            provider = service(app, generation=job.operation == "generate")
            if job.plan_id:
                plan = db.get(Plan, job.plan_id)
                conv = db.get(Conversation, job.conversation_id)
                if plan.source_version != conv.version or plan.state == "stale":
                    raise ApiError(409, "PLAN_STALE", "Plan changed before execution.")
            payload = {**job.payload, "sources": sources}
            if job.operation == "chat":
                history = db.scalars(
                    select(Message)
                    .where(Message.conversation_id == job.conversation_id)
                    .order_by(Message.created_at, Message.id)
                    .limit(100)
                ).all()
                for item in history:
                    resolve_sources(app, db, user, item.sources)
                payload["history"] = [{"role": m.role, "content": m.content} for m in history]
            job.provider_started = True
            db.commit()
            result = provider.run(job.operation, payload, job.budget)
            job.input_tokens, job.output_tokens = result.input_tokens, result.output_tokens
            if (
                min(job.input_tokens, job.output_tokens) < 0
                or job.input_tokens + job.output_tokens > job.budget
            ):
                raise ProviderFailure(
                    "Provider exceeded budget.",
                    input_tokens=max(0, job.input_tokens),
                    output_tokens=max(0, job.output_tokens),
                )
            resolve_sources(app, db, user, job.sources)
            if job.operation == "plan":
                plan = db.get(Plan, job.plan_id)
                db.refresh(plan)
                if plan.state == "stale":
                    raise ApiError(409, "PLAN_STALE", "Plan changed during analysis.")
                plan.content, plan.state = result.content, "awaiting_confirmation"
            elif job.operation == "chat":
                db.add(
                    Message(
                        conversation_id=job.conversation_id,
                        role="assistant",
                        content=str(result.content.get("text", "")),
                        sources=job.sources,
                        created_at=now,
                    )
                )
            else:
                from app.config import Settings

                limits = (
                    app.state.settings
                    if hasattr(app.state.settings, "max_upload_bytes")
                    else Settings()
                )
                raw, provenance = package_output(result.content, sources, limits)
                from app.validation import validate_output

                validation = validate_output(raw, limits)
                raw, provenance = package_output(result.content, sources, limits, validation)
                output = Output(
                    id=new_id(),
                    user_id=user.id,
                    job_id=job.id,
                    storage_key=app.state.storage.put_private(raw),
                    sources=job.sources,
                    provenance=provenance,
                    derivative_allowed=all(s["derivative_allowed"] for s in sources),
                )
                db.add(output)
                job.output_id = output.id
                job.validation = validation
            job.status, job.phase = "succeeded", "completed"
            if job.validation.get("build") == "failed":
                job.status, job.error = "failed", "OUTPUT_VALIDATION_FAILED"
            settle(db, job)
            db.commit()
        except ProviderFailure as exc:
            job.input_tokens, job.output_tokens = exc.input_tokens, exc.output_tokens
            job.status, job.error = (
                "failed",
                (
                    exc.code
                    if exc.code != "PROVIDER_FAILED"
                    else "PROVIDER_OUTCOME_UNKNOWN"
                    if exc.outcome_unknown
                    else "PROVIDER_FAILED"
                ),
            )
            settle(db, job, unknown=exc.outcome_unknown)
            db.commit()
        except ApiError as exc:
            job.status, job.error = "failed", exc.code
            settle(db, job)
            db.commit()
        except Exception:
            db.rollback()
            job = db.get(Job, job_id)
            job.status, job.error = "failed", "WORKER_FAILED"
            settle(db, job, unknown=job.provider_started)
            db.commit()
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    from app.main import create_app

    app = create_app()
    if args.once:
        run_once(app)
    else:
        while True:
            if not run_once(app):
                time.sleep(2)


if __name__ == "__main__":
    main()
