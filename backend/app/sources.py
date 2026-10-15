from types import SimpleNamespace

from app.errors import ApiError
from app.projects import TermsSnapshot, authorized_release
from app.storage import validate_archive


class SourceService:
    def __init__(self, app):
        self.app = app

    def resolve(self, db, user, ref):
        if ref["project_id"].startswith("import:"):
            return self.resolve_import(db, user, ref)
        request = SimpleNamespace(app=self.app)
        project, release, rights = authorized_release(
            request, db, user, ref["project_id"], ref.get("release_id")
        )
        raw = self.app.state.storage.get_source(release)
        files, total = [], 0
        for path, content in validate_archive(raw, self.app.state.settings):
            parts = path.split("/")
            if any(p in {".git", "node_modules", ".venv", "dist", "__pycache__"} for p in parts):
                continue
            if parts[-1].startswith(".env") or path.endswith((".pem", ".key", ".p12")):
                continue
            try:
                text = content.decode("utf-8")
            except UnicodeDecodeError:
                continue
            total += len(content)
            if total > self.app.state.settings.max_source_context_bytes:
                raise ApiError(
                    422, "CONTEXT_LIMIT", "Source context is too large; select smaller releases."
                )
            files.append({"path": path, "content": text})
        snapshot = db.get(TermsSnapshot, rights["terms_hash"])
        if not snapshot:
            raise ApiError(
                503, "TERMS_UNAVAILABLE", "Purchased license text is temporarily unavailable."
            )
        return {
            "project_id": project.id,
            "release_id": release.id,
            "files": files,
            "derivative_allowed": rights["derivative_allowed"],
            "provenance": {
                "project_id": project.id,
                "release_id": release.id,
                "sha256": release.sha256,
                "terms_hash": rights["terms_hash"],
                "license_terms": snapshot.license_terms,
            },
        }

    def resolve_import(self, db, user, ref):
        from app.intake import ImportedSource

        row = db.get(ImportedSource, ref["project_id"].removeprefix("import:"))
        if not row or row.user_id != user.id:
            raise ApiError(403, "ACCESS_DENIED", "Imported source is private to its owner.")
        if ref.get("release_id") and ref["release_id"] != row.id:
            raise ApiError(403, "SOURCE_MISMATCH", "Imported source snapshot does not match.")
        if not row.verified:
            raise ApiError(
                403, "LICENSE_UNVERIFIED", "Resolve the license evidence before using this source."
            )
        files, total = [], 0
        for path, data in validate_archive(
            self.app.state.storage.get_source(row), self.app.state.settings
        ):
            if any(p in {"node_modules", ".git", ".venv"} for p in path.split("/")):
                continue
            if path.rsplit("/", 1)[-1].startswith(".env") or path.endswith((".pem", ".key")):
                continue
            try:
                content = data.decode("utf-8")
            except UnicodeDecodeError:
                continue
            total += len(data)
            if total > self.app.state.settings.max_source_context_bytes:
                raise ApiError(422, "CONTEXT_LIMIT", "Imported source context is too large.")
            files.append({"path": path, "content": content})
        return {
            "project_id": f"import:{row.id}",
            "release_id": row.id,
            "files": files,
            "derivative_allowed": True,
            "provenance": {
                "origin": row.origin,
                "sha256": row.sha256,
                "license_id": row.license_id,
                "license_terms": row.license_evidence,
            },
        }
