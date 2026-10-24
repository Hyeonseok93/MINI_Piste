import type { Exercise, FinderChoice, Recommendation, RoutineItem, SetInput, SetKind, SetLog } from '../api/types'
import { useSetLogger } from '../hooks/useSetLogger'
import { formatShort } from '../lib/date'
import { kg, setAmount, summarizeSets, targetText } from '../lib/format'
import { CheckIcon, MinusIcon, PlusIcon, XIcon } from './icons'

interface Props {
  index: number
  exercise: Exercise
  item?: RoutineItem
  recommendation?: Recommendation
  last?: { date: string; sets: SetLog[] } | null
  sets: SetLog[]
  /** 무게 찾기 버튼 목록 (백엔드가 내려준다) */
  finderChoices: FinderChoice[]
  onAdd: (body: SetInput) => Promise<unknown>
  onDelete: (setId: number) => void
}

const KIND_LABEL: Record<SetKind, string> = { work: '', find: '찾기', warmup: '워밍업' }

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

export default function ExerciseCard({ index, exercise, item, recommendation, last, sets, finderChoices, onAdd, onDelete }: Props) {
  const s = useSetLogger({ exercise, item, recommendation, last, sets, onAdd })
  const action = recommendation?.action ?? 'keep'

  return (
    <article className={`ex${s.done ? ' is-done' : ''}`} aria-label={exercise.name}>
      <div className="ex-top">
        <span className="ex-pos" aria-label={s.done ? '완료' : `${index}번째`}>
          {s.done ? <CheckIcon /> : index}
        </span>
        <div className="grow">
          <h3 className="ex-name">{exercise.name}</h3>
          <p className="ex-meta">
            {item ? targetText(item) : '루틴 외 종목'}
            {exercise.unilateral && ', 좌우 각각'}
          </p>
          {exercise.alternative && <p className="ex-meta">기구가 없으면 {exercise.alternative}</p>}
        </div>
        {recommendation && !s.timed && (
          <div className={`ex-target ${action}`}>
            <span className="num">{recommendation.weight_kg != null ? kg(recommendation.weight_kg) : '무게 찾기'}</span>
            <small>{action === 'increase' ? '올린 무게' : action === 'unknown' ? '처음 하는 종목' : '오늘 무게'}</small>
          </div>
        )}
      </div>

      {recommendation && !s.timed && (
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
                <th>{s.timed ? '시간' : '무게 × 횟수'}</th>
                <th>
                  <span className="sr-only">구분</span>
                </th>
                <th className="sr-only">삭제</th>
              </tr>
            </thead>
            <tbody>
              {sets.map((set) => (
                <tr key={set.id}>
                  <td className="n">
                    {set.side ?? ''}
                    {set.set_no}
                  </td>
                  <td className="v">{s.timed ? setAmount(set) : `${kg(set.weight_kg)} × ${setAmount(set)}`}</td>
                  <td>
                    {set.kind !== 'work' && <span className="pill find">{KIND_LABEL[set.kind]}</span>}
                    {set.rir != null && <span className="muted set-rir">여유 {set.rir}개</span>}
                  </td>
                  <td className="act">
                    <button className="icon-btn" aria-label={`${set.set_no}세트 삭제`} onClick={() => onDelete(set.id)}>
                      <XIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className={`set-inputs${s.timed ? ' single' : ''}`}>
          {!s.timed && <Stepper label="무게(kg)" value={s.weight} onChange={s.setWeight} step={exercise.increment_kg || 1} decimal />}
          <Stepper label={s.timed ? '시간(초)' : '횟수'} value={s.amount} onChange={s.setAmount} step={s.timed ? 5 : 1} />
          {!s.timed && !s.finding && (
            <label className="field">
              <span className="field-label">여유</span>
              <input className="input center" inputMode="numeric" placeholder="개" value={s.rir} onChange={(e) => s.setRir(e.target.value)} aria-label="더 할 수 있었던 개수" />
            </label>
          )}
        </div>

        {exercise.unilateral && (
          <div className="seg" role="group" aria-label="좌우 선택">
            {(['L', 'R'] as const).map((side) => (
              <button key={side} type="button" aria-pressed={s.side === side} onClick={() => s.setSide(side)}>
                {side === 'L' ? '왼쪽' : '오른쪽'}
              </button>
            ))}
          </div>
        )}

        {s.finding ? (
          <div className="finder">
            <p className="finder-q">
              <b>
                {s.weight}kg × {s.amount}회
              </b>{' '}
              하고 나서, 몇 개 더 할 수 있었나요? 누르면 바로 기록됩니다.
            </p>
            <div className="finder-grid">
              {finderChoices.map((c) => (
                <button key={c.label} className="btn btn-secondary" disabled={s.busy} onClick={() => s.pickFinder(c)}>
                  {c.label}
                </button>
              ))}
            </div>
            {s.finderResult && (
              <p className="finder-result" role="status">
                {s.finderResult.message}
                {s.finderResult.steps !== 0 && s.finderResult.next_weight_kg != null && `, 다음 세트 ${kg(s.finderResult.next_weight_kg)}`}
              </p>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => s.setFinding(false)}>
              무게 찾기 끝내고 본세트 하기
            </button>
          </div>
        ) : (
          <div className="row">
            <button className="btn btn-primary grow" disabled={s.busy} onClick={() => s.submit('work')}>
              {s.workSets.length + 1}세트 기록
            </button>
            {!s.timed && (
              <button className="btn btn-secondary" onClick={() => s.setFinding(true)}>
                무게 찾기
              </button>
            )}
          </div>
        )}

        {s.error && <p className="error-text">{s.error}</p>}

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
