import type { ReactNode, SVGProps } from 'react'

function make(path: ReactNode) {
  return function Icon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
        {path}
      </svg>
    )
  }
}

export const HomeIcon = make(<path d="M3.5 10.5 12 4l8.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4.5V15h-5v5.5H5A1.5 1.5 0 0 1 3.5 19z" />)
export const DumbbellIcon = make(<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />)
export const CalendarIcon = make(
  <>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </>,
)
export const ListIcon = make(<path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />)
export const ChartIcon = make(<path d="M4 19.5h16M7 16v-5M12 16V7M17 16v-8" />)
export const PlanIcon = make(
  <>
    <path d="M4 6.5h16M4 12h16M4 17.5h10" />
    <circle cx="18" cy="17.5" r="2" />
  </>,
)
export const SettingsIcon = make(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </>,
)
export const MoreIcon = make(
  <>
    <circle cx="5" cy="12" r="1.2" />
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="19" cy="12" r="1.2" />
  </>,
)
export const ChevronLeft = make(<path d="m14.5 6-6 6 6 6" />)
export const ChevronRight = make(<path d="m9.5 6 6 6-6 6" />)
export const CheckIcon = make(<path d="m5 12.5 4.5 4.5L19 7.5" />)
export const XIcon = make(<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />)
export const PlusIcon = make(<path d="M12 5v14M5 12h14" />)
export const MinusIcon = make(<path d="M5 12h14" />)
export const TrashIcon = make(<path d="M4.5 7h15M10 11v6M14 11v6M6 7l1 12.5h10L18 7M9 7V4.5h6V7" />)

/** 브랜드 마크: 위에서 본 피스트(경기장) — 중앙선과 앙가르드 선 */
export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden {...props}>
      <rect x="1" y="9" width="30" height="14" rx="3" fill="var(--ink)" />
      <rect x="3" y="11" width="5" height="10" rx="1" fill="var(--miss)" />
      <rect x="24" y="11" width="5" height="10" rx="1" fill="var(--hit)" />
      <path d="M16 11v10M12 13v6M20 13v6" stroke="var(--surface)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
