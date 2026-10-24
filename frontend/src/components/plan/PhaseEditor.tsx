import { useState } from 'react'
import { useUpdatePhase } from '../../api/hooks'
import type { Phase } from '../../api/types'
import DatePicker from '../DatePicker'
import { useToast } from '../Toast'

/** 단계 이름과 기간. 다른 단계와 겹치면 서버가 거절하고 그 이유를 보여 준다 */
export default function PhaseEditor({ phase, onDone }: { phase: Phase; onDone: () => void }) {
  const save = useUpdatePhase()
  const toast = useToast()
  const [name, setName] = useState(phase.name)
  const [start, setStart] = useState(phase.start_date)
  const [end, setEnd] = useState<string | null>(phase.end_date)
  const dirty = name.trim() !== phase.name || start !== phase.start_date || end !== phase.end_date

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault()
        save
          .mutateAsync({ id: phase.id, body: { name: name.trim(), start_date: start, end_date: end } })
          .then(() => {
            toast(`${name.trim()} 단계를 저장했습니다`)
            onDone()
          })
          .catch(() => {}) // 오류는 아래 문구로 보여 준다
      }}
    >
      <label className="field">
        <span className="field-label">단계 이름</span>
        <input className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="form-grid cols-2">
        <div className="field">
          <span className="field-label">시작일</span>
          <DatePicker label="시작일" value={start} onChange={setStart} max={end ?? undefined} />
        </div>
        <div className="field">
          <span className="field-label">종료일</span>
          <DatePicker label="종료일" value={end} onChange={setEnd} min={start} placeholder="끝 없음" />
        </div>
      </div>
      <p className="row-sub">다른 단계와 기간이 겹치면 저장되지 않습니다. 이어지는 단계의 날짜를 먼저 옮기세요.</p>
      {save.isError && <p className="error-text">{save.error.message}</p>}
      <div className="row">
        <span className="grow" />
        <button type="button" className="btn btn-secondary btn-sm" onClick={onDone}>
          취소
        </button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={!dirty || !name.trim() || save.isPending}>
          저장
        </button>
      </div>
    </form>
  )
}
