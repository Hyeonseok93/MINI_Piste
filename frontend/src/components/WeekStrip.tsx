import { Link } from 'react-router-dom'
import type { CalendarDay } from '../api/types'
import { parseISODate, weekdayIndex, weekdayLabel } from '../lib/date'
import { dayStatus, shortTitle, STATUS_LABEL } from '../lib/status'
import s from './WeekStrip.module.css'

/** 이번 주 7일: 날짜와 그날 상태 막대 */
export default function WeekStrip({ days, today }: { days: CalendarDay[]; today: string }) {
  return (
    <ol className={s.days}>
      {days.map((d) => {
        const st = dayStatus(d, today)
        const title = st === 'rest' ? '휴식' : st === 'skipped' ? '못 함' : shortTitle(d)
        const wd = weekdayLabel(weekdayIndex(d.date))
        return (
          <li key={d.date}>
            <Link
              to={`/workout?date=${d.date}`}
              className={`${s.day} ${s[st] ?? ''}`}
              aria-label={`${wd}요일 ${title} ${STATUS_LABEL[st]}`}
              aria-current={d.date === today ? 'date' : undefined}
            >
              <span className={s.wd}>{wd}</span>
              <span className={`${s.d} num`}>{parseISODate(d.date).getDate()}</span>
              <span className={s.bar} aria-hidden />
              <span className={s.t}>{title || ' '}</span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
