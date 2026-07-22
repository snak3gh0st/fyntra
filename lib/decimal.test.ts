import { describe, expect, it } from 'vitest'
import { decimalToNumber } from './decimal'

describe('decimalToNumber', () => {
  it('passes through a plain number', () => {
    expect(decimalToNumber(42.5)).toBe(42.5)
  })

  it('returns 0 for null/undefined', () => {
    expect(decimalToNumber(null)).toBe(0)
    expect(decimalToNumber(undefined)).toBe(0)
  })

  it('unwraps a Prisma-Decimal-like object via toNumber()', () => {
    expect(decimalToNumber({ toNumber: () => 12.34 })).toBe(12.34)
  })

  it('parses a numeric string', () => {
    expect(decimalToNumber('99.9')).toBe(99.9)
  })

  it('returns 0 for non-finite results', () => {
    expect(decimalToNumber('not-a-number')).toBe(0)
    expect(decimalToNumber({ toNumber: () => NaN })).toBe(0)
  })
})
