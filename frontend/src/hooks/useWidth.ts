import { useCallback, useRef, useState } from 'react'

/** 요소의 실제 폭(px). 그래프·타임라인을 viewBox 로 늘이지 않고 실제 폭으로 그려야 휴대폰에서 글자가 작아지지 않는다 */
export function useWidth() {
  const [width, setWidth] = useState(0)
  const observer = useRef<ResizeObserver | null>(null)
  // 데이터가 늦게 와서 figure 가 나중에 생겨도 잴 수 있게 콜백 ref 를 쓴다
  const ref = useCallback((el: HTMLElement | null) => {
    observer.current?.disconnect()
    if (!el) return
    setWidth(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    observer.current = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)))
    observer.current.observe(el)
  }, [])
  return [ref, width] as const
}
