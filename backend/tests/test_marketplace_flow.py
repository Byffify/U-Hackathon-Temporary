import io

from conftest import login
from PIL import Image
from test_projects import create_project, upload, zip_bytes


class RightsChain:
    def __init__(self, offer):
        self.offer = offer
        self.allow = False

    def listing(self, identifier):
        return self.offer

    def access_rights(self, listing, address):
        return {
            "has_access": self.allow,
            "derivative_allowed": False,
            "terms_hash": self.offer["terms_hash"],
        }


def test_publish_search_free_update_and_current_holder_access(client, app, tmp_path):
    app.state.settings.storage_root = str(tmp_path / "files")
    identity = login(client)
    project = create_project(client, identity)
    first = upload(client, identity, project).json()["data"]
    chain = RightsChain(
        {
            "creator": identity["user"]["address"],
            "price_wei": project["price_wei"],
            "terms_hash": project["terms_hash"],
            "resale_allowed": True,
            "derivative_allowed": True,
        }
    )
    app.state.chain_gateway = chain
    response = client.post(
        f"/api/v1/projects/{project['id']}/publish",
        json={"chain_listing_id": "1"},
        headers={"X-CSRF-Token": identity["csrf_token"]},
    )
    assert response.status_code == 200, response.text
    assert client.get("/api/v1/projects?q=Python&stack=Python").json()["meta"]["total"] == 1
    assert client.get("/api/v1/projects?q=missing").json()["data"] == []
    new_raw = zip_bytes({"app.py": "print('updated')"})
    second = client.post(
        f"/api/v1/projects/{project['id']}/releases",
        files={"file": ("update.zip", new_raw, "application/zip")},
        data={"version": "2.0.0"},
        headers={"X-CSRF-Token": identity["csrf_token"], "Idempotency-Key": "second"},
    ).json()["data"]
    login(client)
    path = f"/api/v1/projects/{project['id']}/releases/{second['id']}/download"
    assert client.get(path).status_code == 403
    chain.allow = True
    assert client.get(path).content == new_raw
    assert (
        client.get(f"/api/v1/projects/{project['id']}/releases/{first['id']}/download").status_code
        == 200
    )
    chain.allow = False
    assert client.get(path).status_code == 403


def test_avatar_image_upload_is_real_and_invalid_image_rejected(client, app, tmp_path):
    app.state.settings.storage_root = str(tmp_path / "images")
    identity = login(client)
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), "red").save(buffer, format="PNG")
    response = client.post(
        "/api/v1/me/avatar",
        files={"file": ("photo.png", buffer.getvalue(), "image/png")},
        headers={"X-CSRF-Token": identity["csrf_token"]},
    )
    assert response.status_code == 201, response.text
    url = response.json()["data"]["url"]
    assert client.get(url).headers["content-type"] == "image/png"
    assert client.get("/api/v1/me/profile").json()["data"]["avatar_url"] == url
    assert (
        client.post(
            "/api/v1/me/avatar",
            files={"file": ("bad.png", b"not an image", "image/png")},
            headers={"X-CSRF-Token": identity["csrf_token"]},
        ).status_code
        == 422
    )


def test_ciphertext_tampering_does_not_release_source(client, app, tmp_path):
    root = tmp_path / "files"
    app.state.settings.storage_root = str(root)
    identity = login(client)
    project = create_project(client, identity)
    release = upload(client, identity, project).json()["data"]
    file = next((root / "objects").iterdir())
    file.write_bytes(b"modified ciphertext")
    response = client.get(f"/api/v1/projects/{project['id']}/releases/{release['id']}/download")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "STORAGE_INTEGRITY_ERROR"


def test_import_unknown_license_is_blocked_as_gemini_source(client, app, tmp_path):
    app.state.settings.storage_root = str(tmp_path / "files")
    identity = login(client)
    response = client.post(
        "/api/v1/gemini/source-imports",
        files={"file": ("source.zip", zip_bytes(), "application/zip")},
        data={
            "origin": "https://example.com/source",
            "license_id": "Unknown",
            "license_evidence": "No license",
        },
        headers={"X-CSRF-Token": identity["csrf_token"]},
    )
    assert response.status_code == 201, response.text
    source = response.json()["data"]
    chat = client.post(
        "/api/v1/gemini/conversations", json={}, headers={"X-CSRF-Token": identity["csrf_token"]}
    ).json()["data"]
    response = client.put(
        f"/api/v1/gemini/conversations/{chat['id']}/sources",
        json={
            "sources": [{"project_id": source["project_id"], "release_id": source["release_id"]}]
        },
        headers={"X-CSRF-Token": identity["csrf_token"]},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "LICENSE_UNVERIFIED"


def test_real_storage_plan_confirmation_output_and_derivative_draft(client, app, tmp_path):
    from app.gemini_provider import ProviderResult
    from app.worker import run_once

    app.state.settings.storage_root = str(tmp_path / "files")
    app.state.settings.gemini_model = "test-fixture"
    app.state.settings.gemini_free_tier_enabled = True
    app.state.settings.gemini_initial_quota = 10000
    app.state.settings.gemini_trial_end = app.state.clock() + 3600
    app.state.settings.gemini_analysis_budget = 1000
    app.state.settings.gemini_generation_budget = 2000

    class FixtureProvider:
        def run(self, operation, payload, budget):
            return ProviderResult(
                {
                    "text": "plan",
                    "conflicts": [],
                    "files": {"app.py": "print('derived')"},
                    "instructions": "python app.py",
                },
                50,
                20,
            )

    app.state.gemini_provider = FixtureProvider()
    identity = login(client)
    headers = {"X-CSRF-Token": identity["csrf_token"]}
    project = create_project(client, identity)
    release = upload(client, identity, project).json()["data"]
    chat = client.post("/api/v1/gemini/conversations", json={}, headers=headers).json()["data"]
    cid = chat["id"]
    assert (
        client.put(
            f"/api/v1/gemini/conversations/{cid}/sources",
            headers=headers,
            json={"sources": [{"project_id": project["id"], "release_id": release["id"]}]},
        ).status_code
        == 200
    )
    estimate = client.post(f"/api/v1/gemini/conversations/{cid}/estimates", headers=headers).json()[
        "data"
    ]
    response = client.post(
        f"/api/v1/gemini/conversations/{cid}/plans",
        headers={**headers, "Idempotency-Key": "plan"},
        json={"estimate_id": estimate["id"], "requirements": "Update feature"},
    )
    assert response.status_code == 202, response.text
    assert run_once(app)
    plan = client.get(f"/api/v1/gemini/conversations/{cid}").json()["data"]["plans"][-1]
    response = client.post(
        f"/api/v1/gemini/plans/{plan['id']}/confirm",
        headers={**headers, "Idempotency-Key": "confirm"},
        json={"revision": plan["revision"]},
    )
    assert response.status_code == 202, response.text
    jid = response.json()["data"]["id"]
    assert run_once(app)
    result = client.get(f"/api/v1/jobs/{jid}").json()["data"]
    assert result["status"] == "succeeded", result
    output_id = result["output_id"]
    assert client.get(f"/api/v1/outputs/{output_id}/download").status_code == 200
    body = {
        "title": "Derived",
        "description": "Derived project",
        "stack": "Python",
        "price_wei": "2000",
        "license_terms": "Use with notices",
        "derivative_allowed": True,
    }
    response = client.post(
        f"/api/v1/outputs/{output_id}/project-draft",
        json=body,
        headers={**headers, "Idempotency-Key": "derived"},
    )
    assert response.status_code == 201, response.text
    draft = response.json()["data"]
    assert draft["id"] != project["id"] and not draft["published"]
    again = client.post(
        f"/api/v1/outputs/{output_id}/project-draft",
        json=body,
        headers={**headers, "Idempotency-Key": "derived"},
    )
    assert again.json()["data"]["id"] == draft["id"]
