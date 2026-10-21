"""add_failed_code_attempts

Revision ID: c51e8a2f7d03
Revises: a3f7c2d94b81
Create Date: 2026-10-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c51e8a2f7d03'
down_revision: Union[str, None] = 'a3f7c2d94b81'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('failed_code_attempts', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('users', 'failed_code_attempts')
