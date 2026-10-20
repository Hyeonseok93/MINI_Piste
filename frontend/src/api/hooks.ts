import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { DailyLogInput, ExerciseUpdate, ProfileInput, SetInput, WorkoutInput, WorkoutUpdate } from './types'

export const keys = {
  profile: ['profile'] as const,
  dashboard: (date: string) => ['dashboard', date] as const,
  calendar: (month: string) => ['calendar', month] as const,
  today: (date: string) => ['today', date] as const,
  week: (start: string) => ['week', start] as const,
  phases: ['phases'] as const,
  routines: ['routines'] as const,
  routine: (id: number) => ['routine', id] as const,
  exercises: ['exercises'] as const,
  history: (id: number) => ['history', id] as const,
  workouts: ['workouts'] as const,
  workout: (id: number) => ['workout', id] as const,
  dailyLogs: ['daily-logs'] as const,
}

export const useProfile = () => useQuery({ queryKey: keys.profile, queryFn: api.profile, staleTime: Infinity })
export const useDashboard = (date: string) => useQuery({ queryKey: keys.dashboard(date), queryFn: () => api.dashboard(date) })
export const useCalendar = (month: string) => useQuery({ queryKey: keys.calendar(month), queryFn: () => api.calendar(month) })
export const useToday = (date: string) => useQuery({ queryKey: keys.today(date), queryFn: () => api.today(date) })
export const useWeek = (start: string) => useQuery({ queryKey: keys.week(start), queryFn: () => api.week(start) })
export const usePhases = () => useQuery({ queryKey: keys.phases, queryFn: api.phases, staleTime: Infinity })
export const useRoutines = () => useQuery({ queryKey: keys.routines, queryFn: api.routines, staleTime: Infinity })
export const useRoutine = (id: number | null) =>
  useQuery({ queryKey: keys.routine(id ?? 0), queryFn: () => api.routine(id!), enabled: id != null, staleTime: Infinity })
export const useExercises = () => useQuery({ queryKey: keys.exercises, queryFn: api.exercises })
export const useHistory = (id: number | null) =>
  useQuery({ queryKey: keys.history(id ?? 0), queryFn: () => api.history(id!), enabled: id != null })
export const useWorkouts = () => useQuery({ queryKey: keys.workouts, queryFn: () => api.workouts() })
export const useWorkout = (id: number | null) =>
  useQuery({ queryKey: keys.workout(id ?? 0), queryFn: () => api.workout(id!), enabled: id != null })
export const useDailyLogs = () => useQuery({ queryKey: keys.dailyLogs, queryFn: () => api.dailyLogs() })

/** 기록이 바뀌면 오늘·주간·기록·추이 화면이 모두 영향을 받는다 */
function useInvalidateLogs() {
  const qc = useQueryClient()
  return () =>
    Promise.all(
      ['today', 'week', 'workouts', 'workout', 'history', 'daily-logs', 'dashboard', 'calendar'].map((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      ),
    )
}

export function useCreateWorkout() {
  const invalidate = useInvalidateLogs()
  return useMutation({ mutationFn: (body: WorkoutInput) => api.createWorkout(body), onSuccess: invalidate })
}

export function useUpdateWorkout() {
  const invalidate = useInvalidateLogs()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: WorkoutUpdate }) => api.updateWorkout(id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteWorkout() {
  const invalidate = useInvalidateLogs()
  return useMutation({ mutationFn: (id: number) => api.deleteWorkout(id), onSuccess: invalidate })
}

export function useAddSet() {
  const invalidate = useInvalidateLogs()
  return useMutation({
    mutationFn: ({ workoutId, body }: { workoutId: number; body: SetInput }) => api.addSet(workoutId, body),
    onSuccess: invalidate,
  })
}

export function useDeleteSet() {
  const invalidate = useInvalidateLogs()
  return useMutation({ mutationFn: (id: number) => api.deleteSet(id), onSuccess: invalidate })
}

export function useSaveDailyLog() {
  const invalidate = useInvalidateLogs()
  return useMutation({
    mutationFn: ({ date, body }: { date: string; body: DailyLogInput }) => api.saveDailyLog(date, body),
    onSuccess: invalidate,
  })
}

export function useUpdateExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ExerciseUpdate }) => api.updateExercise(id, body),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: keys.exercises }), qc.invalidateQueries({ queryKey: ['today'] })]),
  })
}

export function useSaveProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ProfileInput) => api.saveProfile(body),
    onSuccess: (p) => {
      qc.setQueryData(keys.profile, p)
      return qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
