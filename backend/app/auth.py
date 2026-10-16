import hashlib
import secrets
from datetime import UTC, datetime
from typing import Annotated

from eth_account import Account
from eth_account.messages import encode_defunct
from eth_keys.exceptions import BadSignature
from eth_utils import is_address, to_checksum_address
from fastapi import APIRouter, Depends, Header, Request, Response
from fastapi.security import APIKeyCookie
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DBSession

from app.errors import ApiError
from app.models import Challenge, Session, User
from app.schemas import ChallengeView, Envelope, LogoutView, SessionView
from app.throttle import auth_throttle

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
session_cookie = APIKeyCookie(name="utopia_session", auto_error=False)


def digest(value: str):
    return hashlib.sha256(value.encode()).hexdigest()


def csrf_token(token: str):
    return digest("csrf:" + token)


def database(request: Request):
    with request.app.state.sessions() as session:
        yield session


DB = Annotated[DBSession, Depends(database)]


def allowed_origin(request: Request):
    if request.headers.get("origin") not in request.app.state.settings.frontend_origins:
        raise ApiError(403, "ORIGIN_FORBIDDEN", "Use the authorized application origin.")


def current_user(request: Request, db: DB, token: Annotated[str | None, Depends(session_cookie)]):
    stored = db.get(Session, digest(token)) if token else None
    if not stored or stored.expires_at <= request.app.state.clock():
        raise ApiError(401, "UNAUTHENTICATED", "Sign in with your wallet to continue.")
    user = db.get(User, stored.user_id)
    if not user:
        raise ApiError(401, "UNAUTHENTICATED", "Sign in with your wallet to continue.")
    return user


def csrf_guard(
    request: Request,
    user: Annotated[User, Depends(current_user)],
    supplied: Annotated[
        str | None,
        Header(
            alias="X-CSRF-Token", description="Required CSRF token returned by the session endpoint"
        ),
    ] = None,
):
    allowed_origin(request)
    token = request.cookies.get("utopia_session", "")
    if not secrets.compare_digest((supplied or "").encode(), csrf_token(token).encode()):
        raise ApiError(403, "CSRF_FAILED", "Refresh your session and try again.")
    return user


def user_data(user: User):
    return {"id": user.id, "address": user.address}


def set_cookie(response: Response, request: Request, name: str, value: str, max_age: int):
    settings = request.app.state.settings
    response.set_cookie(
        name,
        value,
        max_age=max_age,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )


class ChallengeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    address: str = Field(min_length=42, max_length=42)
    chain_id: int

    @field_validator("address")
    @classmethod
    def valid_wallet(cls, value):
        if not is_address(value):
            raise ValueError("Invalid EVM address")
        return to_checksum_address(value)


class VerifyInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    challenge_id: str = Field(min_length=36, max_length=36)
    signature: str = Field(pattern=r"^0x[0-9a-fA-F]{130}$")


def iso_time(value):
    return datetime.fromtimestamp(value, UTC).isoformat().replace("+00:00", "Z")


@router.post(
    "/challenges",
    status_code=201,
    dependencies=[Depends(auth_throttle)],
    response_model=Envelope[ChallengeView],
)
def issue_challenge(body: ChallengeInput, request: Request, response: Response, db: DB):
    allowed_origin(request)
    settings = request.app.state.settings
    if body.chain_id != settings.chain_id:
        raise ApiError(422, "WRONG_NETWORK", "Switch to Avalanche Fuji.")
    now = request.app.state.clock()
    expiry = now + settings.challenge_ttl_seconds
    browser = request.cookies.get("utopia_challenge") or secrets.token_urlsafe(32)
    nonce = secrets.token_hex(16)
    message = (
        f"{settings.auth_domain} wants you to sign in with your Ethereum account:\n"
        f"{body.address}\n\nSign in to KEEPHUB. This does not authorize a payment.\n\n"
        f"URI: {settings.auth_uri}\nVersion: 1\nChain ID: {settings.chain_id}\n"
        f"Nonce: {nonce}\nIssued At: {iso_time(now)}\nExpiration Time: {iso_time(expiry)}"
    )
    stored = Challenge(
        address=body.address, message=message, expires_at=expiry, browser_hash=digest(browser)
    )
    db.add(stored)
    db.commit()
    set_cookie(response, request, "utopia_challenge", browser, settings.challenge_ttl_seconds)
    return {"data": {"id": stored.id, "message": message, "expires_at": iso_time(expiry)}}


@router.post("/verify", dependencies=[Depends(auth_throttle)], response_model=Envelope[SessionView])
def verify_challenge(body: VerifyInput, request: Request, response: Response, db: DB):
    allowed_origin(request)
    now = request.app.state.clock()
    stored = db.get(Challenge, body.challenge_id)
    browser = request.cookies.get("utopia_challenge", "")
    if (
        not stored
        or stored.used
        or stored.expires_at <= now
        or not secrets.compare_digest(stored.browser_hash, digest(browser))
    ):
        raise ApiError(401, "CHALLENGE_INVALID", "Request a new wallet challenge.")
    try:
        recovered = Account.recover_message(
            encode_defunct(text=stored.message), signature=body.signature
        )
    except (ValueError, TypeError, OverflowError, BadSignature):
        raise ApiError(
            401, "SIGNATURE_INVALID", "Wallet signature could not be verified."
        ) from None
    if recovered != stored.address:
        raise ApiError(401, "SIGNATURE_INVALID", "Wallet signature could not be verified.")
    consumed = db.execute(
        update(Challenge)
        .where(
            Challenge.id == stored.id,
            Challenge.used.is_(False),
            Challenge.expires_at > now,
        )
        .values(used=True)
    )
    if consumed.rowcount != 1:
        raise ApiError(401, "CHALLENGE_INVALID", "Request a new wallet challenge.")
    user = db.scalar(select(User).where(User.address == recovered))
    if user is None:
        try:
            with db.begin_nested():
                user = User(address=recovered, created_at=now)
                db.add(user)
                db.flush()
        except IntegrityError:
            user = db.scalar(select(User).where(User.address == recovered))
    previous = request.cookies.get("utopia_session")
    if previous:
        existing = db.get(Session, digest(previous))
        if existing:
            db.delete(existing)
    token = secrets.token_urlsafe(32)
    settings = request.app.state.settings
    db.add(
        Session(
            token_hash=digest(token), user_id=user.id, expires_at=now + settings.session_ttl_seconds
        )
    )
    db.commit()
    set_cookie(response, request, "utopia_session", token, settings.session_ttl_seconds)
    return {"data": {"user": user_data(user), "csrf_token": csrf_token(token)}}


@router.get("/session", response_model=Envelope[SessionView])
def get_session(request: Request, user: Annotated[User, Depends(current_user)]):
    return {
        "data": {
            "user": user_data(user),
            "csrf_token": csrf_token(request.cookies["utopia_session"]),
        }
    }


@router.post("/logout", response_model=Envelope[LogoutView])
def logout(
    request: Request, response: Response, db: DB, user: Annotated[User, Depends(csrf_guard)]
):
    stored = db.get(Session, digest(request.cookies["utopia_session"]))
    db.delete(stored)
    db.commit()
    set_cookie(response, request, "utopia_session", "", 0)
    return {"data": {"logged_out": True}}
