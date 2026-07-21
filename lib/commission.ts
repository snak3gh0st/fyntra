import { getUplineIds, type AgentNode } from './hierarchy'

export type AgentRankInfo = AgentNode & { rank: string }
export type PlanLookup = (rank: string, downlineLevel: number) => number | null
export type OverrideResult = { agentId: string; level: number; amount: number }

export function computeOverrides(
  agents: AgentRankInfo[],
  directAgentId: string,
  baseAmount: number,
  lookupPlan: PlanLookup,
): OverrideResult[] {
  const rankById = new Map(agents.map((a) => [a.id, a.rank]))
  const uplineIds = getUplineIds(agents, directAgentId)

  const results: OverrideResult[] = []
  uplineIds.forEach((agentId, index) => {
    const level = index + 1
    const rank = rankById.get(agentId)
    if (!rank) return
    const percent = lookupPlan(rank, level)
    if (percent === null) return
    results.push({ agentId, level, amount: (baseAmount * percent) / 100 })
  })
  return results
}
