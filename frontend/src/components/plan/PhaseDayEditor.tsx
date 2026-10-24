import { useState } from 'react'
import { useRoutines, useSetPhaseDay } from '../../api/hooks'
import type { DayKind, PhaseDay } from '../../api/types'
import { weekdayLabel } from '../../lib/date'
import { KIND_LABEL } from '../../lib/status'
import Select from '../Select'
import { useToast } from '../Toast'

const KINDS: DayKind[] = ['strength', 'cardio', 'outdoor', 'rest']

/** 단계의 요일 하나 수정: 종류, 루틴(격주 루틴), 표시 이름, 유산소 시간 */
export default function PhaseDayEditor({ phaseId, day, onDone }: { phaseId: number; day: PhaseDay; onDone: () => void }) {
  const routines = useRoutines().data ?? []
  const save = useSetPhaseDay()
  const toast = useToast()
  const [kind, setKind] = useState<DayKind>(day.kind)
  const [routineId, setRoutineId] = useState<number | null>(day.routine?.id ?? null)
  const [altId, setAltId] = useState<number | null>(day.alt_routine?.id ?? null)
  const [label, setLabel] = useState(day.label)
  const [cardio, setCardio] = useState(day.cardio_minutes == null ? '' : String(day.cardio_minutes))

  const options = routines.map((r) => ({ value: r.id, label: r.name, hint: `${r.item_count}종목` }))
  const strength = kind === 'strength'

  return (
    <form
      className="form-grid day-editor"
      onSubmit={(e) => {
        e.preventDefault()
        save
          .mutateAsync({
            id: phaseId,
            weekday: day.weekday,
            body: {
              kind,
              label: label.trim() || KIND_LABEL[kind],
              routine_id: strength ? routineId : null,
              alt_routine_id: strength ? altId : null,
              cardio_minutes: cardio === '' ? null : Number(cardio),
            },
          })
          .then(() => {
            toast(`${weekdayLabel(day.weekday)}요일 계획을 저장했습니다`)
            onDone()
          })
          .catch(() => {}) // 오류는 화면의 isError 로 보여 준다
      }}
    >
      <div className="seg" role="group" aria-label="이 날 할 일">
        {KINDS.map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      {strength && (
        <div className="form-grid cols-2-auto">
          <div className="field">
            <span className="field-label">루틴</span>
            <Select label="루틴" placeholder="루틴 선택" value={routineId} onChange={setRoutineId} options={options} />
          </div>
          <div className="field">
            <span className="field-label">격주 루틴 (선택)</span>
            <Select label="격주 루틴" placeholder="없음" value={altId} onChange={setAltId} options={options} />
            {altId != null && (
              <button type="button" className="btn btn-ghost btn-sm self-start" onClick={() => setAltId(null)}>
                격주 없애기
              </button>
            )}
          </div>
        </div>
      )}
      <div className="form-grid cols-2-auto">
        <label className="field">
          <span className="field-label">표시 이름</span>
          <input className="input" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">유산소</span>
          <span className="input-suffix">
            <input className="input" inputMode="numeric" value={cardio} onChange={(e) => setCardio(e.target.value)} placeholder="없음" />
            <span>분</span>
          </span>
        </label>
      </div>
      {save.isError && <p className="error-text">{save.error.message}</p>}
      <div className="row">
        <span className="grow" />
        <button type="button" className="btn btn-secondary btn-sm" onClick={onDone}>
          취소
        </button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={save.isPending || (strength && routineId == null)}>
          저장
        </button>
      </div>
    </form>
  )
}
