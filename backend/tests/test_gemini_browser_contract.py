from conftest import login
from test_gemini import gem as _gem
from test_projects import create_project, upload

gem = _gem


def test_source_catalog_includes_own_drafts_without_chain_and_excludes_other_users(client):
    owner = login(client)
    project = create_project(client, owner)
    release = upload(client, owner, project).json()["data"]
    response = client.get("/api/v1/gemini/sources")
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["purchased_available"] is False
    assert [(s["project_id"], s["release_id"]) for s in data["sources"]] == [
        (project["id"], release["id"])
    ]
    assert "wrapped_key" not in response.text
    from eth_account import Account

    login(client, Account.create())
    assert client.get("/api/v1/gemini/sources").json()["data"]["sources"] == []


def test_conversation_restore_includes_jobs_and_message_count(gem):
    from test_gemini import conversation, plan

    cid = conversation(gem)
    p = plan(gem, cid)
    job = gem.client.post(
        f"/api/v1/gemini/plans/{p['id']}/confirm",
        json={"revision": p["revision"]},
        headers={"Idempotency-Key": "restore-job"},
    ).json()["data"]
    restored = gem.client.get(f"/api/v1/gemini/conversations/{cid}").json()["data"]
    assert any(j["id"] == job["id"] for j in restored["jobs"])
    assert restored["plans"][-1]["source_version"] == restored["source_version"]
    assert gem.client.get("/api/v1/gemini/conversations").json()["data"][0]["message_count"] == 0
