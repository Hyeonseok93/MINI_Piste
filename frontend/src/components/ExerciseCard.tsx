import { useState } from 'react'
import { api } from '../api/client'
import type { Exercise, FinderResult, Recommendation, RoutineItem, SetInput, SetKind, SetLog, Side } from '../api/types'
import { formatShort } from '../lib/date'
import { kg, summarizeSets } from '../lib/format'
import { CheckIcon, MinusIcon, PlusIcon, XIcon } from './icons'

interface Props {
  index: number
  exercise: Exercise
  item?: RoutineItem
  recommendation?: Recommendation
  last?: { date: string; sets: SetLog[] } | null
  sets: SetLog[]
  onAdd: (body: SetInput) => Promise<unknown>
  onDelete: (setId: number) => void
}

const KIND_LABEL: Record<SetKind, string> = { work: '', find: '찾기', warmup: '워밍업' }

const FINDER_CHOICES: { label: string; completed: boolean; rir: number | null }[] = [
  { label: '못 채움', completed: false, rir: null },
  { label: '0~1개', completed: true, rir: 1 },
  { label: '2~3개', completed: true, rir: 2 },
  { label: '4개', completed: true, rir: 4 },
  { label: '5개+', completed: true, rir: 5 },
]

function target(item?: RoutineItem): string {
  if (!item) return '루틴 외 종목'
  if (item.duration_sec) return `${item.sets}세트 × ${item.duration_sec}초`
  const reps = item.rep_min === item.rep_max ? `${item.rep_max}` : `${item.rep_min}–${item.rep_max}`
  return `${item.sets}세트 × ${reps}회`
}

function Stepper({ label, value, onChange, step, decimal }: { label: string; value: string; onChange: (v: string) => void; step: number; decimal?: boolean }) {
  const bump = (d: number) => onChange(String(Math.max(0, +(Number(value || 0) + d).toFixed(2))))
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="stepper">
        <button type="button" aria-label={`${label} 줄이기`} onClick={() => bump(-step)}>
          <MinusIcon />
        </button>
        <input inputMode={decimal ? 'decimal' : 'numeric'} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
        <button type="button" aria-label={`${label} 늘리기`} onClick={() => bump(step)}>
          <PlusIcon />
        </button>
      </div>
    </div>
  )
}

export default function ExerciseCard({ index, exercise, item, recommendation, last, sets, onAdd, onDelete }: Props) {
  const timed = item?.duration_sec != null
  const lastLogged = sets.filter((s) => s.kind !== 'warmup').at(-1)
  const initialWeight = lastLogged?.weight_kg ?? recommendation?.weight_kg ?? last?.sets.at(-1)?.weight_kg ?? 0
  const initialReps = item?.duration_sec ?? item?.rep_max ?? 12

  const [weight, setWeight] = useState(String(initialWeight))
  const [reps, setReps] = useState(String(initialReps))
  const [rir, setRir] = useState('')
  const [side, setSide] = useState<Side>('L')
  const [finding, setFinding] = useState(recommendation?.action === 'unknown' && !timed)
  const [finderResult, setFinderResult] = useState<FinderResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const workSets = sets.filter((s) => s.kind === 'work')
  const goal = item ? item.sets * (exercise.unilateral ? 2 : 1) : 0
  const done = item ? workSets.length >= goal : sets.length > 0
  const action = recommendation?.action ?? 'keep'

  async function submit(kind: SetKind, rirValue: number | null = rir === '' ? null : Number(rir)) {
    const w = timed ? 0 : Number(weight)
    const r = Number(reps)
    if (!Number.isFinite(w) || !Number.isFinite(r) || r <= 0) {
      setError('무게와 횟수를 숫자로 입력하세요')
      return false
    }
    setError(null)
    setBusy(true)
    try {
      await onAdd({ exercise_id: exercise.id, kind, weight_kg: w, reps: r, rir: rirValue, side: exercise.unilateral ? side : null })
      setRir('')
      if (exercise.unilateral) setSide((s) => (s === 'L' ? 'R' : 'L'))
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function finderPick(choice: (typeof FINDER_CHOICES)[number]) {
    const current = Number(weight)
    if (!(await submit('find', choice.rir))) return
    const res = await api.weightFinder({ completed: choice.completed, rir: choice.rir, weight_kg: current, increment_kg: exercise.increment_kg })
    setFinderResult(res)
    if (res.next_weight_kg != null) setWeight(String(res.next_weight_kg))
  }

  return (
    <article className={`ex${done ? ' is-done' : ''}`} aria-label={exercise.name}>
      <div className="ex-top">
        <span className="ex-pos" aria-label={done ? '완료' : `${index}번째`}>
          {done ? <CheckIcon /> : index}
        </span>
        <div className="grow">
          <h3 className="ex-name">{exercise.name}</h3>
          <p className="ex-meta">
            {target(item)}
            {exercise.unilateral && ', 좌우 각각'}
          </p>
          {exercise.alternative && <p className="ex-meta">기구가 없으면 {exercise.alternative}</p>}
        </div>
        {recommendation && !timed && (
          <div className={`ex-target ${action}`}>
            <span className="num">{recommendation.weight_kg != null ? kg(recommendation.weight_kg) : '무게 찾기'}</span>
            <small>{action === 'increase' ? '올린 무게' : action === 'unknown' ? '처음 하는 종목' : '오늘 무게'}</small>
          </div>
        )}
      </div>

      {recommendation && !timed && (
        <p className={`ex-reason ${action}`}>
          {recommendation.reason}
          {last && (
            <>
              <br />
              <span className="muted">
                지난번 {formatShort(last.date)}: {summarizeSets(last.sets)}
              </span>
            </>
          )}
        </p>
      )}

      <div className="ex-body">
        {sets.length > 0 && (
          <table className="set-table">
            <thead>
              <tr>
                <th>세트</th>
                <th>{timed ? '시간' : '무게 × 횟수'}</th>
                <th />
                <th className="sr-only">삭제</th>
              </tr>
            </thead>
            <tbody>
              {sets.map((s) => (
                <tr key={s.id}>
                  <td className="n">
                    {s.side ?? ''}
                    {s.set_no}
                  </td>
                  <td className="v">{timed ? `${s.reps}초` : `${kg(s.weight_kg)} × ${s.reps}`}</td>
                  <td>
                    {s.kind !== 'work' && <span className="pill find">{KIND_LABEL[s.kind]}</span>}
                    {s.rir != null && <span className="muted" style={{ fontSize: 13, marginLeft: 6 }}>여유 {s.rir}개</span>}
                  </td>
                  <td className="act">
                    <button className="icon-btn" aria-label={`${s.set_no}세트 삭제`} onClick={() => onDelete(s.id)}>
                      <XIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="set-inputs" style={timed ? { gridTemplateColumns: '1fr' } : undefined}>
          {!timed && <Stepper label="무게(kg)" value={weight} onChange={setWeight} step={exercise.increment_kg || 1} decimal />}
          <Stepper label={timed ? '시간(초)' : '횟수'} value={reps} onChange={setReps} step={timed ? 5 : 1} />
          {!timed && !finding && (
            <label className="field">
              <span className="field-label">여유</span>
              <input className="input" inputMode="numeric" placeholder="개" value={rir} onChange={(e) => setRir(e.target.value)} aria-label="더 할 수 있었던 개수" style={{ textAlign: 'center' }} />
            </label>
          )}
        </div>

        {exercise.unilateral && (
          <div className="seg" role="group" aria-label="좌우 선택">
            {(['L', 'R'] as const).map((s) => (
              <button key={s} type="button" aria-pressed={side === s} onClick={() => setSide(s)}>
                {s === 'L' ? '왼쪽' : '오른쪽'}
              </button>
            ))}
          </div>
        )}

        {finding ? (
          <div className="finder">
            <p style={{ fontSize: 14 }}>
              <b>
                {weight}kg × {reps}회
              </b>{' '}
              하고 나서, 몇 개 더 할 수 있었나요? 누르면 바로 기록됩니다.
            </p>
            <div className="finder-grid">
              {FINDER_CHOICES.map((c) => (
                <button key={c.label} className="btn btn-secondary" disabled={busy} onClick={() => finderPick(c)}>
                  {c.label}
                </button>
              ))}
            </div>
            {finderResult && (
              <p className="finder-result" role="status">
                {finderResult.message}
                {finderResult.steps !== 0 && finderResult.next_weight_kg != null && `, 다음 세트 ${kg(finderResult.next_weight_kg)}`}
              </p>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setFinding(false)}>
              무게 찾기 끝내고 본세트 하기
            </button>
          </div>
        ) : (
          <div className="row">
            <button className="btn btn-primary grow" disabled={busy} onClick={() => submit('work')}>
              {workSets.length + 1}세트 기록
            </button>
            {!timed && (
              <button className="btn btn-secondary" onClick={() => setFinding(true)}>
                무게 찾기
              </button>
            )}
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

        {(exercise.cue || exercise.setup_note) && (
          <details className="cue">
            <summary>자세·세팅 메모</summary>
            {exercise.setup_note && <p>{exercise.setup_note}</p>}
            {exercise.cue && <p>{exercise.cue}</p>}
          </details>
        )}
      </div>
    </article>
  )
}
