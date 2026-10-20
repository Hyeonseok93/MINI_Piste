import calendar as pycal
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Profile
from app.schemas import CalendarDay, DashboardOut, ProfileIn, ProfileOut
from app.services.calendar import calendar_days, dashboard

router = APIRouter(tags=["home"])


@router.get("/profile", response_model=ProfileOut)
def read_profile(db: Session = Depends(get_db)):
    p = db.get(Profile, 1)
    if p is None:
        raise HTTPException(404, "프로필이 없습니다")
    return p


@router.put("/profile", response_model=ProfileOut)
def save_profile(body: ProfileIn, db: Session = Depends(get_db)):
    p = db.get(Profile, 1) or Profile(id=1)
    data = body.model_dump()
    data["name"] = data["name"].strip()
    if not data["name"]:
        raise HTTPException(422, "이름을 입력하세요")
    for k, v in data.items():
        setattr(p, k, v)
    db.add(p)
    db.commit()
    return p


@router.get("/calendar", response_model=list[CalendarDay])
def month_calendar(month: str = Query(pattern=r"^\d{4}-\d{2}$"), db: Session = Depends(get_db)):
    y, m = map(int, month.split("-"))
    if not 1 <= m <= 12:
        raise HTTPException(422, "month 는 YYYY-MM 형식이어야 합니다")
    last = pycal.monthrange(y, m)[1]
    return calendar_days(db, date(y, m, 1), date(y, m, last))


@router.get("/dashboard", response_model=DashboardOut)
def read_dashboard(date: date, db: Session = Depends(get_db)):
    return dashboard(db, date)
