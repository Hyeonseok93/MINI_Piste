"""달력·대시보드 집계. 날짜별 '계획 + 실제 기록'을 한 번에 만든다."""

from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import DailyLog, DayKind, Profile, SetLog, Workout
from app.schemas import (
    CalendarDay,
    DashboardOut,
    DashboardStats,
    PhaseSpan,
    ProfileOut,
    RoutineSummary,
)
from app.services.planner import load_phases, plan_range


def is_planned_training(d: CalendarDay) -> bool:
    """출석·연속 계산에 들어가는 운동일: 계획된 운동일이고 직접 쉬기로 하지 않은 날."""
    return d.kind not in (None, DayKind.rest) and not d.rest_day


def calendar_days(db: Session, start: date, end: date) -> list[CalendarDay]:
    plans = plan_range(db, start, end)

    rows = db.execute(
        select(Workout.id, Workout.date, Workout.title, Workout.cardio_minutes, func.count(SetLog.id))
        .outerjoin(SetLog, SetLog.workout_id == Workout.id)
        .where(Workout.date.between(start, end))
        .group_by(Workout.id)
        .order_by(Workout.id)
    ).all()
    workouts: dict[date, tuple] = {}
    for wid, d, title, cardio, n in rows:
        workouts.setdefault(d, (wid, title, cardio, n))  # 하루 여러 개면 첫 세션 기준

    logs = {
        d: (w, rest)
        for d, w, rest in db.execute(
            select(DailyLog.date, DailyLog.body_weight_kg, DailyLog.rest_day).where(DailyLog.date.between(start, end))
        ).all()
    }

    out = []
    for p in plans:
        w = workouts.get(p.date)
        out.append(
            CalendarDay(
                date=p.date,
                phase=p.phase.name if p.phase else None,
                week_index=p.week_index,
                kind=p.day.kind if p.day else None,
                label=p.day.label if p.day else None,
                cardio_minutes=p.day.cardio_minutes if p.day else None,
                routine=RoutineSummary.model_validate(p.routine) if p.routine else None,
                workout_id=w[0] if w else None,
                done=w is not None,
                workout_title=w[1] if w else None,
                cardio_minutes_done=w[2] if w else None,
                set_count=w[3] if w else 0,
                body_weight_kg=logs.get(p.date, (None, False))[0],
                rest_day=bool(logs.get(p.date, (None, False))[1]),
            )
        )
    return out


def compute_streak(days: list[CalendarDay], today: date) -> int:
    """오늘부터 거꾸로, 계획된 운동일을 연속으로 해낸 횟수.

    휴식일·계획 밖 날짜는 건너뛰고, 오늘은 아직 안 했어도 끊지 않는다.
    """
    streak = 0
    for d in sorted(days, key=lambda x: x.date, reverse=True):
        if d.date > today or not (d.done or is_planned_training(d)):
            continue
        if d.done:
            streak += 1
        elif d.date == today:
            continue
        else:
            break
    return streak


def attendance(days: list[CalendarDay], today: date) -> float | None:
    """지난 운동일 중 해낸 비율 (오늘은 했을 때만 포함)."""
    planned = [d for d in days if is_planned_training(d) and (d.date < today or d.done)]
    if not planned:
        return None
    return round(sum(d.done for d in planned) / len(planned), 3)


def dashboard(db: Session, today: date) -> DashboardOut:
    phases = load_phases(db)
    plan_start = phases[0].start_date if phases else None
    plan_end = phases[-1].end_date if phases else None

    monday = today - timedelta(days=today.weekday())
    lookback = today - timedelta(days=90)
    span = calendar_days(db, min(lookback, monday), max(today + timedelta(days=21), monday + timedelta(days=6)))
    by_date = {d.date: d for d in span}

    week = [by_date[monday + timedelta(days=i)] for i in range(7)]
    upcoming = [d for d in span if d.date > today and is_planned_training(d)][:3]
    past = [d for d in span if d.date <= today]
    last_28 = [d for d in past if d.date > today - timedelta(days=28)]

    profile = db.get(Profile, 1)
    latest = db.execute(
        select(DailyLog.body_weight_kg)
        .where(DailyLog.body_weight_kg.is_not(None), DailyLog.date <= today)
        .order_by(DailyLog.date.desc())
        .limit(1)
    ).scalar()

    week_planned = [d for d in week if is_planned_training(d) or d.done]
    stats = DashboardStats(
        plan_start=plan_start,
        plan_end=plan_end,
        day_number=(today - plan_start).days + 1 if plan_start and today >= plan_start else None,
        total_workouts=db.scalar(select(func.count(Workout.id)).where(Workout.date <= today)) or 0,
        week_done=sum(d.done for d in week_planned),
        week_planned=len(week_planned),
        attendance_28d=attendance(last_28, today),
        streak=compute_streak(past, today),
        latest_weight_kg=latest,
        start_weight_kg=profile.start_weight_kg if profile else None,
        goal_weight_kg=profile.goal_weight_kg if profile else None,
    )
    return DashboardOut(
        profile=ProfileOut.model_validate(profile) if profile else None,
        today=by_date[today],
        week=week,
        upcoming=upcoming,
        phases=[PhaseSpan(name=p.name, start_date=p.start_date, end_date=p.end_date) for p in phases],
        stats=stats,
    )
