from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Phase, PhaseDay, Routine


@dataclass
class DayPlan:
    date: date
    phase: Phase | None
    day: PhaseDay | None
    routine: Routine | None
    week_index: int | None  # phase 시작 기준 0부터


def pick_routine(day: PhaseDay, week_index: int) -> Routine | None:
    """홀수 주에는 대체 루틴 사용 (예: B-A-B ↔ A-B-A 교대)."""
    if week_index % 2 == 1 and day.alt_routine is not None:
        return day.alt_routine
    return day.routine


def find_phase(phases: list[Phase], d: date) -> Phase | None:
    for p in phases:
        if p.start_date <= d and (p.end_date is None or d <= p.end_date):
            return p
    return None


def load_phases(db: Session) -> list[Phase]:
    return list(
        db.scalars(
            select(Phase)
            .options(selectinload(Phase.days).selectinload(PhaseDay.routine))
            .options(selectinload(Phase.days).selectinload(PhaseDay.alt_routine))
            .order_by(Phase.start_date)
        )
    )


def plan_with(phases: list[Phase], d: date) -> DayPlan:
    phase = find_phase(phases, d)
    if phase is None:
        return DayPlan(d, None, None, None, None)
    week_index = (d - phase.start_date).days // 7
    day = next((x for x in phase.days if x.weekday == d.weekday()), None)
    routine = pick_routine(day, week_index) if day else None
    return DayPlan(d, phase, day, routine, week_index)


def plan_for(db: Session, d: date) -> DayPlan:
    return plan_with(load_phases(db), d)


def plan_range(db: Session, start: date, end: date) -> list[DayPlan]:
    """start~end(포함) 날짜별 계획. phase는 한 번만 읽는다."""
    phases = load_phases(db)
    return [plan_with(phases, start + timedelta(days=i)) for i in range((end - start).days + 1)]
