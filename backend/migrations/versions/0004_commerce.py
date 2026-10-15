"""Purchase intents and resale transaction preparations.

Revision ID: 0004_commerce
Revises: 0003_gemini
"""

import sqlalchemy as sa
from alembic import op

revision = "0004_commerce"
down_revision = "0003_gemini"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "purchase_intents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("idempotency_key", sa.String(128), nullable=False),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("project_id", sa.String(36), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("typed_data", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("tx_hash", sa.String(66)),
        sa.Column("raw_transaction", sa.Text()),
        sa.Column("token_id", sa.String(78)),
        sa.Column("created_at", sa.Integer(), nullable=False),
        sa.UniqueConstraint("user_id", "idempotency_key"),
    )
    op.create_index("ix_purchase_intents_user_id", "purchase_intents", ["user_id"])
    op.create_table(
        "resale_preparations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("operation", sa.String(16), nullable=False),
        sa.Column("idempotency_key", sa.String(128), nullable=False),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("token_id", sa.String(78), nullable=False),
        sa.Column("transaction", sa.Text(), nullable=False),
        sa.UniqueConstraint("user_id", "operation", "idempotency_key"),
    )


def downgrade():
    op.drop_table("resale_preparations")
    op.drop_index("ix_purchase_intents_user_id", table_name="purchase_intents")
    op.drop_table("purchase_intents")
