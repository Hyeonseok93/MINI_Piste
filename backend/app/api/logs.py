from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import DailyLog
from app.schemas import DailyLogIn, DailyLogOut, FinderIn, FinderOut
from app.services.progression import FINDER_STEPS, FINDER_TEXT, weight_finder

router = APIRouter(tags=["logs"])


@router.get("/daily-logs", response_model=list[DailyLogOut])
def list_daily_logs(from_: date | None = Query(default=None, alias="from"), to: date | None = None, db: Session = Depends(get_db)):
    q = select(DailyLog).order_by(DailyLog.date)
    if from_:
        q = q.where(DailyLog.date >= from_)
    if to:
        q = q.where(DailyLog.date <= to)
    return db.scalars(q).all()


@router.put("/daily-logs/{day}", response_model=DailyLogOut)
def upsert_daily_log(day: date, body: DailyLogIn, db: Session = Depends(get_db)):
    log = db.get(DailyLog, day) or DailyLog(date=day)
    for k, v in body.model_dump().items():
        setattr(log, k, v)
    db.add(log)
    db.commit()
    return log


@router.post("/tools/weight-finder", response_model=FinderOut)
def finder(body: FinderIn):
    if body.completed and body.rir is None:
        raise HTTPException(422, "12회를 채웠다면 '몇 개 더 가능했는지(rir)'를 입력하세요")
    verdict = weight_finder(completed=body.completed, rir=body.rir)
    steps = FINDER_STEPS[verdict]
    next_w = None
    if body.weight_kg is not None and body.increment_kg is not None:
        next_w = max(body.weight_kg + steps * body.increment_kg, 0)
    return FinderOut(verdict=verdict, steps=steps, message=FINDER_TEXT[verdict], next_weight_kg=next_w)
