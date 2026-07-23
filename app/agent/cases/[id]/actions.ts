"use server";

import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'
import { canAccessCase } from '@/lib/case-access'
import { canTransitionCase, caseStageLabel, type CaseStage } from '@/lib/case-workflow'
import { revalidatePath } from 'next/cache'

type ActionResult = { ok: true } | { ok: false; message: string }

const TERMINAL: CaseStage[] = ['PLACED', 'DECLINED', 'WITHDRAWN']

async function agentScopeIds(): Promise<{ agentId: string; scope: string[] }> {
  const agent = await getCurrentAgent()
  const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true } })
  return { agentId: agent.id, scope: [agent.id, ...getDownlineIds(allAgents, agent.id)] }
}

export async function transitionCase(caseId: string, nextStage: CaseStage): Promise<ActionResult> {
  const { scope } = await agentScopeIds()

  const insuranceCase = await prisma.insuranceCase.findUnique({
    where: { id: caseId },
    select: { id: true, stage: true, assignedAgentId: true },
  })
  if (!insuranceCase || !canAccessCase({ role: 'AGENT', agentScopeIds: scope }, insuranceCase)) {
    return { ok: false, message: 'Caso não encontrado ou fora da sua carteira.' }
  }

  if (!canTransitionCase(insuranceCase.stage, nextStage)) {
    return { ok: false, message: 'Esta mudança de etapa não é permitida.' }
  }

  await prisma.$transaction([
    prisma.insuranceCase.update({
      where: { id: caseId },
      data: {
        stage: nextStage,
        status: TERMINAL.includes(nextStage) ? 'CLOSED' : 'OPEN',
      },
    }),
    prisma.caseTimelineEvent.create({
      data: {
        caseId,
        type: 'STAGE_CHANGED',
        title: `Etapa alterada para ${caseStageLabel[nextStage]}`,
        body: `De ${caseStageLabel[insuranceCase.stage]} para ${caseStageLabel[nextStage]}.`,
      },
    }),
  ])

  revalidatePath(`/agent/cases/${caseId}`)
  revalidatePath('/agent/cases')
  return { ok: true }
}

// Standard life-application document checklist. These are Fyntra-owned tracking
// items, not carrier-authoritative requirements — when a vendor feed is wired,
// its requirements sync in via provider/externalId alongside these.
const STANDARD_REQUIREMENTS = [
  'Formulário de aplicação assinado',
  'Documento de identidade',
  'Exame médico / paramédico',
  'Autorização HIPAA',
  'Comprovante de pagamento inicial',
]

// An application is "active" until it terminates. Only one active application
// per case — a declined/withdrawn one can be superseded by a fresh start.
const ACTIVE_APPLICATION: string[] = ['DRAFT', 'STARTED', 'SUBMITTED', 'UNDERWRITING', 'APPROVED', 'ISSUED']

export async function startApplication(caseId: string): Promise<ActionResult> {
  const { scope } = await agentScopeIds()

  const insuranceCase = await prisma.insuranceCase.findUnique({
    where: { id: caseId },
    select: { id: true, assignedAgentId: true, applications: { select: { status: true } } },
  })
  if (!insuranceCase || !canAccessCase({ role: 'AGENT', agentScopeIds: scope }, insuranceCase)) {
    return { ok: false, message: 'Caso não encontrado ou fora da sua carteira.' }
  }

  if (insuranceCase.applications.some((a) => ACTIVE_APPLICATION.includes(a.status))) {
    return { ok: false, message: 'Já existe uma aplicação em andamento para este caso.' }
  }

  await prisma.$transaction([
    prisma.application.create({
      data: {
        caseId,
        status: 'STARTED',
        requirements: { create: STANDARD_REQUIREMENTS.map((title) => ({ title })) },
      },
    }),
    prisma.caseTimelineEvent.create({
      data: {
        caseId,
        type: 'APPLICATION_STARTED',
        title: 'Aplicação iniciada',
        body: `Checklist padrão criado com ${STANDARD_REQUIREMENTS.length} requirements.`,
      },
    }),
  ])

  revalidatePath(`/agent/cases/${caseId}`)
  return { ok: true }
}

const REQUIREMENT_STATUSES = ['OPEN', 'RECEIVED', 'WAIVED'] as const
type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number]

export async function updateRequirement(requirementId: string, status: RequirementStatus): Promise<ActionResult> {
  if (!REQUIREMENT_STATUSES.includes(status)) {
    return { ok: false, message: 'Status de requirement inválido.' }
  }

  const { scope } = await agentScopeIds()

  const requirement = await prisma.applicationRequirement.findUnique({
    where: { id: requirementId },
    select: { id: true, application: { select: { caseId: true, insuranceCase: { select: { assignedAgentId: true } } } } },
  })
  if (!requirement || !canAccessCase({ role: 'AGENT', agentScopeIds: scope }, requirement.application.insuranceCase)) {
    return { ok: false, message: 'Requirement não encontrado ou fora da sua carteira.' }
  }

  await prisma.applicationRequirement.update({
    where: { id: requirementId },
    data: {
      status,
      receivedAt: status === 'RECEIVED' ? new Date() : null,
    },
  })

  revalidatePath(`/agent/cases/${requirement.application.caseId}`)
  return { ok: true }
}
