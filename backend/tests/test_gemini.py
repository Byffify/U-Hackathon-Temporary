import io
import json
import zipfile
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.auth import csrf_guard, current_user
from app.db import Base, make_engine
from app.errors import ApiError, install_error_handlers
from app.models import User


@pytest.fixture
def gem(tmp_path):
    from app.gemini import router
    from app.gemini_provider import ProviderResult

    app = FastAPI()
    install_error_handlers(app)
    app.include_router(router)
    app.state.settings = SimpleNamespace(
        gemini_model="test-model",
        gemini_free_tier_enabled=True,
        gemini_initial_quota=10000,
        gemini_trial_end=2000000000,
        gemini_analysis_budget=1000,
        gemini_generation_budget=2000,
    )
    app.state.clock = lambda: 1800000000
    engine = make_engine(f"sqlite:///{tmp_path / 'gemini.db'}")
    Base.metadata.create_all(engine)
    app.state.sessions = sessionmaker(engine, expire_on_commit=False)
    with app.state.sessions() as db:
        user = User(address="0x" + "a" * 40, created_at=1800000000)
        other = User(address="0x" + "b" * 40, created_at=1800000000)
        db.add_all([user, other])
        db.commit()
    app.dependency_overrides[current_user] = lambda: user
    app.dependency_overrides[csrf_guard] = lambda: user

    class Sources:
        allowed = True

        def resolve(self, db, user, ref):
            if not self.allowed:
                raise ApiError(403, "SOURCE_FORBIDDEN", "Source access denied.")
            return {
                "project_id": ref["project_id"],
                "release_id": "release-1",
                "files": [{"path": "app.py", "content": "print('source')"}],
                "provenance": {"license": "MIT"},
                "derivative_allowed": True,
            }

    class Provider:
        calls = []
        failure = None

        def run(self, operation, payload, max_tokens):
            self.calls.append(operation)
            if self.failure:
                raise self.failure
            content = {
                "text": "Explanation",
                "features": ["search"],
                "files": {"app.py": "print('integrated')"},
                "instructions": "Run python app.py",
                "conflicts": [],
            }
            return ProviderResult(content, 50, 20)

    class Storage:
        values = {}

        def put_private(self, data):
            key = str(len(self.values))
            self.values[key] = data
            return key

        def read_private(self, key):
            return self.values[key]

    app.state.source_service = Sources()
    app.state.gemini_provider = Provider()
    app.state.storage = Storage()
    with TestClient(app) as client:
        yield SimpleNamespace(app=app, client=client, user=user, other=other)
    engine.dispose()


def conversation(gem, count=1):
    response = gem.client.post("/api/v1/gemini/conversations", json={"title": "Build"})
    assert response.status_code == 201, response.text
    cid = response.json()["data"]["id"]
    response = gem.client.put(
        f"/api/v1/gemini/conversations/{cid}/sources",
        json={"sources": [{"project_id": f"project-{i}"} for i in range(count)]},
    )
    assert response.status_code == 200, response.text
    return cid


def plan(gem, cid, budget=None):
    estimated = gem.client.post(f"/api/v1/gemini/conversations/{cid}/estimates", json={})
    assert estimated.status_code == 200, estimated.text
    response = gem.client.post(
        f"/api/v1/gemini/conversations/{cid}/plans",
        json={
            "estimate_id": estimated.json()["data"]["id"],
            "requirements": "Integrate search",
            "target_stack": "Python",
            "generation_budget": budget,
        },
        headers={"Idempotency-Key": "plan-1"},
    )
    assert response.status_code == 202, response.text
    from app.worker import run_once

    assert run_once(gem.app)
    result = gem.client.get(f"/api/v1/gemini/conversations/{cid}").json()["data"]
    return result["plans"][-1]


def test_generation_requires_latest_explicit_confirmation_and_returns_private_zip(gem):
    cid = conversation(gem, count=3)
    p = plan(gem, cid, budget=1000)
    assert p["generation_budget"] == 1000
    assert gem.app.state.gemini_provider.calls == ["plan"]
    response = gem.client.post(
        f"/api/v1/gemini/plans/{p['id']}/confirm",
        json={"revision": p["revision"]},
        headers={"Idempotency-Key": "confirm-1"},
    )
    assert response.status_code == 202, response.text
    job = response.json()["data"]
    duplicate = gem.client.post(
        f"/api/v1/gemini/plans/{p['id']}/confirm",
        json={"revision": p["revision"]},
        headers={"Idempotency-Key": "confirm-1"},
    )
    assert duplicate.json()["data"]["id"] == job["id"]
    from app.worker import run_once

    assert run_once(gem.app)
    result = gem.client.get(f"/api/v1/jobs/{job['id']}").json()["data"]
    assert result["status"] == "succeeded"
    assert result["validation"]["build"] == "not-run"
    download = gem.client.get(f"/api/v1/outputs/{result['output_id']}/download")
    assert download.status_code == 200
    with zipfile.ZipFile(io.BytesIO(download.content)) as archive:
        assert archive.read("app.py") == b"print('integrated')"
        assert json.loads(archive.read("UTOPIA_PROVENANCE.json"))[0]["project_id"] == "project-0"
    gem.app.state.source_service.allowed = False
    assert gem.client.get(f"/api/v1/outputs/{result['output_id']}/download").status_code == 403


def test_unconfigured_service_does_not_allocate_or_consume_quota(gem):
    gem.app.state.settings.gemini_model = None
    response = gem.client.get("/api/v1/gemini/quota")
    assert response.status_code == 503
    from app.gemini import Quota

    with gem.app.state.sessions() as db:
        assert db.get(Quota, gem.user.id) is None


def test_history_is_owner_only_and_sources_are_rechecked(gem):
    cid = conversation(gem)
    gem.app.dependency_overrides[current_user] = lambda: gem.other
    assert gem.client.get(f"/api/v1/gemini/conversations/{cid}").status_code == 404
    gem.app.dependency_overrides[current_user] = lambda: gem.user
    gem.app.state.source_service.allowed = False
    assert gem.client.get(f"/api/v1/gemini/conversations/{cid}").status_code == 403


def test_failed_provider_charges_known_usage_and_releases_unused_reservation(gem):
    from app.gemini_provider import ProviderFailure
    from app.worker import run_once

    cid = conversation(gem)
    p = plan(gem, cid)
    response = gem.client.post(
        f"/api/v1/gemini/plans/{p['id']}/confirm",
        json={"revision": 1},
        headers={"Idempotency-Key": "failure"},
    )
    job_id = response.json()["data"]["id"]
    gem.app.state.gemini_provider.failure = ProviderFailure("Unavailable", input_tokens=30)
    assert run_once(gem.app)
    assert gem.client.get(f"/api/v1/jobs/{job_id}").json()["data"]["status"] == "failed"
    quota = gem.client.get("/api/v1/gemini/quota").json()["data"]
    assert quota["used"] == 100
    assert quota["reserved"] == 0
    assert not run_once(gem.app)
