import { useState } from 'react'
import { useDailyLogs, useExercises, useHistory, useProfile } from '../api/hooks'
import LineChart from '../components/LineChart'
import Select from '../components/Select'
import { parseISODate } from '../lib/date'
import { EQUIPMENT_LABEL, kg, movingAverage } from '../lib/format'

const md = (s: string) => {
  const d = parseISODate(s)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function ProgressPage() {
  const exercises = useExercises()
  const profile = useProfile()
  const strength = exercises.data?.filter((e) => e.category === 'strength') ?? []
  const [exId, setExId] = useState<number | null>(null)
  const selected = exId ?? strength[0]?.id ?? null
  const history = useHistory(selected)
  const logs = useDailyLogs()

  const weights = (logs.data ?? []).filter((l) => l.body_weight_kg != null)
  const latest = weights.at(-1)?.body_weight_kg ?? null
  const start = profile.data?.start_weight_kg ?? null
  const goal = profile.data?.goal_weight_kg ?? null
  const h = history.data ?? []
  const first = h[0]?.top_weight_kg
  const last = h.at(-1)?.top_weight_kg

  return (
    <>
      <header className="page-header">
        <div className="titles">
          <h1 className="page-title">통계</h1>
          <p className="page-sub">무게는 세션마다 가장 무거웠던 세트, 체중은 7일 평균으로 봅니다.</p>
        </div>
      </header>

      <div className="grid cols-2">
        <section className="panel stack">
          <div className="row">
            <h2 className="panel-title">종목별 무게</h2>
          </div>
          <Select
            label="종목 선택"
            searchable
            value={selected}
            onChange={setExId}
            options={strength.map((e) => ({ value: e.id, label: e.name, hint: EQUIPMENT_LABEL[e.equipment] }))}
          />
          {h.length > 0 && first != null && last != null && (
            <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
              <span className="num" style={{ fontSize: 34, fontWeight: 600 }}>
                {kg(last)}
              </span>
              <span className="muted">
                처음 {kg(first)}
                {first > 0 && last !== first && `, ${last > first ? '+' : ''}${Math.round(((last - first) / first) * 100)}%`}
              </span>
            </div>
          )}
          <LineChart labels={h.map((p) => md(p.date))} series={[{ label: '최고 무게', values: h.map((p) => p.top_weight_kg), color: 'var(--primary)' }]} unit="kg" />
        </section>

        <section className="panel stack">
          <div className="row">
            <h2 className="panel-title">체중</h2>
          </div>
          <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
            <span className="num" style={{ fontSize: 34, fontWeight: 600 }}>
              {latest != null ? kg(latest) : '—'}
            </span>
            {latest != null && start != null && (
              <span style={{ color: latest <= start ? 'var(--hit)' : 'var(--miss)', fontWeight: 600 }}>
                시작 대비 {latest - start > 0 ? '+' : ''}
                {+(latest - start).toFixed(1)}kg
              </span>
            )}
            {goal != null && <span className="muted">목표 {kg(goal)}</span>}
          </div>
          <LineChart
            labels={weights.map((l) => md(l.date))}
            series={[
              { label: '체중', values: weights.map((l) => l.body_weight_kg), color: 'var(--cardio)' },
              { label: '7일 평균', values: movingAverage(weights.map((l) => l.body_weight_kg), 7), color: 'var(--ink)', dashed: true },
            ]}
            unit="kg"
          />
          {weights.length === 0 && <p className="row-sub">운동 화면의 '몸 상태'에 아침 공복 체중을 기록하면 여기에 쌓입니다.</p>}
        </section>
      </div>
    </>
  )
}
