import { describe, it, expect } from 'vitest'
import { buildPipelineFunnel, type PipelineCase } from './pipeline-bi'

const c = (stage: PipelineCase['stage'], cov = 0, budget = 0): PipelineCase => ({
  stage,
  targetCoverage: cov,
  monthlyBudget: budget,
})

describe('buildPipelineFunnel', () => {
  it('counts by stage and separates open from terminal', () => {
    const f = buildPipelineFunnel([
      c('LEAD'),
      c('DISCOVERY'),
      c('PLACED'),
      c('DECLINED'),
      c('WITHDRAWN'),
    ])
    expect(f.total).toBe(5)
    expect(f.open).toBe(2)
    expect(f.placed).toBe(1)
    expect(f.declined).toBe(1)
    expect(f.withdrawn).toBe(1)
    expect(f.byStage.find((s) => s.stage === 'LEAD')?.count).toBe(1)
  })

  it('win rate is placed over decided (placed+declined), ignoring withdrawn', () => {
    const f = buildPipelineFunnel([c('PLACED'), c('PLACED'), c('DECLINED'), c('WITHDRAWN')])
    expect(f.winRate).toBeCloseTo(2 / 3)
  })

  it('win rate is 0 when nothing is decided', () => {
    expect(buildPipelineFunnel([c('LEAD'), c('DISCOVERY')]).winRate).toBe(0)
  })

  it('sums in-flight coverage/budget only for non-terminal cases', () => {
    const f = buildPipelineFunnel([
      c('DISCOVERY', 500_000, 300),
      c('UNDERWRITING', 250_000, 150),
      c('PLACED', 999_999, 999), // terminal — excluded
    ])
    expect(f.inFlightCoverage).toBe(750_000)
    expect(f.inFlightBudget).toBe(450)
  })
})
