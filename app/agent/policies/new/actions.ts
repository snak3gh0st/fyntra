"use server";

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { calculateMarketPremium, parseAgeBand, parseFaceBand } from '@/lib/policy-quote'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'
import { revalidatePath } from 'next/cache'

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'INFORCE', 'LAPSED', 'CANCELLED'] as const
type PolicyStatus = (typeof STATUS_OPTIONS)[number]

type CreatePolicyResult =
  | { ok: true; policyId: string; policyNumber: string; premium: number; premiumSource: "market" | "manual" }
  | { ok: false; message: string }

function normalizeMoney(value: string | null | undefined): number | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function normalizeDate(value: string | null | undefined): Date | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date
}

function invalidEmail(value: string | null | undefined): boolean {
  if (!value) return false
  return !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())
}

export async function createPolicy(formData: FormData): Promise<CreatePolicyResult> {
  const agent = await getCurrentAgent()
  const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true } })
  const scopeAgentIds = new Set([agent.id, ...getDownlineIds(allAgents, agent.id)])

  const policyNumber = (formData.get('policyNumber') as string | null)?.trim()
  if (!policyNumber) return { ok: false, message: 'Número da apólice é obrigatório.' }

  const carrier = (formData.get('carrier') as string | null)?.trim()
  if (!carrier) return { ok: false, message: 'A seguradora é obrigatória.' }

  const product = (formData.get('product') as string | null)?.trim()
  if (!product) return { ok: false, message: 'O produto é obrigatório.' }

  const faceAmount = normalizeMoney(formData.get('faceAmount') as string | null)
  if (faceAmount === null) return { ok: false, message: 'O valor segurado é obrigatório e deve ser numérico.' }

  const pricingMode = (formData.get('pricingMode') as string | null)?.trim() || 'market'
  const quoteAgeBand = parseAgeBand(formData.get('quoteAgeBand') as string | null)
  const quoteFaceBand = parseFaceBand(formData.get('quoteFaceBand') as string | null, faceAmount)
  const marketQuote = calculateMarketPremium({
    product,
    faceAmount,
    ageBand: quoteAgeBand,
    faceBand: quoteFaceBand,
  })
  const useMarketQuote = pricingMode === 'market'
  const requestedPremium = useMarketQuote ? null : normalizeMoney(formData.get('premium') as string | null)
  const premiumSource = useMarketQuote ? 'market' : 'manual'
  if (!useMarketQuote && requestedPremium === null) {
    return { ok: false, message: 'O prêmio manual é obrigatório e deve ser numérico.' }
  }

  let finalPremium: number
  if (useMarketQuote) {
    finalPremium = marketQuote.premium
  } else {
    finalPremium = requestedPremium ?? 0
  }

  const rawStatus = (formData.get('status') as string | null)?.trim()
  if (!rawStatus || !STATUS_OPTIONS.includes(rawStatus as PolicyStatus)) {
    return { ok: false, message: 'Selecione um status válido.' }
  }
  const status = rawStatus as PolicyStatus

  const effectiveDate = normalizeDate(formData.get('effectiveDate') as string | null)
  const lastPaymentDate = normalizeDate(formData.get('lastPaymentDate') as string | null)

  const clientMode = (formData.get('clientId') as string | null)?.trim() || 'new'
  let clientId: string

  if (clientMode === 'new') {
    const clientName = (formData.get('clientName') as string | null)?.trim()
    if (!clientName) return { ok: false, message: 'Nome do cliente é obrigatório ao criar novo cliente.' }

    const clientEmailRaw = (formData.get('clientEmail') as string | null)?.trim() || null
    if (invalidEmail(clientEmailRaw)) {
      return { ok: false, message: 'Informe um e-mail de cliente válido ou deixe em branco.' }
    }

    const client = await prisma.client.create({
      data: {
        name: clientName,
        email: clientEmailRaw || null,
        assignedAgentId: agent.id,
      },
      select: { id: true },
    })
    clientId = client.id
  } else {
    const scopedClient = await prisma.client.findFirst({
      where: { id: clientMode },
      select: { id: true, assignedAgentId: true },
    })

    if (!scopedClient) {
      return { ok: false, message: 'Cliente não encontrado.' }
    }

    if (!scopeAgentIds.has(scopedClient.assignedAgentId)) {
      return { ok: false, message: 'Você só pode associar clientes da sua carteira.' }
    }

    clientId = scopedClient.id
  }

  const existingPolicy = await prisma.policy.findUnique({
    where: { policyNumber },
    select: { id: true },
  })
  if (existingPolicy) {
    return { ok: false, message: 'Já existe uma apólice com este número.' }
  }

  try {
    const statusChangedAt = status === 'LAPSED' || status === 'CANCELLED' ? null : new Date()
    const policy = await prisma.policy.create({
      data: {
        clientId,
        agentId: agent.id,
        carrier,
        product,
        policyNumber,
        faceAmount,
        premium: finalPremium,
        status,
        effectiveDate,
        lastPaymentDate,
        statusChangedAt,
      },
      select: { id: true, policyNumber: true },
    })

    revalidatePath('/agent/policies')
    revalidatePath(`/agent/policies/${policy.id}`)
    return {
      ok: true,
      policyId: policy.id,
      policyNumber: policy.policyNumber,
      premium: finalPremium,
      premiumSource,
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { ok: false, message: 'Já existe uma apólice com este número.' }
    }
    throw error
  }
}
