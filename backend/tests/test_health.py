from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_health_and_openapi_do_not_require_external_services(tmp_path):
    settings = Settings(_env_file=None, database_url=f"sqlite:///{tmp_path / 'test.db'}")
    with TestClient(create_app(settings)) as client:
        assert client.get("/health/live").json() == {"data": {"status": "ok"}}
        assert client.get("/openapi.json").json()["info"]["title"] == "KEEPHUB API"


def test_openapi_describes_profile_response_and_csrf_header(client):
    schema = client.get("/openapi.json").json()
    route = schema["paths"]["/api/v1/me/profile"]["patch"]
    assert route["responses"]["200"]["content"]["application/json"]["schema"]
    assert any(p["name"] == "X-CSRF-Token" for p in route["parameters"])
