export type CaseAccessContext =
  | { role: 'ADMIN' }
  | { role: 'AGENT'; agentScopeIds: string[] }

export type CaseRef = { assignedAgentId: string }

export function canAccessCase(context: CaseAccessContext, caseRef: CaseRef): boolean {
  if (context.role === 'ADMIN') return true
  return context.agentScopeIds.includes(caseRef.assignedAgentId)
}
