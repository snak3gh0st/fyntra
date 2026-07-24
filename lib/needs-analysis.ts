// DIME-method life insurance needs estimate. This is a planning recommendation,
// not a regulated actuarial figure — plain numbers are fine (no ledger money here).
// Recommended coverage = Debt + Income replacement + Mortgage + Education,
// minus resources the family already has (existing coverage + liquid assets).
export type NeedsAnalysisInput = {
  annualIncome: number // primary income to replace
  incomeYears: number // years of income replacement
  mortgageBalance: number
  otherDebts: number // non-mortgage debts (cards, loans)
  finalExpenses: number // funeral / estate settlement
  children: number
  educationPerChild: number // college fund target per child
  existingCoverage: number // in-force life insurance
  liquidAssets: number // savings/investments available to the family
}

export type NeedsAnalysisResult = {
  grossNeed: number
  resources: number
  recommendedCoverage: number // floored at 0
}

const n = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0)

export function computeNeedsAnalysis(input: NeedsAnalysisInput): NeedsAnalysisResult {
  const grossNeed =
    n(input.annualIncome) * n(input.incomeYears) +
    n(input.mortgageBalance) +
    n(input.otherDebts) +
    n(input.finalExpenses) +
    n(input.children) * n(input.educationPerChild)

  const resources = n(input.existingCoverage) + n(input.liquidAssets)
  const recommendedCoverage = Math.max(0, grossNeed - resources)

  return { grossNeed, resources, recommendedCoverage }
}
