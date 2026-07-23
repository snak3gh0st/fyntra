import { describe, expect, it } from 'vitest'
import { canAccessCase } from './case-access'

const caseRef = { assignedAgentId: 'agent-1' }

describe('canAccessCase', () => {
  it('allows admins', () => expect(canAccessCase({ role: 'ADMIN' }, caseRef)).toBe(true))
  it('allows scoped agents', () => expect(canAccessCase({ role: 'AGENT', agentScopeIds: ['agent-1'] }, caseRef)).toBe(true))
  it('blocks agents outside the hierarchy scope', () => expect(canAccessCase({ role: 'AGENT', agentScopeIds: ['agent-2'] }, caseRef)).toBe(false))
})
