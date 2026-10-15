"""Persistent wallet identity, browser-bound challenges, sessions and auth limits."""

import sqlalchemy as sa
from alembic import op

revision = "0001_identity"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("address", sa.String(42), nullable=False, unique=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("bio", sa.Text(), nullable=False),
        sa.Column("avatar_url", sa.String(2048), nullable=True),
        sa.Column("created_at", sa.Integer(), nullable=False),
    )
    op.create_table(
        "auth_challenges",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("address", sa.String(42), nullable=False),
        sa.Column("browser_hash", sa.String(64), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.Integer(), nullable=False, index=True),
        sa.Column("used", sa.Boolean(), nullable=False),
    )
    op.create_table(
        "sessions",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("expires_at", sa.Integer(), nullable=False, index=True),
    )
    op.create_table(
        "auth_rate_buckets",
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("window", sa.Integer(), primary_key=True),
        sa.Column("count", sa.Integer(), nullable=False),
    )


def downgrade():
    for table in ("auth_rate_buckets", "sessions", "auth_challenges", "users"):
        op.drop_table(table)
