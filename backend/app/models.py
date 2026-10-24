import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    false,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _enum(cls: type[enum.Enum]) -> Enum:
    # native_enum=False → SQLite/Postgres 모두 VARCHAR + CHECK 로 저장, 값(value) 기준
    return Enum(cls, native_enum=False, values_callable=lambda e: [m.value for m in e], length=20)


class Category(str, enum.Enum):
    strength = "strength"
    core = "core"
    cardio = "cardio"


class Equipment(str, enum.Enum):
    pin = "pin"  # 핀 꽂는 머신
    assisted = "assisted"  # 보조 무게 (어시스트 풀업)
    plate = "plate"  # 원판 끼우는 머신
    smith = "smith"
    barbell = "barbell"
    bodyweight = "bodyweight"
    cardio = "cardio"


class DayKind(str, enum.Enum):
    strength = "strength"
    cardio = "cardio"
    outdoor = "outdoor"
    rest = "rest"


class SetKind(str, enum.Enum):
    work = "work"
    find = "find"  # 시작 무게 찾기
    warmup = "warmup"


class Side(str, enum.Enum):
    left = "L"
    right = "R"


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    category: Mapped[Category] = mapped_column(_enum(Category), default=Category.strength)
    equipment: Mapped[Equipment] = mapped_column(_enum(Equipment), default=Equipment.pin)
    increment_kg: Mapped[float] = mapped_column(Float, default=5.0)
    unilateral: Mapped[bool] = mapped_column(Boolean, default=False)
    alternative: Mapped[str | None] = mapped_column(String(120))
    setup_note: Mapped[str | None] = mapped_column(Text)
    cue: Mapped[str | None] = mapped_column(Text)


class Routine(Base):
    __tablename__ = "routines"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40), unique=True)
    description: Mapped[str | None] = mapped_column(String(200))

    items: Mapped[list["RoutineItem"]] = relationship(
        back_populates="routine", order_by="RoutineItem.position", cascade="all, delete-orphan"
    )


class RoutineItem(Base):
    __tablename__ = "routine_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    routine_id: Mapped[int] = mapped_column(ForeignKey("routines.id", ondelete="CASCADE"))
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"))
    position: Mapped[int] = mapped_column(Integer)
    sets: Mapped[int] = mapped_column(Integer, default=3)
    rep_min: Mapped[int | None] = mapped_column(Integer)
    rep_max: Mapped[int | None] = mapped_column(Integer)
    duration_sec: Mapped[int | None] = mapped_column(Integer)

    routine: Mapped[Routine] = relationship(back_populates="items")
    exercise: Mapped[Exercise] = relationship()


class Phase(Base):
    __tablename__ = "phases"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)

    days: Mapped[list["PhaseDay"]] = relationship(
        back_populates="phase", order_by="PhaseDay.weekday", cascade="all, delete-orphan"
    )


class PhaseDay(Base):
    __tablename__ = "phase_days"
    __table_args__ = (UniqueConstraint("phase_id", "weekday"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    phase_id: Mapped[int] = mapped_column(ForeignKey("phases.id", ondelete="CASCADE"))
    weekday: Mapped[int] = mapped_column(Integer)  # 0=월 … 6=일
    kind: Mapped[DayKind] = mapped_column(_enum(DayKind))
    label: Mapped[str] = mapped_column(String(80))
    routine_id: Mapped[int | None] = mapped_column(ForeignKey("routines.id"))
    alt_routine_id: Mapped[int | None] = mapped_column(ForeignKey("routines.id"))
    cardio_minutes: Mapped[int | None] = mapped_column(Integer)

    phase: Mapped[Phase] = relationship(back_populates="days")
    routine: Mapped[Routine | None] = relationship(foreign_keys=[routine_id])
    alt_routine: Mapped[Routine | None] = relationship(foreign_keys=[alt_routine_id])


class Workout(Base):
    __tablename__ = "workouts"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    routine_id: Mapped[int | None] = mapped_column(ForeignKey("routines.id"))
    title: Mapped[str] = mapped_column(String(80))
    cardio_minutes: Mapped[int | None] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    routine: Mapped[Routine | None] = relationship()
    sets: Mapped[list["SetLog"]] = relationship(
        back_populates="workout",
        order_by="SetLog.id",
        cascade="all, delete-orphan",
    )


class SetLog(Base):
    __tablename__ = "set_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    workout_id: Mapped[int] = mapped_column(ForeignKey("workouts.id", ondelete="CASCADE"), index=True)
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"), index=True)
    set_no: Mapped[int] = mapped_column(Integer)
    kind: Mapped[SetKind] = mapped_column(_enum(SetKind), default=SetKind.work)
    weight_kg: Mapped[float] = mapped_column(Float)
    reps: Mapped[int] = mapped_column(Integer)
    rir: Mapped[int | None] = mapped_column(Integer)
    side: Mapped[Side | None] = mapped_column(_enum(Side))

    workout: Mapped[Workout] = relationship(back_populates="sets")
    exercise: Mapped[Exercise] = relationship()


class DailyLog(Base):
    __tablename__ = "daily_logs"

    date: Mapped[date] = mapped_column(Date, primary_key=True)
    body_weight_kg: Mapped[float | None] = mapped_column(Float)
    steps: Mapped[int | None] = mapped_column(Integer)
    sleep_hours: Mapped[float | None] = mapped_column(Float)
    memo: Mapped[str | None] = mapped_column(Text)
    # 계획은 운동일이지만 쉬기로 한 날 (빠짐이 아니라 휴식으로 센다)
    rest_day: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())


class Profile(Base):
    """단일 사용자 프로필 (로그인 없음, 항상 id=1)."""

    __tablename__ = "profile"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40))
    height_cm: Mapped[float | None] = mapped_column(Float)
    start_weight_kg: Mapped[float | None] = mapped_column(Float)
    goal_weight_kg: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
