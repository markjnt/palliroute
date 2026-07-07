"""add employee auto planning preferences

Revision ID: a1b2c3d4e5f6
Revises: fe64ae07a25a
Create Date: 2026-07-07 17:45:00.000000

"""

import sqlalchemy as sa
from alembic import op

revision = "a1b2c3d4e5f6"
down_revision = "fe64ae07a25a"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "employee_auto_planning_preferences",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("rb_even_weeks", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("rb_odd_weeks", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "duty_preference", sa.String(length=20), nullable=False, server_default="neutral"
        ),
        sa.Column("aw_rhythm", sa.String(length=20), nullable=False, server_default="regular"),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("employee_id", name="unique_employee_auto_planning_preference"),
    )


def downgrade():
    op.drop_table("employee_auto_planning_preferences")
