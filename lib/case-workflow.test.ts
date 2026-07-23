import { describe, expect, it } from 'vitest'
import { canTransitionCase, caseStageLabel } from './case-workflow'

describe('canTransitionCase', () => {
  it('allows the normal sales path', () => {
    expect(canTransitionCase('LEAD', 'DISCOVERY')).toBe(true)
    expect(canTransitionCase('SUBMITTED', 'UNDERWRITING')).toBe(true)
    expect(canTransitionCase('ISSUED', 'PLACED')).toBe(true)
  })

  it('blocks creating an issued case directly from a lead', () => {
    expect(canTransitionCase('LEAD', 'ISSUED')).toBe(false)
  })

  it('allows terminal exits only from active stages', () => {
    expect(canTransitionCase('UNDERWRITING', 'DECLINED')).toBe(true)
    expect(canTransitionCase('PLACED', 'WITHDRAWN')).toBe(false)
  })
})

describe('caseStageLabel', () => {
  it('exposes plain Portuguese labels', () => {
    expect(caseStageLabel.ILLUSTRATION_READY).toBe('Ilustração pronta')
    expect(caseStageLabel.UNDERWRITING).toBe('Em análise')
  })
})
