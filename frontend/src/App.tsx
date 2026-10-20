import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useProfile } from './api/hooks'
import AppShell from './components/AppShell'
import CalendarPage from './pages/CalendarPage'
import HistoryPage from './pages/HistoryPage'
import HomePage from './pages/HomePage'
import MorePage from './pages/MorePage'
import PlanPage from './pages/PlanPage'
import ProgressPage from './pages/ProgressPage'
import SettingsPage from './pages/SettingsPage'
import WelcomePage from './pages/WelcomePage'
import WorkoutPage from './pages/WorkoutPage'

export default function App() {
  const { data: profile, isPending, isError, error, refetch } = useProfile()
  const { pathname } = useLocation()

  if (isPending) return <div className="empty" style={{ paddingTop: '40dvh' }}>불러오는 중…</div>
  if (isError)
    return (
      <div className="empty" style={{ paddingTop: '30dvh' }}>
        <p>서버에 연결하지 못했습니다. ({error.message})</p>
        <p className="muted">Docker가 켜져 있는지 확인한 뒤 다시 시도하세요.</p>
        <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => refetch()}>
          다시 시도
        </button>
      </div>
    )

  // 이름을 정하기 전에는 시작 화면만 보여 준다
  if (!profile) return pathname === '/welcome' ? <WelcomePage /> : <Navigate to="/welcome" replace />

  return (
    <Routes>
      <Route path="/welcome" element={<Navigate to="/" replace />} />
      <Route element={<AppShell profile={profile} />}>
        <Route index element={<HomePage profile={profile} />} />
        <Route path="workout" element={<WorkoutPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="settings" element={<SettingsPage profile={profile} />} />
        <Route path="more" element={<MorePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
