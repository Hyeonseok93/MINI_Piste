import type { DailyLog } from '../api/types'
import { addDays } from './date'

interface WeightPoint {
  date: string
  weight: number
  /** 그날까지 7일(달력 기준) 아침 체중 평균. 플랜 규칙: 하루 값이 아니라 평균으로 본다 */
  avg7: number
}

/** 체중이 있는 날만 골라 7일 평균을 붙인다 (날짜 오름차순) */
export function weightTrend(logs: DailyLog[]): WeightPoint[] {
  const days = logs
    .filter((l): l is DailyLog & { body_weight_kg: number } => l.body_weight_kg != null)
    .sort((a, b) => a.date.localeCompare(b.date))
  return days.map((l) => {
    const from = addDays(l.date, -6)
    const window = days.filter((d) => d.date >= from && d.date <= l.date)
    const avg = window.reduce((sum, d) => sum + d.body_weight_kg, 0) / window.length
    return { date: l.date, weight: l.body_weight_kg, avg7: +avg.toFixed(1) }
  })
}
