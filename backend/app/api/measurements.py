from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import BodyMeasurement, DailyLog
from app.schemas import MeasurementIn, MeasurementOut

router = APIRouter(prefix="/measurements", tags=["measurements"])


def _with_weight(db: Session, m: BodyMeasurement) -> MeasurementOut:
    """플랜 규칙: 체중은 하루 값이 아니라 마지막 7일 평균으로 본다."""
    avg, n = db.execute(
        select(func.avg(DailyLog.body_weight_kg), func.count(DailyLog.body_weight_kg)).where(
            DailyLog.date.between(m.date - timedelta(days=6), m.date)
        )
    ).one()
    out = MeasurementOut.model_validate(m)
    out.weight_avg_7d = round(float(avg), 2) if avg is not None else None
    out.weight_days = n
    return out


@router.get("", response_model=list[MeasurementOut])
def list_measurements(
    from_: date | None = Query(default=None, alias="from"), to: date | None = None, db: Session = Depends(get_db)
):
    q = select(BodyMeasurement).order_by(BodyMeasurement.date)
    if from_:
        q = q.where(BodyMeasurement.date >= from_)
    if to:
        q = q.where(BodyMeasurement.date <= to)
    return [_with_weight(db, m) for m in db.scalars(q)]


@router.put("/{day}", response_model=MeasurementOut)
def save_measurement(day: date, body: MeasurementIn, db: Session = Depends(get_db)):
    m = db.scalar(select(BodyMeasurement).where(BodyMeasurement.date == day)) or BodyMeasurement(date=day)
    for k, v in body.model_dump().items():
        setattr(m, k, v)
    db.add(m)
    db.commit()
    return _with_weight(db, m)


@router.delete("/{day}", status_code=204)
def delete_measurement(day: date, db: Session = Depends(get_db)):
    m = db.scalar(select(BodyMeasurement).where(BodyMeasurement.date == day))
    if m is None:
        raise HTTPException(404, "그날 측정 기록이 없습니다")
    db.delete(m)
    db.commit()
    return Response(status_code=204)
