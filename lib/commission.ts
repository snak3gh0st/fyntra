import Decimal from 'decimal.js'
import { getUplineIds, type AgentNode } from './hierarchy'

export type AgentRankInfo = AgentNode & { rank: string }
export type PlanLookup = (rank: string, downlineLevel: number) => number | null
export type OverrideResult = { agentId: string; level: number; amount: number }

// Money math for override amounts uses decimal.js rather than raw JS
// `number` arithmetic. `baseAmount * percent / 100` on plain floats can
// introduce rounding artifacts for percentages that aren't exact binary
// fractions (e.g. 33.33%), and since this is the one place override
// commission dollar amounts actually get computed, it's worth the small
// dependency. decimal.js is not already installed elsewhere in this project
// (Prisma vendors its own Decimal implementation internally rather than
// depending on the `decimal.js` package), so it was added as a new direct
// dependency in package.json.
//
// CSV row parsing (lib/csv/schemas.ts' `numericString`) is intentionally
// left as plain `number` — it's bounded by realistic premium/face-amount
// ranges and only ever does a single Number(string) parse with no chained
// arithmetic, so the precision risk there is negligible compared to a
// full Decimal-based rewrite of the whole import pipeline.
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
    const amount = new Decimal(baseAmount).times(percent).dividedBy(100).toNumber()
    results.push({ agentId, level, amount })
  })
  return results
}
