from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Exercise, ExerciseMuscle
from app.muscles import MUSCLE_INFO
from app.schemas import ExerciseCreate, ExerciseMusclesIn, ExerciseOut, ExerciseUpdate, HistoryPoint, MuscleInfo
from app.services.history import exercise_history

router = APIRouter(prefix="/exercises", tags=["exercises"])
meta = APIRouter(tags=["exercises"])


@meta.get("/muscles", response_model=list[MuscleInfo])
def list_muscles():
    """근육 부위 분류 (3D 몸 모델·통계가 같은 이름을 쓴다)."""
    return [MuscleInfo(muscle=m, label=label, side=side) for m, (label, side) in MUSCLE_INFO.items()]


def get_exercise(db: Session, exercise_id: int) -> Exercise:
    ex = db.get(Exercise, exercise_id)
    if ex is None:
        raise HTTPException(404, "종목을 찾을 수 없습니다")
    return ex


@router.get("", response_model=list[ExerciseOut])
def list_exercises(active: bool = False, db: Session = Depends(get_db)):
    """active=true 면 보관한 종목을 뺀다 (선택 목록용). 기본은 과거 기록 표시를 위해 전부."""
    q = select(Exercise).order_by(Exercise.id)
    if active:
        q = q.where(Exercise.archived.is_(False))
    return db.scalars(q).all()


@router.post("", response_model=ExerciseOut, status_code=201)
def create_exercise(body: ExerciseCreate, db: Session = Depends(get_db)):
    name = body.name.strip()
    if db.scalar(select(Exercise.id).where(Exercise.name == name)) is not None:
        raise HTTPException(409, f"'{name}' 종목이 이미 있습니다")
    ex = Exercise(**body.model_dump(exclude={"name", "muscles"}), name=name)
    ex.muscles = [ExerciseMuscle(muscle=m.muscle, role=m.role) for m in body.muscles]
    db.add(ex)
    db.commit()
    return ex


@router.get("/{exercise_id}", response_model=ExerciseOut)
def read_exercise(exercise_id: int, db: Session = Depends(get_db)):
    return get_exercise(db, exercise_id)


@router.patch("/{exercise_id}", response_model=ExerciseOut)
def update_exercise(exercise_id: int, body: ExerciseUpdate, db: Session = Depends(get_db)):
    ex = get_exercise(db, exercise_id)
    data = body.model_dump(exclude_unset=True)
    if "name" in data:
        data["name"] = data["name"].strip()
        dup = db.scalar(select(Exercise.id).where(Exercise.name == data["name"], Exercise.id != exercise_id))
        if dup is not None:
            raise HTTPException(409, f"'{data['name']}' 종목이 이미 있습니다")
    for k, v in data.items():
        setattr(ex, k, v)
    db.commit()
    return ex


@router.put("/{exercise_id}/muscles", response_model=ExerciseOut)
def set_muscles(exercise_id: int, body: ExerciseMusclesIn, db: Session = Depends(get_db)):
    """종목이 쓰는 근육을 통째로 바꾼다."""
    ex = get_exercise(db, exercise_id)
    ex.muscles = [ExerciseMuscle(muscle=m.muscle, role=m.role) for m in body.muscles]
    db.commit()
    db.refresh(ex)
    return ex


@router.get("/{exercise_id}/history", response_model=list[HistoryPoint])
def read_history(exercise_id: int, db: Session = Depends(get_db)):
    get_exercise(db, exercise_id)
    return exercise_history(db, exercise_id)
