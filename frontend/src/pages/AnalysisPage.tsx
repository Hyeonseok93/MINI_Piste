import { useSearchParams } from 'react-router-dom'
import { useBalance, useMuscleVolume, usePRs } from '../api/hooks'
import ExerciseTrend from '../components/analysis/ExerciseTrend'
import HistoryList from '../components/analysis/HistoryList'
import MuscleBars from '../components/analysis/MuscleBars'
import { addDays, formatShort, todayISO } from '../lib/date'
import { kg } from '../lib/format'

type Tab = 'summary' | 'trend' | 'history'
const TABS: [Tab, string][] = [
  ['summary', '요약'],
  ['trend', '종목 추이'],
  ['history', '운동 기록'],
]

/** 분석: 근육별 훈련량·개인 기록·좌우 균형 / 종목 추이 / 운동 기록 */
export default function AnalysisPage() {
  const [params, setParams] = useSearchParams()
  const tab = (TABS.find(([k]) => k === params.get('tab'))?.[0] ?? 'summary') as Tab

  return (
    <>
      <header className="page-header">
        <div className="titles">
          <h1 className="page-title">분석</h1>
          <p className="page-sub">어느 부위를 얼마나 했는지, 기록이 어떻게 늘고 있는지 봅니다.</p>
        </div>
        <div className="seg" role="tablist">
          {TABS.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setParams(k === 'summary' ? {} : { tab: k })}>
              {label}
            </button>
          ))}
        </div>
      </header>
      {tab === 'summary' && <Summary />}
      {tab === 'trend' && <ExerciseTrend />}
      {tab === 'history' && <HistoryList />}
    </>
  )
}

function Summary() {
  const today = todayISO()
  const week = { from: addDays(today, -6), to: today }
  const month = { from: addDays(today, -27), to: today }
  const volume = useMuscleVolume(week)
  const prs = usePRs()
  const balance = useBalance(month)

  return (
    <div className="grid cols-2">
      <section className="panel stack">
        <div className="panel-head">
          <h2 className="panel-title">최근 7일 근육별 세트</h2>
          <span className="muted">
            {formatShort(week.from)} – {formatShort(week.to)}
          </span>
        </div>
        {volume.data ? <MuscleBars data={volume.data} /> : <div className="skeleton md" />}
      </section>

      <div className="stack">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">개인 기록</h2>
          </div>
          {prs.data?.length === 0 && <p className="empty">무게를 기록하면 종목별 최고 기록이 쌓입니다.</p>}
          <ul className="rows">
            {prs.data?.map((p) => (
              <li key={p.exercise_id}>
                <span className="grow">
                  <span className="row-title block">{p.name}</span>
                  <span className="row-sub">
                    {formatShort(p.best_weight_date)} · 추정 1RM {kg(p.e1rm_kg)}
                  </span>
                </span>
                <span className="num num-lg">
                  {kg(p.best_weight_kg)} × {p.best_weight_reps}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">좌우 균형 (최근 4주)</h2>
          </div>
          {balance.data?.length === 0 ? (
            <p className="row-sub">싱글 레그프레스처럼 한쪽씩 하는 종목을 기록하면 왼쪽·오른쪽을 비교해 드립니다.</p>
          ) : (
            <ul className="rows">
              {balance.data?.map((b) => (
                <li key={b.exercise_id}>
                  <span className="grow">
                    <span className="row-title block">{b.name}</span>
                    <span className="row-sub">
                      왼쪽 {kg(b.left.top_weight_kg)} · 오른쪽 {kg(b.right.top_weight_kg)}
                    </span>
                  </span>
                  {b.weaker ? (
                    <span className={`pill ${b.diff_pct != null && b.diff_pct >= 10 ? 'miss' : 'find'}`}>
                      {b.weaker === 'L' ? '왼쪽' : '오른쪽'} 약함{b.diff_pct != null && ` ${b.diff_pct}%`}
                    </span>
                  ) : (
                    <span className="pill hit">균형</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
