import { useState } from 'react'
import { useExercises, useHistory } from '../../api/hooks'
import { formatMD } from '../../lib/date'
import { EQUIPMENT_LABEL, kg } from '../../lib/format'
import LineChart from '../LineChart'
import Select from '../Select'

/** 종목별 세션 최고 무게 추이 */
export default function ExerciseTrend() {
  const exercises = useExercises()
  const strength = exercises.data?.filter((e) => e.category === 'strength') ?? []
  const [exId, setExId] = useState<number | null>(null)
  const selected = exId ?? strength[0]?.id ?? null
  const h = useHistory(selected).data ?? []
  const first = h[0]?.top_weight_kg
  const last = h.at(-1)?.top_weight_kg

  return (
    <section className="panel stack">
      <h2 className="panel-title">종목별 무게</h2>
      <Select
        label="종목 선택"
        searchable
        value={selected}
        onChange={setExId}
        options={strength.map((e) => ({ value: e.id, label: e.name, hint: EQUIPMENT_LABEL[e.equipment] }))}
      />
      {first != null && last != null && (
        <div className="row align-baseline gap-sm">
          <span className="num num-xl">{kg(last)}</span>
          <span className="muted">
            처음 {kg(first)}
            {first > 0 && last !== first && `, ${last > first ? '+' : ''}${Math.round(((last - first) / first) * 100)}%`}
          </span>
        </div>
      )}
      <LineChart labels={h.map((p) => formatMD(p.date))} series={[{ label: '최고 무게', values: h.map((p) => p.top_weight_kg), color: 'var(--primary)' }]} unit="kg" />
    </section>
  )
}
