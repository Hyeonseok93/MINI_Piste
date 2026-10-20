import { Link } from 'react-router-dom'
import { ChartIcon, ChevronRight, PlanIcon, SettingsIcon } from '../components/icons'

const ITEMS = [
  { to: '/progress', label: '통계', icon: ChartIcon },
  { to: '/plan', label: '플랜 · 루틴 · 종목', icon: PlanIcon },
  { to: '/settings', label: '프로필 설정', icon: SettingsIcon },
]

export default function MorePage() {
  return (
    <>
      <header className="page-header">
        <div className="titles">
          <h1 className="page-title">더보기</h1>
        </div>
      </header>
      <nav className="panel menu-list" aria-label="더보기 메뉴">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}>
            <Icon />
            <span className="grow">{label}</span>
            <ChevronRight />
          </Link>
        ))}
      </nav>
    </>
  )
}
