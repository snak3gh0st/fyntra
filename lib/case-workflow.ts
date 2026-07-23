export const CASE_STAGES = [
  'LEAD',
  'DISCOVERY',
  'DESIGN',
  'ILLUSTRATION_READY',
  'APPLICATION_STARTED',
  'SUBMITTED',
  'UNDERWRITING',
  'APPROVED',
  'ISSUED',
  'PLACED',
  'DECLINED',
  'WITHDRAWN',
] as const

export type CaseStage = (typeof CASE_STAGES)[number]
export type Tone = 'success' | 'warning' | 'danger' | 'neutral'

const transitions: Record<CaseStage, CaseStage[]> = {
  LEAD: ['DISCOVERY', 'WITHDRAWN'],
  DISCOVERY: ['DESIGN', 'WITHDRAWN'],
  DESIGN: ['ILLUSTRATION_READY', 'DISCOVERY', 'WITHDRAWN'],
  ILLUSTRATION_READY: ['APPLICATION_STARTED', 'DESIGN', 'WITHDRAWN'],
  APPLICATION_STARTED: ['SUBMITTED', 'ILLUSTRATION_READY', 'WITHDRAWN'],
  SUBMITTED: ['UNDERWRITING', 'WITHDRAWN'],
  UNDERWRITING: ['APPROVED', 'DECLINED', 'WITHDRAWN'],
  APPROVED: ['ISSUED', 'UNDERWRITING', 'WITHDRAWN'],
  ISSUED: ['PLACED', 'WITHDRAWN'],
  PLACED: [],
  DECLINED: [],
  WITHDRAWN: [],
}

export const caseStageLabel: Record<CaseStage, string> = {
  LEAD: 'Lead',
  DISCOVERY: 'Descoberta',
  DESIGN: 'Desenho',
  ILLUSTRATION_READY: 'Ilustração pronta',
  APPLICATION_STARTED: 'Aplicação iniciada',
  SUBMITTED: 'Enviado',
  UNDERWRITING: 'Em análise',
  APPROVED: 'Aprovado',
  ISSUED: 'Emitido',
  PLACED: 'Em vigor',
  DECLINED: 'Recusado',
  WITHDRAWN: 'Retirado',
}

export function canTransitionCase(from: CaseStage, to: CaseStage): boolean {
  return transitions[from].includes(to)
}

export function caseStageTone(stage: CaseStage): Tone {
  if (stage === 'PLACED') return 'success'
  if (stage === 'DECLINED' || stage === 'WITHDRAWN') return 'danger'
  if (stage === 'UNDERWRITING' || stage === 'APPROVED' || stage === 'ISSUED') return 'warning'
  return 'neutral'
}
