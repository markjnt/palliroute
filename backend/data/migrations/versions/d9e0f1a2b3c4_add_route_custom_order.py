"""add route custom order fields

Revision ID: d9e0f1a2b3c4
Revises: c8d9e0f1a2b3
Create Date: 2026-08-19 02:15:00.000000

"""

import sqlalchemy as sa
from alembic import op

revision = "d9e0f1a2b3c4"
down_revision = "c8d9e0f1a2b3"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("routes", schema=None) as batch_op:
        batch_op.add_column(sa.Column("custom_order", sa.Text(), nullable=True))
        batch_op.add_column(
            sa.Column("custom_order_active", sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(sa.Column("custom_polyline", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("custom_distance", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("custom_duration", sa.Integer(), nullable=True))

    op.execute("UPDATE routes SET custom_order = route_order WHERE custom_order IS NULL")
    op.execute("UPDATE routes SET custom_polyline = polyline WHERE custom_polyline IS NULL")
    op.execute("UPDATE routes SET custom_distance = total_distance WHERE custom_distance IS NULL")
    op.execute("UPDATE routes SET custom_duration = total_duration WHERE custom_duration IS NULL")

    with op.batch_alter_table("routes", schema=None) as batch_op:
        batch_op.alter_column("custom_order", existing_type=sa.Text(), nullable=False)


def downgrade():
    with op.batch_alter_table("routes", schema=None) as batch_op:
        batch_op.drop_column("custom_duration")
        batch_op.drop_column("custom_distance")
        batch_op.drop_column("custom_polyline")
        batch_op.drop_column("custom_order_active")
        batch_op.drop_column("custom_order")
