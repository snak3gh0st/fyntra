import { describe, it, expect } from 'vitest'
import { computeNeedsAnalysis } from './needs-analysis'

const base = {
  annualIncome: 80_000,
  incomeYears: 10,
  mortgageBalance: 250_000,
  otherDebts: 30_000,
  finalExpenses: 15_000,
  children: 2,
  educationPerChild: 100_000,
  existingCoverage: 100_000,
  liquidAssets: 50_000,
}

describe('computeNeedsAnalysis', () => {
  it('applies the DIME formula minus resources', () => {
    const r = computeNeedsAnalysis(base)
    // 800k income + 250k mortgage + 30k debt + 15k final + 200k education = 1,295,000
    expect(r.grossNeed).toBe(1_295_000)
    expect(r.resources).toBe(150_000)
    expect(r.recommendedCoverage).toBe(1_145_000)
  })

  it('floors recommendation at zero when resources exceed need', () => {
    const r = computeNeedsAnalysis({ ...base, existingCoverage: 2_000_000 })
    expect(r.recommendedCoverage).toBe(0)
  })

  it('treats negative or non-finite inputs as zero', () => {
    const r = computeNeedsAnalysis({ ...base, annualIncome: -5, children: NaN, liquidAssets: -100 })
    expect(r.grossNeed).toBe(250_000 + 30_000 + 15_000) // income & education drop out
    expect(r.resources).toBe(100_000) // liquidAssets floored to 0
  })
})
