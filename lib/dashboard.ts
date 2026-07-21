export type MonthBucket = { month: string; count: number }

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
