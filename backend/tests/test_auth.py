from conftest import challenge, login, verify
from eth_account import Account


def test_wallet_signature_creates_persistent_session_and_public_profile(client):
    wallet = Account.create()
    issued = challenge(client, wallet)
    assert "localhost:4173 wants you to sign in" in issued["message"]
    assert "URI: http://localhost:4173" in issued["message"]
    assert "Chain ID: 658440" in issued["message"]
    response = verify(client, issued, wallet)
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["user"]["address"] == wallet.address
    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie
    assert "SameSite=lax" in cookie
    assert client.get("/api/v1/auth/session").json()["data"]["user"] == data["user"]
    public = client.get(f"/api/v1/creators/{data['user']['id']}").json()["data"]
    assert public["id"] == data["user"]["id"]
    assert "address" not in public
    assert "csrf_token" not in public


def test_anonymous_session_is_unauthorized(client):
    response = client.get("/api/v1/auth/session")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


def test_relogin_reuses_same_wallet_account(client):
    wallet = Account.create()
    assert login(client, wallet)["user"]["id"] == login(client, wallet)["user"]["id"]
