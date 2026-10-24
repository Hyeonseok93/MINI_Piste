import type {
  BalanceRow,
  CalendarDay,
  DailyLog,
  DailyLogInput,
  Dashboard,
  Exercise,
  ExerciseCreate,
  ExerciseMuscle,
  ExerciseUpdate,
  FinderChoice,
  FinderInput,
  FinderResult,
  HistoryPoint,
  Measurement,
  MeasurementInput,
  MuscleInfo,
  MuscleVolume,
  PersonalRecord,
  Phase,
  PhaseDayInput,
  PhaseUpdate,
  Profile,
  ProfileInput,
  Routine,
  RoutineCreate,
  RoutineItemInput,
  RoutineSummary,
  RoutineUpdate,
  SetInput,
  SetLog,
  Today,
  Workout,
  WorkoutInput,
  WorkoutListItem,
  WorkoutUpdate,
} from './types'

const BASE = import.meta.env.VITE_API_BASE ?? '/api'

class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    let message = `요청 실패 (${res.status})`
    try {
      const body = await res.json()
      if (typeof body.detail === 'string') message = body.detail
      else if (Array.isArray(body.detail)) message = body.detail.map((d: { msg: string }) => d.msg.replace(/^Value error, /, '')).join(', ')
    } catch {
      /* 본문 없음 */
    }
    throw new ApiError(res.status, message)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

type Params = Record<string, string | boolean | undefined>

const qs = (params: Params) => {
  const entries = Object.entries(params)
    .filter((e): e is [string, string | boolean] => e[1] !== undefined && e[1] !== '')
    .map(([k, v]) => [k, String(v)])
  const s = new URLSearchParams(entries)
  return s.size ? `?${s}` : ''
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })
const del = { method: 'DELETE' }

type Range = { from?: string; to?: string }

export const api = {
  /** 프로필이 아직 없으면 null */
  profile: () =>
    request<Profile>('/profile').catch((e) => {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }),
  saveProfile: (body: ProfileInput) => request<Profile>('/profile', json('PUT', body)),
  dashboard: (date: string) => request<Dashboard>(`/dashboard${qs({ date })}`),
  calendar: (month: string) => request<CalendarDay[]>(`/calendar${qs({ month })}`),
  today: (date: string) => request<Today>(`/today${qs({ date })}`),

  // 플랜
  phases: () => request<Phase[]>('/phases'),
  updatePhase: (id: number, body: PhaseUpdate) => request<Phase>(`/phases/${id}`, json('PATCH', body)),
  setPhaseDay: (id: number, weekday: number, body: PhaseDayInput) => request<Phase>(`/phases/${id}/days/${weekday}`, json('PUT', body)),
  routines: () => request<RoutineSummary[]>('/routines'),
  routine: (id: number) => request<Routine>(`/routines/${id}`),
  createRoutine: (body: RoutineCreate) => request<Routine>('/routines', json('POST', body)),
  updateRoutine: (id: number, body: RoutineUpdate) => request<Routine>(`/routines/${id}`, json('PATCH', body)),
  setRoutineItems: (id: number, items: RoutineItemInput[]) => request<Routine>(`/routines/${id}/items`, json('PUT', items)),
  deleteRoutine: (id: number) => request<void>(`/routines/${id}`, del),

  // 종목
  muscles: () => request<MuscleInfo[]>('/muscles'),
  exercises: () => request<Exercise[]>('/exercises'),
  createExercise: (body: ExerciseCreate) => request<Exercise>('/exercises', json('POST', body)),
  updateExercise: (id: number, body: ExerciseUpdate) => request<Exercise>(`/exercises/${id}`, json('PATCH', body)),
  setExerciseMuscles: (id: number, muscles: ExerciseMuscle[]) => request<Exercise>(`/exercises/${id}/muscles`, json('PUT', { muscles })),
  history: (id: number) => request<HistoryPoint[]>(`/exercises/${id}/history`),

  // 운동 기록
  workouts: (p: Range = {}) => request<WorkoutListItem[]>(`/workouts${qs(p)}`),
  workout: (id: number) => request<Workout>(`/workouts/${id}`),
  createWorkout: (body: WorkoutInput) => request<Workout>('/workouts', json('POST', body)),
  updateWorkout: (id: number, body: WorkoutUpdate) => request<Workout>(`/workouts/${id}`, json('PATCH', body)),
  deleteWorkout: (id: number) => request<void>(`/workouts/${id}`, del),
  addSet: (workoutId: number, body: SetInput) => request<SetLog>(`/workouts/${workoutId}/sets`, json('POST', body)),
  deleteSet: (id: number) => request<void>(`/sets/${id}`, del),

  // 몸
  dailyLogs: (p: Range = {}) => request<DailyLog[]>(`/daily-logs${qs(p)}`),
  saveDailyLog: (date: string, body: DailyLogInput) => request<DailyLog>(`/daily-logs/${date}`, json('PUT', body)),
  setRestDay: (date: string, rest_day: boolean) => request<DailyLog>(`/daily-logs/${date}/rest`, json('PUT', { rest_day })),
  measurements: (p: Range = {}) => request<Measurement[]>(`/measurements${qs(p)}`),
  saveMeasurement: (date: string, body: MeasurementInput) => request<Measurement>(`/measurements/${date}`, json('PUT', body)),
  deleteMeasurement: (date: string) => request<void>(`/measurements/${date}`, del),

  // 분석
  muscleVolume: (p: Range = {}) => request<MuscleVolume[]>(`/stats/muscles${qs(p)}`),
  prs: () => request<PersonalRecord[]>('/stats/prs'),
  balance: (p: Range = {}) => request<BalanceRow[]>(`/stats/balance${qs(p)}`),

  // 도구
  finderChoices: () => request<FinderChoice[]>('/tools/weight-finder/choices'),
  weightFinder: (body: FinderInput) => request<FinderResult>('/tools/weight-finder', json('POST', body)),
}
