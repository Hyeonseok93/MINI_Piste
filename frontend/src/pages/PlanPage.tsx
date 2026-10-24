import { useState } from 'react'
import { useExercises, usePhases, useRoutine, useRoutines, useUpdateExercise } from '../api/hooks'
import type { Exercise } from '../api/types'
import PisteTimeline from '../components/PisteTimeline'
import { useToast } from '../components/Toast'
import { formatShort, todayISO, weekdayLabel } from '../lib/date'
import { EQUIPMENT_LABEL, kg, targetShort } from '../lib/format'
import { shortTitle } from '../lib/status'

type Tab = 'phases' | 'routines' | 'exercises'

export default function PlanPage() {
  const [tab, setTab] = useState<Tab>('phases')
  const phases = usePhases().data
  const today = todayISO()
  const current = phases?.find((p) => p.start_date <= today && (!p.end_date || today <= p.end_date))
  const trainDays = current?.days.filter((d) => d.kind !== 'rest').map((d) => weekdayLabel(d.weekday)) ?? []
  const restDays = current?.days.filter((d) => d.kind === 'rest').map((d) => weekdayLabel(d.weekday)) ?? []
  return (
    <>
      <header className="page-header">
        <div className="titles">
          <h1 className="page-title">플랜</h1>
          <p className="page-sub">
            체지방 감량과 근력 유지·증가를 위한 1년 계획입니다.
            {current && ` 지금은 ${trainDays.join('·')} 운동, ${restDays.join('·')} 휴식.`}
          </p>
        </div>
        <div className="seg" role="tablist">
          {(
            [
              ['phases', '단계'],
              ['routines', '루틴'],
              ['exercises', '종목'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>
      </header>
      {tab === 'phases' && <Phases />}
      {tab === 'routines' && <Routines />}
      {tab === 'exercises' && <Exercises />}
    </>
  )
}

function Phases() {
  const { data } = usePhases()
  const today = todayISO()
  if (!data) return <div className="skeleton lg" />

  return (
    <div className="grid">
      <section className="panel">
        <PisteTimeline phases={data} today={today} />
      </section>
      <div className="grid cols-2">
        {data.map((p) => {
          const current = p.start_date <= today && (!p.end_date || today <= p.end_date)
          return (
            <section key={p.id} className="panel" style={current ? { borderColor: 'var(--ink)' } : undefined}>
              <div className="panel-head">
                <h2 className="panel-title">{p.name}</h2>
                {current && <span className="pill strength">진행 중</span>}
              </div>
              <p className="row-sub num num-md phase-dates">
                {formatShort(p.start_date)} – {p.end_date ? formatShort(p.end_date) : ''}
              </p>
              <ul className="rows">
                {[...p.days]
                  .sort((a, b) => a.weekday - b.weekday)
                  .map((d) => (
                    <li key={d.weekday} className="compact">
                      <span className="muted wd-label">
                        {weekdayLabel(d.weekday)}
                      </span>
                      <span className={`dot ${d.kind}`} />
                      <span className={`grow${d.kind === 'rest' ? ' muted' : ''}`}>
                        {d.routine ? (
                          <>
                            <b>{shortTitle(d)}</b>
                            {d.alt_routine && <span className="muted">, 격주 {d.alt_routine.name}</span>}
                          </>
                        ) : (
                          d.label
                        )}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Routines() {
  const { data } = useRoutines()
  const [id, setId] = useState<number | null>(null)
  const selected = id ?? data?.[0]?.id ?? null
  const routine = useRoutine(selected)

  return (
    <div className="grid">
      <div className="row wrap">
        {data?.map((r) => (
          <button key={r.id} className={`btn btn-sm ${r.id === selected ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setId(r.id)}>
            {r.name}
          </button>
        ))}
      </div>
      {routine.data && (
        <section className="panel narrow-sm">
          <div className="panel-head">
            <h2 className="panel-title">{routine.data.name}</h2>
            <span className="muted">{routine.data.description}</span>
          </div>
          <ol className="rows">
            {routine.data.items.map((it) => (
              <li key={it.id}>
                <span className="ex-pos">{it.position}</span>
                <span className="grow">
                  <span className="row-title block">
                    {it.exercise.name}
                  </span>
                  {it.exercise.alternative && <span className="row-sub">없으면 {it.exercise.alternative}</span>}
                </span>
                <span className="num num-lg">
                  {targetShort(it)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}

function Exercises() {
  const { data } = useExercises()
  return (
    <div className="grid cols-2">
      {data?.map((e) => (
        <ExerciseRow key={e.id} exercise={e} />
      ))}
    </div>
  )
}

function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const update = useUpdateExercise()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [inc, setInc] = useState(String(exercise.increment_kg))
  const [note, setNote] = useState(exercise.setup_note ?? '')

  return (
    <section className="panel stack tight">
      <div className="row">
        <div className="grow">
          <h3 className="row-title">{exercise.name}</h3>
          <p className="row-sub">
            {EQUIPMENT_LABEL[exercise.equipment]}, 한 번에 {kg(exercise.increment_kg)}씩 증량
            {exercise.unilateral && ', 좌우 따로'}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(!editing)} aria-expanded={editing}>
          {editing ? '닫기' : '수정'}
        </button>
      </div>
      {!editing && exercise.setup_note && <p className="cue">{exercise.setup_note}</p>}
      {editing && (
        <form
          className="form-grid"
          onSubmit={(ev) => {
            ev.preventDefault()
            update.mutate(
              { id: exercise.id, body: { increment_kg: Number(inc), setup_note: note.trim() || null } },
              {
                onSuccess: () => {
                  setEditing(false)
                  toast(`${exercise.name} 정보를 저장했습니다`)
                },
              },
            )
          }}
        >
          <label className="field">
            <span className="field-label">증량 단위</span>
            <span className="input-suffix">
              <input className="input" inputMode="decimal" value={inc} onChange={(e) => setInc(e.target.value)} />
              <span>kg</span>
            </span>
          </label>
          <label className="field">
            <span className="field-label">세팅 메모 (의자 높이, 패드 위치)</span>
            <textarea className="textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          {update.isError && <p className="error-text">{update.error.message}</p>}
          <button className="btn btn-primary btn-sm" type="submit" disabled={update.isPending}>
            저장
          </button>
        </form>
      )}
    </section>
  )
}
