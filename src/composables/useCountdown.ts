import { ref, onUnmounted } from 'vue'

/**
 * A one-second countdown. `start` seeds the remaining seconds, ticks once per
 * second, and fires `onComplete` when it reaches zero. Uses Date-based drift
 * correction so a throttled/background tab doesn't accumulate error.
 *
 * 新增 `pause` / `resume` / `restart`：与源项目一致，让用户能中途停下来、
 * 续上或从满血重来，不必离开计时弹层。
 *
 * `stop` cancels a running countdown and is safe to call repeatedly.
 */
export function useCountdown() {
  const secondsLeft = ref(0)
  let intervalId: number | null = null
  let deadline = 0
  let pausedRemaining = 0
  let totalSeconds = 0
  let onComplete: (() => void) | null = null

  function clear() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function tick() {
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
    secondsLeft.value = remaining
    if (remaining <= 0) {
      clear()
      const cb = onComplete
      onComplete = null
      cb?.()
    }
  }

  function start(secs: number, cb?: () => void) {
    clear()
    totalSeconds = Math.max(0, Math.round(Number(secs) || 0))
    secondsLeft.value = totalSeconds
    deadline = Date.now() + totalSeconds * 1000
    pausedRemaining = totalSeconds
    onComplete = cb ?? null
    intervalId = window.setInterval(tick, 250)
  }

  function pause() {
    if (intervalId === null) return
    pausedRemaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
    secondsLeft.value = pausedRemaining
    clear()
  }

  function resume() {
    if (intervalId !== null || pausedRemaining <= 0) return
    deadline = Date.now() + pausedRemaining * 1000
    intervalId = window.setInterval(tick, 250)
  }

  function restart() {
    if (totalSeconds <= 0) return
    const cb = onComplete
    start(totalSeconds, cb ?? undefined)
  }

  function stop() {
    clear()
    pausedRemaining = 0
    totalSeconds = 0
    onComplete = null
  }

  onUnmounted(clear)

  return {
    secondsLeft,
    isRunning: () => intervalId !== null,
    start,
    pause,
    resume,
    restart,
    stop,
  }
}
