from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: Literal["development", "production", "test"] = "development"
    database_url: str = "sqlite:///./utopia.db"
    frontend_origins: list[str] = ["http://localhost:4173", "http://127.0.0.1:4173"]
    auth_domain: str = "localhost:4173"
    auth_uri: str = "http://localhost:4173"
    chain_id: Literal[43113] = 43113
    challenge_ttl_seconds: int = Field(default=300, ge=1, le=600)
    session_ttl_seconds: int = Field(default=86400, ge=60, le=604800)
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    auth_requests_per_minute: int = Field(default=30, ge=1, le=1000)

    @model_validator(mode="after")
    def validate_deployment(self):
        if self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace("postgres://", "postgresql+psycopg://", 1)
        elif self.database_url.startswith("postgresql://"):
            self.database_url = self.database_url.replace(
                "postgresql://", "postgresql+psycopg://", 1
            )
        if not self.database_url.startswith(("sqlite:///", "postgresql+psycopg://")):
            raise ValueError("Use SQLite or PostgreSQL with psycopg")
        parsed = urlsplit(self.auth_uri)
        if parsed.netloc != self.auth_domain or parsed.scheme not in {"http", "https"}:
            raise ValueError("AUTH_DOMAIN must match AUTH_URI authority")
        if not self.frontend_origins or self.auth_uri.rstrip("/") not in self.frontend_origins:
            raise ValueError("AUTH_URI must be an allowed frontend origin")
        for origin in self.frontend_origins:
            parts = urlsplit(origin)
            if (
                parts.scheme not in {"https", "http"}
                or not parts.netloc
                or parts.username
                or parts.path
                or parts.query
                or parts.fragment
            ):
                raise ValueError("FRONTEND_ORIGINS must contain exact HTTP origins")
        if self.cookie_samesite == "none" and not self.cookie_secure:
            raise ValueError("SameSite=None requires secure cookies")
        if self.environment == "production":
            if not self.cookie_secure or any(
                not origin.startswith("https://") for origin in self.frontend_origins
            ):
                raise ValueError("Production requires HTTPS origins and secure cookies")
            if not self.database_url.startswith("postgresql+psycopg://"):
                raise ValueError("Production requires persistent PostgreSQL")
        return self
