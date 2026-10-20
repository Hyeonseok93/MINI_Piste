import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useExercises, useWorkout, useWorkouts } from '../api/hooks'
import type { WorkoutListItem } from '../api/types'
import { ChevronRight } from '../components/icons'
import { parseISODate, weekdayIndex, weekdayLabel } from '../lib/date'
import { summarizeSets } from '../lib/format'

function byMonth(list: WorkoutListItem[]) {
  const groups = new Map<string, WorkoutListItem[]>()
  for (const w of list) {
    const key = w.date.slice(0, 7)
    groups.set(key, [...(groups.get(key) ?? []), w])
  }
  return [...groups.entries()]
}

export default function HistoryPage() {
  const { data, isPending, isError, error } = useWorkouts()
  const [open, setOpen] = useState<number | null>(null)

  return (
    <>
      <header className="page-header">
        <div className="titles">
          <h1 className="page-title">운동 기록</h1>
          <p className="page-sub">{data ? `지금까지 ${data.length}번 운동했어요` : ' '}</p>
        </div>
      </header>

      {isPending && <div className="skeleton" style={{ height: 240 }} />}
      {isError && <p className="error-text">{error.message}</p>}
      {data?.length === 0 && (
        <div className="panel empty">
          <p>아직 기록이 없습니다.</p>
          <Link to="/workout" className="btn btn-primary" style={{ marginTop: 14 }}>
            오늘 운동 기록하기
          </Link>
        </div>
      )}

      <div className="stack" style={{ gap: 20, maxWidth: 820 }}>
        {data &&
          byMonth(data).map(([month, list]) => {
            const [y, m] = month.split('-')
            return (
              <section key={month} className="panel">
                <div className="panel-head">
                  <h2 className="panel-title">
                    {y}년 {Number(m)}월
                  </h2>
                  <span className="muted">{list.length}회</span>
                </div>
                <ul className="rows">
                  {list.map((w) => (
                    <li key={w.id} style={{ display: 'block' }}>
                      <button className="row" style={{ width: '100%', textAlign: 'left', gap: 14 }} aria-expanded={open === w.id} onClick={() => setOpen(open === w.id ? null : w.id)}>
                        <span className="date-block">
                          <span className="num">{parseISODate(w.date).getDate()}</span>
                          <span>{weekdayLabel(weekdayIndex(w.date))}요일</span>
                        </span>
                        <span className="grow">
                          <span className="row-title" style={{ display: 'block' }}>
                            {w.title}
                          </span>
                          <span className="row-sub">
                            {w.exercise_count > 0 ? `${w.exercise_count}종목 ${w.set_count}세트` : '근력 기록 없음'}
                            {w.cardio_minutes != null && `, 유산소 ${w.cardio_minutes}분`}
                          </span>
                        </span>
                        <ChevronRight style={{ width: 18, height: 18, color: 'var(--muted)', transform: open === w.id ? 'rotate(90deg)' : undefined, transition: 'transform 150ms' }} />
                      </button>
                      {open === w.id && <Detail id={w.id} date={w.date} />}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
      </div>
    </>
  )
}

function Detail({ id, date }: { id: number; date: string }) {
  const { data } = useWorkout(id)
  const exercises = useExercises()
  if (!data || !exercises.data) return <p className="muted" style={{ padding: '10px 0 0 60px' }}>불러오는 중…</p>
  const nameOf = (eid: number) => exercises.data.find((e) => e.id === eid)?.name ?? `#${eid}`
  const order = [...new Set(data.sets.map((s) => s.exercise_id))]

  return (
    <div className="stack" style={{ padding: '12px 0 4px 60px', gap: 8 }}>
      {order.map((eid) => {
        const sets = data.sets.filter((s) => s.exercise_id === eid)
        return (
          <div key={eid} className="row" style={{ alignItems: 'baseline' }}>
            <span className="grow" style={{ fontWeight: 600 }}>
              {nameOf(eid)}
              {sets.some((s) => s.kind === 'find') && (
                <span className="pill find" style={{ marginLeft: 8 }}>
                  무게 찾기
                </span>
              )}
            </span>
            <span className="num muted" style={{ fontSize: 16 }}>
              {summarizeSets(sets)}
            </span>
          </div>
        )
      })}
      {data.notes && <p className="row-sub">{data.notes}</p>}
      <Link to={`/workout?date=${date}`} className="btn btn-secondary btn-sm" style={{ justifySelf: 'start' }}>
        이 날 열어서 수정
      </Link>
    </div>
  )
}
