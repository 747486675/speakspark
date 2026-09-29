/** Format a whole number of seconds as m:ss (e.g. 65 -> "1:05"). */
export function formatMSS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/** Convert minutes to seconds. */
export function minutesToSeconds(minutes: number): number {
  return Math.round(minutes) * 60
}

/** Convert seconds to whole minutes. */
export function secondsToMinutes(seconds: number): number {
  return Math.round(seconds / 60)
}

/**
 * Fraction elapsed in [0, 1] given seconds left and the original total.
 * Returns 0 when total is non-positive.
 */
export function elapsedFraction(secondsLeft: number, totalSeconds: number): number {
  if (totalSeconds <= 0) return 0
  const elapsed = totalSeconds - secondsLeft
  return Math.min(1, Math.max(0, elapsed / totalSeconds))
}
