import { describe, expect, it } from 'vitest'
import { buildExternalEventKey, isDuplicateExternalEvent } from './idempotency'

describe('buildExternalEventKey', () => {
  it('normalizes provider event identity', () => {
    expect(buildExternalEventKey(' NATIONAL_LIFE ', ' EVT-42 ')).toBe('national_life:EVT-42')
  })

  it('rejects missing external identity', () => {
    expect(() => buildExternalEventKey('NATIONAL_LIFE', '')).toThrow('externalId')
  })

  it('rejects missing provider', () => {
    expect(() => buildExternalEventKey('  ', 'EVT-1')).toThrow('provider')
  })
})

describe('isDuplicateExternalEvent', () => {
  it('is true only for identical keys', () => {
    expect(isDuplicateExternalEvent('national_life:EVT-1', 'national_life:EVT-1')).toBe(true)
    expect(isDuplicateExternalEvent('national_life:EVT-1', 'national_life:EVT-2')).toBe(false)
  })
})
