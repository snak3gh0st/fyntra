import { describe, expect, it } from 'vitest'
import { diffAuditFields } from './audit-diff'

describe('diffAuditFields', () => {
  it('returns only the fields that changed', () => {
    expect(diffAuditFields({ rank: 'AGENT', parentAgentId: 'x' }, { rank: 'MANAGER', parentAgentId: 'x' })).toEqual([
      { field: 'rank', before: 'AGENT', after: 'MANAGER' },
    ])
  })

  it('treats a null/missing before as a create', () => {
    expect(diffAuditFields(null, { overridePercent: 10 })).toEqual([
      { field: 'overridePercent', before: '—', after: '10' },
    ])
  })

  it('returns an empty array when nothing changed', () => {
    expect(diffAuditFields({ rank: 'AGENT' }, { rank: 'AGENT' })).toEqual([])
  })
})
