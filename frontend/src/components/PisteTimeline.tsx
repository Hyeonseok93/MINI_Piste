import type { PhaseSpan } from '../api/types'
import { formatYMDot, parseISODate } from '../lib/date'
import s from './PisteTimeline.module.css'

interface Props {
  phases: PhaseSpan[]
  today: string
}

const DAY = 86_400_000
const days = (a: string, b: string) => Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / DAY)

function splitName(name: string) {
  const [first, ...rest] = name.split(' ')
  // 단계 이름은 "🌱 복귀 적응기" 형태
  return /\p{Extended_Pictographic}/u.test(first) ? { icon: first, text: rest.join(' ') } : { icon: '', text: name }
}

/** 전체 일정(단계들)을 펜싱 피스트처럼 한 줄 띠로 보여 준다 */
export default function PisteTimeline({ phases, today }: Props) {
  if (phases.length === 0) return null
  const start = phases[0].start_date
  const end = phases.at(-1)!.end_date ?? phases.at(-1)!.start_date
  const total = days(start, end) + 1
  const elapsed = Math.min(Math.max(days(start, today) + 1, 0), total)
  const pct = (elapsed / total) * 100
  const current = phases.find((p) => p.start_date <= today && (!p.end_date || today <= p.end_date))

  return (
    <div>
      <div className={s.track} role="img" aria-label={`전체 일정 중 ${elapsed}일째, 전체의 ${Math.round(pct)}%${current ? `, 지금은 ${current.name}` : ''}`}>
        {phases.map((p) => {
          const w = (days(p.start_date, p.end_date ?? p.start_date) + 1) / total
          const { icon, text } = splitName(p.name)
          // 칸 폭에 맞춰 이름은 말줄임, 아주 좁으면 아이콘만 (CSS 컨테이너 쿼리)
          return (
            <div
              key={p.name}
              className={`${s.seg}${p === current ? ` ${s.current}` : ''}`}
              style={{ flex: w }}
              data-tip={`${p.name}, ${formatYMDot(p.start_date)}–${p.end_date ? formatYMDot(p.end_date) : ''}`}
            >
              <span className={s.inner}>
                {icon && (
                  <span className={s.icon} aria-hidden>
                    {icon}
                  </span>
                )}
                <span className={s.name}>{text}</span>
              </span>
            </div>
          )
        })}
        {elapsed > 0 && elapsed < total && <span className={s.marker} style={{ left: `${pct}%` }} aria-hidden />}
      </div>
      <div className={`${s.ends} num`}>
        <span>{formatYMDot(start)} 시작</span>
        <span>{formatYMDot(end)} 끝</span>
      </div>
    </div>
  )
}
