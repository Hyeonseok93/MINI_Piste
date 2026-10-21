// backend/app/schemas.py 와 1:1 대응

export type Category = 'strength' | 'core' | 'cardio'
export type Equipment = 'pin' | 'assisted' | 'plate' | 'smith' | 'barbell' | 'bodyweight' | 'cardio'
export type DayKind = 'strength' | 'cardio' | 'outdoor' | 'rest'
export type SetKind = 'work' | 'find' | 'warmup'
export type Side = 'L' | 'R'
export type Action = 'start' | 'increase' | 'keep' | 'decrease' | 'unknown'
export type FinderVerdict = 'up2' | 'up1' | 'confirm' | 'confirm_heavy' | 'down1'

export interface Exercise {
  id: number
  name: string
  category: Category
  equipment: Equipment
  increment_kg: number
  unilateral: boolean
  alternative: string | null
  setup_note: string | null
  cue: string | null
}

export type ExerciseUpdate = Partial<
  Pick<Exercise, 'increment_kg' | 'alternative' | 'setup_note' | 'cue' | 'equipment'>
>

export interface HistoryPoint {
  date: string
  top_weight_kg: number
  volume_kg: number
  sets: number
}

export interface RoutineSummary {
  id: number
  name: string
  description: string | null
}

export interface RoutineItem {
  id: number
  position: number
  sets: number
  rep_min: number | null
  rep_max: number | null
  duration_sec: number | null
  exercise: Exercise
}

export interface Routine extends RoutineSummary {
  items: RoutineItem[]
}

export interface PhaseDay {
  weekday: number
  kind: DayKind
  label: string
  cardio_minutes: number | null
  routine: RoutineSummary | null
  alt_routine: RoutineSummary | null
}

export interface Phase {
  id: number
  name: string
  start_date: string
  end_date: string | null
  days: PhaseDay[]
}

export interface DayPlan {
  date: string
  phase: string | null
  week_index: number | null
  kind: DayKind | null
  label: string | null
  cardio_minutes: number | null
  routine: RoutineSummary | null
}

export interface WeekDay extends DayPlan {
  workout_id: number | null
  done: boolean
}

export interface SetLog {
  id: number
  exercise_id: number
  set_no: number
  kind: SetKind
  weight_kg: number
  reps: number
  rir: number | null
  side: Side | null
}

export interface SetInput {
  exercise_id: number
  kind?: SetKind
  weight_kg: number
  reps: number
  rir?: number | null
  side?: Side | null
}

export interface WorkoutSummary {
  id: number
  date: string
  title: string
  routine_id: number | null
  cardio_minutes: number | null
  notes: string | null
}

export interface Workout extends WorkoutSummary {
  sets: SetLog[]
}

export interface WorkoutListItem extends WorkoutSummary {
  set_count: number
  exercise_count: number
}

export interface WorkoutInput {
  date: string
  routine_id?: number | null
  title?: string | null
  cardio_minutes?: number | null
  notes?: string | null
}

export type WorkoutUpdate = Partial<Pick<Workout, 'title' | 'cardio_minutes' | 'notes'>>

export interface Recommendation {
  action: Action
  weight_kg: number | null
  last_weight_kg: number | null
  reason: string
}

export interface TodayItem {
  item: RoutineItem
  last: { date: string; sets: SetLog[] } | null
  recommendation: Recommendation
}

export interface DailyLogInput {
  body_weight_kg: number | null
  steps: number | null
  sleep_hours: number | null
  memo: string | null
}

export interface DailyLog extends DailyLogInput {
  date: string
}

export interface Today {
  plan: DayPlan
  items: TodayItem[]
  workout: Workout | null
  daily_log: DailyLog | null
}

export interface FinderInput {
  completed: boolean
  rir?: number | null
  weight_kg?: number | null
  increment_kg?: number | null
}

export interface FinderResult {
  verdict: FinderVerdict
  steps: number
  message: string
  next_weight_kg: number | null
}

export interface ProfileInput {
  name: string
  height_cm: number | null
  start_weight_kg: number | null
  goal_weight_kg: number | null
}

export type Profile = ProfileInput

export interface CalendarDay extends WeekDay {
  workout_title: string | null
  set_count: number
  cardio_minutes_done: number | null
  body_weight_kg: number | null
}

export interface PhaseSpan {
  name: string
  start_date: string
  end_date: string | null
}

export interface DashboardStats {
  plan_start: string | null
  plan_end: string | null
  day_number: number | null
  total_workouts: number
  week_done: number
  week_planned: number
  attendance_28d: number | null
  streak: number
  latest_weight_kg: number | null
  start_weight_kg: number | null
  goal_weight_kg: number | null
}

export interface Dashboard {
  profile: Profile | null
  today: CalendarDay
  week: CalendarDay[]
  upcoming: CalendarDay[]
  phases: PhaseSpan[]
  stats: DashboardStats
}
