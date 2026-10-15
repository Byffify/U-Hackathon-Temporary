from uuid import uuid4

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException


class ApiError(Exception):
    def __init__(
        self, status: int, code: str, message: str, *, retryable=False, fields=None, headers=None
    ):
        self.status, self.code, self.message = status, code, message
        self.retryable, self.fields = retryable, fields or {}
        self.headers = headers or {}


def error_response(request: Request, error: ApiError):
    return JSONResponse(
        status_code=error.status,
        headers=error.headers,
        content={
            "error": {
                "code": error.code,
                "message": error.message,
                "field_errors": error.fields,
                "retryable": error.retryable,
            },
            "request_id": getattr(request.state, "request_id", str(uuid4())),
        },
    )


def install_error_handlers(app):
    @app.exception_handler(ApiError)
    async def api_error(request, exc):
        return error_response(request, exc)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        fields = {".".join(str(p) for p in e["loc"]): e["type"] for e in exc.errors()}
        return error_response(
            request,
            ApiError(
                422,
                "VALIDATION_ERROR",
                "Check the submitted fields.",
                fields=fields,
            ),
        )

    @app.exception_handler(HTTPException)
    async def http_error(request, exc):
        return error_response(
            request,
            ApiError(
                exc.status_code,
                "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR",
                "Resource not found."
                if exc.status_code == 404
                else "Request could not be processed.",
            ),
        )

    @app.exception_handler(SQLAlchemyError)
    async def database_error(request, _):
        return error_response(
            request,
            ApiError(
                503,
                "DATABASE_UNAVAILABLE",
                "Storage is temporarily unavailable.",
                retryable=True,
            ),
        )
