"""Opt-in real local-EVM test, separate from fake-gateway unit fixtures."""

import json
import os
from pathlib import Path

import pytest
from conftest import ORIGIN, login
from eth_account import Account
from eth_account.messages import encode_typed_data
from fastapi.testclient import TestClient
from test_projects import create_project, upload
from web3 import Web3

from app.config import Settings
from app.db import Base, make_engine
from app.main import create_app

pytestmark = pytest.mark.skipif(
    os.environ.get("LOCAL_EVM_TEST") != "1", reason="Needs disposable local EVM fixture"
)


def test_real_chain_purchase_library_delivery_and_resale(tmp_path):
    fixture = json.loads((Path(__file__).parents[2] / ".local/test-chain.json").read_text())
    wallets = [Account.from_key(a["key"]) for a in fixture["accounts"]]
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=f"sqlite:///{tmp_path / 'evm.db'}",
        fuji_rpc_url=fixture["rpc"],
        marketplace_contract_address=fixture["address"],
        sponsor_private_key=wallets[2].key.hex(),
        chain_confirmations=1,
        storage_root=str(tmp_path / "files"),
        auth_requests_per_minute=1000,
    )
    app = create_app(settings)
    engine = make_engine(settings.database_url)
    Base.metadata.create_all(engine)
    engine.dispose()
    web3 = Web3(Web3.HTTPProvider(fixture["rpc"]))

    def send(payload, wallet):
        tx = web3.eth.send_transaction(
            {
                "from": wallet.address,
                "to": payload["to"],
                "data": payload["data"],
                "value": int(payload["value"]),
                "gas": 1000000,
            }
        )
        assert web3.eth.wait_for_transaction_receipt(tx).status == 1

    with TestClient(app, headers={"Origin": ORIGIN}) as client:
        creator = login(client, wallets[0])
        project = create_project(client, creator)
        release = upload(client, creator, project).json()["data"]
        prepare = client.post(
            f"/api/v1/projects/{project['id']}/chain-transaction",
            headers={"X-CSRF-Token": creator["csrf_token"]},
        )
        assert prepare.status_code == 200, prepare.text
        send(prepare.json()["data"], wallets[0])
        chain_listing = app.state.chain_gateway.call("nextListingId") - 1
        published = client.post(
            f"/api/v1/projects/{project['id']}/publish",
            json={"chain_listing_id": str(chain_listing)},
            headers={"X-CSRF-Token": creator["csrf_token"]},
        )
        assert published.status_code == 200, published.text

        def buy(wallet, body, key):
            buyer = login(client, wallet)
            response = client.post(
                "/api/v1/purchase-intents",
                json=body,
                headers={"X-CSRF-Token": buyer["csrf_token"], "Idempotency-Key": key},
            )
            assert response.status_code == 201, response.text
            intent = response.json()["data"]
            send(intent["funding"]["deposit_transaction"], wallet)
            before = web3.eth.get_balance(wallet.address)
            signed = Account.sign_message(
                encode_typed_data(full_message=intent["authorization"]), wallet.key
            )
            response = client.post(
                f"/api/v1/purchase-intents/{intent['id']}/confirm",
                json={"signature": "0x" + signed.signature.hex()},
                headers={"X-CSRF-Token": buyer["csrf_token"], "Idempotency-Key": key + "-confirm"},
            )
            assert response.status_code == 200, response.text
            result = response.json()["data"]
            assert result["status"] == "confirmed", result
            assert web3.eth.get_balance(wallet.address) == before  # purchase gas paid by sponsor
            assert client.get("/api/v1/me/entitlements").json()["data"]
            return result["entitlement_id"], buyer

        token, buyer = buy(wallets[3], {"project_id": project["id"]}, "primary")
        download = f"/api/v1/projects/{project['id']}/releases/{release['id']}/download"
        assert client.get(download).status_code == 200
        response = client.post(
            "/api/v1/resale-offers",
            json={
                "entitlement_id": token,
                "price_wei": "500",
                "deadline": int(app.state.clock()) + 300,
            },
            headers={"X-CSRF-Token": buyer["csrf_token"], "Idempotency-Key": "offer"},
        )
        assert response.status_code == 201, response.text
        send(response.json()["data"]["transaction"], wallets[3])
        new_token, _ = buy(wallets[4], {"resale_offer_id": token}, "resale")
        assert token == new_token
        assert client.get(download).status_code == 200
        login(client, wallets[3])
        assert client.get(download).status_code == 403
