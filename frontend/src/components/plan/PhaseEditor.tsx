import { useState } from 'react'
import { useCreatePhase, useDeletePhase, useUpdatePhase } from '../../api/hooks'
import type { Phase } from '../../api/types'
import { addDays, todayISO } from '../../lib/date'
import { useConfirm } from '../Confirm'
import DatePicker from '../DatePicker'
import Select from '../Select'
import { useToast } from '../Toast'

interface Props {
  /** 없으면 새 단계 만들기 */
  phase?: Phase
  /** 전체 단계: 새 단계의 기본 시작일·복사할 요일 계획 후보 */
  phases: Phase[]
  onDone: () => void
}

const NO_COPY = 0

/** 단계 이름과 기간. 다른 단계와 겹치면 서버가 거절하고 그 이유를 보여 준다 */
export default function PhaseEditor({ phase, phases, onDone }: Props) {
  const create = useCreatePhase()
  const update = useUpdatePhase()
  const remove = useDeletePhase()
  const toast = useToast()
  const confirm = useConfirm()

  // 새 단계는 마지막 단계 다음 날부터, 요일 계획은 마지막 단계를 복사하는 것이 기본
  const last = phases.at(-1)
  const nextStart = last ? addDays(last.end_date ?? last.start_date, 1) : todayISO()
  const [name, setName] = useState(phase?.name ?? '')
  const [start, setStart] = useState(phase?.start_date ?? nextStart)
  const [end, setEnd] = useState<string | null>(phase ? phase.end_date : null)
  const [copyFrom, setCopyFrom] = useState(last?.id ?? NO_COPY)

  const dirty = !phase || name.trim() !== phase.name || start !== phase.start_date || end !== phase.end_date
  const busy = create.isPending || update.isPending || remove.isPending
  const error = create.error ?? update.error ?? remove.error

  function save() {
    const body = { name: name.trim(), start_date: start, end_date: end }
    const done = (verb: string) => {
      toast(`${body.name} 단계를 ${verb}`)
      onDone()
    }
    if (phase) update.mutateAsync({ id: phase.id, body }).then(() => done('저장했습니다')).catch(() => {}) // 오류는 아래 문구로 보여 준다
    else create.mutateAsync({ ...body, copy_from: copyFrom === NO_COPY ? null : copyFrom }).then(() => done('만들었습니다')).catch(() => {})
  }

  async function onDelete() {
    if (!phase) return
    const ok = await confirm({
      title: `${phase.name} 단계를 삭제할까요?`,
      message: '그 기간의 요일 계획만 사라지고, 이미 한 운동 기록은 남습니다.',
      confirmLabel: '삭제',
      danger: true,
    })
    if (!ok) return
    remove
      .mutateAsync(phase.id)
      .then(() => {
        toast('단계를 삭제했습니다')
        onDone()
      })
      .catch(() => {})
  }

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <label className="field">
        <span className="field-label">단계 이름</span>
        <input className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="예: 🏁 2년차 유지기" />
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
      {!phase && (
        <div className="field">
          <span className="field-label">요일 계획</span>
          <Select
            label="요일 계획 복사"
            value={copyFrom}
            onChange={setCopyFrom}
            options={[...phases.map((p) => ({ value: p.id, label: `${p.name} 복사` })), { value: NO_COPY, label: '복사 안 함 (모두 휴식으로 시작)' }]}
          />
        </div>
      )}
      <p className="row-sub">다른 단계와 기간이 겹치면 저장되지 않습니다. 이어지는 단계의 날짜를 먼저 옮기세요.</p>
      {error && <p className="error-text">{error.message}</p>}
      <div className="row">
        {phase && (
          <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={onDelete}>
            단계 삭제
          </button>
        )}
        <span className="grow" />
        <button type="button" className="btn btn-secondary btn-sm" onClick={onDone}>
          취소
        </button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={!dirty || !name.trim() || busy}>
          {phase ? '저장' : '단계 만들기'}
        </button>
      </div>
    </form>
  )
}
