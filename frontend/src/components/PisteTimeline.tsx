import type { PhaseSpan } from '../api/types'
import { parseISODate } from '../lib/date'

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

const md = (s: string) => {
  const d = parseISODate(s)
  return `${d.getFullYear() % 100}.${d.getMonth() + 1}.${d.getDate()}`
}

/** 1년 플랜을 펜싱 피스트처럼 한 줄 띠로 보여 준다 */
export default function PisteTimeline({ phases, today }: Props) {
  if (phases.length === 0) return null
  const start = phases[0].start_date
  const end = phases.at(-1)!.end_date ?? phases.at(-1)!.start_date
  const total = days(start, end) + 1
  const elapsed = Math.min(Math.max(days(start, today) + 1, 0), total)
  const pct = (elapsed / total) * 100
  const current = phases.find((p) => p.start_date <= today && (!p.end_date || today <= p.end_date))

  return (
    <div className="piste-wrap">
      <div className="piste" role="img" aria-label={`1년 플랜 중 ${elapsed}일째, 전체의 ${Math.round(pct)}%`}>
        <div className="piste-fill" style={{ width: `${pct}%` }} />
        {phases.map((p) => {
          const w = ((days(p.start_date, p.end_date ?? p.start_date) + 1) / total) * 100
          const { icon, text } = splitName(p.name)
          const isCurrent = p === current
          return (
            <div key={p.name} className={`piste-seg${isCurrent ? ' current' : ''}`} style={{ width: `${w}%` }} title={p.name}>
              {w > 4 && (
                <span className="piste-icon" aria-hidden>
                  {icon}
                </span>
              )}
              {w > 13 && <span className="piste-name">{text}</span>}
            </div>
          )
        })}
        <div className="piste-marker" style={{ left: `${pct}%` }}>
          <span className="piste-flag num">{elapsed}일째</span>
        </div>
      </div>
      <div className="piste-ends num">
        <span>{md(start)} 시작</span>
        <span>{md(end)} 종료</span>
      </div>
    </div>
  )
}
