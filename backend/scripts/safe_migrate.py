#!/usr/bin/env python3
"""
Deploy-safe migration helper.

When alembic_version is missing but the schema already exists (e.g. Railway
re-deploy after volume/metadata loss), this script inspects the actual schema
to determine the highest revision already applied, stamps it, then runs
`alembic upgrade head` so only genuinely missing migrations are executed.

To add a new migration checkpoint: append a tuple
  ("revision_id", lambda insp: <boolean that returns True when this revision's
                                 schema changes are present>)
to REVISION_CHECKPOINTS in reverse-chronological order (newest first).
"""
import subprocess
import sys

from sqlalchemy import create_engine, inspect, text

sys.path.insert(0, "/app")
from app.db import DATABASE_URL

# Ordered newest → oldest; first match wins.
# Each entry: (revision_id, callable(inspector) -> bool)
REVISION_CHECKPOINTS = [
    (
        "a3f7c2d94b81",
        lambda insp: _has_column(insp, "users", "is_verified"),
    ),
    (
        "05c813854496",
        lambda insp: _has_column(insp, "pets", "avatar_type"),
    ),
    (
        "e95c3b202a5f",
        lambda insp: insp.has_table("users"),
    ),
]


def _has_column(insp, table: str, column: str) -> bool:
    if not insp.has_table(table):
        return False
    return any(c["name"] == column for c in insp.get_columns(table))


def run(cmd: list[str]) -> None:
    print(f"[safe_migrate] $ {' '.join(cmd)}", flush=True)
    subprocess.run(cmd, check=True)


def main() -> None:
    engine = create_engine(DATABASE_URL)
    try:
        with engine.connect() as conn:
            insp = inspect(engine)
            users_exists = insp.has_table("users")

            alembic_has_rows = False
            if insp.has_table("alembic_version"):
                row = conn.execute(
                    text("SELECT version_num FROM alembic_version LIMIT 1")
                ).fetchone()
                alembic_has_rows = row is not None

            if users_exists and not alembic_has_rows:
                detected = next(
                    (rev for rev, check in REVISION_CHECKPOINTS if check(insp)),
                    None,
                )
    finally:
        engine.dispose()

    if not users_exists:
        print("[safe_migrate] Fresh database — running full migration.", flush=True)

    elif not alembic_has_rows:
        if detected:
            print(
                f"[safe_migrate] Schema exists (detected up to {detected!r}) but "
                "alembic_version is empty — stamping then upgrading.",
                flush=True,
            )
            run(["alembic", "stamp", detected])
        else:
            print(
                "[safe_migrate] Schema exists but revision unknown — stamping head.",
                flush=True,
            )
            run(["alembic", "stamp", "head"])

    else:
        print("[safe_migrate] Already in sync — running upgrade head (idempotent).", flush=True)

    run(["alembic", "upgrade", "head"])
    print("[safe_migrate] All migrations complete.", flush=True)


if __name__ == "__main__":
    main()
