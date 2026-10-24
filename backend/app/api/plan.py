from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.models import Phase, PhaseDay, Routine, RoutineItem
from app.schemas import DayPlanOut, PhaseOut, RoutineOut, RoutineSummary
from app.services.planner import DayPlan

router = APIRouter(tags=["plan"])


def to_day_plan_out(p: DayPlan) -> DayPlanOut:
    return DayPlanOut(
        date=p.date,
        phase=p.phase.name if p.phase else None,
        week_index=p.week_index,
        kind=p.day.kind if p.day else None,
        label=p.day.label if p.day else None,
        cardio_minutes=p.day.cardio_minutes if p.day else None,
        routine=RoutineSummary.model_validate(p.routine) if p.routine else None,
    )


@router.get("/phases", response_model=list[PhaseOut])
def list_phases(db: Session = Depends(get_db)):
    return db.scalars(
        select(Phase)
        .options(selectinload(Phase.days).selectinload(PhaseDay.routine))
        .options(selectinload(Phase.days).selectinload(PhaseDay.alt_routine))
        .order_by(Phase.start_date)
    ).all()


@router.get("/routines", response_model=list[RoutineSummary])
def list_routines(db: Session = Depends(get_db)):
    return db.scalars(select(Routine).order_by(Routine.id)).all()


@router.get("/routines/{routine_id}", response_model=RoutineOut)
def read_routine(routine_id: int, db: Session = Depends(get_db)):
    r = db.scalar(
        select(Routine)
        .where(Routine.id == routine_id)
        .options(selectinload(Routine.items).selectinload(RoutineItem.exercise))
    )
    if r is None:
        raise HTTPException(404, "루틴을 찾을 수 없습니다")
    return r
