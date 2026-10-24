from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.plan import to_day_plan_out
from app.db import get_db
from app.models import DailyLog, Routine, RoutineItem, Workout
from app.schemas import (
    DailyLogOut,
    LastSession,
    RecommendationOut,
    RoutineItemOut,
    SetOut,
    TodayItem,
    TodayOut,
    WorkoutOut,
)
from app.services.history import recommend_for
from app.services.planner import plan_for

router = APIRouter(tags=["today"])


@router.get("/today", response_model=TodayOut)
def today(date: date, db: Session = Depends(get_db)):
    """그날 계획 + 종목별 지난 기록·추천 무게 + 이미 시작한 세션 + 일일 기록."""
    plan = plan_for(db, date)

    workout = db.scalar(
        select(Workout).where(Workout.date == date).options(selectinload(Workout.sets)).order_by(Workout.id).limit(1)
    )
    # 이미 다른 루틴으로 시작했다면 그 루틴을 기준으로 보여준다
    routine_id = workout.routine_id if workout and workout.routine_id else (plan.routine.id if plan.routine else None)

    items: list[TodayItem] = []
    if routine_id is not None:
        routine = db.scalar(
            select(Routine)
            .where(Routine.id == routine_id)
            .options(selectinload(Routine.items).selectinload(RoutineItem.exercise))
        )
        for it in routine.items if routine else []:
            last_date, sets, rec = recommend_for(db, it.exercise, date, it)
            items.append(
                TodayItem(
                    item=RoutineItemOut.model_validate(it),
                    last=LastSession(date=last_date, sets=[SetOut.model_validate(s) for s in sets])
                    if last_date
                    else None,
                    recommendation=RecommendationOut(**rec.__dict__),
                )
            )

    log = db.get(DailyLog, date)
    return TodayOut(
        plan=to_day_plan_out(plan),
        items=items,
        workout=WorkoutOut.model_validate(workout) if workout else None,
        daily_log=DailyLogOut.model_validate(log) if log else None,
    )
