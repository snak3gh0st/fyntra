export function periodFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function shiftPeriod(period: string, deltaMonths: number): string {
  const [year, month] = period.split('-').map(Number)
  const shifted = new Date(year, month - 1 + deltaMonths, 1)
  return periodFromDate(shifted)
}

// null means "no meaningful comparison" (previous period had zero activity),
// not a 0% or infinite change — callers should render that as a dash, not a
// percentage.
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}
