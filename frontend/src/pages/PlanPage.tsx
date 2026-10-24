import { useState } from 'react'
import { useCreateRoutine, useExercises, useMuscles, usePhases, useRoutine, useRoutines } from '../api/hooks'
import type { Phase } from '../api/types'
import PisteTimeline from '../components/PisteTimeline'
import ExerciseEditor from '../components/plan/ExerciseEditor'
import PhaseDayEditor from '../components/plan/PhaseDayEditor'
import PhaseEditor from '../components/plan/PhaseEditor'
import css from '../components/plan/Plan.module.css'
import RoutineEditor from '../components/plan/RoutineEditor'
import { PlusIcon } from '../components/icons'
import { useToast } from '../components/Toast'
import { formatShort, todayISO, weekdayLabel } from '../lib/date'
import { EQUIPMENT_LABEL, kg } from '../lib/format'
import { shortTitle } from '../lib/status'

type Tab = 'phases' | 'routines' | 'exercises'
const TABS: [Tab, string][] = [
  ['phases', '단계·요일'],
  ['routines', '루틴'],
  ['exercises', '종목'],
]

const isCurrent = (p: Phase, today: string) => p.start_date <= today && (!p.end_date || today <= p.end_date)

export default function PlanPage() {
  const [tab, setTab] = useState<Tab>('phases')
  const phases = usePhases().data
  const today = todayISO()
  const current = phases?.find((p) => isCurrent(p, today))
  const trainDays = current?.days.filter((d) => d.kind !== 'rest').map((d) => weekdayLabel(d.weekday)) ?? []
  const restDays = current?.days.filter((d) => d.kind === 'rest').map((d) => weekdayLabel(d.weekday)) ?? []

  return (
    <>
      <header className="page-header">
        <div className="titles">
          <h1 className="page-title">플랜</h1>
          <p className="page-sub">
            요일 계획과 루틴, 종목을 여기서 바꿉니다.
            {current && ` 지금은 ${trainDays.join('·')} 운동, ${restDays.join('·')} 휴식이에요.`}
          </p>
        </div>
        <div className="seg" role="tablist">
          {TABS.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>
      </header>
      {tab === 'phases' && <Phases phases={phases} today={today} />}
      {tab === 'routines' && <Routines />}
      {tab === 'exercises' && <Exercises />}
    </>
  )
}

function Phases({ phases, today }: { phases: Phase[] | undefined; today: string }) {
  const [editing, setEditing] = useState<string | null>(null)
  if (!phases) return <div className="skeleton lg" />

  return (
    <div className="grid">
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">1년 플랜</h2>
          {editing !== 'new' && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
              <PlusIcon /> 새 단계
            </button>
          )}
        </div>
        <PisteTimeline phases={phases} today={today} />
      </section>
      {editing === 'new' && (
        <section className="panel" aria-label="새 단계">
          <h2 className="panel-title mb-lg">새 단계</h2>
          <PhaseEditor phases={phases} onDone={() => setEditing(null)} />
        </section>
      )}
      <div className="grid cols-2">
        {phases.map((p) => (
          <section key={p.id} className={`panel${isCurrent(p, today) ? ` ${css.current}` : ''}`}>
            <div className="panel-head">
              <h2 className="panel-title">{p.name}</h2>
              {isCurrent(p, today) && <span className="pill strength">진행 중</span>}
              {editing !== `${p.id}-period` && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(`${p.id}-period`)} aria-label={`${p.name} 이름과 기간 수정`}>
                  기간 수정
                </button>
              )}
            </div>
            {editing === `${p.id}-period` ? (
              <PhaseEditor phase={p} phases={phases} onDone={() => setEditing(null)} />
            ) : (
              <>
                <p className={`num ${css.dates}`}>
                  {formatShort(p.start_date)} – {p.end_date ? formatShort(p.end_date) : '끝 없음'}
                </p>
                <ul className={css.days}>
                  {[...p.days]
                    .sort((a, b) => a.weekday - b.weekday)
                    .map((d) => {
                      const key = `${p.id}-${d.weekday}`
                      return (
                        <li key={d.weekday} className="block">
                          {editing === key ? (
                            <PhaseDayEditor phaseId={p.id} day={d} onDone={() => setEditing(null)} />
                          ) : (
                            <button type="button" className={css.dayRow} onClick={() => setEditing(key)} aria-label={`${weekdayLabel(d.weekday)}요일 계획 수정`}>
                              <span className={css.wd}>{weekdayLabel(d.weekday)}</span>
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
                              <span className={css.editHint}>수정</span>
                            </button>
                          )}
                        </li>
                      )
                    })}
                </ul>
              </>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

function Routines() {
  const { data } = useRoutines()
  const create = useCreateRoutine()
  const toast = useToast()
  const [id, setId] = useState<number | null>(null)
  const selected = id ?? data?.[0]?.id ?? null
  const routine = useRoutine(selected)

  async function addRoutine() {
    const base = '새 루틴'
    const names = new Set(data?.map((r) => r.name))
    let name = base
    for (let n = 2; names.has(name); n++) name = `${base} ${n}`
    const r = await create.mutateAsync({ name, items: [] })
    setId(r.id)
    toast(`${name}을 만들었습니다. 이름과 종목을 정하세요`)
  }

  return (
    <div className="grid">
      <div className="row wrap">
        {data?.map((r) => (
          <button key={r.id} className={`btn btn-sm ${r.id === selected ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setId(r.id)}>
            {r.name}
            <span className={css.count}>{r.item_count}</span>
          </button>
        ))}
        <button className="btn btn-primary btn-sm" onClick={addRoutine} disabled={create.isPending}>
          <PlusIcon /> 새 루틴
        </button>
      </div>
      {routine.data && <RoutineEditor key={`${routine.data.id}-${routine.dataUpdatedAt}`} routine={routine.data} onDeleted={() => setId(null)} />}
    </div>
  )
}

function Exercises() {
  const { data } = useExercises()
  const labels = new Map((useMuscles().data ?? []).map((m) => [m.muscle, m.label]))
  const [open, setOpen] = useState<number | 'new' | null>(null)
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const list = (data ?? []).filter((e) => (showArchived || !e.archived) && e.name.includes(query.trim()))

  return (
    <div className="grid">
      <div className="row wrap">
        <input className={`input ${css.search}`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="종목 검색" aria-label="종목 검색" />
        <label className="check">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          보관한 종목도 보기
        </label>
        <span className="grow" />
        <button className="btn btn-primary btn-sm" onClick={() => setOpen('new')}>
          <PlusIcon /> 새 종목
        </button>
      </div>
      {open === 'new' && (
        <section className="panel">
          <h2 className="panel-title mb-lg">새 종목</h2>
          <ExerciseEditor onDone={() => setOpen(null)} />
        </section>
      )}
      <div className="grid cols-2">
        {list.map((e) => (
          <section key={e.id} className={`panel stack tight${e.archived ? ` ${css.archived}` : ''}`}>
            <div className="row">
              <div className="grow">
                <h3 className="row-title">
                  {e.name}
                  {e.archived && <span className="pill ml-sm">보관</span>}
                </h3>
                <p className="row-sub">
                  {EQUIPMENT_LABEL[e.equipment]}, 한 번에 {kg(e.increment_kg)}씩, 휴식 {e.rest_sec}초{e.unilateral && ', 좌우 따로'}
                </p>
                <p className="row-sub">
                  {e.muscles.length
                    ? e.muscles.map((m) => `${labels.get(m.muscle) ?? m.muscle}${m.role === 'secondary' ? '(보조)' : ''}`).join(', ')
                    : '근육 미지정'}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id}>
                {open === e.id ? '닫기' : '수정'}
              </button>
            </div>
            {open === e.id && <ExerciseEditor exercise={e} onDone={() => setOpen(null)} />}
          </section>
        ))}
      </div>
    </div>
  )
}
