import pytest
from conftest import login
from eth_account import Account
from eth_account.messages import encode_typed_data


def test_missing_chain_configuration_fails_closed(client):
    login(client)
    response = client.get("/api/v1/me/entitlements")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "CHAIN_UNAVAILABLE"


def test_purchase_type_uses_numeric_existing_contract_listing_id():
    from app.chain import purchase_typed_data

    typed = purchase_typed_data(43113, "0x" + "12" * 20, {})
    assert typed["types"]["Purchase"][0] == {"name": "listingId", "type": "uint256"}


def test_uint256_authorization_values_are_strings_for_javascript_precision():
    from app.chain import purchase_typed_data

    typed = purchase_typed_data(
        43113,
        "0x" + "12" * 20,
        {
            "buyer": "0x" + "34" * 20,
            "listingId": 1,
            "price": 1000000000000000001,
            "termsHash": "0x" + "56" * 32,
            "nonce": 0,
            "deadline": 1800000000,
        },
    )
    assert typed["message"]["price"] == "1000000000000000001"
    assert typed["message"]["nonce"] == "0"


def test_authorization_cannot_be_replayed_for_other_buyer():
    from app.chain import purchase_typed_data, verify_purchase_signature

    wallet = Account.create()
    typed = purchase_typed_data(
        43113,
        "0x" + "12" * 20,
        {
            "buyer": wallet.address,
            "listingId": 1,
            "price": 100,
            "termsHash": "0x" + "56" * 32,
            "nonce": 0,
            "deadline": 1800000300,
        },
    )
    signed = Account.sign_message(encode_typed_data(full_message=typed), wallet.key)
    verify_purchase_signature(typed, signed.signature.hex(), wallet.address)
    with pytest.raises(Exception) as error:
        verify_purchase_signature(typed, signed.signature.hex(), Account.create().address)
    assert error.value.code == "SIGNATURE_INVALID"
