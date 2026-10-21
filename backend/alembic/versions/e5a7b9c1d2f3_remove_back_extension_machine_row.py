"""모든 루틴에서 백 익스텐션·머신 로우 제거 (헬스장 기구가 애매함)

종목과 과거 기록은 남기고 routine_items 만 지운 뒤 순서를 다시 매긴다.
빈 DB(첫 실행)에서는 아무것도 하지 않고, 이후 app.seed 가 같은 구성을 넣는다.

Revision ID: e5a7b9c1d2f3
Revises: c3f1a2b4d5e6
Create Date: 2026-10-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e5a7b9c1d2f3"
down_revision: str | None = "c3f1a2b4d5e6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

EXT = "백 익스텐션 (45°)"
ROW = "머신 로우"

# downgrade 때 되돌릴 원래 자리: (루틴, 종목, 위치, 세트, 최소, 최대)
ORIGINAL = [
    ("전신 A", EXT, 4, 3, 12, 12),
    ("전신 A", ROW, 5, 3, 10, 12),
    ("상체 1", ROW, 3, 3, 10, 12),
    ("하체 2", EXT, 1, 3, 12, 15),
]


def _scalar(conn, sql: str, **params):
    return conn.execute(sa.text(sql), params).scalar()


def _renumber(conn, routine_id: int) -> None:
    rows = conn.execute(
        sa.text("SELECT id FROM routine_items WHERE routine_id = :r ORDER BY position, id"), {"r": routine_id}
    ).fetchall()
    for pos, (item_id,) in enumerate(rows, start=1):
        conn.execute(sa.text("UPDATE routine_items SET position = :p WHERE id = :i"), {"p": pos, "i": item_id})


def upgrade() -> None:
    conn = op.get_bind()
    ids = [_scalar(conn, "SELECT id FROM exercises WHERE name = :n", n=n) for n in (EXT, ROW)]
    ids = [i for i in ids if i is not None]
    if not ids:
        return  # 빈 DB: 시드가 처리

    touched = {
        row[0]
        for row in conn.execute(
            sa.text("SELECT DISTINCT routine_id FROM routine_items WHERE exercise_id IN :ids").bindparams(
                sa.bindparam("ids", expanding=True)
            ),
            {"ids": ids},
        )
    }
    conn.execute(
        sa.text("DELETE FROM routine_items WHERE exercise_id IN :ids").bindparams(sa.bindparam("ids", expanding=True)),
        {"ids": ids},
    )
    for routine_id in touched:
        _renumber(conn, routine_id)

    conn.execute(
        sa.text("UPDATE exercises SET alternative = :alt WHERE name = :n AND alternative = :old"),
        {"alt": "랫풀다운 언더그립", "n": "하이로우", "old": "머신 로우 / 랫풀다운 언더그립"},
    )


def downgrade() -> None:
    conn = op.get_bind()
    for routine, name, pos, sets, rmin, rmax in ORIGINAL:
        routine_id = _scalar(conn, "SELECT id FROM routines WHERE name = :n", n=routine)
        ex_id = _scalar(conn, "SELECT id FROM exercises WHERE name = :n", n=name)
        if routine_id is None or ex_id is None:
            continue
        if _scalar(conn, "SELECT id FROM routine_items WHERE routine_id = :r AND exercise_id = :e", r=routine_id, e=ex_id):
            continue
        conn.execute(
            sa.text("UPDATE routine_items SET position = position + 1 WHERE routine_id = :r AND position >= :p"),
            {"r": routine_id, "p": pos},
        )
        conn.execute(
            sa.text(
                "INSERT INTO routine_items (routine_id, exercise_id, position, sets, rep_min, rep_max) "
                "VALUES (:r, :e, :p, :s, :mn, :mx)"
            ),
            {"r": routine_id, "e": ex_id, "p": pos, "s": sets, "mn": rmin, "mx": rmax},
        )
    conn.execute(
        sa.text("UPDATE exercises SET alternative = :old WHERE name = :n AND alternative = :alt"),
        {"alt": "랫풀다운 언더그립", "n": "하이로우", "old": "머신 로우 / 랫풀다운 언더그립"},
    )
