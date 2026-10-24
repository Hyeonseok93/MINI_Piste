import { describe, expect, it } from 'vitest'
import { addDays, formatShort, mondayOf, todayISO, weekdayIndex } from './date'
import { kg, movingAverage, summarizeSets } from './format'

describe('date', () => {
  it('uses local date, not UTC', () => {
    // 한국 시간 00:30 이어도 같은 날짜
    expect(todayISO(new Date(2026, 9, 19, 0, 30))).toBe('2026-10-19')
  })

  it('weekday index is Monday-based', () => {
    expect(weekdayIndex('2026-10-19')).toBe(0) // 월
    expect(weekdayIndex('2026-10-25')).toBe(6) // 일
  })

  it('adds days across months', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31')
  })

  it('finds monday of the week', () => {
    expect(mondayOf('2026-10-16')).toBe('2026-10-12')
    expect(mondayOf('2026-10-19')).toBe('2026-10-19')
  })

  it('formats short date', () => {
    expect(formatShort('2026-10-16')).toBe('10/16 (금)')
  })
})

describe('format', () => {
  it('kg drops trailing zeros', () => {
    expect(kg(50)).toBe('50kg')
    expect(kg(42.5)).toBe('42.5kg')
    expect(kg(null)).toBe('—')
  })

  it('summarizes consecutive same-weight sets', () => {
    const s = [
      { weight_kg: 70, reps: 12, side: null },
      { weight_kg: 70, reps: 12, side: null },
      { weight_kg: 75, reps: 9, side: null },
    ]
    expect(summarizeSets(s)).toBe('70kg × 12, 12 · 75kg × 9')
  })

  it('summarizes bodyweight sets by count only', () => {
    expect(summarizeSets([{ weight_kg: 0, reps: 30, side: null }], '초')).toBe('30초')
  })

  it('moving average skips gaps', () => {
    expect(movingAverage([110, null, 109, 108], 3)).toEqual([110, 110, 109.5, 108.5])
  })
})

describe('dayStatus', () => {
  const base = { date: '2026-10-22', kind: 'cardio' as const, done: false }
  it('distinguishes missed, skipped and planned rest', async () => {
    const { dayStatus } = await import('./status')
    expect(dayStatus(base, '2026-10-24')).toBe('missed')
    expect(dayStatus({ ...base, rest_day: true }, '2026-10-24')).toBe('skipped')
    expect(dayStatus({ ...base, kind: 'rest' }, '2026-10-24')).toBe('rest')
    expect(dayStatus({ ...base, rest_day: true, done: true }, '2026-10-24')).toBe('done')
  })
})
