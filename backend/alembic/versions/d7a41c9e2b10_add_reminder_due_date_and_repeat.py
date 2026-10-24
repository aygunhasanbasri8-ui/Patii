"""add_reminder_due_date_and_repeat

Revision ID: d7a41c9e2b10
Revises: c51e8a2f7d03
Create Date: 2026-10-24 22:00:00.000000

"""
from datetime import datetime
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd7a41c9e2b10'
down_revision: Union[str, None] = 'c51e8a2f7d03'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('reminders', sa.Column('due_date', sa.Date(), nullable=True))
    op.add_column('reminders', sa.Column('repeat_rule', sa.String(), nullable=True))
    op.add_column('reminders', sa.Column('repeat_start', sa.Date(), nullable=True))
    op.add_column('reminders', sa.Column('last_notified_on', sa.Date(), nullable=True))
    op.create_index('ix_reminders_due_date', 'reminders', ['due_date'])

    # Mevcut "gg/aa/yyyy" metinlerinden doldur; okunamayan eski kayıt NULL kalır,
    # bildirim almaz ama listede eskisi gibi görünür.
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, date FROM reminders")).fetchall()
    for rid, raw in rows:
        try:
            due = datetime.strptime((raw or "").strip(), "%d/%m/%Y").date()
        except ValueError:
            continue
        conn.execute(sa.text("UPDATE reminders SET due_date = :d WHERE id = :i"), {"d": due, "i": rid})


def downgrade() -> None:
    op.drop_index('ix_reminders_due_date', table_name='reminders')
    op.drop_column('reminders', 'last_notified_on')
    op.drop_column('reminders', 'repeat_start')
    op.drop_column('reminders', 'repeat_rule')
    op.drop_column('reminders', 'due_date')
