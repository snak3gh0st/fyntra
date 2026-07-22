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

export function getDownlineWithLevels(
  agents: AgentNode[],
  rootId: string,
): { id: string; level: number }[] {
  const childrenByParent = new Map<string, string[]>();
  for (const agent of agents) {
    if (agent.parentAgentId === null) continue;
    const siblings = childrenByParent.get(agent.parentAgentId) ?? [];
    siblings.push(agent.id);
    childrenByParent.set(agent.parentAgentId, siblings);
  }

  const result: { id: string; level: number }[] = [];
  const visited = new Set<string>();
  const queue: { id: string; level: number }[] = (
    childrenByParent.get(rootId) ?? []
  ).map((id) => ({ id, level: 1 }));
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    result.push(current);
    for (const childId of childrenByParent.get(current.id) ?? []) {
      queue.push({ id: childId, level: current.level + 1 });
    }
  }
  return result;
}

// Orders every agent root-first, depth-first, for hierarchy tables where the
// visual order (and indentation) needs to reflect the org tree rather than
// insertion order. Agents unreachable from a root (a data cycle with no
// root) are appended at the end at depth 0 rather than dropped, so the table
// never silently hides a row.
export function buildHierarchyOrder(
  agents: AgentNode[],
): { id: string; depth: number }[] {
  const childrenByParent = new Map<string, string[]>();
  for (const agent of agents) {
    if (agent.parentAgentId === null) continue;
    const siblings = childrenByParent.get(agent.parentAgentId) ?? [];
    siblings.push(agent.id);
    childrenByParent.set(agent.parentAgentId, siblings);
  }

  const result: { id: string; depth: number }[] = [];
  const visited = new Set<string>();

  function visit(id: string, depth: number) {
    if (visited.has(id)) return;
    visited.add(id);
    result.push({ id, depth });
    for (const childId of childrenByParent.get(id) ?? []) {
      visit(childId, depth + 1);
    }
  }

  const roots = agents.filter((a) => a.parentAgentId === null);
  for (const root of roots) visit(root.id, 0);
  // Anything left over is unreachable from a root (cycle, or a parent id
  // pointing at a deleted agent) — still show it rather than drop it.
  for (const agent of agents) visit(agent.id, 0);

  return result;
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
