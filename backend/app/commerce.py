"""Purchase authorization, authoritative library, and resale transaction preparation."""

import hashlib
import json
from contextlib import nullcontext
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapped, mapped_column

from app.auth import DB, csrf_guard, current_user
from app.chain import verify_purchase_signature
from app.db import Base
from app.errors import ApiError
from app.models import User, new_id

router = APIRouter(prefix="/api/v1", tags=["commerce"])
Buyer = Annotated[User, Depends(current_user)]
Actor = Annotated[User, Depends(csrf_guard)]
Key = Annotated[str, Header(alias="Idempotency-Key", min_length=1, max_length=128)]


class PurchaseIntent(Base):
    __tablename__ = "purchase_intents"
    __table_args__ = (UniqueConstraint("user_id", "idempotency_key"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(128))
    payload_hash: Mapped[str] = mapped_column(String(64))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    typed_data: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    tx_hash: Mapped[str | None] = mapped_column(String(66), nullable=True)
    raw_transaction: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_id: Mapped[str | None] = mapped_column(String(78), nullable=True)
    created_at: Mapped[int] = mapped_column(Integer)


class ResalePreparation(Base):
    __tablename__ = "resale_preparations"
    __table_args__ = (UniqueConstraint("user_id", "operation", "idempotency_key"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    operation: Mapped[str] = mapped_column(String(16))
    idempotency_key: Mapped[str] = mapped_column(String(128))
    payload_hash: Mapped[str] = mapped_column(String(64))
    token_id: Mapped[str] = mapped_column(String(78))
    transaction: Mapped[str] = mapped_column(Text)


class IntentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    project_id: str | None = Field(default=None, min_length=36, max_length=36)
    resale_offer_id: str | None = Field(default=None, pattern=r"^[1-9][0-9]{0,77}$")

    @model_validator(mode="after")
    def exactly_one(self):
        if bool(self.project_id) == bool(self.resale_offer_id):
            raise ValueError("Choose a project or resale offer")
        return self


class ConfirmInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    signature: str = Field(pattern=r"^0x[0-9a-fA-F]{130}$")


class ResaleInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    entitlement_id: str = Field(pattern=r"^[1-9][0-9]{0,77}$")
    price_wei: str = Field(pattern=r"^[1-9][0-9]{0,77}$")
    deadline: int = Field(gt=0)


def fingerprint(body):
    return hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()


def repeated(record, body):
    if record.payload_hash != fingerprint(body):
        raise ApiError(409, "IDEMPOTENCY_CONFLICT", "This key was already used for different data.")
    return record


def gateway(request):
    return request.app.state.chain_gateway


def intent_view(intent):
    return {
        "id": intent.id,
        "project_id": intent.project_id,
        "status": intent.status,
        "authorization": json.loads(intent.typed_data),
        "transaction_hash": intent.tx_hash,
        "entitlement_id": intent.token_id,
    }


def intent_with_funding(intent, chain, address):
    result = intent_view(intent)
    if intent.status == "pending":
        price = json.loads(intent.typed_data)["message"]["price"]
        result["funding"] = chain.funding(address, price)
    return result


def owned_intent(db, intent_id, user):
    intent = db.scalar(
        select(PurchaseIntent)
        .where(PurchaseIntent.id == intent_id, PurchaseIntent.user_id == user.id)
        .with_for_update()
    )
    if not intent:
        raise ApiError(404, "NOT_FOUND", "Purchase intent not found.")
    return intent


def refresh_intent(intent, chain):
    if intent.tx_hash and intent.status == "submitted":
        result = chain.receipt(intent.tx_hash, json.loads(intent.typed_data))
        intent.status = result["status"]
        intent.token_id = result.get("token_id")


@router.post("/purchase-intents", status_code=201)
def create_intent(body: IntentInput, request: Request, db: DB, user: Actor, key: Key):
    from app.projects import Project

    payload = body.model_dump()
    existing = db.scalar(
        select(PurchaseIntent).where(
            PurchaseIntent.user_id == user.id, PurchaseIntent.idempotency_key == key
        )
    )
    if existing:
        return {
            "data": intent_with_funding(repeated(existing, payload), gateway(request), user.address)
        }
    chain = gateway(request)
    now = request.app.state.clock()
    deadline = now + getattr(request.app.state.settings, "purchase_intent_ttl_seconds", 300)
    resale = bool(body.resale_offer_id)
    if resale:
        offer = chain.resale_offer(body.resale_offer_id)
        if not offer["active"] or offer["deadline"] <= now:
            raise ApiError(409, "OFFER_UNAVAILABLE", "This resale offer is no longer available.")
        project = db.scalar(
            select(Project).where(
                Project.chain_listing_id == offer["chain_listing_id"], Project.published.is_(True)
            )
        )
        deadline = min(deadline, offer["deadline"])
        terms, price = offer["terms_hash"], offer["price_wei"]
        message = {"tokenId": int(body.resale_offer_id), "seller": offer["holder"]}
    else:
        project = db.get(Project, body.project_id)
        if not project or not project.published or not project.chain_listing_id:
            raise ApiError(404, "NOT_FOUND", "Published project not found.")
        listing = chain.listing(project.chain_listing_id)
        if (
            listing["price_wei"] != project.price_wei
            or listing["terms_hash"].lower() != project.terms_hash.lower()
            or not listing["active"]
        ):
            raise ApiError(
                409, "LISTING_CHANGED", "The listing changed; refresh before purchasing."
            )
        terms, price = project.terms_hash, project.price_wei
        message = {"listingId": int(project.chain_listing_id)}
    if not project:
        raise ApiError(404, "NOT_FOUND", "Published project not found.")
    if not resale and project.creator_id == user.id:
        raise ApiError(
            409, "SELF_PURCHASE_FORBIDDEN", "Creators already have access to their source."
        )
    message.update(
        buyer=user.address,
        price=int(price),
        termsHash=terms,
        nonce=chain.nonce(user.address),
        deadline=deadline,
    )
    typed = chain.typed_purchase(message, resale)
    intent = PurchaseIntent(
        user_id=user.id,
        idempotency_key=key,
        payload_hash=fingerprint(payload),
        project_id=project.id,
        typed_data=json.dumps(typed),
        created_at=now,
    )
    db.add(intent)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        intent = repeated(
            db.scalar(
                select(PurchaseIntent).where(
                    PurchaseIntent.user_id == user.id, PurchaseIntent.idempotency_key == key
                )
            ),
            payload,
        )
    return {"data": intent_with_funding(intent, chain, user.address)}


@router.post("/purchase-intents/{intent_id}/confirm")
def confirm_intent(
    intent_id: str, body: ConfirmInput, request: Request, db: DB, user: Actor, key: Key
):
    chain = gateway(request)
    with getattr(chain, "_lock", nullcontext()):
        intent = owned_intent(db, intent_id, user)
        typed = json.loads(intent.typed_data)
        verify_purchase_signature(typed, body.signature, user.address)
        if intent.status == "pending":
            if int(typed["message"]["deadline"]) <= request.app.state.clock():
                raise ApiError(409, "AUTHORIZATION_EXPIRED", "Create a new purchase intent.")
            raw, tx_hash = chain.signed_transaction(typed, body.signature)
            intent.raw_transaction, intent.tx_hash, intent.status = raw, tx_hash, "submitted"
            db.commit()
            chain.broadcast(raw)
        refresh_intent(intent, chain)
        db.commit()
        return {"data": intent_view(intent)}


@router.get("/purchase-intents/{intent_id}")
def get_intent(intent_id: str, request: Request, db: DB, user: Buyer):
    intent = owned_intent(db, intent_id, user)
    chain = gateway(request)
    refresh_intent(intent, chain)
    db.commit()
    return {"data": intent_with_funding(intent, chain, user.address)}


def enrich_entitlement(db, right):
    from app.projects import Project

    project = db.scalar(
        select(Project).where(Project.chain_listing_id == right["chain_listing_id"])
    )
    return {
        **right,
        "project_id": project.id if project else None,
        "project_title": project.title if project else None,
    }


@router.get("/me/entitlements")
def library(request: Request, db: DB, user: Buyer):
    rights = gateway(request).entitlements(user.address)
    return {
        "data": [enrich_entitlement(db, right) for right in rights],
        "meta": {"total": len(rights)},
    }


@router.get("/entitlements/{token_id}")
def get_entitlement(token_id: str, request: Request, db: DB, user: Buyer):
    right = gateway(request).entitlement(token_id)
    if right["holder"].lower() != user.address.lower():
        raise ApiError(403, "ACCESS_DENIED", "This wallet does not hold the entitlement.")
    return {"data": enrich_entitlement(db, right)}


def prepare_offer(db, user, key, operation, payload, token_id, transaction):
    existing = db.scalar(
        select(ResalePreparation).where(
            ResalePreparation.user_id == user.id,
            ResalePreparation.operation == operation,
            ResalePreparation.idempotency_key == key,
        )
    )
    if existing:
        existing = repeated(existing, payload)
    else:
        existing = ResalePreparation(
            user_id=user.id,
            operation=operation,
            idempotency_key=key,
            payload_hash=fingerprint(payload),
            token_id=token_id,
            transaction=json.dumps(transaction),
        )
        db.add(existing)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            existing = repeated(
                db.scalar(
                    select(ResalePreparation).where(
                        ResalePreparation.user_id == user.id,
                        ResalePreparation.operation == operation,
                        ResalePreparation.idempotency_key == key,
                    )
                ),
                payload,
            )
    return {
        "data": {
            "id": existing.token_id,
            "status": "awaiting_wallet_transaction",
            "transaction": json.loads(existing.transaction),
        }
    }


@router.post("/resale-offers", status_code=201)
def create_resale(body: ResaleInput, request: Request, db: DB, user: Actor, key: Key):
    chain = gateway(request)
    right = chain.entitlement(body.entitlement_id)
    if right["holder"].lower() != user.address.lower() or not right["resale_allowed"]:
        raise ApiError(403, "RESALE_FORBIDDEN", "This wallet cannot resell this entitlement.")
    if body.deadline <= request.app.state.clock():
        raise ApiError(422, "DEADLINE_INVALID", "Resale deadline must be in the future.")
    return prepare_offer(
        db,
        user,
        key,
        "create",
        body.model_dump(),
        body.entitlement_id,
        chain.prepare_resale(body.entitlement_id, body.price_wei, body.deadline),
    )


@router.get("/resale-offers/{token_id}")
def read_resale(token_id: str, request: Request, db: DB):
    offer = gateway(request).resale_offer(token_id)
    offer["active"] = offer["active"] and offer["deadline"] > request.app.state.clock()
    return {"data": enrich_entitlement(db, offer)}


@router.post("/resale-offers/{token_id}/cancel")
def cancel_resale(token_id: str, request: Request, db: DB, user: Actor, key: Key):
    chain = gateway(request)
    right = chain.entitlement(token_id)
    if right["holder"].lower() != user.address.lower():
        raise ApiError(403, "ACCESS_DENIED", "This wallet does not hold the entitlement.")
    return prepare_offer(
        db, user, key, "cancel", {"token_id": token_id}, token_id, chain.prepare_resale(token_id)
    )


@router.get("/entitlements/{token_id}/releases/{release_id}/download")
def entitlement_download(token_id: str, release_id: str, request: Request, db: DB, user: Buyer):
    from app.projects import authorized_release

    right = gateway(request).entitlement(token_id)
    if right["holder"].lower() != user.address.lower():
        raise ApiError(403, "ACCESS_DENIED", "This wallet does not hold that entitlement.")
    enriched = enrich_entitlement(db, right)
    if not enriched["project_id"]:
        raise ApiError(404, "NOT_FOUND", "Project mapping is unavailable.")
    _, release, _ = authorized_release(request, db, user, enriched["project_id"], release_id)
    return Response(
        request.app.state.storage.get_source(release),
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="source.zip"'},
    )
