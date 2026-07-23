import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { applySignedTransaction } from './financial-transactions'

const n = (v: Decimal) => v.toNumber()

describe('applySignedTransaction', () => {
  it('EARNING and OVERRIDE add to the total', () => {
    expect(n(applySignedTransaction(new Decimal(100), new Decimal(50), 'EARNING'))).toBe(150)
    expect(n(applySignedTransaction(new Decimal(100), new Decimal(25), 'OVERRIDE'))).toBe(125)
  })

  it('CHARGEBACK and REVERSAL subtract from the total', () => {
    expect(n(applySignedTransaction(new Decimal(100), new Decimal(30), 'CHARGEBACK'))).toBe(70)
    expect(n(applySignedTransaction(new Decimal(100), new Decimal(40), 'REVERSAL'))).toBe(60)
  })

  it('always debits the magnitude for chargebacks, ignoring incoming sign', () => {
    expect(n(applySignedTransaction(new Decimal(100), new Decimal(-30), 'CHARGEBACK'))).toBe(70)
  })

  it('ADJUSTMENT carries its own sign', () => {
    expect(n(applySignedTransaction(new Decimal(100), new Decimal(-15), 'ADJUSTMENT'))).toBe(85)
    expect(n(applySignedTransaction(new Decimal(100), new Decimal(15), 'ADJUSTMENT'))).toBe(115)
  })

  it('is a pure fold that never mutates its inputs', () => {
    const total = new Decimal(100)
    applySignedTransaction(total, new Decimal(50), 'CHARGEBACK')
    expect(n(total)).toBe(100)
  })
})
