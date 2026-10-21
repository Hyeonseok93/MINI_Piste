"""루틴의 하이로우를 랫풀다운 언더그립으로 교체

같은 자리(세트·횟수 유지)에서 종목만 바꾼다. 하이로우 종목과 과거 기록은 남긴다.
빈 DB(첫 실행)에서는 아무것도 하지 않고, 이후 app.seed 가 같은 구성을 넣는다.

Revision ID: f6b8c0d2e4a5
Revises: e5a7b9c1d2f3
Create Date: 2026-10-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f6b8c0d2e4a5"
down_revision: str | None = "e5a7b9c1d2f3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

HIGH_ROW = "하이로우"
UNDER = "랫풀다운 언더그립"
UNDER_CUE = "랫풀다운 기계에서 손바닥이 나를 보게 잡는다. 팔꿈치를 옆구리로 끌어내리고 가슴을 바 쪽으로 편다"


def _id(conn, name: str):
    return conn.execute(sa.text("SELECT id FROM exercises WHERE name = :n"), {"n": name}).scalar()


def upgrade() -> None:
    conn = op.get_bind()
    high_row = _id(conn, HIGH_ROW)
    if high_row is None:
        return  # 빈 DB: 시드가 처리

    if _id(conn, UNDER) is None:
        conn.execute(
            sa.text(
                "INSERT INTO exercises (name, category, equipment, increment_kg, unilateral, setup_note, cue) "
                "VALUES (:n, 'strength', 'pin', 5, :uni, '랫풀다운과 같은 기계', :cue)"
            ),
            {"n": UNDER, "uni": False, "cue": UNDER_CUE},
        )
    conn.execute(
        sa.text("UPDATE routine_items SET exercise_id = :new WHERE exercise_id = :old"),
        {"new": _id(conn, UNDER), "old": high_row},
    )


def downgrade() -> None:
    conn = op.get_bind()
    high_row, under = _id(conn, HIGH_ROW), _id(conn, UNDER)
    if high_row is None or under is None:
        return
    routine_b = conn.execute(sa.text("SELECT id FROM routines WHERE name = '전신 B'")).scalar()
    conn.execute(
        sa.text("UPDATE routine_items SET exercise_id = :old WHERE exercise_id = :new AND routine_id = :r"),
        {"old": high_row, "new": under, "r": routine_b},
    )
