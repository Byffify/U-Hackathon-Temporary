import hashlib

from fastapi import Request
from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.errors import ApiError
from app.models import Challenge, RateBucket


def auth_throttle(request: Request):
    """Atomic SQL counter shared by processes. Never trust a submitted forwarded header here."""
    peer = request.client.host if request.client else "unknown"
    key = hashlib.sha256(peer.encode()).hexdigest()
    now = request.app.state.clock()
    window = now // 60
    with request.app.state.sessions.begin() as db:
        insert = sqlite_insert if db.bind.dialect.name == "sqlite" else pg_insert
        statement = insert(RateBucket).values(key=key, window=window, count=1)
        statement = statement.on_conflict_do_update(
            index_elements=[RateBucket.key, RateBucket.window],
            set_={"count": RateBucket.count + 1},
        ).returning(RateBucket.count)
        count = db.scalar(statement)
        db.execute(delete(RateBucket).where(RateBucket.window < window - 2))
        db.execute(delete(Challenge).where(Challenge.expires_at < now - 3600))
    if count > request.app.state.settings.auth_requests_per_minute:
        raise ApiError(
            429,
            "RATE_LIMITED",
            "Too many sign-in attempts. Try again shortly.",
            retryable=True,
            headers={"Retry-After": str(60 - now % 60)},
        )
