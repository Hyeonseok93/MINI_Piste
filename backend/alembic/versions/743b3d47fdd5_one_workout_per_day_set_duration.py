"""하루 운동 세션 1개 제약 + 시간 종목 duration_sec 분리

Revision ID: 743b3d47fdd5
Revises: 29bb37a86784
Create Date: 2026-10-24 13:00:32.331660

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '743b3d47fdd5'
down_revision: str | Sequence[str] | None = '29bb37a86784'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    dup = conn.execute(sa.text("SELECT date FROM workouts GROUP BY date HAVING COUNT(*) > 1")).fetchall()
    if dup:
        raise RuntimeError(f"같은 날짜 세션이 여러 개라 제약을 걸 수 없습니다: {[str(d[0]) for d in dup]}")

    with op.batch_alter_table("set_logs", schema=None) as batch_op:
        batch_op.add_column(sa.Column("duration_sec", sa.Integer(), nullable=True))
        batch_op.alter_column("reps", existing_type=sa.INTEGER(), nullable=True)

    # 지금까지 시간 종목(루틴에 duration_sec 이 있는 종목)은 reps 칸에 초를 넣었다 → 옮긴다
    conn.execute(
        sa.text(
            "UPDATE set_logs SET duration_sec = reps, reps = NULL "
            "WHERE exercise_id IN (SELECT DISTINCT exercise_id FROM routine_items WHERE duration_sec IS NOT NULL)"
        )
    )

    with op.batch_alter_table("workouts", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_workouts_date"))
        batch_op.create_unique_constraint("uq_workouts_date", ["date"])


def downgrade() -> None:
    with op.batch_alter_table("workouts", schema=None) as batch_op:
        batch_op.drop_constraint("uq_workouts_date", type_="unique")
        batch_op.create_index(batch_op.f("ix_workouts_date"), ["date"], unique=False)

    op.get_bind().execute(sa.text("UPDATE set_logs SET reps = duration_sec WHERE reps IS NULL"))
    with op.batch_alter_table("set_logs", schema=None) as batch_op:
        batch_op.alter_column("reps", existing_type=sa.INTEGER(), nullable=False)
        batch_op.drop_column("duration_sec")
