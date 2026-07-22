import dagre from "dagre";

export const NODE_WIDTH = 236;
export const NODE_HEIGHT = 78;
export const ROOT_ZONE_ID = "__root__";

type AgentNode = { id: string; parentAgentId: string | null };

export function layoutHierarchy<T extends AgentNode>(
  agents: T[],
): { positions: Map<string, { x: number; y: number }>; edges: { id: string; source: string; target: string }[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 32, ranksep: 64, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const agent of agents) {
    g.setNode(agent.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  const edges: { id: string; source: string; target: string }[] = [];
  for (const agent of agents) {
    if (agent.parentAgentId && g.hasNode(agent.parentAgentId)) {
      g.setEdge(agent.parentAgentId, agent.id);
      edges.push({ id: `${agent.parentAgentId}->${agent.id}`, source: agent.parentAgentId, target: agent.id });
    }
  }

  dagre.layout(g);

  const positions = new Map<string, { x: number; y: number }>();
  for (const agent of agents) {
    const node = g.node(agent.id);
    // dagre centers nodes on (x, y); React Flow positions by top-left corner.
    positions.set(agent.id, { x: node.x - NODE_WIDTH / 2, y: node.y - NODE_HEIGHT / 2 });
  }

  // The "drop here to remove manager" zone floats above whichever roots
  // currently exist, centered over their span.
  const roots = agents.filter((a) => !a.parentAgentId || !positions.has(a.parentAgentId));
  if (roots.length > 0) {
    const rootXs = roots.map((r) => positions.get(r.id)!.x);
    const minX = Math.min(...rootXs);
    const maxX = Math.max(...rootXs) + NODE_WIDTH;
    positions.set(ROOT_ZONE_ID, { x: (minX + maxX) / 2 - NODE_WIDTH / 2, y: -140 });
  } else {
    positions.set(ROOT_ZONE_ID, { x: 0, y: -140 });
  }

  return { positions, edges };
}
