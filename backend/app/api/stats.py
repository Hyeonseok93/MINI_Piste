from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import BalanceRow, MuscleVolume, PersonalRecord
from app.services.stats import muscle_volume, personal_records, side_balance

router = APIRouter(prefix="/stats", tags=["stats"])


def _range(from_: date | None, to: date | None, default_days: int) -> tuple[date, date]:
    end = to or date.today()
    start = from_ or end - timedelta(days=default_days - 1)
    if start > end:
        raise HTTPException(422, "from 이 to 보다 늦을 수 없습니다")
    if (end - start).days > 366:
        raise HTTPException(422, "기간은 1년 이내로 정하세요")
    return start, end


@router.get("/muscles", response_model=list[MuscleVolume])
def muscles(
    from_: date | None = Query(default=None, alias="from"), to: date | None = None, db: Session = Depends(get_db)
):
    """근육별 세트 수 (기본: 오늘까지 7일). 3D 몸 모델의 색칠 기준."""
    return muscle_volume(db, *_range(from_, to, 7))


@router.get("/prs", response_model=list[PersonalRecord])
def prs(db: Session = Depends(get_db)):
    """종목별 최고 무게와 추정 1RM."""
    return personal_records(db)


@router.get("/balance", response_model=list[BalanceRow])
def balance(
    from_: date | None = Query(default=None, alias="from"), to: date | None = None, db: Session = Depends(get_db)
):
    """한쪽씩 하는 종목의 좌우 비교 (기본: 오늘까지 28일)."""
    return side_balance(db, *_range(from_, to, 28))
