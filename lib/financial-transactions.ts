import Decimal from 'decimal.js'

// Commission math is an append-only ledger: each transaction is a signed entry
// folded into a running total. Corrections (chargebacks, reversals, adjustments)
// are additive entries — they never rewrite the original earning. This helper
// owns the direction rule so every reader agrees on the sign.
export type TransactionDirection =
  | 'EARNING'
  | 'OVERRIDE'
  | 'ADJUSTMENT'
  | 'CHARGEBACK'
  | 'REVERSAL'

const CREDIT: TransactionDirection[] = ['EARNING', 'OVERRIDE']
const DEBIT: TransactionDirection[] = ['CHARGEBACK', 'REVERSAL']

export function applySignedTransaction(
  total: Decimal.Value,
  amount: Decimal.Value,
  type: TransactionDirection,
): Decimal {
  const runningTotal = new Decimal(total)
  const entry = new Decimal(amount)

  if (CREDIT.includes(type)) return runningTotal.plus(entry.abs())
  if (DEBIT.includes(type)) return runningTotal.minus(entry.abs())
  // ADJUSTMENT carries its own sign so a manual correction can go either way.
  return runningTotal.plus(entry)
}
