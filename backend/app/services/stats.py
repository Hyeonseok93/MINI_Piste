"""분석용 집계: 근육별 세트 수, 개인 기록(PR), 좌우 균형."""

from collections import defaultdict
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Exercise, ExerciseMuscle, SetKind, SetLog, Side, Workout
from app.muscles import MUSCLE_INFO, ROLE_WEIGHT, WEEKLY_TARGET_SETS, MuscleRole
from app.schemas import BalanceRow, MuscleVolume, PersonalRecord, SideStats

# 기록으로 치는 세트 (워밍업 제외)
COUNTED = (SetKind.work, SetKind.weight_find)


def epley_1rm(weight: float, reps: int) -> float:
    """Epley 추정 1RM. 1회면 그 무게 그대로."""
    return weight if reps <= 1 else round(weight * (1 + reps / 30), 1)


def muscle_volume(db: Session, start: date, end: date) -> list[MuscleVolume]:
    """기간 동안 근육별 세트 수. 주동근은 1세트, 보조근은 0.5세트로 센다.

    한쪽씩 하는 종목은 왼쪽·오른쪽을 각각 1세트로 센다(그 쪽 근육이 실제로 한 세트).
    """
    rows = db.execute(
        select(ExerciseMuscle.muscle, ExerciseMuscle.role)
        .join(SetLog, SetLog.exercise_id == ExerciseMuscle.exercise_id)
        .join(Workout, Workout.id == SetLog.workout_id)
        .where(Workout.date.between(start, end), SetLog.kind.in_(COUNTED))
    ).all()
    primary: dict = defaultdict(int)
    secondary: dict = defaultdict(int)
    for muscle, role in rows:
        (primary if role == MuscleRole.primary else secondary)[muscle] += 1

    days = (end - start).days + 1
    target = max(1, round(WEEKLY_TARGET_SETS * days / 7))
    return [
        MuscleVolume(
            muscle=m,
            label=label,
            side=side,
            sets=primary[m] * ROLE_WEIGHT[MuscleRole.primary] + secondary[m] * ROLE_WEIGHT[MuscleRole.secondary],
            primary_sets=primary[m],
            secondary_sets=secondary[m],
            target_sets=target,
        )
        for m, (label, side) in MUSCLE_INFO.items()
    ]


def personal_records(db: Session) -> list[PersonalRecord]:
    """종목별 최고 무게와 추정 1RM. 횟수 기록이 있는 무게 세트만 (시간 종목·맨몸 제외)."""
    rows = db.execute(
        select(Exercise.id, Exercise.name, Workout.date, SetLog.weight_kg, SetLog.reps)
        .join(SetLog, SetLog.exercise_id == Exercise.id)
        .join(Workout, Workout.id == SetLog.workout_id)
        .where(SetLog.kind.in_(COUNTED), SetLog.reps.is_not(None), SetLog.weight_kg > 0)
        .order_by(Workout.date, SetLog.id)
    ).all()

    best: dict[int, PersonalRecord] = {}
    for ex_id, name, d, w, reps in rows:
        if reps is None:  # 쿼리에서 걸렀지만 타입을 좁히기 위해
            continue
        e1 = epley_1rm(w, reps)
        cur = best.get(ex_id)
        if cur is None:
            best[ex_id] = PersonalRecord(
                exercise_id=ex_id,
                name=name,
                best_weight_kg=w,
                best_weight_reps=reps,
                best_weight_date=d,
                e1rm_kg=e1,
                e1rm_date=d,
            )
            continue
        # 같은 무게면 더 많은 횟수를 기록으로 친다 (날짜순이라 처음 달성일이 남는다)
        if w > cur.best_weight_kg or (w == cur.best_weight_kg and reps > cur.best_weight_reps):
            cur.best_weight_kg, cur.best_weight_reps, cur.best_weight_date = w, reps, d
        if e1 > cur.e1rm_kg:
            cur.e1rm_kg, cur.e1rm_date = e1, d
    return sorted(best.values(), key=lambda r: r.exercise_id)


def side_balance(db: Session, start: date, end: date) -> list[BalanceRow]:
    """한쪽씩 하는 종목의 좌우 비교 (펜싱 출신이라 플랜에서 강조한 항목)."""
    rows = db.execute(
        select(Exercise.id, Exercise.name, SetLog.side, SetLog.weight_kg, SetLog.reps)
        .join(SetLog, SetLog.exercise_id == Exercise.id)
        .join(Workout, Workout.id == SetLog.workout_id)
        .where(
            Workout.date.between(start, end),
            SetLog.kind.in_(COUNTED),
            SetLog.side.is_not(None),
            SetLog.reps.is_not(None),
        )
    ).all()

    agg: dict[int, dict] = {}
    for ex_id, name, side, w, reps in rows:
        e = agg.setdefault(ex_id, {"name": name, Side.left: [], Side.right: []})
        e[side].append((w, reps))

    def stats(sets: list[tuple[float, int]]) -> SideStats:
        return SideStats(
            top_weight_kg=max((w for w, _ in sets), default=None),
            total_reps=sum(r for _, r in sets),
            sets=len(sets),
        )

    out = []
    for ex_id, e in sorted(agg.items()):
        left, right = stats(e[Side.left]), stats(e[Side.right])
        weaker, diff = None, None
        if left.top_weight_kg is not None and right.top_weight_kg is not None:
            lk = (left.top_weight_kg, left.total_reps)
            rk = (right.top_weight_kg, right.total_reps)
            if lk != rk:
                weaker = "L" if lk < rk else "R"
                weak_w, strong_w = sorted([left.top_weight_kg, right.top_weight_kg])
                diff = round((strong_w - weak_w) / weak_w * 100, 1) if weak_w else None
        out.append(BalanceRow(exercise_id=ex_id, name=e["name"], left=left, right=right, weaker=weaker, diff_pct=diff))
    return out
