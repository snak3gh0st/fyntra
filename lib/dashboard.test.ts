import { describe, expect, it } from 'vitest'
import { bucketByMonth } from './dashboard'

describe('bucketByMonth', () => {
  const now = new Date(2026, 6, 15) // July 2026

  it('returns the requested number of months, oldest first, all zero when no dates', () => {
    const result = bucketByMonth([], 3, now)
    expect(result).toEqual([
      { month: '2026-05', count: 0 },
      { month: '2026-06', count: 0 },
      { month: '2026-07', count: 0 },
    ])
  })

  it('counts dates into their correct month bucket', () => {
    const dates = [new Date(2026, 6, 1), new Date(2026, 6, 20), new Date(2026, 5, 5)]
    const result = bucketByMonth(dates, 3, now)
    expect(result).toEqual([
      { month: '2026-05', count: 0 },
      { month: '2026-06', count: 1 },
      { month: '2026-07', count: 2 },
    ])
  })

  it('ignores dates outside the requested window', () => {
    const dates = [new Date(2025, 0, 1)]
    const result = bucketByMonth(dates, 3, now)
    expect(result.every((b) => b.count === 0)).toBe(true)
  })
})
