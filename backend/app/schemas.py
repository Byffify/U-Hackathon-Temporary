from pydantic import BaseModel


class Envelope[T](BaseModel):
    data: T


class UserIdentity(BaseModel):
    id: str
    address: str


class SessionView(BaseModel):
    user: UserIdentity
    csrf_token: str


class ChallengeView(BaseModel):
    id: str
    message: str
    expires_at: str


class ProfileView(BaseModel):
    id: str
    name: str
    bio: str
    avatar_url: str | None


class LogoutView(BaseModel):
    logged_out: bool


class HealthView(BaseModel):
    status: str


class ErrorInfo(BaseModel):
    code: str
    message: str
    field_errors: dict[str, str]
    retryable: bool


class ErrorEnvelope(BaseModel):
    error: ErrorInfo
    request_id: str
