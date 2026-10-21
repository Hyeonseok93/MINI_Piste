"""전신 A에 바벨 숄더프레스·바이셉 컬 머신 추가 (3세트 × 12회)

이미 시드가 들어간 DB를 위한 데이터 마이그레이션. 빈 DB(첫 실행)에서는 아무것도 하지 않고,
이후 app.seed 가 같은 구성을 넣는다.

Revision ID: c3f1a2b4d5e6
Revises: 8a8dffbeef6d
Create Date: 2026-10-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c3f1a2b4d5e6"
down_revision: str | None = "8a8dffbeef6d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SHOULDER = "바벨 숄더프레스"
CURL = "바이셉 컬 머신"
PLANK = "플랭크"


def _id(conn, sql: str, **params):
    return conn.execute(sa.text(sql), params).scalar()


def upgrade() -> None:
    conn = op.get_bind()
    routine_id = _id(conn, "SELECT id FROM routines WHERE name = :n", n="전신 A")
    if routine_id is None:
        return  # 빈 DB: 시드가 처리

    if _id(conn, "SELECT id FROM exercises WHERE name = :n", n=SHOULDER) is None:
        conn.execute(
            sa.text(
                "INSERT INTO exercises (name, category, equipment, increment_kg, unilateral, alternative, cue) "
                "VALUES (:name, 'strength', 'barbell', 2.5, :uni, '숄더프레스 머신', :cue)"
            ),
            {"name": SHOULDER, "uni": False, "cue": "바는 쇄골 위에서 출발, 팔꿈치를 살짝 앞으로. 허리를 뒤로 꺾지 않는다"},
        )

    shoulder_id = _id(conn, "SELECT id FROM exercises WHERE name = :n", n=SHOULDER)
    curl_id = _id(conn, "SELECT id FROM exercises WHERE name = :n", n=CURL)
    plank_id = _id(conn, "SELECT id FROM exercises WHERE name = :n", n=PLANK)

    existing = {
        row[0]
        for row in conn.execute(sa.text("SELECT exercise_id FROM routine_items WHERE routine_id = :r"), {"r": routine_id})
    }
    plank_pos = _id(
        conn, "SELECT position FROM routine_items WHERE routine_id = :r AND exercise_id = :e", r=routine_id, e=plank_id
    )
    pos = plank_pos if plank_pos is not None else (_id(conn, "SELECT MAX(position) FROM routine_items WHERE routine_id = :r", r=routine_id) or 0) + 1

    for ex_id in (shoulder_id, curl_id):
        if ex_id in existing:
            continue
        conn.execute(
            sa.text(
                "INSERT INTO routine_items (routine_id, exercise_id, position, sets, rep_min, rep_max) "
                "VALUES (:r, :e, :p, 3, 12, 12)"
            ),
            {"r": routine_id, "e": ex_id, "p": pos},
        )
        pos += 1

    if plank_pos is not None:
        conn.execute(
            sa.text("UPDATE routine_items SET position = :p WHERE routine_id = :r AND exercise_id = :e"),
            {"p": pos, "r": routine_id, "e": plank_id},
        )


def downgrade() -> None:
    conn = op.get_bind()
    routine_id = _id(conn, "SELECT id FROM routines WHERE name = :n", n="전신 A")
    if routine_id is None:
        return
    for name in (SHOULDER, CURL):
        ex_id = _id(conn, "SELECT id FROM exercises WHERE name = :n", n=name)
        conn.execute(
            sa.text("DELETE FROM routine_items WHERE routine_id = :r AND exercise_id = :e"), {"r": routine_id, "e": ex_id}
        )
    plank_id = _id(conn, "SELECT id FROM exercises WHERE name = :n", n=PLANK)
    top = _id(conn, "SELECT MAX(position) FROM routine_items WHERE routine_id = :r AND exercise_id <> :e", r=routine_id, e=plank_id) or 0
    conn.execute(
        sa.text("UPDATE routine_items SET position = :p WHERE routine_id = :r AND exercise_id = :e"),
        {"p": top + 1, "r": routine_id, "e": plank_id},
    )
