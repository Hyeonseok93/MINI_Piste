import type { PhaseSpan } from '../api/types'
import { formatMD, parseISODate } from '../lib/date'
import s from './PlanTimeline.module.css'

interface Props {
  phases: PhaseSpan[]
  today: string
  /** 요약: 지금 단계와 다음 몇 단계만 (홈) */
  limit?: number
  /** 단계를 누르면 (플랜 화면: 그 단계 카드로 이동) */
  onSelect?: (index: number) => void
}

const DAY = 86_400_000
const days = (a: string, b: string) => Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / DAY)

/** 단계 이름 앞 이모지로 종류를 정해 점 색을 고른다 ("🔥 감량 1단계" → cut) */
const KIND: Record<string, string> = { '🌱': 'start', '🔥': 'cut', '🔨': 'build', '💪': 'build', '🛌': 'pause', '👔': 'event', '🎯': 'review' }
const kindOf = (name: string) => KIND[name.split(' ')[0]] ?? 'build'

/** 7일 → "7일", 28일 → "4주", 91일 → "3개월" */
function length(n: number) {
  if (n < 14) return `${n}일`
  if (n < 63) return `${Math.round(n / 7)}주`
  return `${Math.round(n / 30.4)}개월`
}

/** 2026-11-23 → "11/23", 올해가 아니면 "27.1/1" */
function shortDate(d: string, today: string) {
  return d.slice(0, 4) === today.slice(0, 4) ? formatMD(d) : `${d.slice(2, 4)}.${formatMD(d)}`
}

/**
 * 전체 일정: 단계를 위에서 아래로 한 줄씩 (점과 세로선으로 잇는 로드맵).
 * 단계 길이가 7일~3개월로 차이가 커서 한 줄 비율 막대 대신 목록으로 보여 준다.
 */
export default function PlanTimeline({ phases, today, limit, onSelect }: Props) {
  if (phases.length === 0) return null
  const currentIdx = phases.findIndex((p) => p.start_date <= today && (!p.end_date || today <= p.end_date))
  // 요약일 때: 지금 단계(없으면 다음에 올 단계)부터 limit 개
  const from = limit ? Math.max(currentIdx >= 0 ? currentIdx : phases.findIndex((p) => p.start_date > today), 0) : 0
  const shown = phases.slice(from, limit ? from + limit : undefined)
  const rest = phases.length - from - shown.length
  const last = phases.at(-1)!

  return (
    <div>
      <ol className={s.list}>
        {shown.map((p, k) => {
          const i = from + k
          const end = p.end_date ?? p.start_date
          const total = days(p.start_date, end) + 1
          const state = i === currentIdx ? 'current' : end < today ? 'past' : 'future'
          const dayNo = days(p.start_date, today) + 1
          const until = days(today, p.start_date)
          const content = (
            <>
              <span className={s.name}>{p.name}</span>
              <span className={`${s.dates} num`}>
                {shortDate(p.start_date, today)} – {p.end_date ? shortDate(end, today) : '끝 없음'}
              </span>
              <span className={s.meta}>
                {state === 'current' ? (
                  <b>
                    <span className="num">{dayNo}</span>/<span className="num">{total}</span>일째
                  </b>
                ) : state === 'past' ? (
                  '끝남'
                ) : until <= 60 ? (
                  `${until}일 뒤, ${length(total)}`
                ) : (
                  length(total)
                )}
              </span>
              {state === 'current' && (
                <span className={s.progress} role="progressbar" aria-label={`${p.name} 진행`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={dayNo}>
                  <i style={{ width: `${(dayNo / total) * 100}%` }} />
                </span>
              )}
            </>
          )
          return (
            <li key={p.name} className={`${s.item} ${s[kindOf(p.name)]} ${s[state]}`}>
              <span className={s.dot} aria-hidden />
              {onSelect ? (
                <button type="button" className={s.row} onClick={() => onSelect(i)}>
                  {content}
                </button>
              ) : (
                <div className={s.row}>{content}</div>
              )}
            </li>
          )
        })}
      </ol>
      {rest > 0 && (
        <p className={s.more}>
          이후 {rest}단계 더, {shortDate(last.end_date ?? last.start_date, today)}까지
        </p>
      )}
    </div>
  )
}
