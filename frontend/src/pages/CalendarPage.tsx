import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCalendar, useExercises, useRoutine, useWorkout } from '../api/hooks'
import type { CalendarDay } from '../api/types'
import { ChevronLeft, ChevronRight } from '../components/icons'
import MonthCalendar from '../components/MonthCalendar'
import { formatLong, todayISO } from '../lib/date'
import { kg, summarizeSets } from '../lib/format'
import { dayStatus, KIND_LABEL, shortTitle, STATUS_LABEL } from '../lib/status'

function shiftMonth(month: string, n: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function CalendarPage() {
  const today = todayISO()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [selected, setSelected] = useState<string | null>(today)
  const { data, isPending, isError, error } = useCalendar(month)

  const sel = data?.find((d) => d.date === selected) ?? null
  const done = data?.filter((d) => d.done).length ?? 0
  const planned = data?.filter((d) => d.kind && d.kind !== 'rest' && d.date <= today).length ?? 0

  const go = (n: number) => {
    const next = shiftMonth(month, n)
    setMonth(next)
    setSelected(today.startsWith(next) ? today : null)
  }

  return (
    <>
      <header className="page-header">
        <div className="titles">
          <h1 className="page-title">달력</h1>
          <p className="page-sub">
            이번 달 {done}번 운동했어요{planned > 0 && ` (지난 운동일 ${planned}일 중)`}
          </p>
        </div>
      </header>

      <div className="grid cols-cal">
        <section className="panel">
          <div className="cal-toolbar">
            <button className="icon-btn" onClick={() => go(-1)} aria-label="이전 달">
              <ChevronLeft />
            </button>
            <h2 className="cal-month">{month.replace('-', '.')}</h2>
            <button className="icon-btn" onClick={() => go(1)} aria-label="다음 달">
              <ChevronRight />
            </button>
            <span className="grow" />
            {!today.startsWith(month) && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setMonth(today.slice(0, 7))
                  setSelected(today)
                }}
              >
                오늘
              </button>
            )}
          </div>
          {isPending && <div className="skeleton" style={{ height: 420 }} />}
          {isError && <p className="error-text">{error.message}</p>}
          {data && <MonthCalendar days={data} today={today} selected={selected} onSelect={setSelected} />}
          <div className="cal-legend">
            <span>
              <i className="dot strength" /> 근력
            </span>
            <span>
              <i className="dot cardio" /> 유산소
            </span>
            <span>
              <i className="dot hit" /> 완료
            </span>
            <span>
              <i className="dot miss" /> 빠짐
            </span>
            <span>
              <i className="dot skipped" /> 못 함
            </span>
            <span>
              <i className="dot" /> 휴식
            </span>
          </div>
        </section>

        <aside className="sticky-aside">{sel ? <DayDetail day={sel} today={today} /> : <div className="panel empty">날짜를 고르면 그날 계획과 기록이 보입니다</div>}</aside>
      </div>
    </>
  )
}

function DayDetail({ day, today }: { day: CalendarDay; today: string }) {
  const st = dayStatus(day, today)
  const routine = useRoutine(day.routine?.id ?? null)
  const workout = useWorkout(day.workout_id)
  const exercises = useExercises()
  const nameOf = (id: number) => exercises.data?.find((e) => e.id === id)?.name ?? `#${id}`

  const groups = workout.data
    ? [...new Set(workout.data.sets.map((s) => s.exercise_id))].map((id) => ({
        id,
        sets: workout.data!.sets.filter((s) => s.exercise_id === id),
      }))
    : []

  return (
    <section className="panel stack" aria-label={`${day.date} 상세`}>
      <div className="row">
        <h2 className="panel-title">{formatLong(day.date)}</h2>
        {STATUS_LABEL[st] && <span className={`pill ${st === 'done' ? 'hit' : st === 'missed' ? 'miss' : day.kind ?? ''}`}>{STATUS_LABEL[st]}</span>}
      </div>

      {day.kind ? (
        <div>
          <p className="row-title">{day.kind === 'rest' ? '휴식' : shortTitle(day)}</p>
          <p className="row-sub">
            {day.phase} · {KIND_LABEL[day.kind]}
            {day.cardio_minutes != null && ` · 유산소 ${day.cardio_minutes}분`}
          </p>
        </div>
      ) : (
        <p className="muted">플랜 기간이 아닙니다</p>
      )}

      {workout.data && (
        <div className="stack" style={{ gap: 8 }}>
          <p className="field-label">기록 · {workout.data.title}</p>
          <ul className="rows">
            {groups.map((g) => (
              <li key={g.id} style={{ alignItems: 'flex-start' }}>
                <span className="grow" style={{ fontWeight: 600 }}>
                  {nameOf(g.id)}
                </span>
                <span className="muted num" style={{ fontSize: 16, textAlign: 'right' }}>
                  {summarizeSets(g.sets)}
                </span>
              </li>
            ))}
          </ul>
          {workout.data.cardio_minutes != null && <p className="row-sub">유산소 {workout.data.cardio_minutes}분</p>}
          {workout.data.notes && <p className="row-sub">{workout.data.notes}</p>}
        </div>
      )}

      {!day.done && routine.data && (
        <div className="stack" style={{ gap: 8 }}>
          <p className="field-label">할 종목</p>
          <ul className="rows">
            {routine.data.items.map((it) => (
              <li key={it.id}>
                <span className="grow">{it.exercise.name}</span>
                <span className="muted num" style={{ fontSize: 16 }}>
                  {it.sets}×{it.duration_sec ? `${it.duration_sec}초` : it.rep_min === it.rep_max ? it.rep_max : `${it.rep_min}–${it.rep_max}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {day.body_weight_kg != null && <p className="row-sub">체중 {kg(day.body_weight_kg)}</p>}

      <Link to={day.date === today ? '/workout' : `/workout?date=${day.date}`} className="btn btn-primary btn-block">
        {day.done ? '기록 열기' : day.date > today ? '미리 보기' : '기록하기'}
      </Link>
    </section>
  )
}
