import { periodFromDate } from './period'

export type MonthBucket = { month: string; count: number }
export type MonthSumBucket = { month: string; total: number }

/**
 * Buckets dates into their last N calendar months (YYYY-MM), oldest first,
 * always including empty months so the chart has a consistent number of bars.
 */
export function bucketByMonth(dates: Date[], months: number, now: Date): MonthBucket[] {
  const buckets: MonthBucket[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.push({ month: key, count: 0 })
  }
  const indexByMonth = new Map(buckets.map((b, i) => [b.month, i]))
  for (const date of dates) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const idx = indexByMonth.get(key)
    if (idx !== undefined) buckets[idx].count += 1
  }
  return buckets
}

/**
 * Same shape as bucketByMonth, but sums an amount per month instead of
 * counting occurrences — for premium/commission trend charts.
 */
export function sumByMonth(entries: { date: Date; amount: number }[], months: number, now: Date): MonthSumBucket[] {
  const buckets: MonthSumBucket[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ month: periodFromDate(d), total: 0 })
  }
  const indexByMonth = new Map(buckets.map((b, i) => [b.month, i]))
  for (const entry of entries) {
    const idx = indexByMonth.get(periodFromDate(entry.date))
    if (idx !== undefined) buckets[idx].total += entry.amount
  }
  return buckets
}
