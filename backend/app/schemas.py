from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.models import Category, DayKind, Equipment, SetKind, Side
from app.services.progression import Action, FinderVerdict


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- 종목 ---------------------------------------------------------------
class ExerciseOut(ORM):
    id: int
    name: str
    category: Category
    equipment: Equipment
    increment_kg: float
    unilateral: bool
    alternative: str | None
    setup_note: str | None
    cue: str | None


class ExerciseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    category: Category = Category.strength
    equipment: Equipment = Equipment.pin
    increment_kg: float = Field(default=5.0, ge=0, le=50)
    unilateral: bool = False
    alternative: str | None = None
    setup_note: str | None = None
    cue: str | None = None


class ExerciseUpdate(BaseModel):
    increment_kg: float | None = Field(default=None, gt=0, le=50)
    alternative: str | None = None
    setup_note: str | None = None
    cue: str | None = None
    equipment: Equipment | None = None


class HistoryPoint(BaseModel):
    date: date
    top_weight_kg: float
    volume_kg: float
    sets: int


# --- 루틴·플랜 ------------------------------------------------------------
class RoutineItemOut(ORM):
    id: int
    position: int
    sets: int
    rep_min: int | None
    rep_max: int | None
    duration_sec: int | None
    exercise: ExerciseOut


class RoutineSummary(ORM):
    id: int
    name: str
    description: str | None


class RoutineOut(RoutineSummary):
    items: list[RoutineItemOut]


class PhaseDayOut(ORM):
    weekday: int
    kind: DayKind
    label: str
    cardio_minutes: int | None
    routine: RoutineSummary | None
    alt_routine: RoutineSummary | None


class PhaseOut(ORM):
    id: int
    name: str
    start_date: date
    end_date: date | None
    days: list[PhaseDayOut]


class DayPlanOut(BaseModel):
    date: date
    phase: str | None
    week_index: int | None
    kind: DayKind | None
    label: str | None
    cardio_minutes: int | None
    routine: RoutineSummary | None


class WeekDayOut(DayPlanOut):
    workout_id: int | None
    done: bool


# --- 세트·세션 -------------------------------------------------------------
class SetIn(BaseModel):
    exercise_id: int
    set_no: int | None = Field(default=None, ge=1)
    kind: SetKind = SetKind.work
    weight_kg: float = Field(ge=0, le=1000)
    reps: int = Field(ge=0, le=200)
    rir: int | None = Field(default=None, ge=0, le=20)
    side: Side | None = None


class SetUpdate(BaseModel):
    weight_kg: float | None = Field(default=None, ge=0, le=1000)
    reps: int | None = Field(default=None, ge=0, le=200)
    rir: int | None = Field(default=None, ge=0, le=20)
    kind: SetKind | None = None


class SetOut(ORM):
    id: int
    exercise_id: int
    set_no: int
    kind: SetKind
    weight_kg: float
    reps: int
    rir: int | None
    side: Side | None


class WorkoutIn(BaseModel):
    date: date
    routine_id: int | None = None
    title: str | None = Field(default=None, max_length=80)
    cardio_minutes: int | None = Field(default=None, ge=0, le=600)
    notes: str | None = None


class WorkoutUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=80)
    cardio_minutes: int | None = Field(default=None, ge=0, le=600)
    notes: str | None = None


class WorkoutSummary(ORM):
    id: int
    date: date
    title: str
    routine_id: int | None
    cardio_minutes: int | None
    notes: str | None


class WorkoutOut(WorkoutSummary):
    sets: list[SetOut]


class WorkoutListItem(WorkoutSummary):
    set_count: int
    exercise_count: int


# --- 오늘 화면 --------------------------------------------------------------
class RecommendationOut(BaseModel):
    action: Action
    weight_kg: float | None
    last_weight_kg: float | None
    reason: str


class LastSession(BaseModel):
    date: date
    sets: list[SetOut]


class TodayItem(BaseModel):
    item: RoutineItemOut
    last: LastSession | None
    recommendation: RecommendationOut


class DailyLogIn(BaseModel):
    body_weight_kg: float | None = Field(default=None, gt=0, le=400)
    steps: int | None = Field(default=None, ge=0, le=200_000)
    sleep_hours: float | None = Field(default=None, ge=0, le=24)
    memo: str | None = None


class DailyLogOut(ORM, DailyLogIn):
    date: date


class TodayOut(BaseModel):
    plan: DayPlanOut
    items: list[TodayItem]
    workout: WorkoutOut | None
    daily_log: DailyLogOut | None


# --- 도구 -------------------------------------------------------------------
class FinderIn(BaseModel):
    completed: bool = Field(description="12회를 채웠는가")
    rir: int | None = Field(default=None, ge=0, le=20, description="몇 개 더 할 수 있었나")
    weight_kg: float | None = Field(default=None, ge=0)
    increment_kg: float | None = Field(default=None, gt=0)


class FinderOut(BaseModel):
    verdict: FinderVerdict
    steps: int
    message: str
    next_weight_kg: float | None


# --- 프로필 · 달력 · 대시보드 ---------------------------------------------------
class ProfileIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    height_cm: float | None = Field(default=None, gt=0, le=260)
    start_weight_kg: float | None = Field(default=None, gt=0, le=400)
    goal_weight_kg: float | None = Field(default=None, gt=0, le=400)


class ProfileOut(ORM, ProfileIn):
    pass


class CalendarDay(WeekDayOut):
    workout_title: str | None
    set_count: int
    cardio_minutes_done: int | None
    body_weight_kg: float | None


class PhaseSpan(BaseModel):
    name: str
    start_date: date
    end_date: date | None


class DashboardStats(BaseModel):
    plan_start: date | None
    plan_end: date | None
    day_number: int | None  # 플랜 시작일 = 1일차
    total_workouts: int
    week_done: int
    week_planned: int
    attendance_28d: float | None  # 0~1
    streak: int
    latest_weight_kg: float | None
    start_weight_kg: float | None
    goal_weight_kg: float | None


class DashboardOut(BaseModel):
    profile: ProfileOut | None
    today: CalendarDay
    week: list[CalendarDay]
    upcoming: list[CalendarDay]
    phases: list[PhaseSpan]
    stats: DashboardStats
