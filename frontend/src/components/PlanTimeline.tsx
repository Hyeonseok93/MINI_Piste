import type { PhaseSpan } from '../api/types'
import { addDays, formatMD, formatYMDot, parseISODate } from '../lib/date'
import { useWidth } from '../hooks/useWidth'
import s from './PlanTimeline.module.css'

interface Props {
  phases: PhaseSpan[]
  today: string
}

const DAY = 86_400_000
const days = (a: string, b: string) => Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / DAY)

// 세로 배치(px)
const BAR_H = 30
const CALLOUT_H = 20 // 막대 밖 이름 한 층
const MAX_LEVELS = 2
const AXIS_H = 30
const INSIDE_PAD = 8 // 막대 안 이름 좌우 여백
const GAP = 10 // 같은 층 이름 사이 최소 간격
const NARROW = 560 // 이보다 좁으면(휴대폰) 막대 밖 이름은 지금·다음 단계만

/** 단계 이름 앞 이모지로 종류를 정해 색을 고른다 ("🔥 감량 1단계" → cut) */
const KIND: Record<string, string> = { '🌱': 'start', '🔥': 'cut', '🔨': 'build', '💪': 'build', '🛌': 'pause', '👔': 'event', '🎯': 'review' }
const kindOf = (name: string) => KIND[name.split(' ')[0]] ?? 'build'
const iconOf = (name: string) => (/\p{Extended_Pictographic}/u.test(name.split(' ')[0]) ? name.split(' ')[0] : '')

let canvas: HTMLCanvasElement | null = null
/** 이름이 차지할 폭. 캔버스로 재고, 못 쓰는 환경(테스트)에서는 글자 수로 어림한다 */
function textWidth(text: string) {
  canvas ??= document.createElement('canvas')
  const ctx = canvas.getContext?.('2d')
  if (!ctx) return text.length * 12
  ctx.font = `600 12.5px ${getComputedStyle(document.body).fontFamily || 'sans-serif'}`
  return ctx.measureText(text).width
}

const nameOnly = (name: string) => (iconOf(name) ? name.split(' ').slice(1).join(' ') : name)

interface Placement {
  /** 막대 안에 쓰는 이름 (들어갈 때) */
  inside: string | null
  /** 막대가 좁으면 위에 올리는 이름 */
  callout: { text: string; left: number; level: number } | null
}

/**
 * 이름 배치: 막대 안에 들어가면 안에 쓴다(아이콘+이름 → 이름만 순으로 시도).
 * 안 들어가는 것만 막대 시작점 위에 올리는데, 지금·앞으로 할 단계를 먼저 자리 잡고
 * 두 층 안에서 겹치지 않으면 쓰고, 자리가 없으면 생략한다(막대를 누르면 말풍선으로 보인다).
 * 휴대폰처럼 좁으면 지금·다음 단계 두 개만 올린다.
 */
function placeNames(items: { name: string; x0: number; x1: number; order: number }[], width: number): Placement[] {
  const out: Placement[] = items.map(({ name, x0, x1 }) => {
    const room = x1 - x0 - INSIDE_PAD * 2
    const inside = [name, nameOnly(name)].find((t) => textWidth(t) <= room) ?? null
    return { inside, callout: null }
  })
  const taken: [number, number][][] = Array.from({ length: MAX_LEVELS }, () => [])
  const queue = items.map((it, i) => ({ ...it, i })).filter(({ i }) => !out[i].inside)
  queue.sort((a, b) => a.order - b.order)
  const limit = width < NARROW ? 2 : queue.length
  for (const { name, x0, i } of queue.slice(0, limit)) {
    for (const text of [name, nameOnly(name)]) {
      const w = textWidth(text)
      const left = Math.min(Math.max(x0, 0), Math.max(width - w, 0))
      const level = taken.findIndex((spans) => spans.every(([l, r]) => left + w + GAP <= l || left >= r + GAP))
      if (level >= 0) {
        taken[level].push([left, left + w])
        out[i].callout = { text, left, level }
        break
      }
    }
  }
  return out
}

/** 월 눈금: 1월은 연도로, 나머지는 'n월'. 눈금 사이가 좁으면 건너뛴다 */
function monthTicks(start: string, end: string, x: (d: string) => number) {
  const ticks: { x: number; label: string; year: boolean }[] = []
  const d = parseISODate(start)
  let cur = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  const last = parseISODate(end)
  while (cur <= last) {
    const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-01`
    const jan = cur.getMonth() === 0
    ticks.push({ x: x(iso), label: jan ? String(cur.getFullYear()) : `${cur.getMonth() + 1}월`, year: jan })
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
  }
  return ticks
}

/** 오늘 글자와 겹치는 눈금 글자는 숨기고, 눈금끼리 너무 붙으면 건너뛴다 */
function thinTicks<T extends { x: number }>(ticks: T[], todayX: number | null, width: number): T[] {
  const out: T[] = []
  for (const t of ticks) {
    const prev = out.at(-1)
    if ((prev && t.x - prev.x < 38) || (todayX != null && Math.abs(t.x - todayX) < 34) || t.x > width - 16) continue
    out.push(t)
  }
  return out
}

/** 전체 일정 타임라인: 단계마다 막대(이름은 안에, 좁으면 위에), 아래 월 축, 오늘 표시 */
export default function PlanTimeline({ phases, today }: Props) {
  const [ref, width] = useWidth()
  if (phases.length === 0) return null

  const start = phases[0].start_date
  const end = phases.at(-1)!.end_date ?? phases.at(-1)!.start_date
  const total = days(start, end) + 1
  const W = width || 1
  const x = (d: string) => (Math.min(Math.max(days(start, d), 0), total) / total) * W

  const current = phases.find((p) => p.start_date <= today && (!p.end_date || today <= p.end_date))
  // 막대 밖 이름은 지금 단계 → 앞으로 할 단계(가까운 순) → 지난 단계 순으로 자리를 잡는다
  const order = (p: PhaseSpan, i: number) => (p === current ? -1 : p.start_date > today ? i : 1000 + i)
  const bars = phases.map((p, i) => ({ name: p.name, x0: x(p.start_date), x1: x(addDays(p.end_date ?? p.start_date, 1)), order: order(p, i) }))
  const placed = width ? placeNames(bars, W) : []
  const levels = Math.max(0, ...placed.map((p) => (p.callout ? p.callout.level + 1 : 0)))
  const barTop = levels * CALLOUT_H + 4
  const axisTop = barTop + BAR_H + 8
  const height = axisTop + AXIS_H

  const elapsed = Math.min(Math.max(days(start, today) + 1, 0), total)
  const showToday = today >= start && today <= end
  const todayX = x(today)
  const shownTicks = width ? thinTicks(monthTicks(start, end, x), showToday ? todayX : null, W) : []

  return (
    <div
      ref={ref}
      className={s.timeline}
      style={{ height }}
      role="img"
      aria-label={`전체 일정 ${formatYMDot(start)}–${formatYMDot(end)} 중 ${elapsed}일째${current ? `, 지금은 ${current.name}` : ''}`}
    >
      {width > 0 && (
        <>
          {bars.map((b, i) => {
            const p = phases[i]
            const { inside, callout } = placed[i]
            return (
              <div key={p.name} className={s[kindOf(p.name)]}>
                <div
                  className={`${s.bar}${p === current ? ` ${s.current}` : ''}`}
                  style={{ left: b.x0 + 1, width: Math.max(b.x1 - b.x0 - 2, 2), top: barTop }}
                  data-tip={`${p.name}, ${formatYMDot(p.start_date)}–${p.end_date ? formatYMDot(p.end_date) : ''}`}
                >
                  {inside && <span className={s.inside}>{inside}</span>}
                </div>
                {callout && (
                  <>
                    <span className={s.callout} style={{ left: callout.left, top: barTop - (callout.level + 1) * CALLOUT_H }}>
                      {callout.text}
                    </span>
                    <span
                      className={s.leader}
                      style={{ left: Math.min(b.x0 + 6, (b.x0 + b.x1) / 2), top: barTop - callout.level * CALLOUT_H - 3, height: callout.level * CALLOUT_H + 3 }}
                    />
                  </>
                )}
              </div>
            )
          })}

          <div className={s.axis} style={{ top: axisTop }} />
          {shownTicks.map((t) => (
            <span key={t.x} className={`${s.tick}${t.year ? ` ${s.year}` : ''}`} style={{ left: t.x, top: axisTop }}>
              <span className="num">{t.label}</span>
            </span>
          ))}

          {showToday && (
            <>
              <span className={s.today} style={{ left: todayX, top: barTop - 4, height: axisTop - barTop + 10 }} />
              <span className={`${s.todayLabel} num`} style={{ left: Math.min(Math.max(todayX, 30), W - 30), top: axisTop }}>
                오늘 {formatMD(today)}
              </span>
            </>
          )}
        </>
      )}
    </div>
  )
}
