import pytest
from conftest import ORIGIN, challenge
from eth_account import Account
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings
from app.main import create_app


def test_auth_rate_limit_is_persistent_across_restarts(client, settings, clock):
    settings.auth_requests_per_minute = 2
    owner = Account.create()
    challenge(client, owner)
    challenge(client, owner)
    with TestClient(create_app(settings, clock=clock), headers={"Origin": ORIGIN}) as restarted:
        response = restarted.post(
            "/api/v1/auth/challenges",
            json={
                "address": owner.address,
                "chain_id": 658440,
            },
        )
        assert response.status_code == 429
        assert response.json()["error"]["retryable"] is True
        assert int(response.headers["Retry-After"]) > 0
        clock.value += 60
        assert (
            restarted.post(
                "/api/v1/auth/challenges",
                json={
                    "address": owner.address,
                    "chain_id": 658440,
                },
            ).status_code
            == 201
        )


def test_live_is_up_but_ready_is_unavailable_without_migrations(settings):
    with TestClient(create_app(settings)) as client:
        assert client.get("/health/live").status_code == 200
        response = client.get("/health/ready")
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "DATABASE_UNAVAILABLE"
        assert "sqlite" not in response.text


def test_ready_when_database_schema_exists(client):
    assert client.get("/health/ready").json() == {"data": {"status": "ready"}}


def test_unknown_endpoint_and_validation_have_standard_envelope(client):
    response = client.get("/api/v1/not-real")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"
    response = client.post("/api/v1/auth/challenges", json={"address": "bad"})
    assert response.status_code == 422
    assert response.json()["error"]["field_errors"]
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize(
    "overrides",
    [
        {"environment": "production"},
        {"cookie_samesite": "none", "cookie_secure": False},
        {"auth_domain": "evil.test"},
        {"frontend_origins": ["*"]},
    ],
)
def test_unsafe_deployment_configuration_is_rejected(overrides):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **overrides)


def test_postgres_provider_url_is_normalized_without_exposing_credentials():
    settings = Settings(_env_file=None, database_url="postgres://user:password@localhost/utopia")
    assert settings.database_url == "postgresql+psycopg://user:password@localhost/utopia"


def test_chain_id_accepts_railway_environment_string(monkeypatch):
    monkeypatch.setenv("CHAIN_ID", "658440")
    assert Settings(_env_file=None).chain_id == 658440

    monkeypatch.setenv("CHAIN_ID", "1")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)
