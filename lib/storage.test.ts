import { describe, expect, it } from 'vitest'
import { sanitizeFilename, buildStoredPath } from './storage'

describe('sanitizeFilename', () => {
  it('strips path separators and keeps the extension', () => {
    expect(sanitizeFilename('../../etc/passwd.pdf')).toBe('etc_passwd.pdf')
  })

  it('replaces spaces and special characters with underscores', () => {
    expect(sanitizeFilename('apolice final (v2).pdf')).toBe('apolice_final__v2_.pdf')
  })

  it('leaves a simple safe filename unchanged', () => {
    expect(sanitizeFilename('contrato.pdf')).toBe('contrato.pdf')
  })
})

describe('buildStoredPath', () => {
  it('builds a path scoped to the policy id with a uuid prefix', () => {
    const path = buildStoredPath('policy-123', 'contrato.pdf', () => 'fixed-uuid')
    expect(path).toBe('policies/policy-123/fixed-uuid-contrato.pdf')
  })

  it('sanitizes the original filename before building the path', () => {
    const path = buildStoredPath('policy-123', '../evil.pdf', () => 'fixed-uuid')
    expect(path).toBe('policies/policy-123/fixed-uuid-evil.pdf')
  })
})
