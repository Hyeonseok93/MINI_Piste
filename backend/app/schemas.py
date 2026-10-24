from datetime import date

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models import Category, DayKind, Equipment, SetKind, Side
from app.muscles import Muscle, MuscleRole
from app.services.progression import Action, FinderVerdict


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- 근육 ---------------------------------------------------------------
class MuscleInfo(BaseModel):
    muscle: Muscle
    label: str
    side: str  # front / back


class ExerciseMuscleIO(ORM):
    muscle: Muscle
    role: MuscleRole = MuscleRole.primary


def _unique_muscles(items: list[ExerciseMuscleIO]) -> list[ExerciseMuscleIO]:
    if len({m.muscle for m in items}) != len(items):
        raise ValueError("같은 근육을 두 번 넣을 수 없습니다")
    return items


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
    archived: bool = False
    rest_sec: int = 90
    muscles: list[ExerciseMuscleIO] = []


class ExerciseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    category: Category = Category.strength
    equipment: Equipment = Equipment.pin
    increment_kg: float = Field(default=5.0, ge=0, le=50)
    unilateral: bool = False
    alternative: str | None = None
    setup_note: str | None = None
    cue: str | None = None
    rest_sec: int = Field(default=90, ge=15, le=600)
    muscles: list[ExerciseMuscleIO] = []

    @model_validator(mode="after")
    def _check_muscles(self):
        _unique_muscles(self.muscles)
        return self


class ExerciseUpdate(BaseModel):
    increment_kg: float | None = Field(default=None, gt=0, le=50)
    alternative: str | None = None
    setup_note: str | None = None
    cue: str | None = None
    equipment: Equipment | None = None
    unilateral: bool | None = None
    archived: bool | None = None
    rest_sec: int | None = Field(default=None, ge=15, le=600)
    name: str | None = Field(default=None, min_length=1, max_length=80)


class ExerciseMusclesIn(BaseModel):
    muscles: list[ExerciseMuscleIO]

    @model_validator(mode="after")
    def _check(self):
        _unique_muscles(self.muscles)
        return self


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
    item_count: int


class RoutineOut(RoutineSummary):
    items: list[RoutineItemOut]


class RoutineItemIn(BaseModel):
    exercise_id: int
    sets: int = Field(ge=1, le=10)
    rep_min: int | None = Field(default=None, ge=1, le=100)
    rep_max: int | None = Field(default=None, ge=1, le=100)
    duration_sec: int | None = Field(default=None, gt=0, le=3600)

    @model_validator(mode="after")
    def _reps_or_duration(self):
        has_reps = self.rep_min is not None or self.rep_max is not None
        if has_reps == (self.duration_sec is not None):
            raise ValueError("횟수 범위(rep_min~rep_max)와 시간(duration_sec) 중 하나만 정하세요")
        if has_reps:
            if self.rep_min is None or self.rep_max is None:
                raise ValueError("rep_min 과 rep_max 를 함께 정하세요")
            if self.rep_min > self.rep_max:
                raise ValueError("rep_min 은 rep_max 보다 클 수 없습니다")
        return self


class RoutineCreate(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    description: str | None = Field(default=None, max_length=200)
    items: list[RoutineItemIn] = []


class RoutineUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=40)
    description: str | None = Field(default=None, max_length=200)


class PhaseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    start_date: date | None = None
    end_date: date | None = None


class PhaseDayIn(BaseModel):
    kind: DayKind
    label: str = Field(min_length=1, max_length=80)
    routine_id: int | None = None
    alt_routine_id: int | None = None
    cardio_minutes: int | None = Field(default=None, ge=0, le=300)

    @model_validator(mode="after")
    def _routine_matches_kind(self):
        if self.kind == DayKind.strength and self.routine_id is None:
            raise ValueError("근력 날은 루틴을 골라야 합니다")
        if self.kind != DayKind.strength and (self.routine_id or self.alt_routine_id):
            raise ValueError("근력 날이 아니면 루틴을 넣을 수 없습니다")
        return self


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


# --- 세트·세션 -------------------------------------------------------------
class SetIn(BaseModel):
    exercise_id: int
    set_no: int | None = Field(default=None, ge=1)
    kind: SetKind = SetKind.work
    weight_kg: float = Field(ge=0, le=1000)
    reps: int | None = Field(default=None, ge=0, le=200)
    duration_sec: int | None = Field(default=None, gt=0, le=3600)
    rir: int | None = Field(default=None, ge=0, le=20)
    side: Side | None = None

    @model_validator(mode="after")
    def _reps_or_duration(self):
        if (self.reps is None) == (self.duration_sec is None):
            raise ValueError("횟수(reps)와 시간(duration_sec) 중 하나만 입력하세요")
        return self


class SetUpdate(BaseModel):
    weight_kg: float | None = Field(default=None, ge=0, le=1000)
    reps: int | None = Field(default=None, ge=0, le=200)
    duration_sec: int | None = Field(default=None, gt=0, le=3600)
    rir: int | None = Field(default=None, ge=0, le=20)
    kind: SetKind | None = None


class SetOut(ORM):
    id: int
    exercise_id: int
    set_no: int
    kind: SetKind
    weight_kg: float
    reps: int | None
    duration_sec: int | None
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
    rest_day: bool = False


class RestDayIn(BaseModel):
    rest_day: bool


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


class FinderChoiceOut(BaseModel):
    label: str
    completed: bool
    rir: int | None


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


class CalendarDay(DayPlanOut):
    workout_id: int | None
    done: bool
    workout_title: str | None
    set_count: int
    cardio_minutes_done: int | None
    body_weight_kg: float | None
    rest_day: bool = False


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


# --- 월말 측정 ---------------------------------------------------------------
class MeasurementIn(BaseModel):
    waist_cm: float | None = Field(default=None, gt=30, le=250)
    chest_cm: float | None = Field(default=None, gt=30, le=250)
    hip_cm: float | None = Field(default=None, gt=30, le=250)
    thigh_cm: float | None = Field(default=None, gt=10, le=150)
    arm_cm: float | None = Field(default=None, gt=10, le=100)
    body_fat_pct: float | None = Field(default=None, gt=1, lt=70)
    note: str | None = None


class MeasurementOut(ORM, MeasurementIn):
    date: date
    # 그날까지 7일간 아침 체중 평균 (daily_logs 에서 계산, 기록이 없으면 null)
    weight_avg_7d: float | None = None
    weight_days: int = 0


# --- 통계 -------------------------------------------------------------------
class MuscleVolume(BaseModel):
    muscle: Muscle
    label: str
    side: str
    sets: float  # 주동근 1 + 보조근 0.5 로 센 세트 수
    primary_sets: int
    secondary_sets: int
    target_sets: int  # 기간을 주 단위로 환산한 목표


class PersonalRecord(BaseModel):
    exercise_id: int
    name: str
    best_weight_kg: float
    best_weight_reps: int
    best_weight_date: date
    e1rm_kg: float  # Epley 추정 1RM
    e1rm_date: date


class SideStats(BaseModel):
    top_weight_kg: float | None
    total_reps: int
    sets: int


class BalanceRow(BaseModel):
    exercise_id: int
    name: str
    left: SideStats
    right: SideStats
    weaker: str | None  # 'L' / 'R' / None(같음)
    diff_pct: float | None  # 약한 쪽 대비 강한 쪽 무게 차이 %
