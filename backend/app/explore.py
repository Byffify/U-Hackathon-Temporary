"""Public Explore catalog, including clearly marked preview projects."""

from fastapi import APIRouter, Query, Request
from sqlalchemy import JSON, Integer, String, Text, func, select
from sqlalchemy.orm import Mapped, mapped_column

from app.auth import DB
from app.db import Base
from app.models import User
from app.projects import Media, Project, get_project, project_view

router = APIRouter(prefix="/api/v1/explore", tags=["explore"])


class ExploreExample(Base):
    """Editorial preview, separate from purchasable project listings."""

    __tablename__ = "explore_examples"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    type: Mapped[str] = mapped_column(String(80))
    stack: Mapped[str] = mapped_column(String(160))
    price_wei: Mapped[str] = mapped_column(String(78))
    creator_name: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(Text)
    tone: Mapped[str] = mapped_column(String(32))
    features: Mapped[list[str]] = mapped_column(JSON)
    sort_order: Mapped[int] = mapped_column(Integer)


def example_view(example):
    return {
        "id": example.id,
        "title": example.title,
        "type": example.type,
        "stack": example.stack,
        "price_wei": example.price_wei,
        "creator_name": example.creator_name,
        "creator_id": None,
        "description": example.description,
        "tone": example.tone,
        "features": example.features,
        "is_example": True,
        "published": False,
        "chain_listing_id": None,
        "demo_url": None,
        "images": [],
        "license_terms": "Preview only. Source archive and purchase are unavailable.",
        "resale_allowed": False,
        "derivative_allowed": False,
    }


def public_project(db, project):
    creator = db.get(User, project.creator_id)
    images = db.scalars(select(Media).where(Media.project_id == project.id)).all()
    return {
        **project_view(project),
        "creator_name": (creator.name or "Creator") if creator else "Creator",
        "images": [f"/api/v1/media/{image.id}" for image in images],
        "is_example": False,
    }


@router.get("")
def list_explore(
    db: DB,
    q: str = Query(default="", max_length=200),
    stack: str = Query(default="", max_length=160),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    needle = q.casefold()
    technology = stack.casefold()
    all_examples = db.scalars(
        select(ExploreExample).order_by(ExploreExample.sort_order, ExploreExample.id)
    ).all()
    examples = [
        example
        for example in all_examples
        if (
            not needle
            or needle
            in " ".join((example.title, example.description, example.creator_name)).casefold()
        )
        and (not technology or technology in example.stack.casefold())
    ]
    conditions = [Project.published.is_(True)]
    if q:
        conditions.append(
            Project.title.icontains(q, autoescape=True)
            | Project.description.icontains(q, autoescape=True)
        )
    if stack:
        conditions.append(Project.stack.icontains(stack, autoescape=True))
    count = db.scalar(select(func.count()).select_from(Project).where(*conditions)) or 0
    published_stacks = db.scalars(
        select(Project.stack).where(Project.published.is_(True)).distinct()
    ).all()
    stacks = sorted(
        {item.stack for item in all_examples} | set(published_stacks),
        key=str.casefold,
    )
    offset = (page - 1) * page_size
    example_page = examples[offset : offset + page_size]
    remaining = page_size - len(example_page)
    live_offset = max(0, offset - len(examples))
    live = (
        db.scalars(
            select(Project)
            .where(*conditions)
            .order_by(Project.created_at.desc(), Project.id)
            .offset(live_offset)
            .limit(remaining)
        ).all()
        if remaining
        else []
    )
    return {
        "data": [
            *(example_view(item) for item in example_page),
            *(public_project(db, item) for item in live),
        ],
        "meta": {
            "page": page,
            "page_size": page_size,
            "total": len(examples) + count,
            "stacks": stacks,
        },
    }


@router.get("/{identifier}")
def get_explore(identifier: str, request: Request, db: DB):
    example = db.get(ExploreExample, identifier)
    if example:
        return {"data": example_view(example)}
    return get_project(identifier, request, db)
