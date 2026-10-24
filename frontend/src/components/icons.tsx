import type { ImgHTMLAttributes, SVGProps } from 'react'
import markUrl from '../assets/brand/piste-mark.svg'
import spriteUrl from '../assets/icons/icons.svg'

type IconProps = SVGProps<SVGSVGElement>

/** assets/icons/icons.svg 의 아이콘 하나. 색은 글자색, 굵기(stroke-width)는 CSS 로 바꿀 수 있다 */
function Icon({ name, ...props }: IconProps & { name: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <use href={`${spriteUrl}#${name}`} />
    </svg>
  )
}

export const HomeIcon = (p: IconProps) => <Icon name="home" {...p} />
export const DumbbellIcon = (p: IconProps) => <Icon name="dumbbell" {...p} />
export const CalendarIcon = (p: IconProps) => <Icon name="calendar" {...p} />
export const BodyIcon = (p: IconProps) => <Icon name="body" {...p} />
export const ChartIcon = (p: IconProps) => <Icon name="chart" {...p} />
export const PlanIcon = (p: IconProps) => <Icon name="plan" {...p} />
export const SettingsIcon = (p: IconProps) => <Icon name="settings" {...p} />
export const MoreIcon = (p: IconProps) => <Icon name="more" {...p} />
export const ChevronLeft = (p: IconProps) => <Icon name="chevron-left" {...p} />
export const ChevronRight = (p: IconProps) => <Icon name="chevron-right" {...p} />
export const ChevronDown = (p: IconProps) => <Icon name="chevron-down" {...p} />
export const CheckIcon = (p: IconProps) => <Icon name="check" {...p} />
export const XIcon = (p: IconProps) => <Icon name="x" {...p} />
export const PlusIcon = (p: IconProps) => <Icon name="plus" {...p} />
export const MinusIcon = (p: IconProps) => <Icon name="minus" {...p} />
export const SearchIcon = (p: IconProps) => <Icon name="search" {...p} />

/** 브랜드 마크 (assets/brand/piste-mark.svg). 파비콘·홈 화면 아이콘과 같은 그림 */
export function BrandMark(props: ImgHTMLAttributes<HTMLImageElement>) {
  return <img src={markUrl} alt="" width={32} height={32} draggable={false} {...props} />
}
