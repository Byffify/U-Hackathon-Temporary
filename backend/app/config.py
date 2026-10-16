from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: Literal["development", "production", "test"] = "development"
    database_url: str = "sqlite:///./utopia.db"
    frontend_origins: list[str] = ["http://localhost:4173", "http://127.0.0.1:4173"]
    auth_domain: str = "localhost:4173"
    auth_uri: str = "http://localhost:4173"
    chain_id: Literal[658440] = 658440
    challenge_ttl_seconds: int = Field(default=300, ge=1, le=600)
    session_ttl_seconds: int = Field(default=86400, ge=60, le=604800)
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    auth_requests_per_minute: int = Field(default=30, ge=1, le=1000)
    storage_root: str = ".local"
    storage_backend: Literal["local", "supabase"] = "local"
    source_storage_backend: Literal["local", "ipfs"] = "local"
    storage_master_key: SecretStr | None = None
    supabase_url: str | None = None
    supabase_service_key: SecretStr | None = None
    supabase_bucket: str = "utopia-private"
    ipfs_api_url: str | None = None
    ipfs_api_authorization: SecretStr | None = None
    max_upload_bytes: int = Field(default=20 * 1024 * 1024, ge=1024, le=100 * 1024 * 1024)
    max_archive_expanded_bytes: int = Field(default=50 * 1024 * 1024, ge=1024)
    max_archive_files: int = Field(default=1000, ge=1, le=10000)
    max_source_context_bytes: int = Field(default=500000, ge=1024, le=2000000)
    max_image_bytes: int = Field(default=5 * 1024 * 1024, ge=1024)
    public_api_url: str | None = None
    chain_rpc_url: str | None = None
    fuji_rpc_url: str | None = None
    marketplace_contract_address: str | None = None
    sponsor_private_key: SecretStr | None = None
    marketplace_deployment_block: int = Field(default=0, ge=0)
    chain_confirmations: int = Field(default=2, ge=1)
    purchase_intent_ttl_seconds: int = Field(default=300, ge=30, le=600)
    gemini_api_key: SecretStr | None = None
    gemini_model: str | None = None
    gemini_free_tier_enabled: bool = False
    gemini_initial_quota: int | None = Field(default=None, gt=0)
    gemini_trial_end: int | None = Field(default=None, gt=0)
    gemini_analysis_budget: int | None = Field(default=None, gt=0)
    gemini_generation_budget: int | None = Field(default=None, gt=0)
    modal_app_name: str | None = None
    sandbox_build_command: list[str] | None = None
    sandbox_image: str = "python:3.12-slim"
    sandbox_timeout_seconds: int = Field(default=180, ge=10, le=240)
    approved_open_source_hashes: list[str] = []

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
