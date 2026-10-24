import { Link } from 'react-router-dom'
import type { CalendarDay } from '../api/types'
import { parseISODate, weekdayLabel } from '../lib/date'
import { dayStatus, shortTitle, STATUS_LABEL } from '../lib/status'
import { CheckIcon, MinusIcon, XIcon } from './icons'

export default function WeekStrip({ days, today }: { days: CalendarDay[]; today: string }) {
  return (
    <ol className="week-strip">
      {days.map((d, i) => {
        const st = dayStatus(d, today)
        const title = shortTitle(d)
        return (
          <li key={d.date}>
            <Link
              to={`/workout?date=${d.date}`}
              className={`wk-day ${st} ${d.kind ?? ''}`}
              aria-label={`${weekdayLabel(i)}요일 ${title} ${STATUS_LABEL[st]}`}
              aria-current={d.date === today ? 'date' : undefined}
            >
              <span className="wk-name">{weekdayLabel(i)}</span>
              <span className="wk-num num">{parseISODate(d.date).getDate()}</span>
              <span className="wk-mark" aria-hidden>
                {st === 'done' ? <CheckIcon /> : st === 'missed' ? <XIcon /> : st === 'skipped' ? <MinusIcon /> : null}
              </span>
              <span className="wk-title">{st === 'rest' ? '휴식' : title}</span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
