export type AgentNode = { id: string; parentAgentId: string | null }

export function getDownlineIds(agents: AgentNode[], rootId: string): string[] {
  const childrenByParent = new Map<string, string[]>()
  for (const agent of agents) {
    if (agent.parentAgentId === null) continue
    const siblings = childrenByParent.get(agent.parentAgentId) ?? []
    siblings.push(agent.id)
    childrenByParent.set(agent.parentAgentId, siblings)
  }

  const result: string[] = []
  const queue = [...(childrenByParent.get(rootId) ?? [])]
  while (queue.length > 0) {
    const current = queue.shift() as string
    result.push(current)
    queue.push(...(childrenByParent.get(current) ?? []))
  }
  return result
}

export function getUplineIds(agents: AgentNode[], startId: string): string[] {
  const parentById = new Map(agents.map((a) => [a.id, a.parentAgentId]))
  const result: string[] = []
  let currentParent = parentById.get(startId) ?? null
  while (currentParent !== null && currentParent !== undefined) {
    result.push(currentParent)
    currentParent = parentById.get(currentParent) ?? null
  }
  return result
}
