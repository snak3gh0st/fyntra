// Prisma returns money/percent columns as its own Decimal type (not the
// decimal.js one lib/commission.ts uses for override math). Every page that
// displays a raw aggregate needs to turn that into a plain number or string;
// this is the one shared place that knows how, instead of four ad hoc copies.
export function decimalToNumber(value: unknown): number {
  if (value == null) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const withToNumber = value as { toNumber?: () => number }
  if (typeof withToNumber.toNumber === 'function') {
    const n = withToNumber.toNumber()
    return Number.isFinite(n) ? n : 0
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
