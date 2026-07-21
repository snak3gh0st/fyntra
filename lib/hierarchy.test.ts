import { describe, expect, it } from 'vitest'
import { getDownlineIds, getUplineIds, type AgentNode } from './hierarchy'

const agents: AgentNode[] = [
  { id: 'top', parentAgentId: null },
  { id: 'mid', parentAgentId: 'top' },
  { id: 'leaf', parentAgentId: 'mid' },
  { id: 'other-top', parentAgentId: null },
]

describe('getDownlineIds', () => {
  it('returns all descendants, not siblings or unrelated trees', () => {
    expect(getDownlineIds(agents, 'top')).toEqual(['mid', 'leaf'])
  })

  it('returns an empty array for a leaf node', () => {
    expect(getDownlineIds(agents, 'leaf')).toEqual([])
  })
})

describe('getUplineIds', () => {
  it('returns all ancestors in order from immediate parent upward', () => {
    expect(getUplineIds(agents, 'leaf')).toEqual(['mid', 'top'])
  })

  it('returns an empty array for a root node', () => {
    expect(getUplineIds(agents, 'top')).toEqual([])
  })
})

describe('cyclic input safety', () => {
  // A -> B -> C -> A (a corrupted/inconsistent parentAgentId chain that
  // should never happen if writes go through updateAgentHierarchy's cycle
  // guard, but data can still end up this way — e.g. a direct DB edit).
  const cyclicAgents: AgentNode[] = [
    { id: 'a', parentAgentId: 'c' },
    { id: 'b', parentAgentId: 'a' },
    { id: 'c', parentAgentId: 'b' },
  ]

  it('getDownlineIds terminates and returns collected descendants instead of hanging', () => {
    // Walking the cycle from 'a' visits b, then c, then loops back around to
    // 'a' itself (which the corrupt data does say is its own descendant) —
    // the guard's job is only to stop repeat visits, not to lie about what
    // the (invalid) data says.
    const result = getDownlineIds(cyclicAgents, 'a')
    expect(result).toEqual(['b', 'c', 'a'])
  })

  it('getUplineIds terminates and returns collected ancestors instead of hanging', () => {
    const result = getUplineIds(cyclicAgents, 'a')
    expect(result).toEqual(['c', 'b'])
  })

  it('handles a self-referencing node without hanging', () => {
    const selfCycle: AgentNode[] = [{ id: 'self', parentAgentId: 'self' }]
    expect(getDownlineIds(selfCycle, 'self')).toEqual(['self'])
    expect(getUplineIds(selfCycle, 'self')).toEqual([])
  })
})
