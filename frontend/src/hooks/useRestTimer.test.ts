import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRestTimer } from './useRestTimer'

describe('useRestTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })
  afterEach(() => vi.useRealTimers())

  it('counts down, adjusts and finishes', () => {
    const { result } = renderHook(() => useRestTimer())
    act(() => result.current.start(90, '레그프레스'))
    expect(result.current.running).toBe(true)
    expect(result.current.remaining).toBe(90)

    act(() => vi.advanceTimersByTime(30_000))
    expect(result.current.remaining).toBe(60)

    act(() => result.current.add(30))
    act(() => vi.advanceTimersByTime(250))
    expect(result.current.remaining).toBe(90)

    act(() => vi.advanceTimersByTime(90_000))
    expect(result.current.running).toBe(false)
    expect(localStorage.getItem('piste.rest-timer')).toBeNull()
  })

  it('survives a remount (page refresh) via storage', () => {
    const first = renderHook(() => useRestTimer())
    act(() => first.result.current.start(60, '펙덱'))
    first.unmount()

    act(() => vi.advanceTimersByTime(20_000))
    const second = renderHook(() => useRestTimer())
    expect(second.result.current.running).toBe(true)
    expect(second.result.current.label).toBe('펙덱')
    expect(second.result.current.remaining).toBe(40)
  })

  it('skip stops immediately', () => {
    const { result } = renderHook(() => useRestTimer())
    act(() => result.current.start(60, 'x'))
    act(() => result.current.skip())
    expect(result.current.running).toBe(false)
  })
})
