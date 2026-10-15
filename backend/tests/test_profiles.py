import pytest
from conftest import ORIGIN, login
from eth_account import Account
from fastapi.testclient import TestClient


def test_profile_update_persists_and_is_public(client, app):
    identity = login(client)
    response = client.patch(
        "/api/v1/me/profile",
        headers={
            "X-CSRF-Token": identity["csrf_token"],
        },
        json={
            "name": "Creator",
            "bio": "Python / Solidity",
            "avatar_url": "https://img.test/a.png",
        },
    )
    assert response.status_code == 200
    with TestClient(app) as public:
        profile = public.get(f"/api/v1/creators/{identity['user']['id']}").json()["data"]
        assert profile["name"] == "Creator"
        assert profile["bio"] == "Python / Solidity"
        assert profile["avatar_url"] == "https://img.test/a.png"
    assert client.get("/api/v1/me/profile").json()["data"] == profile


def test_anonymous_cannot_edit_profile(client):
    assert client.patch("/api/v1/me/profile", json={"name": "No"}).status_code == 401


def test_cannot_change_other_users_profile_or_mass_assign_wallet(client, app):
    first = login(client)
    with TestClient(app, headers={"Origin": ORIGIN}) as second:
        identity = login(second)
        response = second.patch(
            "/api/v1/me/profile",
            headers={
                "X-CSRF-Token": identity["csrf_token"],
            },
            json={
                "name": "Hijacked",
                "id": first["user"]["id"],
                "address": Account.create().address,
            },
        )
        assert response.status_code == 422
        assert client.get("/api/v1/me/profile").json()["data"]["name"] == ""


@pytest.mark.parametrize(
    "payload",
    [
        {"name": ""},
        {"name": "A" * 81},
        {"name": "Valid", "bio": "B" * 2001},
        {"name": "Valid", "avatar_url": "javascript:alert(1)"},
    ],
)
def test_invalid_profile_returns_safe_field_errors(client, payload):
    identity = login(client)
    response = client.patch(
        "/api/v1/me/profile",
        headers={
            "X-CSRF-Token": identity["csrf_token"],
        },
        json=payload,
    )
    assert response.status_code == 422
    assert response.json()["error"]["field_errors"]
    assert response.json()["request_id"] == response.headers["x-request-id"]


def test_unknown_profile_returns_standard_error(client):
    response = client.get("/api/v1/creators/not-a-user")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PROFILE_NOT_FOUND"


def test_patch_preserves_omitted_profile_fields(client):
    identity = login(client)
    headers = {"X-CSRF-Token": identity["csrf_token"]}
    assert (
        client.patch(
            "/api/v1/me/profile",
            headers=headers,
            json={
                "name": "Before",
                "bio": "Keep me",
                "avatar_url": "https://img.test/avatar.png",
            },
        ).status_code
        == 200
    )
    response = client.patch("/api/v1/me/profile", headers=headers, json={"name": "After"})
    assert response.status_code == 200
    assert response.json()["data"]["bio"] == "Keep me"
    assert response.json()["data"]["avatar_url"] == "https://img.test/avatar.png"
    response = client.patch("/api/v1/me/profile", headers=headers, json={"avatar_url": None})
    assert response.status_code == 200
    assert response.json()["data"]["avatar_url"] is None
    assert response.json()["data"]["name"] == "After"


def test_avatar_url_respects_database_length_limit(client):
    identity = login(client)
    response = client.patch(
        "/api/v1/me/profile",
        headers={
            "X-CSRF-Token": identity["csrf_token"],
        },
        json={"name": "Creator", "avatar_url": "https://img.test/" + "a" * 2048},
    )
    assert response.status_code == 422
