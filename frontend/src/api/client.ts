import type {
  CalendarDay,
  DailyLog,
  Dashboard,
  DailyLogInput,
  Exercise,
  ExerciseUpdate,
  FinderInput,
  FinderResult,
  HistoryPoint,
  Phase,
  Profile,
  ProfileInput,
  Routine,
  RoutineSummary,
  SetInput,
  SetLog,
  Today,
  WeekDay,
  Workout,
  WorkoutInput,
  WorkoutListItem,
  WorkoutUpdate,
} from './types'

const BASE = import.meta.env.VITE_API_BASE ?? '/api'

export class ApiError extends Error {
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
      else if (Array.isArray(body.detail)) message = body.detail.map((d: { msg: string }) => d.msg).join(', ')
    } catch {
      /* 본문 없음 */
    }
    throw new ApiError(res.status, message)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

const qs = (params: Record<string, string | undefined>) => {
  const s = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1]))
  return s.size ? `?${s}` : ''
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

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
  week: (start: string) => request<WeekDay[]>(`/plan/week${qs({ start })}`),
  phases: () => request<Phase[]>('/phases'),
  routines: () => request<RoutineSummary[]>('/routines'),
  routine: (id: number) => request<Routine>(`/routines/${id}`),

  exercises: () => request<Exercise[]>('/exercises'),
  updateExercise: (id: number, body: ExerciseUpdate) => request<Exercise>(`/exercises/${id}`, json('PATCH', body)),
  history: (id: number) => request<HistoryPoint[]>(`/exercises/${id}/history`),

  workouts: (p: { from?: string; to?: string } = {}) => request<WorkoutListItem[]>(`/workouts${qs(p)}`),
  workout: (id: number) => request<Workout>(`/workouts/${id}`),
  createWorkout: (body: WorkoutInput) => request<Workout>('/workouts', json('POST', body)),
  updateWorkout: (id: number, body: WorkoutUpdate) => request<Workout>(`/workouts/${id}`, json('PATCH', body)),
  deleteWorkout: (id: number) => request<void>(`/workouts/${id}`, { method: 'DELETE' }),
  addSet: (workoutId: number, body: SetInput) => request<SetLog>(`/workouts/${workoutId}/sets`, json('POST', body)),
  deleteSet: (id: number) => request<void>(`/sets/${id}`, { method: 'DELETE' }),

  dailyLogs: (p: { from?: string; to?: string } = {}) => request<DailyLog[]>(`/daily-logs${qs(p)}`),
  saveDailyLog: (date: string, body: DailyLogInput) => request<DailyLog>(`/daily-logs/${date}`, json('PUT', body)),

  weightFinder: (body: FinderInput) => request<FinderResult>('/tools/weight-finder', json('POST', body)),
}
