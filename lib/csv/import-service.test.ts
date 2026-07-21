import { describe, expect, it } from 'vitest'
import { parseCsv } from './import-service'

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
