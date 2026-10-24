import type { ComponentType, SVGProps } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import type { Profile } from '../api/types'
import { initial } from '../lib/format'
import s from './AppShell.module.css'
import ErrorBoundary from './ErrorBoundary'
import { BodyIcon, BrandMark, CalendarIcon, ChartIcon, DumbbellIcon, HomeIcon, MoreIcon, PlanIcon } from './icons'

type Item = { to: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }

const SIDEBAR: Item[] = [
  { to: '/', label: '홈', icon: HomeIcon },
  { to: '/workout', label: '오늘 운동', icon: DumbbellIcon },
  { to: '/calendar', label: '달력', icon: CalendarIcon },
  { to: '/body', label: '체중', icon: BodyIcon },
  { to: '/analysis', label: '분석', icon: ChartIcon },
  { to: '/plan', label: '플랜', icon: PlanIcon },
]

const TABS: Item[] = [
  { to: '/', label: '홈', icon: HomeIcon },
  { to: '/workout', label: '운동', icon: DumbbellIcon },
  { to: '/calendar', label: '달력', icon: CalendarIcon },
  { to: '/body', label: '체중', icon: BodyIcon },
  { to: '/more', label: '더보기', icon: MoreIcon },
]

function Brand() {
  return (
    <Link to="/" className={s.brand}>
      <BrandMark className={s.brandMark} />
      PISTE
    </Link>
  )
}

export default function AppShell({ profile }: { profile: Profile }) {
  const { pathname } = useLocation()
  return (
    <div className={s.shell}>
      <aside className={s.sidebar} aria-label="사이드바">
        <Brand />
        <nav className={s.nav} aria-label="주요 메뉴">
          {SIDEBAR.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/settings" className={s.me}>
          <span className={s.avatar}>{initial(profile.name)}</span>
          <span>
            <span className={s.meName}>{profile.name}</span>
            <span className={s.meSub}>프로필과 설정</span>
          </span>
        </NavLink>
      </aside>

      <header className={s.topbar}>
        <Brand />
        <Link to="/settings" aria-label="프로필과 설정">
          <span className={s.avatar}>{initial(profile.name)}</span>
        </Link>
      </header>

      <main className={s.content}>
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <nav className={s.tabbar} aria-label="하단 메뉴">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
