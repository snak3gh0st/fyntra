import { CASE_STAGES, type CaseStage } from './case-workflow'

// Aggregate view of the case pipeline for the management/BI area. Pure over the
// case list so it's testable without the DB. Money in/out uses plain numbers —
// these are pipeline estimates (target coverage / budget), not ledger money.
export type PipelineCase = {
  stage: CaseStage
  targetCoverage: number | null
  monthlyBudget: number | null
}

export type PipelineFunnel = {
  total: number
  byStage: { stage: CaseStage; count: number }[]
  open: number
  placed: number
  declined: number
  withdrawn: number
  // Win rate over *decided* cases (placed vs declined). Undecided/withdrawn
  // don't dilute it — withdrawn means the prospect walked, not that we lost.
  winRate: number
  inFlightCoverage: number
  inFlightBudget: number
}

const TERMINAL: CaseStage[] = ['PLACED', 'DECLINED', 'WITHDRAWN']

export function buildPipelineFunnel(cases: PipelineCase[]): PipelineFunnel {
  const counts = new Map<CaseStage, number>(CASE_STAGES.map((s) => [s, 0]))
  let inFlightCoverage = 0
  let inFlightBudget = 0

  for (const c of cases) {
    counts.set(c.stage, (counts.get(c.stage) ?? 0) + 1)
    if (!TERMINAL.includes(c.stage)) {
      inFlightCoverage += c.targetCoverage ?? 0
      inFlightBudget += c.monthlyBudget ?? 0
    }
  }

  const placed = counts.get('PLACED') ?? 0
  const declined = counts.get('DECLINED') ?? 0
  const withdrawn = counts.get('WITHDRAWN') ?? 0
  const decided = placed + declined

  return {
    total: cases.length,
    byStage: CASE_STAGES.map((stage) => ({ stage, count: counts.get(stage) ?? 0 })),
    open: cases.length - placed - declined - withdrawn,
    placed,
    declined,
    withdrawn,
    winRate: decided === 0 ? 0 : placed / decided,
    inFlightCoverage,
    inFlightBudget,
  }
}
