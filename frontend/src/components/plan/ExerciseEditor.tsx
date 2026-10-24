import { useState } from 'react'
import { useCreateExercise, useMuscles, useSetExerciseMuscles, useUpdateExercise } from '../../api/hooks'
import type { Category, Equipment, Exercise, ExerciseMuscle } from '../../api/types'
import { EQUIPMENT_LABEL, toNum, toStr } from '../../lib/format'
import Select from '../Select'
import { useToast } from '../Toast'
import MusclePicker from './MusclePicker'

const CATEGORY_LABEL: Record<Category, string> = { strength: '근력', core: '코어', cardio: '유산소' }
const equipmentOptions = (Object.keys(EQUIPMENT_LABEL) as Equipment[]).map((e) => ({ value: e, label: EQUIPMENT_LABEL[e] }))
const categoryOptions = (Object.keys(CATEGORY_LABEL) as Category[]).map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))

/** 종목 수정(기존) 또는 새 종목 만들기(exercise 없음) */
export default function ExerciseEditor({ exercise, onDone }: { exercise?: Exercise; onDone: () => void }) {
  const muscles = useMuscles().data ?? []
  const create = useCreateExercise()
  const update = useUpdateExercise()
  const setMuscles = useSetExerciseMuscles()
  const toast = useToast()

  const [name, setName] = useState(exercise?.name ?? '')
  const [category, setCategory] = useState<Category>(exercise?.category ?? 'strength')
  const [equipment, setEquipment] = useState<Equipment>(exercise?.equipment ?? 'pin')
  const [increment, setIncrement] = useState(toStr(exercise?.increment_kg ?? 5))
  const [rest, setRest] = useState(toStr(exercise?.rest_sec ?? 90))
  const [unilateral, setUnilateral] = useState(exercise?.unilateral ?? false)
  const [archived, setArchived] = useState(exercise?.archived ?? false)
  const [chosen, setChosen] = useState<ExerciseMuscle[]>(exercise?.muscles ?? [])
  const [note, setNote] = useState(exercise?.setup_note ?? '')
  const [cue, setCue] = useState(exercise?.cue ?? '')
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setError(null)
    const body = {
      name: name.trim(),
      category,
      equipment,
      increment_kg: toNum(increment) ?? 5,
      rest_sec: toNum(rest) ?? 90,
      unilateral,
      setup_note: note.trim() || null,
      cue: cue.trim() || null,
    }
    try {
      if (exercise) {
        await update.mutateAsync({ id: exercise.id, body: { ...body, archived } })
        await setMuscles.mutateAsync({ id: exercise.id, muscles: chosen })
        toast(`${body.name} 정보를 저장했습니다`)
      } else {
        await create.mutateAsync({ ...body, muscles: chosen })
        toast(`${body.name} 종목을 만들었습니다`)
      }
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다')
    }
  }

  const busy = create.isPending || update.isPending || setMuscles.isPending

  return (
    <div className="form-grid">
      <label className="field">
        <span className="field-label">이름</span>
        <input className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="예: 케이블 크런치" />
      </label>
      <div className="form-grid cols-2-auto">
        <div className="field">
          <span className="field-label">분류</span>
          <Select label="분류" value={category} onChange={setCategory} options={categoryOptions} />
        </div>
        <div className="field">
          <span className="field-label">기구</span>
          <Select label="기구" value={equipment} onChange={setEquipment} options={equipmentOptions} />
        </div>
      </div>
      <div className="form-grid cols-2-auto">
        <label className="field">
          <span className="field-label">증량 단위</span>
          <span className="input-suffix">
            <input className="input" inputMode="decimal" value={increment} onChange={(e) => setIncrement(e.target.value)} />
            <span>kg</span>
          </span>
        </label>
        <label className="field">
          <span className="field-label">세트 사이 휴식</span>
          <span className="input-suffix">
            <input className="input" inputMode="numeric" value={rest} onChange={(e) => setRest(e.target.value)} />
            <span>초</span>
          </span>
        </label>
      </div>
      <div className="field">
        <span className="field-label">쓰는 근육 (누를 때마다 주동 → 보조 → 빼기)</span>
        <MusclePicker all={muscles} value={chosen} onChange={setChosen} />
      </div>
      <div className="row wrap">
        <label className="check">
          <input type="checkbox" checked={unilateral} onChange={(e) => setUnilateral(e.target.checked)} />
          한쪽씩 하는 종목 (좌우 따로 기록)
        </label>
        {exercise && (
          <label className="check">
            <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
            보관 (선택 목록에서 숨김, 기록은 유지)
          </label>
        )}
      </div>
      <label className="field">
        <span className="field-label">세팅 메모 (의자 높이, 패드 위치)</span>
        <textarea className="textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">자세 요령</span>
        <textarea className="textarea" rows={2} value={cue} onChange={(e) => setCue(e.target.value)} />
      </label>
      {error && <p className="error-text">{error}</p>}
      <div className="row">
        <span className="grow" />
        <button className="btn btn-secondary btn-sm" type="button" onClick={onDone}>
          취소
        </button>
        <button className="btn btn-primary btn-sm" type="button" disabled={busy || !name.trim()} onClick={save}>
          {exercise ? '저장' : '종목 만들기'}
        </button>
      </div>
    </div>
  )
}
