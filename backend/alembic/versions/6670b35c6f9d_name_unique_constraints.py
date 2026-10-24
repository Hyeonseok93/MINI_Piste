"""처음에 이름 없이 만든 UNIQUE 제약에 규칙대로 이름 붙이기

app.db.NAMING 을 도입하면서 모델과 DB 의 제약 이름을 맞춘다 (alembic check 통과용).
Postgres 는 RENAME, SQLite 는 테이블을 다시 만들어 이름을 붙인다.

Revision ID: 6670b35c6f9d
Revises: 743b3d47fdd5
Create Date: 2026-10-24 13:01:37.481723

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6670b35c6f9d'
down_revision: str | Sequence[str] | None = '743b3d47fdd5'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


from app.db import NAMING  # noqa: E402

# (테이블, 컬럼들, 새 이름, Postgres 가 자동으로 붙였던 이름)
TARGETS = [
    ("exercises", ["name"], "uq_exercises_name", "exercises_name_key"),
    ("routines", ["name"], "uq_routines_name", "routines_name_key"),
    ("phase_days", ["phase_id", "weekday"], "uq_phase_days_phase_id", "phase_days_phase_id_weekday_key"),
]


def _rename_pg(old_new: list[tuple[str, str, str]]) -> None:
    conn = op.get_bind()
    for table, old, new in old_new:
        exists = conn.execute(
            sa.text("SELECT 1 FROM pg_constraint WHERE conname = :n"), {"n": old}
        ).scalar()
        if exists:
            op.execute(f'ALTER TABLE {table} RENAME CONSTRAINT "{old}" TO "{new}"')


def upgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        _rename_pg([(t, pg, new) for t, _cols, new, pg in TARGETS])
        return
    # SQLite: 이름 없는 제약은 직접 지울 수 없으므로, 규칙을 주고 테이블을 다시 만든다
    for table, _cols, _new, _pg in TARGETS:
        with op.batch_alter_table(table, recreate="always", naming_convention=NAMING):
            pass


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        _rename_pg([(t, new, pg) for t, _cols, new, pg in TARGETS])
    # SQLite: 이름이 붙은 상태로 두어도 동작에는 차이가 없다
