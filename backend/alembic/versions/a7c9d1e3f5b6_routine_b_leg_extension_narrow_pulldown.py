"""전신 B: 싱글 레그프레스 → 레그 익스텐션, 랫풀다운 언더그립 → 랫풀다운 내로우

2026-10-21 실제로 바꿔서 한 종목에 맞춘다. 같은 자리에서 종목만 바꾸고 레그 익스텐션은 3 × 10–12.
다른 루틴(하체 1의 싱글 레그프레스 등)은 그대로 둔다. 종목과 과거 기록은 남긴다.

Revision ID: a7c9d1e3f5b6
Revises: f6b8c0d2e4a5
Create Date: 2026-10-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a7c9d1e3f5b6"
down_revision: str | None = "f6b8c0d2e4a5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NARROW = "랫풀다운 내로우"
NARROW_CUE = "랫풀다운 기계에 좁은 손잡이(V바)를 걸고, 팔꿈치를 몸 옆으로 붙인 채 가슴 쪽으로 당긴다"

# (기존 종목, 새 종목, 새 세트, 새 최소, 새 최대, 기존 세트, 기존 최소, 기존 최대)
SWAPS = [
    ("싱글 레그프레스", "레그 익스텐션", 3, 10, 12, 2, 10, 10),
    ("랫풀다운 언더그립", NARROW, 3, 10, 12, 3, 10, 12),
]


def _scalar(conn, sql: str, **params):
    return conn.execute(sa.text(sql), params).scalar()


def _ex(conn, name: str):
    return _scalar(conn, "SELECT id FROM exercises WHERE name = :n", n=name)


def upgrade() -> None:
    conn = op.get_bind()
    routine_b = _scalar(conn, "SELECT id FROM routines WHERE name = :n", n="전신 B")
    if routine_b is None:
        return  # 빈 DB: 시드가 처리

    if _ex(conn, NARROW) is None:
        conn.execute(
            sa.text(
                "INSERT INTO exercises (name, category, equipment, increment_kg, unilateral, setup_note, cue) "
                "VALUES (:n, 'strength', 'pin', 5, :uni, '랫풀다운과 같은 기계, 좁은 손잡이', :cue)"
            ),
            {"n": NARROW, "uni": False, "cue": NARROW_CUE},
        )

    for old, new, sets, rmin, rmax, *_ in SWAPS:
        conn.execute(
            sa.text(
                "UPDATE routine_items SET exercise_id = :new, sets = :s, rep_min = :mn, rep_max = :mx "
                "WHERE routine_id = :r AND exercise_id = :old"
            ),
            {"new": _ex(conn, new), "old": _ex(conn, old), "s": sets, "mn": rmin, "mx": rmax, "r": routine_b},
        )


def downgrade() -> None:
    conn = op.get_bind()
    routine_b = _scalar(conn, "SELECT id FROM routines WHERE name = :n", n="전신 B")
    if routine_b is None:
        return
    for old, new, _s, _mn, _mx, sets, rmin, rmax in SWAPS:
        conn.execute(
            sa.text(
                "UPDATE routine_items SET exercise_id = :old, sets = :s, rep_min = :mn, rep_max = :mx "
                "WHERE routine_id = :r AND exercise_id = :new"
            ),
            {"new": _ex(conn, new), "old": _ex(conn, old), "s": sets, "mn": rmin, "mx": rmax, "r": routine_b},
        )
