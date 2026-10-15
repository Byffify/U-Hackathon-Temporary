from conftest import ORIGIN, challenge, login, verify
from eth_account import Account
from fastapi.testclient import TestClient

from app.main import create_app


def test_wrong_signer_is_denied_without_consuming_valid_challenge(client):
    owner = Account.create()
    issued = challenge(client, owner)
    assert verify(client, issued, Account.create()).status_code == 401
    assert verify(client, issued, owner).status_code == 200


def test_challenge_cannot_be_replayed(client):
    owner = Account.create()
    issued = challenge(client, owner)
    assert verify(client, issued, owner).status_code == 200
    assert verify(client, issued, owner).json()["error"]["code"] == "CHALLENGE_INVALID"


def test_expired_challenge_is_denied(client, clock, settings):
    owner = Account.create()
    issued = challenge(client, owner)
    clock.value += settings.challenge_ttl_seconds
    assert verify(client, issued, owner).status_code == 401


def test_signature_from_another_browser_cannot_login_a_victim(client, app):
    owner = Account.create()
    issued = challenge(client, owner)
    with TestClient(app, headers={"Origin": ORIGIN}) as other:
        assert verify(other, issued, owner).status_code == 401


def test_wrong_chain_cannot_issue_challenge(client):
    response = client.post(
        "/api/v1/auth/challenges",
        json={
            "address": Account.create().address,
            "chain_id": 1,
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "WRONG_NETWORK"


def test_tampered_message_cannot_change_signing_domain(client):
    owner = Account.create()
    issued = challenge(client, owner)
    issued["message"] = issued["message"].replace("localhost:4173", "attacker.example")
    response = verify(client, issued, owner)
    assert response.status_code == 401


def test_invalid_curve_signature_returns_401_not_server_error(client):
    issued = challenge(client, Account.create())
    response = client.post(
        "/api/v1/auth/verify",
        json={
            "challenge_id": issued["id"],
            "signature": "0x" + "00" * 65,
        },
    )
    assert response.status_code == 401


def test_session_expires_server_side(client, clock, settings):
    login(client)
    clock.value += settings.session_ttl_seconds
    assert client.get("/api/v1/auth/session").status_code == 401


def test_logout_revokes_captured_session_cookie(client):
    signed_in = login(client)
    stolen_cookie = client.cookies.get("utopia_session")
    response = client.post(
        "/api/v1/auth/logout",
        headers={
            "X-CSRF-Token": signed_in["csrf_token"],
        },
    )
    assert response.status_code == 200
    client.cookies.set("utopia_session", stolen_cookie)
    assert client.get("/api/v1/auth/session").status_code == 401


def test_logout_without_csrf_is_denied(client):
    login(client)
    assert client.post("/api/v1/auth/logout").status_code == 403
    assert client.get("/api/v1/auth/session").status_code == 200


def test_auth_requires_allowed_origin(client):
    response = client.post(
        "/api/v1/auth/challenges",
        headers={"Origin": "https://evil.test"},
        json={"address": Account.create().address, "chain_id": 43113},
    )
    assert response.status_code == 403


def test_authenticated_mutation_rejects_wrong_origin_even_with_csrf(client):
    signed_in = login(client)
    response = client.patch(
        "/api/v1/me/profile",
        json={"name": "Attacker"},
        headers={
            "Origin": "https://evil.test",
            "X-CSRF-Token": signed_in["csrf_token"],
        },
    )
    assert response.status_code == 403


def test_session_survives_application_restart(client, settings, clock):
    signed_in = login(client)
    cookie = client.cookies.get("utopia_session")
    with TestClient(create_app(settings, clock=clock)) as restarted:
        restarted.cookies.set("utopia_session", cookie)
        response = restarted.get("/api/v1/auth/session")
        assert response.json()["data"]["user"] == signed_in["user"]


def test_new_login_rotates_and_revokes_previous_session(client):
    owner = Account.create()
    login(client, owner)
    old = client.cookies.get("utopia_session")
    login(client, owner)
    assert client.cookies.get("utopia_session") != old
    client.cookies.clear()
    client.cookies.set("utopia_session", old)
    assert client.get("/api/v1/auth/session").status_code == 401


def test_secure_cookie_for_https_deployment(app, client):
    app.state.settings.cookie_secure = True
    owner = Account.create()
    response = client.post(
        "/api/v1/auth/challenges",
        json={
            "address": owner.address,
            "chain_id": 43113,
        },
    )
    assert "Secure" in response.headers["set-cookie"]


def test_cors_disallows_unlisted_origin(client):
    response = client.options(
        "/api/v1/me/profile",
        headers={
            "Origin": "https://evil.test",
            "Access-Control-Request-Method": "PATCH",
        },
    )
    assert "access-control-allow-origin" not in response.headers


def test_non_ascii_csrf_header_is_rejected_without_server_error(client):
    login(client)
    response = client.post(
        "/api/v1/auth/logout",
        headers=[
            (b"Origin", ORIGIN.encode()),
            (b"X-CSRF-Token", b"\xc3\xa9"),
        ],
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "CSRF_FAILED"
