import type { CalendarDay, DayKind } from '../api/types'

type DayStatus = 'done' | 'missed' | 'skipped' | 'today' | 'planned' | 'rest' | 'off'

/** 계획과 기록을 합쳐 그날 상태를 정한다 */
export function dayStatus(d: Pick<CalendarDay, 'date' | 'kind' | 'done'> & { rest_day?: boolean }, today: string): DayStatus {
  if (d.done) return 'done'
  if (d.kind == null) return 'off'
  if (d.kind === 'rest') return 'rest'
  // 계획된 운동일인데 사용자가 '못 함'으로 표시한 날 (빠짐으로 세지 않음)
  if (d.rest_day) return 'skipped'
  if (d.date < today) return 'missed'
  if (d.date === today) return 'today'
  return 'planned'
}

export const KIND_LABEL: Record<DayKind, string> = {
  strength: '근력',
  cardio: '유산소',
  outdoor: '야외 활동',
  rest: '휴식',
}

/** 달력·주간에 쓰는 짧은 이름: 루틴명 > 종류 */
export function shortTitle(d: Pick<CalendarDay, 'kind' | 'routine'>): string {
  if (d.routine) return d.routine.name
  return d.kind ? KIND_LABEL[d.kind] : ''
}

export const STATUS_LABEL: Record<DayStatus, string> = {
  done: '완료',
  missed: '빠짐',
  skipped: '못 함',
  today: '오늘',
  planned: '예정',
  rest: '휴식',
  off: '',
}
