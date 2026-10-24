import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { addDays, parseISODate, todayISO, weekdayIndex, weekdayLabel } from '../lib/date'
import css from './DatePicker.module.css'
import { CalendarIcon, ChevronLeft, ChevronRight } from './icons'

interface Props {
  value: string | null
  onChange: (date: string) => void
  /** 스크린리더용 이름 */
  label: string
  placeholder?: string
  min?: string
  max?: string
}

const POP_HEIGHT = 360
const monthOf = (d: string) => d.slice(0, 7)

function shiftMonth(month: string, n: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** 그 달 1일 앞의 빈칸 + 날짜들 (월요일 시작) */
function monthDays(month: string) {
  const first = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const count = new Date(y, m, 0).getDate()
  return { lead: weekdayIndex(first), days: Array.from({ length: count }, (_, i) => addDays(first, i)) }
}

/** 2026-10-26 → "2026. 10. 26 (월)" */
function display(d: string) {
  const dt = parseISODate(d)
  return `${dt.getFullYear()}. ${dt.getMonth() + 1}. ${dt.getDate()} (${weekdayLabel(weekdayIndex(d))})`
}

/**
 * 브라우저 기본 날짜 입력(<input type="date">)은 OS 마다 모양이 달라 직접 만든 달력.
 * 화살표로 하루·일주일씩, PageUp/Down 으로 한 달씩 움직이고 Enter 로 고른다.
 */
export default function DatePicker({ value, onChange, label, placeholder = '날짜 선택', min, max }: Props) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [focus, setFocus] = useState(value ?? todayISO())
  const [month, setMonth] = useState(monthOf(focus))
  const [dropUp, setDropUp] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const grid = useRef<HTMLDivElement>(null)

  const allowed = (d: string) => (!min || d >= min) && (!max || d <= max)
  const today = todayISO()

  function openPop() {
    const start = value ?? (min && today < min ? min : today)
    setFocus(start)
    setMonth(monthOf(start))
    setOpen(true)
  }

  function close(focusTrigger = true) {
    setOpen(false)
    if (focusTrigger) trigger.current?.focus()
  }

  function choose(d: string) {
    if (!allowed(d)) return
    onChange(d)
    close()
  }

  useLayoutEffect(() => {
    if (!open || !root.current) return
    const r = root.current.getBoundingClientRect()
    const below = window.innerHeight - r.bottom
    setDropUp(below < POP_HEIGHT + 24 && r.top > below)
  }, [open])

  // 키보드로 옮긴 날짜에 포커스
  useEffect(() => {
    if (open) grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focus}"]`)?.focus()
  }, [open, focus])

  // 바깥을 누르거나 Esc 를 누르면 닫기
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      setOpen(false)
      trigger.current?.focus()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  function move(to: string) {
    // 고를 수 없는 날짜로는 가지 않는다
    const next = min && to < min ? min : max && to > max ? max : to
    setFocus(next)
    setMonth(monthOf(next))
  }

  function onKeyDown(e: KeyboardEvent) {
    const keys: Record<string, () => void> = {
      ArrowLeft: () => move(addDays(focus, -1)),
      ArrowRight: () => move(addDays(focus, 1)),
      ArrowUp: () => move(addDays(focus, -7)),
      ArrowDown: () => move(addDays(focus, 7)),
      PageUp: () => move(`${shiftMonth(monthOf(focus), -1)}-${focus.slice(8)}`.replace(/-(29|30|31)$/, '-28')),
      PageDown: () => move(`${shiftMonth(monthOf(focus), 1)}-${focus.slice(8)}`.replace(/-(29|30|31)$/, '-28')),
      Home: () => move(addDays(focus, -weekdayIndex(focus))),
      End: () => move(addDays(focus, 6 - weekdayIndex(focus))),
    }
    const fn = keys[e.key]
    if (!fn) return
    e.preventDefault()
    fn()
  }

  const { lead, days } = monthDays(month)
  const [y, m] = month.split('-').map(Number)

  return (
    <div className={`${css.picker}${open ? ` ${css.open}` : ''}${dropUp ? ` ${css.up}` : ''}`} ref={root}>
      <button
        ref={trigger}
        type="button"
        className={css.trigger}
        aria-label={`${label}${value ? `, ${display(value)}` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-pop`}
        onClick={() => (open ? close() : openPop())}
      >
        <CalendarIcon className={css.icon} />
        <span className={value ? `num ${css.value}` : css.placeholder}>{value ? display(value) : placeholder}</span>
      </button>

      {open && (
        <div className={css.pop} id={`${id}-pop`} role="dialog" aria-label={`${label} 달력`}>
          <div className={css.head}>
            <button type="button" className="icon-btn" aria-label="이전 달" onClick={() => setMonth(shiftMonth(month, -1))}>
              <ChevronLeft />
            </button>
            <p className={`num ${css.month}`} aria-live="polite">
              {y}. {m}
            </p>
            <button type="button" className="icon-btn" aria-label="다음 달" onClick={() => setMonth(shiftMonth(month, 1))}>
              <ChevronRight />
            </button>
          </div>
          <div className={css.weekdays} aria-hidden>
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i}>{weekdayLabel(i)}</span>
            ))}
          </div>
          <div className={css.grid} ref={grid} role="grid" aria-label={`${y}년 ${m}월`}>
            {Array.from({ length: lead }, (_, i) => (
              <span key={`b${i}`} aria-hidden />
            ))}
            {days.map((d) => (
              <button
                key={d}
                type="button"
                role="gridcell"
                data-date={d}
                className={[css.day, d === value && css.selected, d === today && css.today].filter(Boolean).join(' ')}
                aria-selected={d === value}
                aria-label={display(d)}
                tabIndex={d === focus ? 0 : -1}
                disabled={!allowed(d)}
                onClick={() => choose(d)}
                onFocus={() => setFocus(d)}
                onKeyDown={onKeyDown}
              >
                <span className="num">{parseISODate(d).getDate()}</span>
              </button>
            ))}
          </div>
          <div className={css.foot}>
            <button type="button" className="btn btn-ghost btn-sm" disabled={!allowed(today)} onClick={() => choose(today)}>
              오늘
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => close()}>
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
