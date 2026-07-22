import { describe, expect, it } from 'vitest'
import { bucketByMonth, sumByMonth } from './dashboard'

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

describe('sumByMonth', () => {
  const now = new Date(2026, 6, 15) // July 2026

  it('sums amounts into their correct month bucket', () => {
    const entries = [
      { date: new Date(2026, 6, 1), amount: 100 },
      { date: new Date(2026, 6, 20), amount: 50 },
      { date: new Date(2026, 5, 5), amount: 30 },
    ]
    expect(sumByMonth(entries, 3, now)).toEqual([
      { month: '2026-05', total: 0 },
      { month: '2026-06', total: 30 },
      { month: '2026-07', total: 150 },
    ])
  })

  it('ignores entries outside the requested window', () => {
    const entries = [{ date: new Date(2025, 0, 1), amount: 999 }]
    const result = sumByMonth(entries, 3, now)
    expect(result.every((b) => b.total === 0)).toBe(true)
  })
})
