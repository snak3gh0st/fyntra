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
