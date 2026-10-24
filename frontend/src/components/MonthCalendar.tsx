import type { CalendarDay } from '../api/types'
import { parseISODate, weekdayIndex, weekdayLabel } from '../lib/date'
import { dayStatus, shortTitle, STATUS_LABEL } from '../lib/status'

interface Props {
  days: CalendarDay[]
  today: string
  selected: string | null
  onSelect: (date: string) => void
}

export default function MonthCalendar({ days, today, selected, onSelect }: Props) {
  const lead = days.length ? weekdayIndex(days[0].date) : 0

  return (
    <div className="cal" role="grid" aria-label="월간 달력">
      <div className="cal-head" role="row">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} role="columnheader" className={i >= 5 ? 'weekend' : ''}>
            {weekdayLabel(i)}
          </span>
        ))}
      </div>
      <div className="cal-body">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} className="cal-cell blank" aria-hidden />
        ))}
        {days.map((d) => {
          const st = dayStatus(d, today)
          const title = shortTitle(d)
          return (
            <button
              key={d.date}
              type="button"
              role="gridcell"
              className={`cal-cell ${st} ${d.kind ?? ''}${selected === d.date ? ' selected' : ''}`}
              aria-selected={selected === d.date}
              aria-label={`${d.date} ${title} ${STATUS_LABEL[st]}`}
              onClick={() => onSelect(d.date)}
            >
              <span className={`cal-num num${d.date === today ? ' is-today' : ''}`}>{parseISODate(d.date).getDate()}</span>
              {st === 'rest' ? <span className="cal-title">휴식</span> : d.kind && <span className="cal-title">{title}</span>}
              {st === 'done' || st === 'missed' || st === 'skipped' ? <span className={`cal-flag ${st}`}>{STATUS_LABEL[st]}</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
