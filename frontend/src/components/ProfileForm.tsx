import { useState } from 'react'
import { useSaveProfile } from '../api/hooks'
import type { Profile } from '../api/types'
import { toNum, toStr } from '../lib/format'

interface Props {
  initial?: Profile | null
  submitLabel: string
  /** 이름이 바뀔 때마다 (아바타 미리보기용) */
  onNameChange?: (name: string) => void
  onSaved?: (p: Profile) => void
  /** 이름 칸에 바로 포커스 (시작 화면) */
  focusName?: boolean
}

/** 시작 화면과 설정 화면이 같이 쓰는 프로필 입력 폼 */
export default function ProfileForm({ initial, submitLabel, onNameChange, onSaved, focusName }: Props) {
  const save = useSaveProfile()
  const [name, setName] = useState(initial?.name ?? '')
  const [height, setHeight] = useState(toStr(initial?.height_cm))
  const [weight, setWeight] = useState(toStr(initial?.start_weight_kg))
  const [goal, setGoal] = useState(toStr(initial?.goal_weight_kg))

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate(
          { name: name.trim(), height_cm: toNum(height), start_weight_kg: toNum(weight), goal_weight_kg: toNum(goal) },
          { onSuccess: (p) => onSaved?.(p) },
        )
      }}
    >
      <label className="field">
        <span className="field-label">이름</span>
        <input
          className="input"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            onNameChange?.(e.target.value)
          }}
          placeholder="예: 홍길동"
          maxLength={40}
          // 시작 화면은 이름 입력이 유일한 할 일이라 바로 입력할 수 있게 한다
          // oxlint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={focusName}
        />
      </label>
      <div className="form-grid cols-3">
        <label className="field">
          <span className="field-label">키</span>
          <span className="input-suffix">
            <input className="input" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="188" />
            <span>cm</span>
          </span>
        </label>
        <label className="field">
          <span className="field-label">시작 체중</span>
          <span className="input-suffix">
            <input className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="110" />
            <span>kg</span>
          </span>
        </label>
        <label className="field">
          <span className="field-label">목표 체중</span>
          <span className="input-suffix">
            <input className="input" inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="선택" />
            <span>kg</span>
          </span>
        </label>
      </div>
      {save.isError && <p className="error-text">{save.error.message}</p>}
      <button className="btn btn-primary btn-block mt-sm" type="submit" disabled={!name.trim() || save.isPending}>
        {save.isPending ? '저장 중…' : submitLabel}
      </button>
    </form>
  )
}
