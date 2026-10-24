import type { CalendarDay } from '../api/types'
import { parseISODate, weekdayIndex, weekdayLabel } from '../lib/date'
import { dayStatus, shortTitle, STATUS_LABEL } from '../lib/status'
import css from './MonthCalendar.module.css'

interface Props {
  days: CalendarDay[]
  today: string
  selected: string | null
  onSelect: (date: string) => void
}

export default function MonthCalendar({ days, today, selected, onSelect }: Props) {
  const lead = days.length ? weekdayIndex(days[0].date) : 0

  return (
    <div role="grid" aria-label="월간 달력">
      <div className={css.head} role="row">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} role="columnheader" className={i >= 5 ? css.weekend : undefined}>
            {weekdayLabel(i)}
          </span>
        ))}
      </div>
      <div className={css.body}>
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} className={`${css.cell} ${css.blank}`} aria-hidden />
        ))}
        {days.map((d) => {
          const st = dayStatus(d, today)
          const title = shortTitle(d)
          return (
            <button
              key={d.date}
              type="button"
              role="gridcell"
              className={[css.cell, css[st], d.kind && css[d.kind], selected === d.date && css.selected, d.date === today && css.today].filter(Boolean).join(' ')}
              aria-selected={selected === d.date}
              aria-label={`${d.date} ${title} ${STATUS_LABEL[st]}`}
              onClick={() => onSelect(d.date)}
            >
              <span className={`num ${css.num}`}>{parseISODate(d.date).getDate()}</span>
              {st === 'rest' ? <span className={css.title}>휴식</span> : d.kind && <span className={css.title}>{title}</span>}
              {st === 'done' || st === 'missed' || st === 'skipped' ? <span className={`${css.flag} ${css[st]}`}>{STATUS_LABEL[st]}</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
