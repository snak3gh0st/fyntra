import { describe, expect, it } from 'vitest'
import { computeOverrides, type AgentRankInfo, type PlanLookup } from './commission'

const agents: AgentRankInfo[] = [
  { id: 'top', parentAgentId: null, rank: 'DIRECTOR' },
  { id: 'mid', parentAgentId: 'top', rank: 'MANAGER' },
  { id: 'leaf', parentAgentId: 'mid', rank: 'AGENT' },
]

const lookupPlan: PlanLookup = (rank, level) => {
  if (rank === 'MANAGER' && level === 1) return 10
  if (rank === 'DIRECTOR' && level === 2) return 5
  return null
}

describe('computeOverrides', () => {
  it('computes an override for every ancestor with a matching plan', () => {
    const result = computeOverrides(agents, 'leaf', 100, lookupPlan)
    expect(result).toEqual([
      { agentId: 'mid', level: 1, amount: 10 },
      { agentId: 'top', level: 2, amount: 5 },
    ])
  })

  it('skips ancestors whose rank/level has no matching plan', () => {
    const noPlan: PlanLookup = () => null
    expect(computeOverrides(agents, 'leaf', 100, noPlan)).toEqual([])
  })

  it('returns an empty array for a root agent (no upline)', () => {
    expect(computeOverrides(agents, 'top', 100, lookupPlan)).toEqual([])
  })
})
