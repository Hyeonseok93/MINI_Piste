from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Equipment, Exercise, RoutineItem, SetKind, SetLog, Workout
from app.services.progression import Action, LoggedSet, Recommendation, recommend_next

DEFAULT_REP_MIN = 10
DEFAULT_REP_MAX = 12


def last_session_sets(db: Session, exercise_id: int, before: date) -> tuple[date | None, list[SetLog]]:
    """before 날짜 '이전' 세션 중 그 종목을 한 가장 최근 세션의 세트들.

    오늘 기록 중에도 추천이 흔들리지 않도록 당일은 제외한다.
    """
    last = db.execute(
        select(Workout.id, Workout.date)
        .join(SetLog, SetLog.workout_id == Workout.id)
        .where(SetLog.exercise_id == exercise_id, Workout.date < before)
        .order_by(Workout.date.desc(), Workout.id.desc())
        .limit(1)
    ).first()
    if last is None:
        return None, []
    sets = list(
        db.scalars(
            select(SetLog)
            .where(SetLog.workout_id == last.id, SetLog.exercise_id == exercise_id)
            .order_by(SetLog.set_no, SetLog.id)
        )
    )
    return last.date, sets


def recommend_for(
    db: Session, exercise: Exercise, before: date, item: RoutineItem | None = None
) -> tuple[date | None, list[SetLog], Recommendation]:
    last_date, sets = last_session_sets(db, exercise.id, before)
    if item is not None and item.duration_sec:
        return last_date, sets, Recommendation(Action.unknown, None, None, "시간 종목은 무게 추천 없음")
    rec = recommend_next(
        [LoggedSet(s.weight_kg, s.reps or 0, s.kind.value, s.side.value if s.side else None) for s in sets],
        planned_sets=item.sets if item else 3,
        rep_min=(item.rep_min if item and item.rep_min else DEFAULT_REP_MIN),
        rep_max=(item.rep_max if item and item.rep_max else DEFAULT_REP_MAX),
        increment_kg=exercise.increment_kg,
        assisted=exercise.equipment == Equipment.assisted,
    )
    return last_date, sets, rec


def exercise_history(db: Session, exercise_id: int) -> list[dict]:
    """세션별 최고 무게·총 볼륨 (본세트·무게찾기 세트만)."""
    rows = db.execute(
        select(
            Workout.date,
            func.max(SetLog.weight_kg),
            func.sum(SetLog.weight_kg * SetLog.reps),
            func.count(SetLog.id),
        )
        .join(SetLog, SetLog.workout_id == Workout.id)
        .where(SetLog.exercise_id == exercise_id, SetLog.kind != SetKind.warmup)
        .group_by(Workout.date)
        .order_by(Workout.date)
    ).all()
    return [{"date": d, "top_weight_kg": top, "volume_kg": float(vol or 0), "sets": n} for d, top, vol, n in rows]
