import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDeleteWorkout, useExercises, useFinderChoices, useSetRestDay, useToday, useUpdateWorkout } from '../api/hooks'
import type { SetInput, Today, Workout } from '../api/types'
import { useWorkoutSession } from '../hooks/useWorkoutSession'
import DailyLogForm from '../components/DailyLogForm'
import ExerciseCard from '../components/ExerciseCard'
import { ChevronLeft, ChevronRight } from '../components/icons'
import { useConfirm } from '../components/Confirm'
import Select from '../components/Select'
import { useToast } from '../components/Toast'
import { EQUIPMENT_LABEL } from '../lib/format'
import { addDays, formatLong, formatShort, todayISO } from '../lib/date'
import { KIND_LABEL } from '../lib/status'
import css from './WorkoutPage.module.css'

export default function WorkoutPage() {
  const [params, setParams] = useSearchParams()
  const today = todayISO()
  const date = params.get('date') ?? today
  const setDate = (d: string) => setParams(d === today ? {} : { date: d })
  const { data, isPending, isError, error, refetch } = useToday(date)

  const title = data ? (data.workout?.title ?? data.plan.routine?.name ?? (data.plan.kind ? KIND_LABEL[data.plan.kind] : '자유 운동')) : '운동'

  return (
    <div className="page-col">
      <header className="page-header">
        <div className="titles">
          <p className="page-date">
            {formatLong(date)}
            {data?.plan.phase && `, ${data.plan.phase}`}
          </p>
          <h1 className="page-title">{title}</h1>
          {data?.plan.label && <p className="page-sub">{data.plan.label}</p>}
        </div>
        <div className="row wrap">
          {data && data.items.length > 0 && (
            <Link to={`/session${date === today ? '' : `?date=${date}`}`} className="btn btn-primary">
              운동 모드 시작
            </Link>
          )}
          {date !== today && (
            <button className="btn btn-secondary" onClick={() => setDate(today)}>
              오늘
            </button>
          )}
          <div className={css.dateNav}>
            <button className="icon-btn" aria-label="전날" onClick={() => setDate(addDays(date, -1))}>
              <ChevronLeft />
            </button>
            <span className={`num ${css.dateLabel}`}>
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
    </div>
  )
}

function WorkoutView({ date, data }: { date: string; data: Today }) {
  const { plan, items, workout, daily_log } = data
  const exercises = useExercises()
  const finderChoices = useFinderChoices().data ?? []
  const session = useWorkoutSession(date, data)
  const { ensureWorkout, setsOf, doneCount } = session
  const deleteWorkout = useDeleteWorkout()
  const toast = useToast()
  const confirm = useConfirm()
  const [extraIds, setExtraIds] = useState<number[]>([])

  const onAdd = async (body: SetInput) => {
    const s = await session.addSet(body)
    toast(`${s.set_no}세트 기록됨`)
    return s
  }
  const routineIds = new Set(items.map((i) => i.item.exercise.id))
  const loggedExtra = [...new Set((workout?.sets ?? []).map((s) => s.exercise_id))].filter((id) => !routineIds.has(id))
  const extras = [...new Set([...loggedExtra, ...extraIds])].map((id) => exercises.data?.find((e) => e.id === id)).filter((e) => e != null)

  const isRest = plan.kind == null || plan.kind === 'rest'
  const restDay = daily_log?.rest_day ?? false

  return (
    <div className="stack loose">
      {restDay && !workout && (
        <div className={css.banner} role="status">
          <b>이 날은 '못 함'으로 표시했어요.</b> 달력에 원래 일정과 함께 회색으로 표시되고, 안 한 날이라 연속 기록이 끊기고 출석률에도 들어갑니다. 운동을 하게 되면 세트를 기록하거나 표시를 취소하세요.
        </div>
      )}
      {items.length > 0 && (
        <section className="panel stack">
          <div className="row">
            <h2 className="panel-title">진행</h2>
            <span className="num num-lg">
              {doneCount}/{items.length}
            </span>
          </div>
          <div className={css.progress} role="progressbar" aria-label="종목 진행" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={doneCount}>
            <span style={{ width: `${(doneCount / items.length) * 100}%` }} />
          </div>
          <p className="row-sub">세트마다 2~3개 남기고 멈추세요. 모든 세트를 목표 횟수까지 채우면 다음에 무게가 올라갑니다.</p>
        </section>
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
          onDelete={session.removeSet}
        />
      ))}
      {extras.map((ex, i) => (
        <ExerciseCard key={`x-${ex.id}`} index={items.length + i + 1} exercise={ex} sets={setsOf(ex.id)} finderChoices={finderChoices} onAdd={onAdd} onDelete={session.removeSet} />
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
      {!isRest && !workout && <RestToggle date={date} rest={restDay} />}
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">유산소와 메모</h2>
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
              message: `${workout.title}, 세트 ${workout.sets.length}개${workout.cardio_minutes != null ? `, 유산소 ${workout.cardio_minutes}분` : ''}. 삭제하면 되돌릴 수 없습니다.`,
              confirmLabel: '삭제',
              danger: true,
            })
            if (!ok) return
            session.resetPending()
            await deleteWorkout.mutateAsync(workout.id)
            toast('운동 기록을 삭제했습니다')
          }}
        >
          이 날 운동 기록 삭제
        </button>
      )}
    </div>
  )
}

function RestToggle({ date, rest }: { date: string; rest: boolean }) {
  const setRest = useSetRestDay()
  const toast = useToast()
  return (
    <section className={`panel stack ${css.restPanel}${rest ? ` ${css.isRest}` : ''}`}>
      <div>
        <h2 className="panel-title">{rest ? '못 함으로 표시했어요' : '오늘 못 하나요?'}</h2>
        <p className="row-sub mt-xs">
          {rest ? '달력에 회색 \'못 함\'으로 표시돼요. 안 한 날이라 연속 기록이 끊기고 출석률에도 들어가요.' : '아프거나 일정이 생겼으면 못 함으로 표시하세요. 달력에 빨간 빠짐 대신 회색으로 남아요.'}
        </p>
      </div>
      <button
        className="btn btn-secondary"
        disabled={setRest.isPending}
        onClick={() =>
          setRest
            .mutateAsync({ date, rest: !rest })
            .then(() => toast(rest ? '못 함 표시를 취소했습니다' : '못 함으로 표시했습니다'))
            .catch(() => {}) // 오류는 화면의 isError 로 보여 준다
        }
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
        // 첫 저장 때 세션이 생기면 이 폼이 다시 그려지므로 콜백 대신 Promise 로 알린다
        await update
          .mutateAsync({ id: w.id, body: { cardio_minutes: cardio === '' ? null : Number(cardio), notes: notes.trim() || null } })
          .then(() => toast('저장했습니다'))
          .catch(() => {}) // 오류는 화면의 isError 로 보여 준다
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
