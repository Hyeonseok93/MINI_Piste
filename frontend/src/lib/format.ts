import type { Equipment, SetLog } from '../api/types'

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

/** 같은 무게 연속 세트를 묶어 "50kg × 12, 12, 11" 형태로 */
export function summarizeSets(sets: Pick<SetLog, 'weight_kg' | 'reps' | 'side'>[], unit = '회'): string {
  if (sets.length === 0) return ''
  const groups: { w: number; side: string; reps: number[] }[] = []
  for (const s of sets) {
    const side = s.side ?? ''
    const last = groups.at(-1)
    if (last && last.w === s.weight_kg && last.side === side) last.reps.push(s.reps)
    else groups.push({ w: s.weight_kg, side, reps: [s.reps] })
  }
  return groups
    .map((g) => `${g.side ? `${g.side} ` : ''}${g.w > 0 ? `${kg(g.w)} × ` : ''}${g.reps.join(', ')}${g.w > 0 ? '' : unit}`)
    .join(' · ')
}

/** n일 이동평균 (null 은 건너뜀) */
export function movingAverage(values: (number | null)[], window: number): (number | null)[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1).filter((v): v is number => v != null)
    return slice.length ? +(slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2) : null
  })
}


/** 아바타에 쓰는 이름 첫 글자 */
export const initial = (name: string) => name.trim().slice(0, 1).toUpperCase()
