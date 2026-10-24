import { useDailyLogs, useProfile } from '../../api/hooks'
import { formatMD } from '../../lib/date'
import { kg } from '../../lib/format'
import { weightTrend } from '../../lib/weight'
import LineChart from '../LineChart'

/** 아침 체중과 7일 평균 (플랜 규칙: 하루 값이 아니라 평균으로 본다) */
export default function WeightChart() {
  const logs = useDailyLogs()
  const profile = useProfile().data
  const trend = weightTrend(logs.data ?? [])
  const latest = trend.at(-1)?.weight ?? null
  const avg = trend.at(-1)?.avg7 ?? null
  const start = profile?.start_weight_kg ?? null
  const goal = profile?.goal_weight_kg ?? null

  return (
    <section className="panel stack">
      <h2 className="panel-title">체중 추이</h2>
      <div className="row align-baseline gap-sm wrap">
        <span className="num num-xl">{latest != null ? kg(latest) : '—'}</span>
        {avg != null && start != null && (
          <span className={`fw-600 ${avg <= start ? 'text-hit' : 'text-miss'}`}>
            7일 평균 {kg(avg)}, 시작 대비 {avg - start > 0 ? '+' : ''}
            {+(avg - start).toFixed(1)}kg
          </span>
        )}
        {goal != null && avg != null && <span className="muted">목표 {kg(goal)}까지 {+(avg - goal).toFixed(1)}kg</span>}
      </div>
      {trend.length > 0 ? (
        <LineChart
          labels={trend.map((p) => formatMD(p.date))}
          series={[
            { label: '아침 체중', values: trend.map((p) => p.weight), color: 'var(--muted)', style: 'dots' },
            { label: '7일 평균', values: trend.map((p) => p.avg7), color: 'var(--primary)', area: true },
          ]}
          unit="kg"
        />
      ) : (
        <p className="empty">아침 공복 체중을 기록하면 여기에 쌓입니다.</p>
      )}
    </section>
  )
}
