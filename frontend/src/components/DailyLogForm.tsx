import { useState } from 'react'
import { useSaveDailyLog } from '../api/hooks'
import type { DailyLog } from '../api/types'
import { useToast } from './Toast'

const num = (v: string) => (v.trim() === '' ? null : Number(v))
const str = (v: number | null | undefined) => (v == null ? '' : String(v))

export default function DailyLogForm({ date, log }: { date: string; log: DailyLog | null }) {
  const save = useSaveDailyLog()
  const toast = useToast()
  const [weight, setWeight] = useState(str(log?.body_weight_kg))
  const [steps, setSteps] = useState(str(log?.steps))
  const [sleep, setSleep] = useState(str(log?.sleep_hours))
  const [memo, setMemo] = useState(log?.memo ?? '')

  const dirty = weight !== str(log?.body_weight_kg) || steps !== str(log?.steps) || sleep !== str(log?.sleep_hours) || memo !== (log?.memo ?? '')

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate(
          { date, body: { body_weight_kg: num(weight), steps: num(steps), sleep_hours: num(sleep), memo: memo.trim() || null } },
          { onSuccess: () => toast('몸 상태를 저장했습니다') },
        )
      }}
    >
      <div className="form-grid cols-3">
        <label className="field">
          <span className="field-label">체중</span>
          <span className="input-suffix">
            <input className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
            <span>kg</span>
          </span>
        </label>
        <label className="field">
          <span className="field-label">걸음</span>
          <input className="input" inputMode="numeric" value={steps} onChange={(e) => setSteps(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">수면</span>
          <span className="input-suffix">
            <input className="input" inputMode="decimal" value={sleep} onChange={(e) => setSleep(e.target.value)} />
            <span>h</span>
          </span>
        </label>
      </div>
      <label className="field">
        <span className="field-label">메모</span>
        <textarea className="textarea" rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="컨디션, 근육통, 식단" />
      </label>
      {save.isError && <p className="error-text">{save.error.message}</p>}
      <button className="btn btn-secondary" type="submit" disabled={!dirty || save.isPending}>
        몸 상태 저장
      </button>
    </form>
  )
}
