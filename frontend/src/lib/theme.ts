import { useSyncExternalStore } from 'react'

/** 화면 테마. 다크가 기본, 시스템은 기기 설정을 따른다. */
export type ThemePref = 'dark' | 'light' | 'system'

// index.html 의 첫 그림 전 스크립트도 같은 키를 읽는다
const KEY = 'piste-theme'
const META_COLOR = { dark: '#0d121c', light: '#f4f5f8' } as const
const LIGHT_QUERY = '(prefers-color-scheme: light)'

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'system' ? v : 'dark'
  } catch {
    return 'dark' // 사생활 보호 모드 등에서 저장소를 못 쓰면 기본값
  }
}

let current: ThemePref = read()
const listeners = new Set<() => void>()

function apply() {
  const light = current === 'light' || (current === 'system' && window.matchMedia?.(LIGHT_QUERY).matches)
  const theme = light ? 'light' : 'dark'
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[theme])
}

/** 앱 시작 때 한 번: 테마를 적용하고, '시스템'일 때 기기 설정이 바뀌면 따라간다 */
export function initTheme() {
  apply()
  window.matchMedia?.(LIGHT_QUERY).addEventListener?.('change', () => current === 'system' && apply())
}

function setThemePref(pref: ThemePref) {
  current = pref
  try {
    localStorage.setItem(KEY, pref)
  } catch {
    // 저장 못 해도 이번 화면에는 적용된다
  }
  apply()
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function useThemePref() {
  const pref = useSyncExternalStore(subscribe, () => current)
  return [pref, setThemePref] as const
}
