import { describe, expect, it } from 'vitest'
import { PolicyRowSchema, CommissionRowSchema } from './schemas'

describe('PolicyRowSchema', () => {
  it('accepts a valid row and coerces numeric/date fields', () => {
    const result = PolicyRowSchema.safeParse({
      clientName: 'Cliente Exemplo',
      clientEmail: 'cliente@example.com',
      agentNpn: '1000003',
      carrier: 'National Life Group',
      product: 'Term 20',
      policyNumber: 'NLG-0002',
      faceAmount: '250000',
      premium: '45.50',
      status: 'INFORCE',
      effectiveDate: '2026-01-15',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.faceAmount).toBe(250000)
      expect(result.data.premium).toBe(45.5)
    }
  })

  it('rejects a row missing policyNumber', () => {
    const result = PolicyRowSchema.safeParse({
      clientName: 'Cliente Exemplo',
      agentNpn: '1000003',
      carrier: 'National Life Group',
      product: 'Term 20',
      faceAmount: '250000',
      premium: '45.50',
      status: 'INFORCE',
    })
    expect(result.success).toBe(false)
  })
})

describe('CommissionRowSchema', () => {
  it('accepts a valid row', () => {
    const result = CommissionRowSchema.safeParse({
      policyNumber: 'NLG-0002',
      agentNpn: '1000003',
      amount: '45.50',
      period: '2026-01',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-numeric amount', () => {
    const result = CommissionRowSchema.safeParse({
      policyNumber: 'NLG-0002',
      agentNpn: '1000003',
      amount: 'not-a-number',
      period: '2026-01',
    })
    expect(result.success).toBe(false)
  })
})
