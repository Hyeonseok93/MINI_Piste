from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Exercise
from app.schemas import ExerciseCreate, ExerciseOut, ExerciseUpdate, HistoryPoint
from app.services.history import exercise_history

router = APIRouter(prefix="/exercises", tags=["exercises"])


def get_exercise(db: Session, exercise_id: int) -> Exercise:
    ex = db.get(Exercise, exercise_id)
    if ex is None:
        raise HTTPException(404, "종목을 찾을 수 없습니다")
    return ex


@router.get("", response_model=list[ExerciseOut])
def list_exercises(db: Session = Depends(get_db)):
    return db.scalars(select(Exercise).order_by(Exercise.id)).all()


@router.post("", response_model=ExerciseOut, status_code=201)
def create_exercise(body: ExerciseCreate, db: Session = Depends(get_db)):
    name = body.name.strip()
    if db.scalar(select(Exercise.id).where(Exercise.name == name)) is not None:
        raise HTTPException(409, f"'{name}' 종목이 이미 있습니다")
    ex = Exercise(**body.model_dump(exclude={"name"}), name=name)
    db.add(ex)
    db.commit()
    return ex


@router.get("/{exercise_id}", response_model=ExerciseOut)
def read_exercise(exercise_id: int, db: Session = Depends(get_db)):
    return get_exercise(db, exercise_id)


@router.patch("/{exercise_id}", response_model=ExerciseOut)
def update_exercise(exercise_id: int, body: ExerciseUpdate, db: Session = Depends(get_db)):
    ex = get_exercise(db, exercise_id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(ex, k, v)
    db.commit()
    return ex


@router.get("/{exercise_id}/history", response_model=list[HistoryPoint])
def read_history(exercise_id: int, db: Session = Depends(get_db)):
    get_exercise(db, exercise_id)
    return exercise_history(db, exercise_id)
