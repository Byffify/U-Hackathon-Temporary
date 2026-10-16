"""Public Explore catalog, including clearly marked preview projects."""

from fastapi import APIRouter, Query, Request
from sqlalchemy import func, select

from app.auth import DB
from app.models import User
from app.projects import Media, Project, get_project, project_view

router = APIRouter(prefix="/api/v1/explore", tags=["explore"])

# These are editorial previews, not published listings or purchasable source archives.
EXAMPLES = (
    {
        "id": "flora",
        "title": "Flora storefront",
        "type": "E-commerce",
        "stack": "React",
        "price_wei": "500000000000000000",
        "creator_name": "Maya Chen",
        "creator_id": None,
        "description": (
            "A quiet little storefront for things that grow. "
            "Product browsing, search, and a considered cart experience."
        ),
        "tone": "aqua",
        "features": ["Product search", "Shopping cart", "Product cards"],
    },
    {
        "id": "orbit",
        "title": "Orbit dashboard",
        "type": "Dashboard",
        "stack": "Next.js",
        "price_wei": "800000000000000000",
        "creator_name": "Leo Park",
        "creator_id": None,
        "description": (
            "An easy-to-read workspace for the numbers that matter. "
            "Charts, project activity, and a flexible dashboard layout."
        ),
        "tone": "lilac",
        "features": ["Analytics charts", "Activity feed", "Dashboard layout"],
    },
    {
        "id": "folio",
        "title": "Studio portfolio",
        "type": "Portfolio",
        "stack": "Vue",
        "price_wei": "300000000000000000",
        "creator_name": "Aria Patel",
        "creator_id": None,
        "description": (
            "An expressive home for independent work. "
            "A project gallery, editorial case studies, and a simple contact page."
        ),
        "tone": "peach",
        "features": ["Project gallery", "Case studies", "Contact page"],
    },
)


def example_view(example):
    return {
        **example,
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
    examples = [
        example
        for example in EXAMPLES
        if (
            not needle
            or needle
            in " ".join(
                (example["title"], example["description"], example["creator_name"])
            ).casefold()
        )
        and (not technology or technology in example["stack"].casefold())
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
        "meta": {"page": page, "page_size": page_size, "total": len(examples) + count},
    }


@router.get("/{identifier}")
def get_explore(identifier: str, request: Request, db: DB):
    for example in EXAMPLES:
        if example["id"] == identifier:
            return {"data": example_view(example)}
    return get_project(identifier, request, db)
