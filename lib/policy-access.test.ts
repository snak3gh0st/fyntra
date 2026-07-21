import { describe, expect, it } from 'vitest'
import { canAccessPolicy } from './policy-access'

const policy = { agentId: 'agent-1', clientId: 'client-1' }

describe('canAccessPolicy', () => {
  it('ADMIN can always access', () => {
    expect(canAccessPolicy({ role: 'ADMIN' }, policy)).toBe(true)
  })

  it('AGENT can access when the policy agent is in their scope', () => {
    expect(canAccessPolicy({ role: 'AGENT', agentScopeIds: ['agent-1', 'agent-2'] }, policy)).toBe(true)
  })

  it('AGENT cannot access when the policy agent is outside their scope', () => {
    expect(canAccessPolicy({ role: 'AGENT', agentScopeIds: ['agent-2', 'agent-3'] }, policy)).toBe(false)
  })

  it('CLIENT can access their own policy', () => {
    expect(canAccessPolicy({ role: 'CLIENT', clientId: 'client-1' }, policy)).toBe(true)
  })

  it('CLIENT cannot access another client\'s policy', () => {
    expect(canAccessPolicy({ role: 'CLIENT', clientId: 'client-2' }, policy)).toBe(false)
  })
})
