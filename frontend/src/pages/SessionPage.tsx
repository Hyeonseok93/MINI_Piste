import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useFinderChoices, usePRs, useToday } from '../api/hooks'
import type { PersonalRecord, SetInput, Today } from '../api/types'
import ExerciseCard from '../components/ExerciseCard'
import { ChevronLeft, ChevronRight, XIcon } from '../components/icons'
import { useToast } from '../components/Toast'
import { useRestTimer } from '../hooks/useRestTimer'
import { useWakeLock } from '../hooks/useWakeLock'
import { useWorkoutSession } from '../hooks/useWorkoutSession'
import { formatShort, todayISO } from '../lib/date'
import { primeAudio } from '../lib/feedback'
import { kg } from '../lib/format'
import css from './SessionPage.module.css'

/** 운동 모드: 한 종목씩 크게, 세트를 기록하면 휴식 타이머가 돈다. 헬스장에서 폰으로 쓰는 화면. */
export default function SessionPage() {
  const [params] = useSearchParams()
  const today = todayISO()
  const date = params.get('date') ?? today
  const { data, isError, error } = useToday(date)
  const prs = usePRs()
  useWakeLock(true)

  const back = date === today ? '/workout' : `/workout?date=${date}`
  if (isError) return <div className={`${css.session} ${css.state}`}>{error.message}</div>
  if (!data || !prs.data) return <div className={`${css.session} ${css.state}`}>불러오는 중…</div>
  if (data.items.length === 0)
    return (
      <div className={`${css.session} ${css.state}`}>
        <p>이 날은 근력 종목이 없습니다.</p>
        <Link to={back} className="btn btn-secondary mt-md">
          운동 화면으로
        </Link>
      </div>
    )
  return <Session date={date} data={data} prsBefore={prs.data} back={back} />
}

function Session({ date, data, prsBefore, back }: { date: string; data: Today; prsBefore: PersonalRecord[]; back: string }) {
  const { items } = data
  const session = useWorkoutSession(date, data)
  const finderChoices = useFinderChoices().data ?? []
  const toast = useToast()
  const timer = useRestTimer()

  // 세션을 열 때의 개인 기록. 이번에 넘으면 신기록으로 알려 준다
  const [best] = useState(() => new Map(prsBefore.map((p) => [p.exercise_id, p])))
  const [newPRs, setNewPRs] = useState<{ name: string; weight: number; reps: number }[]>([])

  const firstUndone = items.findIndex((i) => !session.isDone(i.item))
  const [index, setIndex] = useState(firstUndone < 0 ? 0 : firstUndone)
  const current = items[index]
  const allDone = session.doneCount === items.length

  const volume = useMemo(
    () => (session.workout?.sets ?? []).reduce((sum, s) => sum + s.weight_kg * (s.reps ?? 0), 0),
    [session.workout],
  )

  async function onAdd(body: SetInput) {
    const s = await session.addSet(body)
    const ex = current.item.exercise
    const prev = best.get(ex.id)
    const reps = s.reps ?? 0
    if (prev && s.weight_kg > 0 && (s.weight_kg > prev.best_weight_kg || (s.weight_kg === prev.best_weight_kg && reps > prev.best_weight_reps))) {
      best.set(ex.id, { ...prev, best_weight_kg: s.weight_kg, best_weight_reps: reps })
      setNewPRs((p) => [...p.filter((x) => x.name !== ex.name), { name: ex.name, weight: s.weight_kg, reps }])
      toast(`🏆 ${ex.name} 최고 기록 ${kg(s.weight_kg)} × ${reps}`)
    } else {
      toast(`${s.set_no}세트 기록됨`)
    }
    if (s.kind !== 'work') return s

    // 이 세트로 지금 종목을 다 했으면 다음 남은 종목으로 (화면의 기록은 아직 이전 값이라 +1 로 계산)
    const goal = current.item.sets * (ex.unilateral ? 2 : 1)
    const finishedThis = session.setsOf(ex.id).filter((x) => x.kind === 'work').length + 1 >= goal
    const others = items.map((it, k) => ({ it, k })).filter(({ it, k }) => k !== index && !session.isDone(it.item))
    if (finishedThis && others.length > 0) setIndex((others.find(({ k }) => k > index) ?? others[0]).k)
    // 마지막 종목의 마지막 세트가 아니면 휴식 시작
    if (!(finishedThis && others.length === 0)) timer.start(ex.rest_sec, ex.name)
    return s
  }

  const go = (d: number) => setIndex((i) => (i + d + items.length) % items.length)

  return (
    <div className={css.session} onPointerDown={primeAudio}>
      <header className={css.top}>
        <Link to={back} className="icon-btn" aria-label="운동 모드 끝내기">
          <XIcon />
        </Link>
        <div className="grow">
          <p className={css.title}>{data.workout?.title ?? data.plan.routine?.name}</p>
          <p className="muted">
            {formatShort(date)}, {session.doneCount}/{items.length} 종목
          </p>
        </div>
      </header>

      <nav className={css.steps} aria-label="종목 순서">
        {items.map((it, k) => (
          <button
            key={it.item.id}
            type="button"
            className={`${css.step}${k === index ? ` ${css.current}` : ''}${session.isDone(it.item) ? ` ${css.done}` : ''}`}
            aria-label={`${k + 1}. ${it.item.exercise.name}${session.isDone(it.item) ? ' 완료' : ''}`}
            aria-current={k === index ? 'step' : undefined}
            onClick={() => setIndex(k)}
          />
        ))}
      </nav>

      {allDone ? (
        <section className={`panel ${css.summary}`} aria-live="polite">
          <p className={css.finished}>오늘 근력 운동 끝</p>
          <h1 className={css.summaryTitle}>수고했어요</h1>
          <div className={css.stats}>
            <div>
              <b className="num">{session.workout?.sets.length ?? 0}</b>세트
            </div>
            <div>
              <b className="num">{Math.round(volume).toLocaleString()}</b>kg 볼륨
            </div>
            <div>
              <b className="num">{newPRs.length}</b>개 신기록
            </div>
          </div>
          {newPRs.length > 0 && (
            <ul className={`rows ${css.prs}`}>
              {newPRs.map((p) => (
                <li key={p.name}>
                  <span className="grow">🏆 {p.name}</span>
                  <span className="num num-md">
                    {kg(p.weight)} × {p.reps}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="row-sub">유산소와 메모는 운동 화면에서 기록하세요.</p>
          <Link to={back} className="btn btn-primary btn-lg btn-block">
            유산소·메모 기록하러 가기
          </Link>
        </section>
      ) : (
        <ExerciseCard
          key={current.item.id}
          index={index + 1}
          exercise={current.item.exercise}
          item={current.item}
          recommendation={current.recommendation}
          last={current.last}
          sets={session.setsOf(current.item.exercise.id)}
          finderChoices={finderChoices}
          onAdd={onAdd}
          onDelete={session.removeSet}
          big
        />
      )}

      {!allDone && (
        <div className={css.nav}>
          <button className="btn btn-secondary" onClick={() => go(-1)} aria-label="이전 종목">
            <ChevronLeft />
          </button>
          <span className={css.count}>
            {index + 1} / {items.length}
          </span>
          <button className="btn btn-secondary" onClick={() => go(1)} aria-label="다음 종목">
            <ChevronRight />
          </button>
        </div>
      )}

      {timer.running && <RestSheet remaining={timer.remaining} total={timer.total} label={timer.label} onAdd={timer.add} onSkip={timer.skip} />}
    </div>
  )
}

function RestSheet({ remaining, total, label, onAdd, onSkip }: { remaining: number; total: number; label: string; onAdd: (s: number) => void; onSkip: () => void }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const ratio = total > 0 ? remaining / total : 0
  const mm = Math.floor(remaining / 60)
  const ss = String(remaining % 60).padStart(2, '0')
  return (
    <section className={css.rest} role="timer" aria-label={`휴식 ${remaining}초 남음`}>
      <div className={css.ring}>
        <svg viewBox="0 0 120 120" aria-hidden>
          <circle cx="60" cy="60" r={r} className={css.track} />
          <circle cx="60" cy="60" r={r} className={css.fill} strokeDasharray={circ} strokeDashoffset={circ * (1 - ratio)} />
        </svg>
        <span className={`num ${css.time}`}>
          {mm}:{ss}
        </span>
      </div>
      <div>
        <p className={css.restLabel}>휴식 중</p>
        <p className="muted">{label} 다음 세트 준비</p>
        <div className="row wrap mt-sm">
          <button className="btn btn-secondary btn-sm" onClick={() => onAdd(-15)}>
            −15초
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => onAdd(30)}>
            +30초
          </button>
          <button className="btn btn-primary btn-sm" onClick={onSkip}>
            바로 시작
          </button>
        </div>
      </div>
    </section>
  )
}
