import { describe, expect, it } from 'vitest'
import { parseCsv, shouldUpdateStatusChangedAt } from './import-service'

describe('parseCsv', () => {
  it('parses a header row into keyed objects', () => {
    const content = 'policyNumber,agentNpn,amount,period\nNLG-0002,1000003,45.50,2026-01'
    expect(parseCsv(content)).toEqual([
      { policyNumber: 'NLG-0002', agentNpn: '1000003', amount: '45.50', period: '2026-01' },
    ])
  })

  it('returns an empty array for a header-only file', () => {
    const content = 'policyNumber,agentNpn,amount,period'
    expect(parseCsv(content)).toEqual([])
  })
})

describe('shouldUpdateStatusChangedAt', () => {
  it('returns true when there is no existing policy (create case)', () => {
    expect(shouldUpdateStatusChangedAt(null, 'PENDING')).toBe(true)
  })

  it('returns true when the status differs from the existing policy', () => {
    expect(shouldUpdateStatusChangedAt({ status: 'PENDING' }, 'LAPSED')).toBe(true)
  })

  it('returns false when the status is unchanged', () => {
    expect(shouldUpdateStatusChangedAt({ status: 'INFORCE' }, 'INFORCE')).toBe(false)
  })
})
