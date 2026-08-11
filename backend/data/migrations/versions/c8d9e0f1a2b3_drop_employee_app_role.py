"""drop employee app_role if present

Revision ID: c8d9e0f1a2b3
Revises: b7c8d9e0f1a2
Create Date: 2026-08-11 23:05:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "c8d9e0f1a2b3"
down_revision = "b7c8d9e0f1a2"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    columns = {col["name"] for col in inspect(bind).get_columns("employees")}
    if "app_role" in columns:
        with op.batch_alter_table("employees", schema=None) as batch_op:
            batch_op.drop_column("app_role")


def downgrade():
    with op.batch_alter_table("employees", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("app_role", sa.String(length=32), nullable=False, server_default="driver")
        )
