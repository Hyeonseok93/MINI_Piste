import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Svg({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      {children}
    </svg>
  )
}

export function HomeIcon(props: IconProps) {
  return <Svg {...props}><path d="M3.5 10.5 12 4l8.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4.5V15h-5v5.5H5A1.5 1.5 0 0 1 3.5 19z" /></Svg>
}
export function DumbbellIcon(props: IconProps) {
  return <Svg {...props}><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" /></Svg>
}
export function CalendarIcon(props: IconProps) {
  return <Svg {...props}><>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </></Svg>
}
export function BodyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M6 9.5c2 .8 4 1.2 6 1.2s4-.4 6-1.2M12 10.7V15m0 0-2.5 6M12 15l2.5 6" />
    </Svg>
  )
}

export function ChartIcon(props: IconProps) {
  return <Svg {...props}><path d="M4 19.5h16M7 16v-5M12 16V7M17 16v-8" /></Svg>
}
export function PlanIcon(props: IconProps) {
  return <Svg {...props}><>
    <path d="M4 6.5h16M4 12h16M4 17.5h10" />
    <circle cx="18" cy="17.5" r="2" />
  </></Svg>
}
export function SettingsIcon(props: IconProps) {
  return <Svg {...props}><>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </></Svg>
}
export function MoreIcon(props: IconProps) {
  return <Svg {...props}><>
    <circle cx="5" cy="12" r="1.2" />
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="19" cy="12" r="1.2" />
  </></Svg>
}
export function ChevronLeft(props: IconProps) {
  return <Svg {...props}><path d="m14.5 6-6 6 6 6" /></Svg>
}
export function ChevronRight(props: IconProps) {
  return <Svg {...props}><path d="m9.5 6 6 6-6 6" /></Svg>
}
export function CheckIcon(props: IconProps) {
  return <Svg {...props}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>
}
export function XIcon(props: IconProps) {
  return <Svg {...props}><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></Svg>
}
export function PlusIcon(props: IconProps) {
  return <Svg {...props}><path d="M12 5v14M5 12h14" /></Svg>
}
export function MinusIcon(props: IconProps) {
  return <Svg {...props}><path d="M5 12h14" /></Svg>
}

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

export function ChevronDown(props: IconProps) {
  return <Svg {...props}><path d="m6 9.5 6 6 6-6" /></Svg>
}
export function SearchIcon(props: IconProps) {
  return <Svg {...props}><>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </></Svg>
}
