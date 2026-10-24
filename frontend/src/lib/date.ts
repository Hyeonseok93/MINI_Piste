// 날짜는 API와 'YYYY-MM-DD' 문자열로 주고받는다. toISOString()은 UTC라 한국 시간 새벽에 하루가 밀리므로 쓰지 않는다.

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now)
}

export function addDays(s: string, n: number): string {
  const d = parseISODate(s)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** 월요일=0 … 일요일=6 (백엔드 weekday와 동일) */
export function weekdayIndex(s: string): number {
  return (parseISODate(s).getDay() + 6) % 7
}

export function weekdayLabel(index: number): string {
  return WEEKDAYS[index]
}

export function mondayOf(s: string): string {
  return addDays(s, -weekdayIndex(s))
}

/** 2026-10-19 → "10/19" */
export function formatMD(s: string): string {
  const d = parseISODate(s)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** 2026-10-19 → "26.10.19" */
export function formatYMDot(s: string): string {
  const d = parseISODate(s)
  return `${d.getFullYear() % 100}.${d.getMonth() + 1}.${d.getDate()}`
}

/** 2026-10-19 → "10/19 (월)" */
export function formatShort(s: string): string {
  const d = parseISODate(s)
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[weekdayIndex(s)]})`
}

/** 2026-10-19 → "2026년 10월 19일 월요일" */
export function formatLong(s: string): string {
  const d = parseISODate(s)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[weekdayIndex(s)]}요일`
}
