export type AccessContext =
  | { role: 'ADMIN' }
  | { role: 'AGENT'; agentScopeIds: string[] }
  | { role: 'CLIENT'; clientId: string }

export type PolicyRef = { agentId: string; clientId: string }

export function canAccessPolicy(context: AccessContext, policy: PolicyRef): boolean {
  if (context.role === 'ADMIN') return true
  if (context.role === 'AGENT') return context.agentScopeIds.includes(policy.agentId)
  return context.clientId === policy.clientId
}
