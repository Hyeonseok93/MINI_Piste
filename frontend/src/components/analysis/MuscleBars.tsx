import type { MuscleVolume } from '../../api/types'
import s from './MuscleBars.module.css'

/** 근육별 세트 수 막대. 목표선 대비 채운 정도로 보여 준다 */
export default function MuscleBars({ data }: { data: MuscleVolume[] }) {
  const groups: [string, MuscleVolume[]][] = [
    ['몸 앞쪽', data.filter((m) => m.side === 'front')],
    ['몸 뒤쪽', data.filter((m) => m.side === 'back')],
  ]
  const target = data[0]?.target_sets ?? 10
  const max = Math.max(target * 1.5, ...data.map((m) => m.sets))

  return (
    <div className={s.bars}>
      {groups.map(([title, list]) => (
        <div key={title} className={s.group}>
          <p className="field-label">{title}</p>
          {list.map((m) => {
            const pct = Math.min(100, (m.sets / max) * 100)
            const state = m.sets === 0 ? s.zero : m.sets >= m.target_sets ? s.met : ''
            return (
              <div key={m.muscle} className={s.bar} data-tip={`주동 ${m.primary_sets}세트, 보조 ${m.secondary_sets}세트`}>
                <span className={s.label}>{m.label}</span>
                <span className={s.track}>
                  <span className={`${s.fill} ${state}`} style={{ width: `${pct}%` }} />
                  <span className={s.target} style={{ left: `${(m.target_sets / max) * 100}%` }} aria-hidden />
                </span>
                <span className={`num ${s.value}`}>{m.sets}</span>
              </div>
            )
          })}
        </div>
      ))}
      <p className="row-sub">주동근 1세트, 보조근 0.5세트로 셉니다. 세로선은 목표({target}세트)입니다.</p>
    </div>
  )
}
