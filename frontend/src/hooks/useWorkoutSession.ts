import { useRef } from 'react'
import { useAddSet, useCreateWorkout, useDeleteSet } from '../api/hooks'
import type { RoutineItem, SetInput, SetLog, Today, Workout } from '../api/types'
import { KIND_LABEL } from '../lib/status'

/**
 * 하루 운동 세션 다루기: 세트를 처음 기록하는 순간 세션을 만들고(서버도 하루 1개만 허용),
 * 종목별 세트 조회·완료 판정을 제공한다. 일반 운동 화면과 운동 모드가 같이 쓴다.
 */
export function useWorkoutSession(date: string, data: Today) {
  const { plan, items, workout } = data
  const createWorkout = useCreateWorkout()
  const addSetM = useAddSet()
  const deleteSetM = useDeleteSet()
  // 첫 세트를 빠르게 연타해도 생성 요청은 하나만 보낸다
  const pending = useRef<Promise<Workout> | null>(null)

  function ensureWorkout(): Promise<Workout> {
    if (workout) return Promise.resolve(workout)
    pending.current ??= createWorkout.mutateAsync({
      date,
      routine_id: plan.routine?.id ?? null,
      title: plan.routine ? null : plan.kind ? KIND_LABEL[plan.kind] : '자유 운동',
    })
    pending.current.catch(() => (pending.current = null))
    return pending.current
  }

  async function addSet(body: SetInput): Promise<SetLog> {
    const w = await ensureWorkout()
    return addSetM.mutateAsync({ workoutId: w.id, body })
  }

  const setsOf = (exerciseId: number) => (workout?.sets ?? []).filter((s) => s.exercise_id === exerciseId)

  /** 계획한 본세트를 다 했는지 (한쪽씩 하는 종목은 좌우 합계) */
  const isDone = (item: RoutineItem) => setsOf(item.exercise.id).filter((s) => s.kind === 'work').length >= item.sets * (item.exercise.unilateral ? 2 : 1)

  return {
    workout,
    ensureWorkout,
    addSet,
    removeSet: (id: number) => deleteSetM.mutate(id),
    setsOf,
    isDone,
    doneCount: items.filter((i) => isDone(i.item)).length,
    /** 세션을 지운 뒤에는 다음 기록 때 새로 만들도록 */
    resetPending: () => (pending.current = null),
  }
}
