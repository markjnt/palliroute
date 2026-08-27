"""add appointment completed flag

Revision ID: f3a4b5c6d7e8
Revises: e1f2a3b4c5d6
Create Date: 2026-08-27 17:55:00.000000

"""

import sqlalchemy as sa
from alembic import op

revision = "f3a4b5c6d7e8"
down_revision = "e1f2a3b4c5d6"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("appointments", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.false())
        )


def downgrade():
    with op.batch_alter_table("appointments", schema=None) as batch_op:
        batch_op.drop_column("completed")
