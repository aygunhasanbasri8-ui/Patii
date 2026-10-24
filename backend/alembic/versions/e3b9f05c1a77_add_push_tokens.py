"""add_push_tokens

Revision ID: e3b9f05c1a77
Revises: d7a41c9e2b10
Create Date: 2026-10-24 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e3b9f05c1a77'
down_revision: Union[str, None] = 'd7a41c9e2b10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'push_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('platform', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token'),
    )
    op.create_index('ix_push_tokens_id', 'push_tokens', ['id'])
    op.create_index('ix_push_tokens_user_id', 'push_tokens', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_push_tokens_user_id', table_name='push_tokens')
    op.drop_index('ix_push_tokens_id', table_name='push_tokens')
    op.drop_table('push_tokens')
