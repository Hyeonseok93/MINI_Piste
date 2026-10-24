import type { ExerciseMuscle, MuscleInfo, MuscleRole } from '../../api/types'

const NEXT: Record<'none' | MuscleRole, 'none' | MuscleRole> = { none: 'primary', primary: 'secondary', secondary: 'none' }
const LABEL: Record<MuscleRole, string> = { primary: '주동', secondary: '보조' }

/** 근육 13부위 칩. 누를 때마다 없음 → 주동근 → 보조근 → 없음 */
export default function MusclePicker({ all, value, onChange }: { all: MuscleInfo[]; value: ExerciseMuscle[]; onChange: (v: ExerciseMuscle[]) => void }) {
  const roleOf = (m: string) => value.find((v) => v.muscle === m)?.role ?? 'none'

  function toggle(m: MuscleInfo['muscle']) {
    const next = NEXT[roleOf(m)]
    const rest = value.filter((v) => v.muscle !== m)
    onChange(next === 'none' ? rest : [...rest, { muscle: m, role: next }])
  }

  return (
    <div className="muscle-chips" role="group" aria-label="쓰는 근육">
      {all.map((m) => {
        const role = roleOf(m.muscle)
        return (
          <button
            key={m.muscle}
            type="button"
            className={`muscle-chip ${role}`}
            aria-pressed={role !== 'none'}
            aria-label={`${m.label} ${role === 'none' ? '안 씀' : LABEL[role]}`}
            onClick={() => toggle(m.muscle)}
          >
            {m.label}
            {role !== 'none' && <small>{LABEL[role]}</small>}
          </button>
        )
      })}
    </div>
  )
}
