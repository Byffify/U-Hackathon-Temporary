from dataclasses import dataclass

import pytest
from eth_account import Account
from eth_account.messages import encode_defunct
from fastapi.testclient import TestClient

from app.config import Settings
from app.db import Base, make_engine
from app.main import create_app

ORIGIN = "http://localhost:4173"


@dataclass
class Clock:
    value: int = 1_800_000_000

    def __call__(self):
        return self.value


@pytest.fixture
def clock():
    return Clock()


@pytest.fixture
def settings(tmp_path):
    return Settings(
        environment="test",
        database_url=f"sqlite:///{tmp_path / 'app.db'}",
        auth_requests_per_minute=1000,
    )


@pytest.fixture
def app(settings, clock):
    app = create_app(settings, clock=clock)
    # Schema setup is fixture preparation only. Runtime uses Alembic, never create_all.
    engine = make_engine(settings.database_url)
    Base.metadata.create_all(engine)
    engine.dispose()
    return app


@pytest.fixture
def client(app):
    with TestClient(app, headers={"Origin": ORIGIN}) as client:
        yield client


def challenge(client, wallet):
    response = client.post(
        "/api/v1/auth/challenges",
        json={
            "address": wallet.address,
            "chain_id": 658440,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]


def verify(client, issued, wallet):
    signature = Account.sign_message(encode_defunct(text=issued["message"]), wallet.key)
    return client.post(
        "/api/v1/auth/verify",
        json={
            "challenge_id": issued["id"],
            "signature": "0x" + signature.signature.hex(),
        },
    )


def login(client, wallet=None):
    wallet = wallet or Account.create()
    response = verify(client, challenge(client, wallet), wallet)
    assert response.status_code == 200, response.text
    return response.json()["data"]
