import io
import zipfile

import pytest
from conftest import login


def zip_bytes(files=None):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for name, content in (
            files or {"README.md": "Example", "app.py": "print('hello')"}
        ).items():
            archive.writestr(name, content)
    return buffer.getvalue()


def create_project(client, identity, **changes):
    body = {
        "title": "Python Demo",
        "description": "A sample website",
        "stack": "Python",
        "demo_url": "https://example.com",
        "price_wei": "1000",
        "license_terms": "Use and modify",
        "resale_allowed": True,
        "derivative_allowed": True,
    }
    body.update(changes)
    response = client.post(
        "/api/v1/projects", json=body, headers={"X-CSRF-Token": identity["csrf_token"]}
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]


def upload(client, identity, project, data=None, key="upload-test"):
    return client.post(
        f"/api/v1/projects/{project['id']}/releases",
        files={"file": ("project.zip", data or zip_bytes(), "application/zip")},
        data={"version": "1.0.0"},
        headers={"X-CSRF-Token": identity["csrf_token"], "Idempotency-Key": key},
    )


def test_creator_upload_encrypt_download_and_idempotency(client, app, tmp_path):
    app.state.settings.storage_root = str(tmp_path / "storage")
    identity = login(client)
    project = create_project(client, identity)
    raw = zip_bytes()
    response = upload(client, identity, project, raw)
    assert response.status_code == 201, response.text
    release = response.json()["data"]
    assert "wrapped_key" not in release and "nonce" not in release
    assert release["storage_mode"] == "local"
    replay = upload(client, identity, project, raw)
    assert replay.json()["data"]["id"] == release["id"]
    assert replay.status_code == 201
    ciphertext = list((tmp_path / "storage" / "objects").iterdir())
    assert len(ciphertext) == 1
    assert not zipfile.is_zipfile(ciphertext[0])
    download = client.get(f"/api/v1/projects/{project['id']}/releases/{release['id']}/download")
    assert download.status_code == 200
    assert download.content == raw
    assert upload(client, identity, project, zip_bytes({"x.py": "changed"})).status_code == 409


@pytest.mark.parametrize(
    "files",
    [
        {"../escape.py": "x"},
        {"/absolute.py": "x"},
        {"A.py": "a", "a.py": "b"},
        {"a/./b.py": "a", "a/b.py": "b"},
        {"a": "x", "a/b.py": "y"},
    ],
)
def test_unsafe_archive_is_rejected(client, app, tmp_path, files):
    app.state.settings.storage_root = str(tmp_path / "storage")
    identity = login(client)
    project = create_project(client, identity)
    response = upload(client, identity, project, zip_bytes(files))
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "UNSAFE_ARCHIVE"


def test_draft_private_and_other_wallet_source_denied(client, app, tmp_path):
    from fastapi.testclient import TestClient

    app.state.settings.storage_root = str(tmp_path / "storage")
    identity = login(client)
    project = create_project(client, identity)
    release = upload(client, identity, project).json()["data"]
    with TestClient(app) as stranger:
        assert stranger.get(f"/api/v1/projects/{project['id']}").status_code == 404
        assert (
            stranger.get(
                f"/api/v1/projects/{project['id']}/releases/{release['id']}/download"
            ).status_code
            == 401
        )
    other = login(client)
    assert (
        client.get(
            f"/api/v1/projects/{project['id']}/releases/{release['id']}/download"
        ).status_code
        == 403
    )
    assert (
        client.patch(
            f"/api/v1/projects/{project['id']}",
            json={"title": "Hijack"},
            headers={"X-CSRF-Token": other["csrf_token"]},
        ).status_code
        == 403
    )


def test_production_source_upload_fails_closed_without_ipfs(client, app):
    identity = login(client)
    project = create_project(client, identity)
    app.state.settings.environment = "production"
    response = upload(client, identity, project)
    assert response.status_code == 503
    assert client.get(f"/api/v1/projects/{project['id']}/releases").json()["data"] == []


def test_request_size_is_rejected_before_multipart_parsing(client, app):
    response = client.post(
        "/api/v1/me/avatar",
        content=b"",
        headers={"Content-Length": str(app.state.settings.max_upload_bytes + 2 * 1024 * 1024)},
    )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "UPLOAD_TOO_LARGE"
