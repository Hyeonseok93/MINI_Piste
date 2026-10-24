import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAddSet, useCreateWorkout, useDeleteSet, useDeleteWorkout, useExercises, useFinderChoices, useSetRestDay, useToday, useUpdateWorkout } from '../api/hooks'
import type { SetInput, Today, Workout } from '../api/types'
import DailyLogForm from '../components/DailyLogForm'
import ExerciseCard from '../components/ExerciseCard'
import { ChevronLeft, ChevronRight } from '../components/icons'
import { useConfirm } from '../components/Confirm'
import Select from '../components/Select'
import { useToast } from '../components/Toast'
import { EQUIPMENT_LABEL } from '../lib/format'
import { addDays, formatLong, formatShort, todayISO } from '../lib/date'
import { KIND_LABEL } from '../lib/status'

export default function WorkoutPage() {
  const [params, setParams] = useSearchParams()
  const today = todayISO()
  const date = params.get('date') ?? today
  const setDate = (d: string) => setParams(d === today ? {} : { date: d })
  const { data, isPending, isError, error, refetch } = useToday(date)

  const title = data ? (data.workout?.title ?? data.plan.routine?.name ?? (data.plan.kind ? KIND_LABEL[data.plan.kind] : '자유 운동')) : '운동'

  return (
    <>
      <header className="page-header">
        <div className="titles">
          <p className="greet-date">
            {formatLong(date)}
            {data?.plan.phase && ` · ${data.plan.phase}`}
          </p>
          <h1 className="page-title">{title}</h1>
          {data?.plan.label && <p className="page-sub">{data.plan.label}</p>}
        </div>
        <div className="row">
          {date !== today && (
            <button className="btn btn-secondary btn-sm" onClick={() => setDate(today)}>
              오늘
            </button>
          )}
          <div className="date-nav">
            <button className="icon-btn" aria-label="전날" onClick={() => setDate(addDays(date, -1))}>
              <ChevronLeft />
            </button>
            <span className="label num num-md">
              {formatShort(date)}
            </span>
            <button className="icon-btn" aria-label="다음날" onClick={() => setDate(addDays(date, 1))}>
              <ChevronRight />
            </button>
          </div>
        </div>
      </header>

      {isPending && <div className="skeleton lg" />}
      {isError && (
        <div className="panel stack">
          <p className="error-text">{error.message}</p>
          <button className="btn btn-secondary" onClick={() => refetch()}>
            다시 시도
          </button>
        </div>
      )}
      {data && <WorkoutView key={date} date={date} data={data} />}
    </>
  )
}

function WorkoutView({ date, data }: { date: string; data: Today }) {
  const { plan, items, workout, daily_log } = data
  const exercises = useExercises()
  const finderChoices = useFinderChoices().data ?? []
  const createWorkout = useCreateWorkout()
  const addSet = useAddSet()
  const deleteSet = useDeleteSet()
  const deleteWorkout = useDeleteWorkout()
  const toast = useToast()
  const confirm = useConfirm()
  const [extraIds, setExtraIds] = useState<number[]>([])
  // 생성 요청 중 연타해도 세션이 하나만 생기도록 진행 중인 요청을 공유한다
  const pending = useRef<Promise<Workout> | null>(null)

  /** 처음 기록하는 순간 그날 세션을 자동으로 만든다 */
  function ensureWorkout(): Promise<Workout> {
    if (workout) return Promise.resolve(workout)
    pending.current ??= createWorkout.mutateAsync({
      date,
      routine_id: plan.routine?.id ?? null,
      title: plan.routine ? null : plan.kind ? KIND_LABEL[plan.kind] : '자유 운동',
    })
    pending.current.catch(() => (pending.current = null))
    return pending.current
  }

  const onAdd = async (body: SetInput) => {
    const w = await ensureWorkout()
    const s = await addSet.mutateAsync({ workoutId: w.id, body })
    toast(`${s.set_no}세트 기록됨`)
    return s
  }

  const setsOf = (id: number) => (workout?.sets ?? []).filter((s) => s.exercise_id === id)
  const routineIds = new Set(items.map((i) => i.item.exercise.id))
  const loggedExtra = [...new Set((workout?.sets ?? []).map((s) => s.exercise_id))].filter((id) => !routineIds.has(id))
  const extras = [...new Set([...loggedExtra, ...extraIds])].map((id) => exercises.data?.find((e) => e.id === id)).filter((e) => e != null)

  const doneCount = items.filter((i) => {
    const goal = i.item.sets * (i.item.exercise.unilateral ? 2 : 1)
    return setsOf(i.item.exercise.id).filter((s) => s.kind === 'work').length >= goal
  }).length
  const isRest = plan.kind == null || plan.kind === 'rest'
  const restDay = daily_log?.rest_day ?? false

  return (
    <div className="grid cols-main-aside">
      <div className="stack">
        {restDay && !workout && (
          <div className="rest-banner" role="status">
            <b>이 날은 '못 함'으로 표시했어요.</b> 달력에 원래 일정과 함께 회색으로 표시되고 빠짐으로 세지 않습니다. 운동을 하게 되면 세트를 기록하거나 표시를 취소하세요.
          </div>
        )}
        {items.length === 0 && (
          <div className="panel empty">
            {isRest ? '오늘은 쉬는 날입니다. 몸 상태만 기록해 두세요.' : '오늘은 근력 종목이 없는 날입니다. 유산소 시간을 기록하세요.'}
          </div>
        )}
        {items.map((it, i) => (
          <ExerciseCard
            key={it.item.id}
            index={i + 1}
            exercise={it.item.exercise}
            item={it.item}
            recommendation={it.recommendation}
            last={it.last}
            sets={setsOf(it.item.exercise.id)}
            finderChoices={finderChoices}
            onAdd={onAdd}
            onDelete={(id) => deleteSet.mutate(id)}
          />
        ))}
        {extras.map((ex, i) => (
          <ExerciseCard key={`x-${ex.id}`} index={items.length + i + 1} exercise={ex} sets={setsOf(ex.id)} finderChoices={finderChoices} onAdd={onAdd} onDelete={(id) => deleteSet.mutate(id)} />
        ))}
        {exercises.data && (
          <div className="field">
            <span className="field-label">다른 종목 추가</span>
            <Select
              label="다른 종목 추가"
              placeholder="루틴에 없는 종목을 골라 기록"
              searchable
              resetAfterSelect
              value={null}
              onChange={(id) => setExtraIds((p) => [...p, id])}
              options={exercises.data
                .filter((e) => !e.archived && !routineIds.has(e.id) && !extras.some((x) => x.id === e.id))
                .map((e) => ({ value: e.id, label: e.name, hint: EQUIPMENT_LABEL[e.equipment] }))}
            />
          </div>
        )}
      </div>

      <aside className="stack">
        {items.length > 0 && (
          <section className="panel stack">
            <div className="row">
              <h2 className="panel-title">진행</h2>
              <span className="num num-lg">
                {doneCount}/{items.length}
              </span>
            </div>
            <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={doneCount}>
              <span style={{ width: `${(doneCount / items.length) * 100}%` }} />
            </div>
            <p className="row-sub">세트마다 2~3개 남기고 멈추세요. 모든 세트를 목표 횟수까지 채우면 다음에 무게가 올라갑니다.</p>
          </section>
        )}

        {!isRest && !workout && <RestToggle date={date} rest={restDay} />}

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">유산소 · 메모</h2>
          </div>
          <WorkoutMeta key={workout?.id ?? 'none'} workout={workout} plannedCardio={plan.cardio_minutes} onEnsure={ensureWorkout} />
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">몸 상태</h2>
          </div>
          <DailyLogForm key={date} date={date} log={daily_log} />
        </section>

        {workout && (
          <button
            className="btn btn-danger"
            onClick={async () => {
              const ok = await confirm({
                title: `${formatShort(date)} 운동 기록을 삭제할까요?`,
                message: `${workout.title} · 세트 ${workout.sets.length}개${workout.cardio_minutes != null ? ` · 유산소 ${workout.cardio_minutes}분` : ''}. 삭제하면 되돌릴 수 없습니다.`,
                confirmLabel: '삭제',
                danger: true,
              })
              if (!ok) return
              pending.current = null
              deleteWorkout.mutate(workout.id, { onSuccess: () => toast('운동 기록을 삭제했습니다') })
            }}
          >
            이 날 운동 기록 삭제
          </button>
        )}
      </aside>
    </div>
  )
}

function RestToggle({ date, rest }: { date: string; rest: boolean }) {
  const setRest = useSetRestDay()
  const toast = useToast()
  return (
    <section className={`panel stack rest-panel${rest ? ' is-rest' : ''}`}>
      <div>
        <h2 className="panel-title">{rest ? '못 함으로 표시했어요' : '오늘 못 하나요?'}</h2>
        <p className="row-sub mt-xs">
          {rest ? '달력에 회색 \'못 함\'으로 표시되고, 출석률과 연속 기록에서 빠짐으로 세지 않아요.' : '아프거나 일정이 생겼으면 못 함으로 표시하세요. 빠짐으로 세지 않습니다.'}
        </p>
      </div>
      <button
        className={`btn ${rest ? 'btn-secondary' : 'btn-ghost rest-btn'}`}
        disabled={setRest.isPending}
        onClick={() => setRest.mutate({ date, rest: !rest }, { onSuccess: () => toast(rest ? '못 함 표시를 취소했습니다' : '못 함으로 표시했습니다') })}
      >
        {rest ? '못 함 표시 취소' : '오늘은 못 함'}
      </button>
    </section>
  )
}

function WorkoutMeta({ workout, plannedCardio, onEnsure }: { workout: Workout | null; plannedCardio: number | null; onEnsure: () => Promise<Workout> }) {
  const update = useUpdateWorkout()
  const toast = useToast()
  const initCardio = workout?.cardio_minutes != null ? String(workout.cardio_minutes) : ''
  const [cardio, setCardio] = useState(initCardio)
  const [notes, setNotes] = useState(workout?.notes ?? '')
  const dirty = cardio !== initCardio || notes !== (workout?.notes ?? '')

  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault()
        const w = await onEnsure()
        update.mutate(
          { id: w.id, body: { cardio_minutes: cardio === '' ? null : Number(cardio), notes: notes.trim() || null } },
          { onSuccess: () => toast('저장했습니다') },
        )
      }}
    >
      <label className="field">
        <span className="field-label">유산소{plannedCardio != null && ` (목표 ${plannedCardio}분)`}</span>
        <div className="row">
          <span className="input-suffix grow">
            <input className="input" inputMode="numeric" value={cardio} onChange={(e) => setCardio(e.target.value)} placeholder="0" />
            <span>분</span>
          </span>
          {plannedCardio != null && cardio === '' && (
            <button type="button" className="btn btn-secondary" onClick={() => setCardio(String(plannedCardio))}>
              목표대로 했음
            </button>
          )}
        </div>
      </label>
      <label className="field">
        <span className="field-label">세션 메모</span>
        <textarea className="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="경사·속도, 기구 위치, 느낌" />
      </label>
      {update.isError && <p className="error-text">{update.error.message}</p>}
      <button className="btn btn-secondary" type="submit" disabled={!dirty || update.isPending}>
        {workout ? '저장' : '기록 시작'}
      </button>
    </form>
  )
}
