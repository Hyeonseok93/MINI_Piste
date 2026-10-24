import type { Equipment, RoutineItem, SetLog } from '../api/types'

export const kg = (w: number | null | undefined) => (w == null ? '—' : `${+w.toFixed(2)}kg`)

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  pin: '핀 머신',
  assisted: '보조 머신',
  plate: '원판 머신',
  smith: '스미스',
  barbell: '바벨',
  bodyweight: '맨몸/추가중량',
  cardio: '유산소',
}

/** 세트 하나의 양: "12" 또는 "30초" */
export function setAmount(s: Pick<SetLog, 'reps' | 'duration_sec'>): string {
  return s.duration_sec != null ? `${s.duration_sec}초` : String(s.reps ?? 0)
}

/** 같은 무게 연속 세트를 묶어 "50kg × 12, 12, 11" / "30초, 30초" 형태로 */
export function summarizeSets(sets: Pick<SetLog, 'weight_kg' | 'reps' | 'duration_sec' | 'side'>[]): string {
  if (sets.length === 0) return ''
  const groups: { w: number; side: string; amounts: string[] }[] = []
  for (const s of sets) {
    const side = s.side ?? ''
    const last = groups.at(-1)
    if (last && last.w === s.weight_kg && last.side === side) last.amounts.push(setAmount(s))
    else groups.push({ w: s.weight_kg, side, amounts: [setAmount(s)] })
  }
  return groups.map((g) => `${g.side ? `${g.side} ` : ''}${g.w > 0 ? `${kg(g.w)} × ` : ''}${g.amounts.join(', ')}`).join(' · ')
}

type Target = Pick<RoutineItem, 'sets' | 'rep_min' | 'rep_max' | 'duration_sec'>

function repsRange(t: Target): string {
  return t.rep_min === t.rep_max ? `${t.rep_max}` : `${t.rep_min}–${t.rep_max}`
}

/** "3세트 × 10–12회" / "3세트 × 30초" */
export function targetText(t: Target): string {
  return t.duration_sec ? `${t.sets}세트 × ${t.duration_sec}초` : `${t.sets}세트 × ${repsRange(t)}회`
}

/** "3 × 10–12" / "3 × 30초" (좁은 자리용) */
export function targetShort(t: Target): string {
  return t.duration_sec ? `${t.sets} × ${t.duration_sec}초` : `${t.sets} × ${repsRange(t)}`
}

/** 입력칸 문자열 ↔ 숫자 (빈칸은 null) */
export const toNum = (v: string): number | null => (v.trim() === '' ? null : Number(v))
export const toStr = (v: number | null | undefined): string => (v == null ? '' : String(v))

/** n일 이동평균 (null 은 건너뜀) */
export function movingAverage(values: (number | null)[], window: number): (number | null)[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1).filter((v): v is number => v != null)
    return slice.length ? +(slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2) : null
  })
}


/** 아바타에 쓰는 이름 첫 글자 */
export const initial = (name: string) => name.trim().slice(0, 1).toUpperCase()
