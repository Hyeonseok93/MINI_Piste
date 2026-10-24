import { useCallback, useEffect, useState } from 'react'
import { beep, vibrate } from '../lib/feedback'

const KEY = 'piste.rest-timer'

interface Saved {
  endAt: number // ms epoch
  total: number // 초
  label: string
}

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY)
    const v = raw ? (JSON.parse(raw) as Saved) : null
    return v && v.endAt > Date.now() ? v : null
  } catch {
    return null
  }
}

function save(v: Saved | null) {
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v))
    else localStorage.removeItem(KEY)
  } catch {
    /* 저장 불가(사생활 보호 모드 등): 화면이 열려 있는 동안만 동작 */
  }
}

/**
 * 세트 사이 휴식 타이머. 끝나는 시각을 저장하므로 새로고침·화면 이동 뒤에도 이어진다.
 * 끝나면 진동 + 비프음.
 */
export function useRestTimer() {
  const [timer, setTimer] = useState<Saved | null>(load)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!timer) return
    const id = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= timer.endAt) {
        window.clearInterval(id)
        save(null)
        setTimer(null)
        vibrate()
        beep()
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [timer])

  const start = useCallback((seconds: number, label: string) => {
    const v = { endAt: Date.now() + seconds * 1000, total: seconds, label }
    save(v)
    setNow(Date.now())
    setTimer(v)
  }, [])

  const add = useCallback((seconds: number) => {
    setTimer((cur) => {
      if (!cur) return cur
      const endAt = Math.max(Date.now() + 1000, cur.endAt + seconds * 1000)
      const v = { ...cur, endAt, total: Math.max(cur.total + seconds, 1) }
      save(v)
      return v
    })
  }, [])

  const skip = useCallback(() => {
    save(null)
    setTimer(null)
  }, [])

  const remaining = timer ? Math.max(0, Math.ceil((timer.endAt - now) / 1000)) : 0
  return { running: timer != null, remaining, total: timer?.total ?? 0, label: timer?.label ?? '', start, add, skip }
}
