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
  // Guard against cyclic parentAgentId data (e.g. A -> B -> A): without this,
  // a cycle reachable from rootId would make the BFS queue grow forever.
  const visited = new Set<string>()
  const queue = [...(childrenByParent.get(rootId) ?? [])]
  while (queue.length > 0) {
    const current = queue.shift() as string
    if (visited.has(current)) continue
    visited.add(current)
    result.push(current)
    queue.push(...(childrenByParent.get(current) ?? []))
  }
  return result
}

export function getUplineIds(agents: AgentNode[], startId: string): string[] {
  const parentById = new Map(agents.map((a) => [a.id, a.parentAgentId]))
  const result: string[] = []
  // Guard against cyclic parentAgentId data: without this, a cycle in the
  // upline chain would make this loop run forever.
  const visited = new Set<string>([startId])
  let currentParent = parentById.get(startId) ?? null
  while (currentParent !== null && currentParent !== undefined) {
    if (visited.has(currentParent)) break
    visited.add(currentParent)
    result.push(currentParent)
    currentParent = parentById.get(currentParent) ?? null
  }
  return result
}
