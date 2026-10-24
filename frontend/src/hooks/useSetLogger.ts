import { useState } from 'react'
import { api } from '../api/client'
import type { Exercise, FinderChoice, FinderResult, Recommendation, RoutineItem, SetInput, SetKind, SetLog, Side } from '../api/types'

interface Options {
  exercise: Exercise
  item?: RoutineItem
  recommendation?: Recommendation
  last?: { date: string; sets: SetLog[] } | null
  sets: SetLog[]
  onAdd: (body: SetInput) => Promise<unknown>
}

/**
 * 종목 카드 하나의 입력 상태와 세트 기록·무게 찾기 동작.
 * 화면(ExerciseCard)과 로직을 나눠 두어 카드 디자인을 바꿔도 기록 규칙은 그대로 유지된다.
 */
export function useSetLogger({ exercise, item, recommendation, last, sets, onAdd }: Options) {
  const timed = item?.duration_sec != null
  const lastLogged = sets.filter((s) => s.kind !== 'warmup').at(-1)
  const initialWeight = lastLogged?.weight_kg ?? recommendation?.weight_kg ?? last?.sets.at(-1)?.weight_kg ?? 0
  const initialAmount = item?.duration_sec ?? item?.rep_max ?? 12

  const [weight, setWeight] = useState(String(initialWeight))
  // 횟수 또는 시간(초): 시간 종목이면 초
  const [amount, setAmount] = useState(String(initialAmount))
  const [rir, setRir] = useState('')
  const [side, setSide] = useState<Side>('L')
  const [finding, setFinding] = useState(recommendation?.action === 'unknown' && !timed)
  const [finderResult, setFinderResult] = useState<FinderResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const workSets = sets.filter((s) => s.kind === 'work')
  const goal = item ? item.sets * (exercise.unilateral ? 2 : 1) : 0
  const done = item ? workSets.length >= goal : sets.length > 0

  async function submit(kind: SetKind, rirValue: number | null = rir === '' ? null : Number(rir)): Promise<boolean> {
    const w = timed ? 0 : Number(weight)
    const n = Number(amount)
    if (!Number.isFinite(w) || w < 0 || !Number.isInteger(n) || n <= 0) {
      setError(timed ? '시간(초)을 숫자로 입력하세요' : '무게와 횟수를 숫자로 입력하세요')
      return false
    }
    setError(null)
    setBusy(true)
    try {
      await onAdd({
        exercise_id: exercise.id,
        kind,
        weight_kg: w,
        ...(timed ? { duration_sec: n } : { reps: n }),
        rir: rirValue,
        side: exercise.unilateral ? side : null,
      })
      setRir('')
      if (exercise.unilateral) setSide((s) => (s === 'L' ? 'R' : 'L'))
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다')
      return false
    } finally {
      setBusy(false)
    }
  }

  /** 무게 찾기 버튼: 세트를 'find' 로 기록하고, 판정 결과로 다음 세트 무게를 채운다 */
  async function pickFinder(choice: FinderChoice) {
    const current = Number(weight)
    if (!(await submit('find', choice.rir))) return
    try {
      const res = await api.weightFinder({ completed: choice.completed, rir: choice.rir, weight_kg: current, increment_kg: exercise.increment_kg })
      setFinderResult(res)
      if (res.next_weight_kg != null) setWeight(String(res.next_weight_kg))
    } catch (e) {
      setError(e instanceof Error ? e.message : '판정을 불러오지 못했습니다')
    }
  }

  return {
    timed,
    weight,
    setWeight,
    amount,
    setAmount,
    rir,
    setRir,
    side,
    setSide,
    finding,
    setFinding,
    finderResult,
    error,
    busy,
    workSets,
    done,
    submit,
    pickFinder,
  }
}
