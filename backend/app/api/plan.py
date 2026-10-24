from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.models import DayKind, Exercise, Phase, PhaseDay, Routine, RoutineItem, Workout
from app.schemas import (
    DayPlanOut,
    PhaseDayIn,
    PhaseOut,
    PhaseUpdate,
    RoutineCreate,
    RoutineItemIn,
    RoutineOut,
    RoutineSummary,
    RoutineUpdate,
)
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


# --- 루틴 편집 ---------------------------------------------------------------
def _load_routine(db: Session, routine_id: int) -> Routine:
    r = db.scalar(
        select(Routine)
        .where(Routine.id == routine_id)
        .options(selectinload(Routine.items).selectinload(RoutineItem.exercise))
    )
    if r is None:
        raise HTTPException(404, "루틴을 찾을 수 없습니다")
    return r


def _check_name_free(db: Session, name: str, exclude_id: int | None = None) -> str:
    name = name.strip()
    q = select(Routine.id).where(Routine.name == name)
    if exclude_id is not None:
        q = q.where(Routine.id != exclude_id)
    if db.scalar(q) is not None:
        raise HTTPException(409, f"'{name}' 루틴이 이미 있습니다")
    return name


def _replace_items(db: Session, routine: Routine, items: list[RoutineItemIn]) -> None:
    ids = {i.exercise_id for i in items}
    found = set(db.scalars(select(Exercise.id).where(Exercise.id.in_(ids)))) if ids else set()
    if missing := ids - found:
        raise HTTPException(422, f"존재하지 않는 종목: {sorted(missing)}")
    routine.items.clear()
    db.flush()  # 기존 항목을 먼저 지워야 같은 종목을 다시 넣을 수 있다
    for pos, it in enumerate(items, start=1):
        routine.items.append(RoutineItem(position=pos, **it.model_dump()))


@router.post("/routines", response_model=RoutineOut, status_code=201)
def create_routine(body: RoutineCreate, db: Session = Depends(get_db)):
    r = Routine(name=_check_name_free(db, body.name), description=body.description)
    db.add(r)
    _replace_items(db, r, body.items)
    db.commit()
    return _load_routine(db, r.id)


@router.patch("/routines/{routine_id}", response_model=RoutineOut)
def update_routine(routine_id: int, body: RoutineUpdate, db: Session = Depends(get_db)):
    r = _load_routine(db, routine_id)
    data = body.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        data["name"] = _check_name_free(db, data["name"], routine_id)
    for k, v in data.items():
        setattr(r, k, v)
    db.commit()
    return _load_routine(db, routine_id)


@router.put("/routines/{routine_id}/items", response_model=RoutineOut)
def replace_routine_items(routine_id: int, items: list[RoutineItemIn], db: Session = Depends(get_db)):
    """루틴 구성을 순서대로 통째로 바꾼다 (추가·삭제·순서 변경을 한 번에)."""
    r = _load_routine(db, routine_id)
    _replace_items(db, r, items)
    db.commit()
    db.expire_all()
    return _load_routine(db, routine_id)


@router.delete("/routines/{routine_id}", status_code=204)
def delete_routine(routine_id: int, db: Session = Depends(get_db)):
    """플랜에 쓰이는 루틴은 지울 수 없다. 과거 운동 기록은 루틴 연결만 끊고 남긴다."""
    r = _load_routine(db, routine_id)
    used = db.scalars(
        select(PhaseDay).where(or_(PhaseDay.routine_id == routine_id, PhaseDay.alt_routine_id == routine_id))
    ).all()
    if used:
        raise HTTPException(409, f"플랜 {len(used)}곳에서 쓰는 루틴입니다. 플랜에서 먼저 바꾸세요")
    db.execute(update(Workout).where(Workout.routine_id == routine_id).values(routine_id=None))
    db.delete(r)
    db.commit()
    return Response(status_code=204)


# --- 플랜 편집 ---------------------------------------------------------------
def _load_phase(db: Session, phase_id: int) -> Phase:
    p = db.scalar(
        select(Phase)
        .where(Phase.id == phase_id)
        .options(selectinload(Phase.days).selectinload(PhaseDay.routine))
        .options(selectinload(Phase.days).selectinload(PhaseDay.alt_routine))
    )
    if p is None:
        raise HTTPException(404, "단계를 찾을 수 없습니다")
    return p


@router.patch("/phases/{phase_id}", response_model=PhaseOut)
def update_phase(phase_id: int, body: PhaseUpdate, db: Session = Depends(get_db)):
    p = _load_phase(db, phase_id)
    data = body.model_dump(exclude_unset=True)
    start = data.get("start_date", p.start_date)
    end = data.get("end_date", p.end_date)
    if end is not None and start > end:
        raise HTTPException(422, "시작일이 종료일보다 늦을 수 없습니다")
    # 다른 단계와 기간이 겹치면 날짜별 계획이 모호해진다
    for other in db.scalars(select(Phase).where(Phase.id != phase_id)):
        o_end = other.end_date or other.start_date
        if start <= o_end and (end is None or other.start_date <= end):
            raise HTTPException(409, f"'{other.name}' 단계와 기간이 겹칩니다")
    for k, v in data.items():
        setattr(p, k, v)
    db.commit()
    return _load_phase(db, phase_id)


@router.put("/phases/{phase_id}/days/{weekday}", response_model=PhaseOut)
def set_phase_day(phase_id: int, weekday: int, body: PhaseDayIn, db: Session = Depends(get_db)):
    """단계의 요일 하나(0=월 … 6=일)를 정한다."""
    if not 0 <= weekday <= 6:
        raise HTTPException(422, "weekday 는 0(월)~6(일) 입니다")
    p = _load_phase(db, phase_id)
    for rid in (body.routine_id, body.alt_routine_id):
        if rid is not None and db.get(Routine, rid) is None:
            raise HTTPException(422, f"존재하지 않는 루틴: {rid}")
    day = next((d for d in p.days if d.weekday == weekday), None)
    if day is None:
        day = PhaseDay(weekday=weekday)
        p.days.append(day)
    day.kind = body.kind
    day.label = body.label.strip()
    day.routine_id = body.routine_id if body.kind == DayKind.strength else None
    day.alt_routine_id = body.alt_routine_id if body.kind == DayKind.strength else None
    day.cardio_minutes = body.cardio_minutes
    db.commit()
    db.expire_all()
    return _load_phase(db, phase_id)
