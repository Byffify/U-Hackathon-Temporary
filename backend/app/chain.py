"""Authoritative Avalanche L1 adapter. No unconfigured or error fallback grants rights."""

import json
import logging
import re
import threading
from pathlib import Path

from eth_account import Account
from eth_account.messages import encode_typed_data

from app.errors import ApiError

logger = logging.getLogger(__name__)


def unavailable():
    return ApiError(
        503, "CHAIN_UNAVAILABLE", "Marketplace chain service is unavailable.", retryable=True
    )


def uint(value, *, positive=True):
    text = str(value)
    if (
        not re.fullmatch(r"[0-9]{1,78}", text)
        or int(text) >= 2**256
        or (positive and int(text) == 0)
    ):
        raise ApiError(
            422, "INVALID_CHAIN_ID", "Use a valid positive on-chain identifier or amount."
        )
    return int(text)


def purchase_typed_data(chain_id, contract, message, resale=False):
    fields = (
        [("tokenId", "uint256"), ("buyer", "address"), ("seller", "address")]
        if resale
        else [("listingId", "uint256"), ("buyer", "address")]
    )
    fields += [
        ("price", "uint256"),
        ("termsHash", "bytes32"),
        ("nonce", "uint256"),
        ("deadline", "uint256"),
    ]
    name = "ResalePurchase" if resale else "Purchase"
    return {
        "types": {
            "EIP712Domain": [
                {"name": k, "type": v}
                for k, v in [
                    ("name", "string"),
                    ("version", "string"),
                    ("chainId", "uint256"),
                    ("verifyingContract", "address"),
                ]
            ],
            name: [{"name": k, "type": v} for k, v in fields],
        },
        "primaryType": name,
        "domain": {
            "name": "UTopiaMarketplace",
            "version": "1",
            "chainId": chain_id,
            "verifyingContract": contract,
        },
        "message": {
            key: str(value)
            if key in {name for name, kind in fields if kind == "uint256"}
            else value
            for key, value in message.items()
        },
    }


def verify_purchase_signature(typed, signature, buyer):
    try:
        recovered = Account.recover_message(
            encode_typed_data(full_message=typed), signature=signature
        )
    except Exception:
        raise ApiError(422, "SIGNATURE_INVALID", "Purchase authorization is invalid.") from None
    if recovered.lower() != buyer.lower():
        raise ApiError(422, "SIGNATURE_INVALID", "Purchase authorization is invalid.")


class ChainGateway:
    def __init__(self, settings):
        self.settings = settings
        self._lock = threading.RLock()

    def connect(self):
        rpc = getattr(self.settings, "chain_rpc_url", None) or getattr(
            self.settings, "fuji_rpc_url", None
        )
        address = getattr(self.settings, "marketplace_contract_address", None)
        if not rpc or not address:
            logger.warning(
                "Marketplace chain configuration missing rpc_set=%s contract_set=%s",
                bool(rpc),
                bool(address),
            )
            raise unavailable()
        try:
            from web3 import Web3

            web3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 15}))
            checksum_address = Web3.to_checksum_address(address)
            rpc_chain_id = web3.eth.chain_id
            if rpc_chain_id != self.settings.chain_id:
                logger.warning(
                    "Marketplace RPC chain mismatch expected=%s actual=%s",
                    self.settings.chain_id,
                    rpc_chain_id,
                )
                raise unavailable()
            if not web3.eth.get_code(checksum_address):
                logger.warning("Marketplace contract has no code at configured address")
                raise unavailable()
            artifact = Path(__file__).with_name("contract_abi.json")
            abi = json.loads(artifact.read_text())
            return web3, web3.eth.contract(address=checksum_address, abi=abi)
        except ApiError:
            raise
        except Exception as exc:
            logger.warning("Marketplace connection failed exception=%s", type(exc).__name__)
            raise unavailable() from None

    def call(self, name, *args):
        try:
            _, contract = self.connect()
            return getattr(contract.functions, name)(*args).call()
        except ApiError:
            raise
        except Exception as exc:
            logger.warning(
                "Marketplace contract read failed function=%s exception=%s",
                name,
                type(exc).__name__,
            )
            raise unavailable() from None

    def listing(self, listing_id):
        value = self.call("listings", uint(listing_id))
        return dict(
            creator=value[0],
            price_wei=str(value[1]),
            terms_hash="0x" + bytes(value[2]).hex(),
            resale_allowed=value[3],
            derivative_allowed=value[4],
            active=int(value[0], 16) != 0,
        )

    def has_access(self, listing_id, address):
        return bool(self.call("hasListingAccess", uint(listing_id), address))

    def access_rights(self, listing_id, address):
        owned = [r for r in self.entitlements(address) if r["chain_listing_id"] == str(listing_id)]
        allowed = [r for r in owned if r["derivative_allowed"]]
        selected = allowed or owned
        return {
            "has_access": bool(owned),
            "derivative_allowed": bool(allowed),
            "terms_hash": selected[0]["terms_hash"] if selected else None,
        }

    def nonce(self, address):
        return self.call("nonces", address)

    def typed_purchase(self, message, resale=False):
        self.connect()
        return purchase_typed_data(
            self.settings.chain_id, self.settings.marketplace_contract_address, message, resale
        )

    def prepare(self, name, args, value=0):
        _, contract = self.connect()
        return {
            "chain_id": self.settings.chain_id,
            "to": contract.address,
            "data": contract.encode_abi(name, args=args),
            "value": str(value),
        }

    def prepare_listing(self, project, update=False):
        args = [
            int(project.price_wei),
            project.terms_hash,
            project.resale_allowed,
            project.derivative_allowed,
        ]
        if update:
            args.insert(0, int(project.chain_listing_id))
        return self.prepare("updateListing" if update else "createListing", args)

    def prepare_resale(self, token_id, price=None, deadline=None):
        return self.prepare(
            "cancelResale" if price is None else "offerResale",
            [uint(token_id)] if price is None else [uint(token_id), uint(price), uint(deadline)],
        )

    def funding(self, address, amount):
        return {
            "balance_wei": str(self.call("depositOf", address)),
            "deposit_transaction": self.prepare("deposit", [], int(amount)),
            "notice": (
                "Deposit setup requires a wallet transaction and gas. Purchase gas is sponsored."
            ),
        }

    def entitlement(self, token_id):
        token_id = uint(token_id)
        right = self.call("entitlements", token_id)
        if not right[0]:
            raise ApiError(404, "NOT_FOUND", "Entitlement not found.")
        return {
            "id": str(token_id),
            "chain_listing_id": str(right[0]),
            "terms_hash": "0x" + bytes(right[1]).hex(),
            "resale_allowed": right[2],
            "derivative_allowed": right[3],
            "price_wei": str(right[4]),
            "holder": self.call("ownerOf", token_id),
        }

    def entitlements(self, address):
        # Token IDs are contiguous and never burned. Current owner is always reread.
        return [
            right
            for token in range(1, self.call("nextTokenId"))
            if (right := self.entitlement(token))["holder"].lower() == address.lower()
        ]

    def resale_offer(self, token_id):
        right = self.entitlement(token_id)
        price, deadline = self.call("resaleOffers", int(token_id))
        return {**right, "price_wei": str(price), "deadline": deadline, "active": price > 0}

    def signed_transaction(self, typed, signature):
        secret = getattr(self.settings, "sponsor_private_key", None)
        if not secret:
            raise ApiError(
                503, "SPONSOR_UNAVAILABLE", "Purchase sponsor is not configured.", retryable=True
            )
        try:
            web3, contract = self.connect()
            wallet = Account.from_key(secret.get_secret_value())
            if contract.functions.sponsor().call().lower() != wallet.address.lower():
                raise unavailable()
            fields = typed["types"][typed["primaryType"]]
            values = tuple(
                int(typed["message"][field["name"]])
                if field["type"] == "uint256"
                else typed["message"][field["name"]]
                for field in fields
            )
            function = (
                contract.functions.buyResale
                if typed["primaryType"] == "ResalePurchase"
                else contract.functions.buy
            )
            # One API process owns signer nonce allocation; do not share it across replicas.
            with self._lock:
                tx = function(values, signature).build_transaction(
                    {
                        "from": wallet.address,
                        "nonce": web3.eth.get_transaction_count(wallet.address, "pending"),
                        "chainId": self.settings.chain_id,
                    }
                )
                signed = wallet.sign_transaction(tx)
                return "0x" + bytes(signed.raw_transaction).hex(), "0x" + bytes(signed.hash).hex()
        except ApiError:
            raise
        except Exception:
            raise ApiError(
                503, "SPONSOR_UNAVAILABLE", "Purchase could not be prepared.", retryable=True
            ) from None

    def broadcast(self, raw):
        try:
            web3, _ = self.connect()
            web3.eth.send_raw_transaction(raw)
        except ApiError:
            raise
        except Exception:
            # Hash and exact signed bytes were persisted before broadcast; poll or rebroadcast only.
            raise ApiError(
                503,
                "BROADCAST_UNCERTAIN",
                "Submission outcome is unknown; check this intent.",
                retryable=True,
            ) from None

    def receipt(self, tx_hash, typed):
        try:
            from web3.exceptions import TransactionNotFound
            from web3.logs import DISCARD

            web3, contract = self.connect()
            try:
                receipt = web3.eth.get_transaction_receipt(tx_hash)
            except TransactionNotFound:
                return {"status": "submitted"}
            if not receipt.status:
                return {"status": "reverted"}
            if web3.eth.block_number - receipt.blockNumber + 1 < getattr(
                self.settings, "chain_confirmations", 2
            ):
                return {"status": "submitted"}
            block = web3.eth.get_block(receipt.blockNumber)
            if block.hash != receipt.blockHash or receipt.to.lower() != contract.address.lower():
                raise unavailable()
            event = (
                contract.events.Resold
                if typed["primaryType"] == "ResalePurchase"
                else contract.events.Purchased
            )
            message = typed["message"]
            for log in event().process_receipt(receipt, errors=DISCARD):
                args = log["args"]
                if (
                    log["address"].lower() == contract.address.lower()
                    and args["buyer"].lower() == message["buyer"].lower()
                    and args["price"] == int(message["price"])
                    and (
                        args.get("listingId") == int(message.get("listingId", 0))
                        if typed["primaryType"] == "Purchase"
                        else args["tokenId"] == int(message["tokenId"])
                        and args["seller"].lower() == message["seller"].lower()
                    )
                ):
                    return {"status": "confirmed", "token_id": str(args["tokenId"])}
            raise ApiError(
                409, "SETTLEMENT_MISMATCH", "Transaction does not settle this authorization."
            )
        except ApiError:
            raise
        except Exception:
            raise unavailable() from None
