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
const LEVEL_H = 20 // 이름 한 층
const MAX_LEVELS = 3
const BAR_H = 22
const AXIS_H = 28
const LABEL_GAP = 10 // 같은 층 이름 사이 최소 간격

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

interface Label {
  text: string
  left: number
  width: number
  level: number
  cx: number
}

/** 이름을 막대 가운데 위에 두고, 앞 이름과 겹치면 한 층 위로. 세 층에도 안 들어가면 아이콘만, 그래도 안 되면 생략 */
function placeLabels(items: { name: string; x0: number; x1: number }[], width: number): (Label | null)[] {
  const right = Array<number>(MAX_LEVELS).fill(-Infinity)
  return items.map(({ name, x0, x1 }) => {
    const cx = (x0 + x1) / 2
    for (const text of [name, iconOf(name)].filter(Boolean)) {
      const w = textWidth(text)
      const left = Math.min(Math.max(cx - w / 2, 0), Math.max(width - w, 0))
      const level = right.findIndex((r) => left >= r + LABEL_GAP)
      if (level >= 0) {
        right[level] = left + w
        return { text, left, width: w, level, cx }
      }
    }
    return null
  })
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

/** 전체 일정 타임라인: 아래 월 축, 단계마다 막대, 이름은 막대 위 (겹치면 층을 나눈다) */
export default function PlanTimeline({ phases, today }: Props) {
  const [ref, width] = useWidth()
  if (phases.length === 0) return null

  const start = phases[0].start_date
  const end = phases.at(-1)!.end_date ?? phases.at(-1)!.start_date
  const total = days(start, end) + 1
  const W = width || 1
  const x = (d: string) => (Math.min(Math.max(days(start, d), 0), total) / total) * W

  const bars = phases.map((p) => ({ name: p.name, x0: x(p.start_date), x1: x(addDays(p.end_date ?? p.start_date, 1)) }))
  const labels = width ? placeLabels(bars, W) : []
  const levels = Math.max(1, ...labels.map((l) => (l ? l.level + 1 : 0)))
  const barTop = levels * LEVEL_H + 6
  const height = barTop + BAR_H + AXIS_H

  const elapsed = Math.min(Math.max(days(start, today) + 1, 0), total)
  const showToday = today >= start && today <= end
  const todayX = x(today)
  const current = phases.find((p) => p.start_date <= today && (!p.end_date || today <= p.end_date))

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
            const l = labels[i]
            const kind = kindOf(p.name)
            return (
              <div key={p.name} className={s[kind]}>
                <div
                  className={`${s.bar}${p === current ? ` ${s.current}` : ''}`}
                  style={{ left: b.x0, width: Math.max(b.x1 - b.x0, 2), top: barTop }}
                  data-tip={`${p.name}, ${formatYMDot(p.start_date)}–${p.end_date ? formatYMDot(p.end_date) : ''}`}
                />
                {l && (
                  <>
                    <span className={s.label} style={{ left: l.left, top: barTop - (l.level + 1) * LEVEL_H - 2 }}>
                      {l.text}
                    </span>
                    {l.level > 0 && (
                      <span
                        className={s.leader}
                        style={{ left: Math.min(Math.max(l.cx, b.x0 + 2), b.x1 - 2), top: barTop - l.level * LEVEL_H, height: l.level * LEVEL_H }}
                      />
                    )}
                  </>
                )}
              </div>
            )
          })}

          <div className={s.axis} style={{ top: barTop + BAR_H + 6 }} />
          {shownTicks.map((t) => (
            <span key={t.x} className={`${s.tick}${t.year ? ` ${s.year}` : ''}`} style={{ left: t.x, top: barTop + BAR_H + 6 }}>
              <span className="num">{t.label}</span>
            </span>
          ))}

          {showToday && (
            <>
              <span className={s.today} style={{ left: todayX, top: 0, height: barTop + BAR_H + 10 }} />
              <span className={`${s.todayLabel} num`} style={{ left: Math.min(Math.max(todayX, 30), W - 30), top: barTop + BAR_H + 6 }}>
                오늘 {formatMD(today)}
              </span>
            </>
          )}
        </>
      )}
    </div>
  )
}
