import { useDailyLogs, useProfile } from '../../api/hooks'
import { formatMD } from '../../lib/date'
import { kg, movingAverage } from '../../lib/format'
import LineChart from '../LineChart'

/** 아침 체중과 7일 평균 (플랜 규칙: 하루 값이 아니라 평균으로 본다) */
export default function WeightChart() {
  const logs = useDailyLogs()
  const profile = useProfile().data
  const weights = (logs.data ?? []).filter((l) => l.body_weight_kg != null)
  const values = weights.map((l) => l.body_weight_kg ?? null)
  const latest = values.at(-1) ?? null
  const start = profile?.start_weight_kg ?? null
  const goal = profile?.goal_weight_kg ?? null

  return (
    <section className="panel stack">
      <h2 className="panel-title">체중</h2>
      <div className="row align-baseline gap-sm wrap">
        <span className="num num-xl">{latest != null ? kg(latest) : '—'}</span>
        {latest != null && start != null && (
          <span className={`fw-600 ${latest <= start ? 'text-hit' : 'text-miss'}`}>
            시작 대비 {latest - start > 0 ? '+' : ''}
            {+(latest - start).toFixed(1)}kg
          </span>
        )}
        {goal != null && latest != null && <span className="muted">목표 {kg(goal)}까지 {+(latest - goal).toFixed(1)}kg</span>}
      </div>
      <LineChart
        labels={weights.map((l) => formatMD(l.date))}
        series={[
          { label: '체중', values, color: 'var(--cardio)' },
          { label: '7일 평균', values: movingAverage(values, 7), color: 'var(--ink)', dashed: true },
        ]}
        unit="kg"
      />
      {weights.length === 0 && <p className="row-sub">아침 공복 체중을 기록하면 여기에 쌓입니다.</p>}
    </section>
  )
}
