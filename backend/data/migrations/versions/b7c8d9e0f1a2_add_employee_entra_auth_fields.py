"""add employee entra auth fields

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-08-11 22:30:00.000000

"""

import sqlalchemy as sa
from alembic import op

revision = "b7c8d9e0f1a2"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("employees", schema=None) as batch_op:
        batch_op.add_column(sa.Column("email", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("entra_oid", sa.String(length=36), nullable=True))
        batch_op.create_index(batch_op.f("ix_employees_email"), ["email"], unique=True)
        batch_op.create_index(batch_op.f("ix_employees_entra_oid"), ["entra_oid"], unique=True)


def downgrade():
    with op.batch_alter_table("employees", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_employees_entra_oid"))
        batch_op.drop_index(batch_op.f("ix_employees_email"))
        batch_op.drop_column("entra_oid")
        batch_op.drop_column("email")
