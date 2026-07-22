import { describe, expect, it } from 'vitest'
import { percentChange, periodFromDate, shiftPeriod } from './period'

describe('periodFromDate', () => {
  it('formats as YYYY-MM with zero-padded month', () => {
    expect(periodFromDate(new Date(2026, 0, 15))).toBe('2026-01')
    expect(periodFromDate(new Date(2026, 10, 1))).toBe('2026-11')
  })
})

describe('shiftPeriod', () => {
  it('moves back a month within the same year', () => {
    expect(shiftPeriod('2026-07', -1)).toBe('2026-06')
  })

  it('rolls back across a year boundary', () => {
    expect(shiftPeriod('2026-01', -1)).toBe('2025-12')
  })

  it('moves forward', () => {
    expect(shiftPeriod('2025-12', 1)).toBe('2026-01')
  })
})

describe('percentChange', () => {
  it('computes a positive change', () => {
    expect(percentChange(150, 100)).toBe(50)
  })

  it('computes a negative change', () => {
    expect(percentChange(50, 100)).toBe(-50)
  })

  it('returns 0 when both current and previous are zero', () => {
    expect(percentChange(0, 0)).toBe(0)
  })

  it('returns null when previous is zero but current is not (undefined % change)', () => {
    expect(percentChange(100, 0)).toBeNull()
  })
})
