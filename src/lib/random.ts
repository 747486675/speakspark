/** Return a random integer in [min, max] inclusive. */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Random index in [0, length). Returns 0 for an empty or single-item list. */
export function pickIndex(length: number): number {
  if (length <= 1) return 0
  return Math.floor(Math.random() * length)
}

/** Pick a random element from a non-empty array. */
export function pick<T>(items: readonly T[]): T {
  return items[pickIndex(items.length)]
}

/**
 * Pick a random index different from `current`. Falls back to any index when the
 * list has a single item.
 */
export function pickDifferentIndex(length: number, current: number): number {
  if (length <= 1) return 0
  let next = pickIndex(length)
  while (next === current) {
    next = pickIndex(length)
  }
  return next
}
