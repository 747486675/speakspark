import { describe, it, expect } from 'vitest'
import {
  formatMSS,
  minutesToSeconds,
  secondsToMinutes,
  elapsedFraction,
} from './duration'

describe('formatMSS', () => {
  it('formats whole minutes', () => {
    expect(formatMSS(60)).toBe('1:00')
    expect(formatMSS(120)).toBe('2:00')
  })

  it('pads seconds to two digits', () => {
    expect(formatMSS(65)).toBe('1:05')
    expect(formatMSS(9)).toBe('0:09')
  })

  it('handles zero', () => {
    expect(formatMSS(0)).toBe('0:00')
  })

  it('clamps negative input to zero', () => {
    expect(formatMSS(-5)).toBe('0:00')
  })
})

describe('minutes <-> seconds', () => {
  it('converts minutes to seconds', () => {
    expect(minutesToSeconds(3)).toBe(180)
  })

  it('rounds seconds to nearest minute', () => {
    expect(secondsToMinutes(180)).toBe(3)
    expect(secondsToMinutes(200)).toBe(3)
    expect(secondsToMinutes(210)).toBe(4)
  })
})

describe('elapsedFraction', () => {
  it('is 0 at the start', () => {
    expect(elapsedFraction(120, 120)).toBe(0)
  })

  it('is 1 when no time is left', () => {
    expect(elapsedFraction(0, 120)).toBe(1)
  })

  it('is halfway at the midpoint', () => {
    expect(elapsedFraction(60, 120)).toBeCloseTo(0.5)
  })

  it('guards against a zero total', () => {
    expect(elapsedFraction(0, 0)).toBe(0)
  })
})
