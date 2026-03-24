"""add lesson student statuses

Revision ID: 16d758107c57
Revises: 
Create Date: 2026-03-24 07:21:00.799570

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '16d758107c57'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'lesson_students',
        sa.Column(
            'attendance_status',
            sa.String(),
            nullable=False,
            server_default='assigned'
        )
    )
    op.add_column(
        'lesson_students',
        sa.Column(
            'payment_status',
            sa.String(),
            nullable=False,
            server_default='unpaid'
        )
    )


def downgrade() -> None:
    op.drop_column('lesson_students', 'payment_status')
    op.drop_column('lesson_students', 'attendance_status')