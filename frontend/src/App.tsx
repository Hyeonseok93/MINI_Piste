import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useProfile } from './api/hooks'
import AppShell from './components/AppShell'
import AnalysisPage from './pages/AnalysisPage'
import BodyPage from './pages/BodyPage'
import CalendarPage from './pages/CalendarPage'
import HomePage from './pages/HomePage'
import MorePage from './pages/MorePage'
import PlanPage from './pages/PlanPage'
import SessionPage from './pages/SessionPage'
import SettingsPage from './pages/SettingsPage'
import WelcomePage from './pages/WelcomePage'
import WorkoutPage from './pages/WorkoutPage'

export default function App() {
  const { data: profile, isPending, isError, error, refetch } = useProfile()
  const { pathname } = useLocation()

  if (isPending) return <div className="empty page-state">불러오는 중…</div>
  if (isError)
    return (
      <div className="empty page-state">
        <p>서버에 연결하지 못했습니다. ({error.message})</p>
        <p className="muted">Docker가 켜져 있는지 확인한 뒤 다시 시도하세요.</p>
        <button className="btn btn-secondary mt-md" onClick={() => refetch()}>
          다시 시도
        </button>
      </div>
    )

  // 이름을 정하기 전에는 시작 화면만 보여 준다
  if (!profile) return pathname === '/welcome' ? <WelcomePage /> : <Navigate to="/welcome" replace />

  return (
    <Routes>
      <Route path="/welcome" element={<Navigate to="/" replace />} />
      {/* 운동 모드는 메뉴 없이 전체 화면 */}
      <Route path="/session" element={<SessionPage />} />
      <Route element={<AppShell profile={profile} />}>
        <Route index element={<HomePage profile={profile} />} />
        <Route path="workout" element={<WorkoutPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="body" element={<BodyPage />} />
        <Route path="analysis" element={<AnalysisPage />} />
        {/* 예전 주소 */}
        <Route path="history" element={<Navigate to="/analysis?tab=history" replace />} />
        <Route path="progress" element={<Navigate to="/analysis?tab=trend" replace />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="settings" element={<SettingsPage profile={profile} />} />
        <Route path="more" element={<MorePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
