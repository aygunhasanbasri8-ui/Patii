"""add_user_verification_and_reset

Revision ID: a3f7c2d94b81
Revises: 05c813854496
Create Date: 2026-06-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a3f7c2d94b81'
down_revision: Union[str, None] = '05c813854496'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('verification_code', sa.String(), nullable=True))
    op.add_column('users', sa.Column('verification_code_sent_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('reset_code', sa.String(), nullable=True))
    op.add_column('users', sa.Column('reset_code_expires_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'reset_code_expires_at')
    op.drop_column('users', 'reset_code')
    op.drop_column('users', 'verification_code_sent_at')
    op.drop_column('users', 'verification_code')
    op.drop_column('users', 'is_verified')
