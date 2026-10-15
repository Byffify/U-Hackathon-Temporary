from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse


class BodyLimitMiddleware:
    def __init__(self, app, settings):
        self.app, self.settings = app, settings

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] not in {"POST", "PUT", "PATCH"}:
            return await self.app(scope, receive, send)
        limit = self.settings.max_upload_bytes + 1024 * 1024
        headers = dict(scope.get("headers", []))
        length = headers.get(b"content-length")
        if length and length.isdigit() and int(length) > limit:
            response = JSONResponse(
                status_code=413,
                content={
                    "error": {
                        "code": "UPLOAD_TOO_LARGE",
                        "message": "Request exceeds the upload limit.",
                        "field_errors": {},
                        "retryable": False,
                    },
                    "request_id": scope.get("state", {}).get("request_id", ""),
                },
            )
            return await response(scope, receive, send)
        total = 0

        async def bounded_receive():
            nonlocal total
            message = await receive()
            total += len(message.get("body", b""))
            if total > limit:
                raise HTTPException(413, "Request exceeds the upload limit")
            return message

        return await self.app(scope, bounded_receive, send)
