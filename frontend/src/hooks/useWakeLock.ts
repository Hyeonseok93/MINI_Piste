import { useEffect } from 'react'

/**
 * 운동 중 화면이 꺼지지 않게 한다. 보안 연결(https·localhost)에서만 동작하고,
 * 집 와이파이의 http 주소 등 지원하지 않는 환경에서는 조용히 넘어간다.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false

    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        lock = null
      }
    }
    // 다른 앱에 갔다 오면 잠금이 풀리므로 다시 건다
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !cancelled) void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => {})
    }
  }, [active])
}
