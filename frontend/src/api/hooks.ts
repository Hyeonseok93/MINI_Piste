import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type {
  DailyLogInput,
  ExerciseCreate,
  ExerciseMuscle,
  ExerciseUpdate,
  MeasurementInput,
  PhaseDayInput,
  PhaseUpdate,
  ProfileInput,
  RoutineCreate,
  RoutineItemInput,
  RoutineUpdate,
  SetInput,
  WorkoutInput,
  WorkoutUpdate,
} from './types'

type Range = { from?: string; to?: string }

// --- 조회 ------------------------------------------------------------------
export const useProfile = () => useQuery({ queryKey: ['profile'], queryFn: api.profile, staleTime: Infinity })
export const useDashboard = (date: string) => useQuery({ queryKey: ['dashboard', date], queryFn: () => api.dashboard(date) })
export const useCalendar = (month: string) => useQuery({ queryKey: ['calendar', month], queryFn: () => api.calendar(month) })
export const useToday = (date: string) => useQuery({ queryKey: ['today', date], queryFn: () => api.today(date) })
export const useFinderChoices = () => useQuery({ queryKey: ['finder-choices'], queryFn: api.finderChoices, staleTime: Infinity })
export const useMuscles = () => useQuery({ queryKey: ['muscles'], queryFn: api.muscles, staleTime: Infinity })

export const usePhases = () => useQuery({ queryKey: ['phases'], queryFn: api.phases })
export const useRoutines = () => useQuery({ queryKey: ['routines'], queryFn: api.routines })
export const useRoutine = (id: number | null) => useQuery({ queryKey: ['routine', id], queryFn: () => api.routine(id!), enabled: id != null })
export const useExercises = () => useQuery({ queryKey: ['exercises'], queryFn: api.exercises })
export const useHistory = (id: number | null) => useQuery({ queryKey: ['history', id], queryFn: () => api.history(id!), enabled: id != null })

export const useWorkouts = () => useQuery({ queryKey: ['workouts'], queryFn: () => api.workouts() })
export const useWorkout = (id: number | null) => useQuery({ queryKey: ['workout', id], queryFn: () => api.workout(id!), enabled: id != null })
export const useDailyLogs = (range: Range = {}) => useQuery({ queryKey: ['daily-logs', range], queryFn: () => api.dailyLogs(range) })
export const useMeasurements = () => useQuery({ queryKey: ['measurements'], queryFn: () => api.measurements() })

export const useMuscleVolume = (range: Range) => useQuery({ queryKey: ['stats', 'muscles', range], queryFn: () => api.muscleVolume(range) })
export const usePRs = () => useQuery({ queryKey: ['stats', 'prs'], queryFn: api.prs })
export const useBalance = (range: Range) => useQuery({ queryKey: ['stats', 'balance', range], queryFn: () => api.balance(range) })

// --- 변경 후 다시 불러올 범위 -------------------------------------------------------
/** 기록(세트·세션·일일 기록)이 바뀌면 영향을 받는 화면 */
const LOG_KEYS = ['today', 'workouts', 'workout', 'history', 'daily-logs', 'dashboard', 'calendar', 'stats', 'measurements']
/** 플랜(루틴·요일·종목)이 바뀌면 영향을 받는 화면 */
const PLAN_KEYS = ['phases', 'routines', 'routine', 'exercises', 'today', 'dashboard', 'calendar', 'stats']

function useInvalidate(keys: string[]) {
  const qc = useQueryClient()
  return () => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: [k] })))
}

function useLogMutation<V, R>(fn: (v: V) => Promise<R>) {
  const invalidate = useInvalidate(LOG_KEYS)
  return useMutation({ mutationFn: fn, onSuccess: invalidate })
}

function usePlanMutation<V, R>(fn: (v: V) => Promise<R>) {
  const invalidate = useInvalidate(PLAN_KEYS)
  return useMutation({ mutationFn: fn, onSuccess: invalidate })
}

// --- 기록 ------------------------------------------------------------------
export const useCreateWorkout = () => useLogMutation((body: WorkoutInput) => api.createWorkout(body))
export const useUpdateWorkout = () => useLogMutation(({ id, body }: { id: number; body: WorkoutUpdate }) => api.updateWorkout(id, body))
export const useDeleteWorkout = () => useLogMutation((id: number) => api.deleteWorkout(id))
export const useAddSet = () => useLogMutation(({ workoutId, body }: { workoutId: number; body: SetInput }) => api.addSet(workoutId, body))
export const useDeleteSet = () => useLogMutation((id: number) => api.deleteSet(id))
export const useSaveDailyLog = () => useLogMutation(({ date, body }: { date: string; body: DailyLogInput }) => api.saveDailyLog(date, body))
export const useSetRestDay = () => useLogMutation(({ date, rest }: { date: string; rest: boolean }) => api.setRestDay(date, rest))
export const useSaveMeasurement = () => useLogMutation(({ date, body }: { date: string; body: MeasurementInput }) => api.saveMeasurement(date, body))
export const useDeleteMeasurement = () => useLogMutation((date: string) => api.deleteMeasurement(date))

// --- 플랜·종목 -----------------------------------------------------------------
export const useCreateRoutine = () => usePlanMutation((body: RoutineCreate) => api.createRoutine(body))
export const useUpdateRoutine = () => usePlanMutation(({ id, body }: { id: number; body: RoutineUpdate }) => api.updateRoutine(id, body))
export const useSetRoutineItems = () => usePlanMutation(({ id, items }: { id: number; items: RoutineItemInput[] }) => api.setRoutineItems(id, items))
export const useDeleteRoutine = () => usePlanMutation((id: number) => api.deleteRoutine(id))
export const useUpdatePhase = () => usePlanMutation(({ id, body }: { id: number; body: PhaseUpdate }) => api.updatePhase(id, body))
export const useSetPhaseDay = () =>
  usePlanMutation(({ id, weekday, body }: { id: number; weekday: number; body: PhaseDayInput }) => api.setPhaseDay(id, weekday, body))
export const useCreateExercise = () => usePlanMutation((body: ExerciseCreate) => api.createExercise(body))
export const useUpdateExercise = () => usePlanMutation(({ id, body }: { id: number; body: ExerciseUpdate }) => api.updateExercise(id, body))
export const useSetExerciseMuscles = () =>
  usePlanMutation(({ id, muscles }: { id: number; muscles: ExerciseMuscle[] }) => api.setExerciseMuscles(id, muscles))

// --- 프로필 -----------------------------------------------------------------
export function useSaveProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ProfileInput) => api.saveProfile(body),
    onSuccess: (p) => {
      qc.setQueryData(['profile'], p)
      return qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
