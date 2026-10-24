import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { CheckIcon, ChevronDown, SearchIcon } from './icons'
import css from './Select.module.css'

interface SelectOption<T extends string | number> {
  value: T
  label: string
  /** 오른쪽에 흐리게 붙는 보조 설명 (예: 기구 종류) */
  hint?: string
}

interface Props<T extends string | number> {
  options: SelectOption<T>[]
  value: T | null
  onChange: (value: T) => void
  placeholder?: string
  /** 스크린리더용 이름 */
  label: string
  /** 목록 위에 검색창을 둔다 (항목이 많을 때) */
  searchable?: boolean
  /** 고른 뒤에도 placeholder 를 계속 보여 준다 ('추가' 용도) */
  resetAfterSelect?: boolean
}

const MAX_LIST_HEIGHT = 320

/**
 * 네이티브 <select> 는 펼친 목록을 OS가 그려서 꾸밀 수 없으므로 직접 만든 listbox.
 * WAI-ARIA combobox 패턴: 버튼이 열고, 화살표·Enter·Esc·Home/End 로 조작한다.
 */
export default function Select<T extends string | number>({
  options,
  value,
  onChange,
  placeholder = '선택',
  label,
  searchable = false,
  resetAfterSelect = false,
}: Props<T>) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [dropUp, setDropUp] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)

  const selected = options.find((o) => o.value === value) ?? null
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)) : options
  }, [options, query])

  function openList() {
    const idx = filtered.findIndex((o) => o.value === value)
    setActive(idx >= 0 ? idx : 0)
    setOpen(true)
  }

  function close(focusTrigger = true) {
    setOpen(false)
    setQuery('')
    if (focusTrigger) trigger.current?.focus()
  }

  function choose(o: SelectOption<T>) {
    onChange(o.value)
    close()
  }

  // 화면 아래쪽 공간이 모자라면 위로 펼친다
  useLayoutEffect(() => {
    if (!open || !root.current) return
    const r = root.current.getBoundingClientRect()
    const below = window.innerHeight - r.bottom
    setDropUp(below < MAX_LIST_HEIGHT + 24 && r.top > below)
    if (searchable) search.current?.focus()
  }, [open, searchable])

  // 바깥을 누르면 닫기
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (root.current?.contains(e.target as Node)) return
      setOpen(false)
      setQuery('')
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // 키보드로 움직인 항목이 보이도록 스크롤
  useEffect(() => {
    if (!open) return
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView?.({ block: "nearest" })
  }, [active, open])

  function onKeyDown(e: KeyboardEvent) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openList()
      }
      return
    }
    const last = filtered.length - 1
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActive((i) => Math.min(i + 1, last))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActive((i) => Math.max(i - 1, 0))
        break
      case 'Home':
        e.preventDefault()
        setActive(0)
        break
      case 'End':
        e.preventDefault()
        setActive(last)
        break
      case 'Enter':
        e.preventDefault()
        if (filtered[active]) choose(filtered[active])
        break
      case 'Escape':
        e.preventDefault()
        close()
        break
      case 'Tab':
        close(false)
        break
    }
  }

  const shown = resetAfterSelect ? null : selected
  const activeId = filtered[active] ? `${id}-opt-${active}` : undefined

  return (
    <div className={`${css.sel}${open ? ` ${css.open}` : ''}${dropUp ? ` ${css.up}` : ''}`} ref={root}>
      <button
        ref={trigger}
        type="button"
        className={css.trigger}
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open && !searchable ? activeId : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
      >
        <span className={shown ? css.value : css.placeholder}>{shown?.label ?? placeholder}</span>
        {shown?.hint && <span className={css.hint}>{shown.hint}</span>}
        <ChevronDown className={css.chevron} />
      </button>

      {open && (
        <div className={css.pop}>
          {searchable && (
            <div className={css.search}>
              <SearchIcon />
              <input
                ref={search}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                placeholder="종목 이름 검색"
                aria-label={`${label} 검색`}
                aria-controls={`${id}-list`}
                aria-activedescendant={activeId}
                onKeyDown={onKeyDown}
              />
            </div>
          )}
          <ul className={css.list} id={`${id}-list`} role="listbox" aria-label={label} ref={list}>
            {filtered.length === 0 && <li className={css.empty}>일치하는 종목이 없습니다</li>}
            {filtered.map((o, i) => {
              const isSel = o.value === value && !resetAfterSelect
              return (
                // 옵션은 포커스를 받지 않고 콤보박스가 aria-activedescendant 로 키보드를 처리한다
                // oxlint-disable-next-line jsx-a11y/click-events-have-key-events
                <li
                  key={String(o.value)}
                  id={`${id}-opt-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSel}
                  className={`${css.opt}${i === active ? ` ${css.active}` : ''}`}
                  onPointerMove={() => setActive(i)}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => choose(o)}
                >
                  <span className={css.optLabel}>{o.label}</span>
                  {o.hint && <span className={css.hint}>{o.hint}</span>}
                  <span className={css.check} aria-hidden>
                    {isSel && <CheckIcon />}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
