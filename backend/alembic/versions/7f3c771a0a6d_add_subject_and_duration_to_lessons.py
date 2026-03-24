"""add subject and duration to lessons

Revision ID: 7f3c771a0a6d
Revises: 16d758107c57
Create Date: 2026-03-24 22:11:32.009949

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7f3c771a0a6d'
down_revision: Union[str, Sequence[str], None] = '16d758107c57'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "lessons",
        sa.Column("subject", sa.String(), nullable=False, server_default="General")
    )
    op.add_column(
        "lessons",
        sa.Column("duration", sa.Integer(), nullable=False, server_default="60")
    )


def downgrade() -> None:
    op.drop_column("lessons", "duration")
    op.drop_column("lessons", "subject")
