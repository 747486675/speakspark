import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useCountdown } from './useCountdown'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useCountdown', () => {
  it('seeds the full duration before any tick', () => {
    const { secondsLeft, start } = useCountdown()
    start(60)
    expect(secondsLeft.value).toBe(60)
  })

  it('counts down as time passes', () => {
    const { secondsLeft, start } = useCountdown()
    start(10)
    vi.advanceTimersByTime(3000)
    expect(secondsLeft.value).toBe(7)
  })

  it('does not reach zero early — a partial second still reads as 1', () => {
    const { secondsLeft, start } = useCountdown()
    const onComplete = vi.fn()
    start(2, onComplete)
    // 1.5s in, 500ms remain. Rounding would show 0 and fire onComplete here.
    vi.advanceTimersByTime(1500)
    expect(secondsLeft.value).toBe(1)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('fires onComplete exactly once when the deadline passes', () => {
    const { secondsLeft, start } = useCountdown()
    const onComplete = vi.fn()
    start(2, onComplete)
    vi.advanceTimersByTime(2000)
    expect(secondsLeft.value).toBe(0)
    expect(onComplete).toHaveBeenCalledTimes(1)

    // The interval must be cleared, not left running past zero.
    vi.advanceTimersByTime(5000)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('stop cancels a running countdown', () => {
    const { start, stop } = useCountdown()
    const onComplete = vi.fn()
    start(5, onComplete)
    vi.advanceTimersByTime(1000)
    stop()
    vi.advanceTimersByTime(10000)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('stop is safe to call repeatedly and before start', () => {
    const { stop } = useCountdown()
    expect(() => {
      stop()
      stop()
    }).not.toThrow()
  })

  it('restarting replaces the previous countdown', () => {
    const { secondsLeft, start } = useCountdown()
    const first = vi.fn()
    const second = vi.fn()
    start(10, first)
    vi.advanceTimersByTime(2000)
    start(3, second)
    expect(secondsLeft.value).toBe(3)
    vi.advanceTimersByTime(3000)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
