from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.models import Exercise, Routine, SetLog, Workout
from app.schemas import (
    SetIn,
    SetOut,
    SetUpdate,
    WorkoutIn,
    WorkoutListItem,
    WorkoutOut,
    WorkoutUpdate,
)

router = APIRouter(tags=["workouts"])


def get_workout(db: Session, workout_id: int) -> Workout:
    w = db.scalar(select(Workout).where(Workout.id == workout_id).options(selectinload(Workout.sets)))
    if w is None:
        raise HTTPException(404, "운동 기록을 찾을 수 없습니다")
    return w


@router.get("/workouts", response_model=list[WorkoutListItem])
def list_workouts(
    from_: date | None = Query(default=None, alias="from"),
    to: date | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = (
        select(
            Workout,
            func.count(SetLog.id).label("set_count"),
            func.count(func.distinct(SetLog.exercise_id)).label("exercise_count"),
        )
        .outerjoin(SetLog, SetLog.workout_id == Workout.id)
        .group_by(Workout.id)
        .order_by(Workout.date.desc(), Workout.id.desc())
        .limit(min(limit, 200))
    )
    if from_:
        q = q.where(Workout.date >= from_)
    if to:
        q = q.where(Workout.date <= to)
    return [
        WorkoutListItem(
            id=w.id,
            date=w.date,
            title=w.title,
            routine_id=w.routine_id,
            cardio_minutes=w.cardio_minutes,
            notes=w.notes,
            set_count=sc,
            exercise_count=ec,
        )
        for w, sc, ec in db.execute(q).all()
    ]


@router.post("/workouts", response_model=WorkoutOut, status_code=201)
def create_workout(body: WorkoutIn, response: Response, db: Session = Depends(get_db)):
    """그날 세션을 만든다. 이미 있으면 새로 만들지 않고 기존 세션을 200으로 돌려준다."""
    title = body.title
    if body.routine_id is not None:
        routine = db.get(Routine, body.routine_id)
        if routine is None:
            raise HTTPException(422, "존재하지 않는 루틴입니다")
        title = title or routine.name
    existing = db.scalar(select(Workout.id).where(Workout.date == body.date))
    if existing is not None:
        response.status_code = 200
        return get_workout(db, existing)
    w = Workout(
        date=body.date,
        routine_id=body.routine_id,
        title=title or "자유 운동",
        cardio_minutes=body.cardio_minutes,
        notes=body.notes,
    )
    db.add(w)
    try:
        db.commit()
    except IntegrityError:  # 동시에 두 요청이 온 경우: 먼저 만든 쪽을 돌려준다
        db.rollback()
        response.status_code = 200
        existing_id = db.scalar(select(Workout.id).where(Workout.date == body.date))
        if existing_id is None:  # 다른 이유의 무결성 오류
            raise
        return get_workout(db, existing_id)
    return get_workout(db, w.id)


@router.get("/workouts/{workout_id}", response_model=WorkoutOut)
def read_workout(workout_id: int, db: Session = Depends(get_db)):
    return get_workout(db, workout_id)


@router.patch("/workouts/{workout_id}", response_model=WorkoutOut)
def update_workout(workout_id: int, body: WorkoutUpdate, db: Session = Depends(get_db)):
    w = get_workout(db, workout_id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(w, k, v)
    db.commit()
    return w


@router.delete("/workouts/{workout_id}", status_code=204)
def delete_workout(workout_id: int, db: Session = Depends(get_db)):
    db.delete(get_workout(db, workout_id))
    db.commit()
    return Response(status_code=204)


@router.post("/workouts/{workout_id}/sets", response_model=SetOut, status_code=201)
def add_set(workout_id: int, body: SetIn, db: Session = Depends(get_db)):
    w = get_workout(db, workout_id)
    if db.get(Exercise, body.exercise_id) is None:
        raise HTTPException(422, "존재하지 않는 종목입니다")
    set_no = body.set_no
    if set_no is None:
        # 같은 종목·같은 쪽(side) 기준 다음 번호
        same = [s for s in w.sets if s.exercise_id == body.exercise_id and s.side == body.side]
        set_no = max((s.set_no for s in same), default=0) + 1
    s = SetLog(workout_id=w.id, **body.model_dump(exclude={"set_no"}), set_no=set_no)
    db.add(s)
    db.commit()
    return s


def get_set(db: Session, set_id: int) -> SetLog:
    s = db.get(SetLog, set_id)
    if s is None:
        raise HTTPException(404, "세트를 찾을 수 없습니다")
    return s


@router.patch("/sets/{set_id}", response_model=SetOut)
def update_set(set_id: int, body: SetUpdate, db: Session = Depends(get_db)):
    s = get_set(db, set_id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    return s


@router.delete("/sets/{set_id}", status_code=204)
def delete_set(set_id: int, db: Session = Depends(get_db)):
    db.delete(get_set(db, set_id))
    db.commit()
    return Response(status_code=204)
