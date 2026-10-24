import { useState } from 'react'
import { useDeleteRoutine, useExercises, useSetRoutineItems, useUpdateRoutine } from '../../api/hooks'
import type { Routine, RoutineItemInput } from '../../api/types'
import { EQUIPMENT_LABEL } from '../../lib/format'
import { useConfirm } from '../Confirm'
import { ChevronDown, XIcon } from '../icons'
import Select from '../Select'
import { useToast } from '../Toast'
import css from './Plan.module.css'

type Row = RoutineItemInput & { key: string; name: string }

const toRows = (r: Routine): Row[] =>
  r.items.map((it) => ({
    key: `i${it.id}`,
    name: it.exercise.name,
    exercise_id: it.exercise.id,
    sets: it.sets,
    rep_min: it.rep_min,
    rep_max: it.rep_max,
    duration_sec: it.duration_sec,
  }))

const num = (v: string, fallback: number) => (Number.isFinite(Number(v)) && v !== '' ? Number(v) : fallback)

/** 루틴 하나의 이름·구성·순서를 고친다. 저장하면 서버에서 구성 전체를 한 번에 바꾼다. */
export default function RoutineEditor({ routine, onDeleted }: { routine: Routine; onDeleted: () => void }) {
  const exercises = useExercises()
  const setItems = useSetRoutineItems()
  const update = useUpdateRoutine()
  const remove = useDeleteRoutine()
  const confirm = useConfirm()
  const toast = useToast()

  const [name, setName] = useState(routine.name)
  const [desc, setDesc] = useState(routine.description ?? '')
  const [rows, setRows] = useState<Row[]>(() => toRows(routine))
  const [error, setError] = useState<string | null>(null)

  const original = JSON.stringify(toRows(routine).map(({ key: _k, ...r }) => r))
  const dirtyItems = JSON.stringify(rows.map(({ key: _k, ...r }) => r)) !== original
  const dirtyMeta = name.trim() !== routine.name || desc.trim() !== (routine.description ?? '')

  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)))
  const move = (i: number, d: number) =>
    setRows((rs) => {
      const j = i + d
      if (j < 0 || j >= rs.length) return rs
      const copy = [...rs]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    })

  async function save() {
    setError(null)
    try {
      if (dirtyMeta) await update.mutateAsync({ id: routine.id, body: { name: name.trim(), description: desc.trim() || null } })
      if (dirtyItems) await setItems.mutateAsync({ id: routine.id, items: rows.map(({ key: _k, name: _n, ...r }) => r) })
      toast(`${name.trim()} 루틴을 저장했습니다`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다')
    }
  }

  async function onDelete() {
    const ok = await confirm({
      title: `${routine.name} 루틴을 삭제할까요?`,
      message: '플랜에서 쓰는 루틴이면 삭제되지 않습니다. 지난 운동 기록은 남습니다.',
      confirmLabel: '삭제',
      danger: true,
    })
    if (!ok) return
    remove.mutate(routine.id, {
      onSuccess: () => {
        toast('루틴을 삭제했습니다')
        onDeleted()
      },
      onError: (e) => setError(e.message),
    })
  }

  const busy = setItems.isPending || update.isPending

  return (
    <section className="panel stack">
      <div className="form-grid cols-2">
        <label className="field">
          <span className="field-label">루틴 이름</span>
          <input className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">설명</span>
          <input className="input" value={desc} maxLength={200} onChange={(e) => setDesc(e.target.value)} placeholder="예: 가슴·등 중심" />
        </label>
      </div>

      <ol className={css.rows}>
        {rows.map((r, i) => {
          const timed = r.duration_sec != null
          return (
            <li key={r.key} className={css.row}>
              <span className={css.pos}>{i + 1}</span>
              <div className="grow">
                <p className="row-title">{r.name}</p>
                <div className={css.fields}>
                  <label className={css.mini}>
                    <span>세트</span>
                    <input className="input" inputMode="numeric" value={r.sets} onChange={(e) => patch(r.key, { sets: num(e.target.value, r.sets) })} />
                  </label>
                  {timed ? (
                    <label className={css.mini}>
                      <span>시간(초)</span>
                      <input className="input" inputMode="numeric" value={r.duration_sec ?? ''} onChange={(e) => patch(r.key, { duration_sec: num(e.target.value, 30) })} />
                    </label>
                  ) : (
                    <>
                      <label className={css.mini}>
                        <span>최소 횟수</span>
                        <input className="input" inputMode="numeric" value={r.rep_min ?? ''} onChange={(e) => patch(r.key, { rep_min: num(e.target.value, 10) })} />
                      </label>
                      <label className={css.mini}>
                        <span>최대 횟수</span>
                        <input className="input" inputMode="numeric" value={r.rep_max ?? ''} onChange={(e) => patch(r.key, { rep_max: num(e.target.value, 12) })} />
                      </label>
                    </>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => patch(r.key, timed ? { duration_sec: null, rep_min: 10, rep_max: 12 } : { duration_sec: 30, rep_min: null, rep_max: null })}
                  >
                    {timed ? '횟수로' : '시간으로'}
                  </button>
                </div>
              </div>
              <div className={css.actions}>
                <button type="button" className="icon-btn" aria-label={`${r.name} 위로`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ChevronDown className={css.flip} />
                </button>
                <button type="button" className="icon-btn" aria-label={`${r.name} 아래로`} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                  <ChevronDown />
                </button>
                <button type="button" className="icon-btn" aria-label={`${r.name} 빼기`} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                  <XIcon />
                </button>
              </div>
            </li>
          )
        })}
      </ol>

      {exercises.data && (
        <div className="field">
          <span className="field-label">종목 추가</span>
          <Select
            label="루틴에 종목 추가"
            placeholder="종목을 골라 맨 아래에 추가"
            searchable
            resetAfterSelect
            value={null}
            onChange={(id) => {
              const ex = exercises.data.find((e) => e.id === id)
              if (!ex) return
              // 기본은 3 × 10–12. 플랭크처럼 시간 종목이면 행에서 '시간으로'를 누른다
              setRows((rs) => [...rs, { key: `n${id}-${Date.now()}`, name: ex.name, exercise_id: id, sets: 3, rep_min: 10, rep_max: 12, duration_sec: null }])
            }}
            options={exercises.data.filter((e) => !e.archived && !rows.some((r) => r.exercise_id === e.id)).map((e) => ({ value: e.id, label: e.name, hint: EQUIPMENT_LABEL[e.equipment] }))}
          />
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
      <div className="row">
        <button className="btn btn-danger btn-sm" onClick={onDelete} disabled={remove.isPending}>
          루틴 삭제
        </button>
        <span className="grow" />
        <button className="btn btn-secondary btn-sm" disabled={busy || (!dirtyItems && !dirtyMeta)} onClick={() => { setRows(toRows(routine)); setName(routine.name); setDesc(routine.description ?? '') }}>
          되돌리기
        </button>
        <button className="btn btn-primary btn-sm" disabled={busy || (!dirtyItems && !dirtyMeta) || !name.trim()} onClick={save}>
          저장
        </button>
      </div>
    </section>
  )
}
