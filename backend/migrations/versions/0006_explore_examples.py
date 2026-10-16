"""Store editorial Explore previews outside purchasable project listings."""

import sqlalchemy as sa
from alembic import op

revision = "0006_explore_examples"
down_revision = "0005_source_provenance"
branch_labels = None
depends_on = None


def upgrade():
    table = op.create_table(
        "explore_examples",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("type", sa.String(80), nullable=False),
        sa.Column("stack", sa.String(160), nullable=False),
        sa.Column("price_wei", sa.String(78), nullable=False),
        sa.Column("creator_name", sa.String(80), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("tone", sa.String(32), nullable=False),
        sa.Column("features", sa.JSON(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
    )
    op.bulk_insert(
        table,
        [
            {
                "id": "flora",
                "title": "Flora storefront",
                "type": "E-commerce",
                "stack": "React",
                "price_wei": "500000000000000000",
                "creator_name": "Maya Chen",
                "description": (
                    "A quiet little storefront for things that grow. "
                    "Product browsing, search, and a considered cart experience."
                ),
                "tone": "aqua",
                "features": ["Product search", "Shopping cart", "Product cards"],
                "sort_order": 1,
            },
            {
                "id": "orbit",
                "title": "Orbit dashboard",
                "type": "Dashboard",
                "stack": "Next.js",
                "price_wei": "800000000000000000",
                "creator_name": "Leo Park",
                "description": (
                    "An easy-to-read workspace for the numbers that matter. "
                    "Charts, project activity, and a flexible dashboard layout."
                ),
                "tone": "lilac",
                "features": ["Analytics charts", "Activity feed", "Dashboard layout"],
                "sort_order": 2,
            },
            {
                "id": "folio",
                "title": "Studio portfolio",
                "type": "Portfolio",
                "stack": "Vue",
                "price_wei": "300000000000000000",
                "creator_name": "Aria Patel",
                "description": (
                    "An expressive home for independent work. "
                    "A project gallery, editorial case studies, and a simple contact page."
                ),
                "tone": "peach",
                "features": ["Project gallery", "Case studies", "Contact page"],
                "sort_order": 3,
            },
        ],
    )


def downgrade():
    op.drop_table("explore_examples")
