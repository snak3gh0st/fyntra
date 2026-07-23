import { describe, expect, it } from 'vitest'
import {
  canCreatePolicyFromOrigin,
  canTransitionCase,
  caseStageLabel,
  caseStageTone,
} from './case-workflow'

describe('canTransitionCase', () => {
  it('allows the normal sales path', () => {
    expect(canTransitionCase('LEAD', 'DISCOVERY')).toBe(true)
    expect(canTransitionCase('SUBMITTED', 'UNDERWRITING')).toBe(true)
    expect(canTransitionCase('ISSUED', 'PLACED')).toBe(true)
  })

  it('blocks creating an issued case directly from a lead', () => {
    expect(canTransitionCase('LEAD', 'ISSUED')).toBe(false)
  })

  it('allows terminal exits from active stages and blocks terminal re-entry', () => {
    expect(canTransitionCase('LEAD', 'WITHDRAWN')).toBe(true)
    expect(canTransitionCase('UNDERWRITING', 'DECLINED')).toBe(true)
    expect(canTransitionCase('ISSUED', 'WITHDRAWN')).toBe(true)
    expect(canTransitionCase('PLACED', 'WITHDRAWN')).toBe(false)
    expect(canTransitionCase('DECLINED', 'DISCOVERY')).toBe(false)
    expect(canTransitionCase('WITHDRAWN', 'LEAD')).toBe(false)
  })
})

describe('caseStageLabel', () => {
  it('exposes plain Portuguese labels', () => {
    expect(caseStageLabel.ILLUSTRATION_READY).toBe('Ilustração pronta')
    expect(caseStageLabel.UNDERWRITING).toBe('Em análise')
  })
})

describe('canCreatePolicyFromOrigin', () => {
  it('allows historical imports without a case', () => {
    expect(canCreatePolicyFromOrigin(undefined, true)).toBe(true)
  })

  it('allows case-backed policies only when the case is issued or placed', () => {
    expect(canCreatePolicyFromOrigin('ISSUED')).toBe(true)
    expect(canCreatePolicyFromOrigin('PLACED')).toBe(true)
    expect(canCreatePolicyFromOrigin('UNDERWRITING')).toBe(false)
    expect(canCreatePolicyFromOrigin('UNDERWRITING', true)).toBe(false)
    expect(canCreatePolicyFromOrigin()).toBe(false)
  })
})

describe('caseStageTone', () => {
  it('assigns the intended tone to active, successful, and terminal stages', () => {
    expect(caseStageTone('LEAD')).toBe('neutral')
    expect(caseStageTone('ISSUED')).toBe('warning')
    expect(caseStageTone('PLACED')).toBe('success')
    expect(caseStageTone('DECLINED')).toBe('danger')
    expect(caseStageTone('WITHDRAWN')).toBe('danger')
  })
})
