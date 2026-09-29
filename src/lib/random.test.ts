import { describe, it, expect } from 'vitest'
import { pick, pickIndex, pickDifferentIndex } from './random'

describe('pick', () => {
  it('returns an element from the array', () => {
    const items = ['a', 'b', 'c']
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(pick(items))
    }
  })

  it('returns the sole element of a one-item array', () => {
    expect(pick(['only'])).toBe('only')
  })
})

describe('pickIndex', () => {
  it('returns an in-range index', () => {
    for (let i = 0; i < 50; i++) {
      const idx = pickIndex(5)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(5)
    }
  })
})

describe('pickDifferentIndex', () => {
  it('never returns the current index across many draws', () => {
    for (let current = 0; current < 4; current++) {
      for (let i = 0; i < 200; i++) {
        expect(pickDifferentIndex(4, current)).not.toBe(current)
      }
    }
  })

  it('stays in range', () => {
    for (let i = 0; i < 200; i++) {
      const idx = pickDifferentIndex(4, 2)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(4)
    }
  })

  it('returns the only other index in a two-item list', () => {
    expect(pickDifferentIndex(2, 0)).toBe(1)
    expect(pickDifferentIndex(2, 1)).toBe(0)
  })

  it('falls back to 0 for a single-item list rather than looping forever', () => {
    expect(pickDifferentIndex(1, 0)).toBe(0)
  })
})
