import type { ComponentType, SVGProps } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import type { Profile } from '../api/types'
import { initial } from '../lib/format'
import {
  BrandMark,
  CalendarIcon,
  ChartIcon,
  DumbbellIcon,
  HomeIcon,
  ListIcon,
  MoreIcon,
  PlanIcon,
} from './icons'

type Item = { to: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }

const SIDEBAR: Item[] = [
  { to: '/', label: '홈', icon: HomeIcon },
  { to: '/workout', label: '오늘 운동', icon: DumbbellIcon },
  { to: '/calendar', label: '달력', icon: CalendarIcon },
  { to: '/history', label: '운동 기록', icon: ListIcon },
  { to: '/progress', label: '통계', icon: ChartIcon },
  { to: '/plan', label: '플랜', icon: PlanIcon },
]

const TABS: Item[] = [
  { to: '/', label: '홈', icon: HomeIcon },
  { to: '/workout', label: '운동', icon: DumbbellIcon },
  { to: '/calendar', label: '달력', icon: CalendarIcon },
  { to: '/history', label: '기록', icon: ListIcon },
  { to: '/more', label: '더보기', icon: MoreIcon },
]

export default function AppShell({ profile }: { profile: Profile }) {
  return (
    <div className="shell">
      <aside className="sidebar" aria-label="사이드바">
        <Link to="/" className="brand">
          <BrandMark className="brand-mark" />
          PISTE
        </Link>
        <nav className="nav" aria-label="주요 메뉴">
          {SIDEBAR.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <NavLink to="/settings" className="me">
            <span className="avatar">{initial(profile.name)}</span>
            <span className="grow">
              <span className="me-name" style={{ display: 'block' }}>
                {profile.name}
              </span>
              <span className="me-sub">프로필 · 설정</span>
            </span>
          </NavLink>
        </div>
      </aside>

      <header className="topbar">
        <Link to="/" className="brand grow" style={{ fontSize: 20 }}>
          <BrandMark className="brand-mark" style={{ width: 26, height: 26 }} />
          PISTE
        </Link>
        <Link to="/settings" aria-label="프로필 설정">
          <span className="avatar sm">{initial(profile.name)}</span>
        </Link>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <nav className="tabbar" aria-label="하단 메뉴">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
