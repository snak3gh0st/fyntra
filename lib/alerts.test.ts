import { describe, expect, it } from 'vitest'
import { getRiskAlerts, type RiskAlertInput } from './alerts'

describe('getRiskAlerts', () => {
  const now = new Date(2026, 6, 21) // July 21, 2026

  function policy(overrides: Partial<RiskAlertInput>): RiskAlertInput {
    return {
      id: 'p1',
      policyNumber: 'NLG-0001',
      carrier: 'National Life Group',
      product: 'Term 20',
      clientName: 'Cliente Exemplo',
      status: 'PENDING',
      createdAt: now,
      effectiveDate: null,
      lastPaymentDate: null,
      statusChangedAt: null,
      ...overrides,
    }
  }

  it('flags PENDING older than 15 days as STALLED', () => {
    const sixteenDaysAgo = new Date(2026, 6, 5)
    const result = getRiskAlerts([policy({ status: 'PENDING', createdAt: sixteenDaysAgo })], now)
    expect(result).toEqual([
      expect.objectContaining({ type: 'STALLED', policy: expect.objectContaining({ id: 'p1' }), daysSince: 16 }),
    ])
  })

  it('does not flag PENDING exactly at the 15-day boundary', () => {
    const fifteenDaysAgo = new Date(2026, 6, 6)
    const result = getRiskAlerts([policy({ status: 'PENDING', createdAt: fifteenDaysAgo })], now)
    expect(result).toEqual([])
  })

  it('flags APPROVED older than 15 days as STALLED', () => {
    const twentyDaysAgo = new Date(2026, 5, 30)
    const result = getRiskAlerts([policy({ status: 'APPROVED', createdAt: twentyDaysAgo })], now)
    expect(result[0].type).toBe('STALLED')
  })

  it('flags INFORCE with lastPaymentDate older than 30 days as NO_PAYMENT', () => {
    const fortyDaysAgo = new Date(2026, 5, 11)
    const result = getRiskAlerts(
      [policy({ status: 'INFORCE', createdAt: new Date(2025, 0, 1), lastPaymentDate: fortyDaysAgo })],
      now,
    )
    expect(result[0]).toEqual(expect.objectContaining({ type: 'NO_PAYMENT', daysSince: 40 }))
  })

  it('falls back to effectiveDate when lastPaymentDate is null', () => {
    const fortyDaysAgo = new Date(2026, 5, 11)
    const result = getRiskAlerts(
      [policy({ status: 'INFORCE', createdAt: new Date(2025, 0, 1), effectiveDate: fortyDaysAgo, lastPaymentDate: null })],
      now,
    )
    expect(result[0].type).toBe('NO_PAYMENT')
  })

  it('flags INFORCE with both dates null as NO_PAYMENT', () => {
    const result = getRiskAlerts(
      [policy({ status: 'INFORCE', createdAt: new Date(2025, 0, 1), effectiveDate: null, lastPaymentDate: null })],
      now,
    )
    expect(result[0].type).toBe('NO_PAYMENT')
  })

  it('does not flag INFORCE with recent payment', () => {
    const tenDaysAgo = new Date(2026, 6, 11)
    const result = getRiskAlerts(
      [policy({ status: 'INFORCE', createdAt: new Date(2025, 0, 1), lastPaymentDate: tenDaysAgo })],
      now,
    )
    expect(result).toEqual([])
  })

  it('flags LAPSED with recent statusChangedAt as RECENT_LAPSE', () => {
    const tenDaysAgo = new Date(2026, 6, 11)
    const result = getRiskAlerts(
      [policy({ status: 'LAPSED', createdAt: new Date(2025, 0, 1), statusChangedAt: tenDaysAgo })],
      now,
    )
    expect(result[0]).toEqual(expect.objectContaining({ type: 'RECENT_LAPSE', daysSince: 10 }))
  })

  it('does not flag LAPSED with null statusChangedAt', () => {
    const result = getRiskAlerts(
      [policy({ status: 'LAPSED', createdAt: new Date(2025, 0, 1), statusChangedAt: null })],
      now,
    )
    expect(result).toEqual([])
  })

  it('does not flag LAPSED that changed status more than 30 days ago', () => {
    const fortyDaysAgo = new Date(2026, 5, 11)
    const result = getRiskAlerts(
      [policy({ status: 'LAPSED', createdAt: new Date(2025, 0, 1), statusChangedAt: fortyDaysAgo })],
      now,
    )
    expect(result).toEqual([])
  })

  it('does not flag CANCELLED policies under any rule', () => {
    const result = getRiskAlerts(
      [policy({ status: 'CANCELLED', createdAt: new Date(2025, 0, 1) })],
      now,
    )
    expect(result).toEqual([])
  })

  it('returns at most one alert per policy', () => {
    // PENDING would never also match NO_PAYMENT/RECENT_LAPSE rules by status,
    // so this asserts the array has exactly one entry for one input policy.
    const sixteenDaysAgo = new Date(2026, 6, 5)
    const result = getRiskAlerts([policy({ status: 'PENDING', createdAt: sixteenDaysAgo })], now)
    expect(result).toHaveLength(1)
  })
})
