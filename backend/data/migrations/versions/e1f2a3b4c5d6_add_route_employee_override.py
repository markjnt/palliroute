"""add route employee_override for AW aplano assignments

Revision ID: e1f2a3b4c5d6
Revises: d9e0f1a2b3c4
Create Date: 2026-08-27 10:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

revision = "e1f2a3b4c5d6"
down_revision = "d9e0f1a2b3c4"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("routes", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "employee_override",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )

    # Preserve existing AW assignees as manual overrides until explicitly reset
    op.execute(
        sa.text(
            """
            UPDATE routes
            SET employee_override = true
            WHERE employee_id IS NOT NULL
              AND area IN ('Nord', 'Mitte', 'Süd')
            """
        )
    )


def downgrade():
    with op.batch_alter_table("routes", schema=None) as batch_op:
        batch_op.drop_column("employee_override")
