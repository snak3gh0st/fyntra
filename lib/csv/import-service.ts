import { parse } from 'csv-parse/sync'
import { prisma } from '@/lib/prisma'
import { computeOverrides } from '@/lib/commission'
import { PolicyRowSchema, CommissionRowSchema } from './schemas'

export function parseCsv(content: string): Record<string, string>[] {
  return parse(content, { columns: true, skip_empty_lines: true, trim: true })
}

export function shouldUpdateStatusChangedAt(
  existing: { status: string } | null,
  newStatus: string,
): boolean {
  return existing === null || existing.status !== newStatus
}

export function statusChangedAtForCreate(status: string): Date | null {
  return status === 'LAPSED' || status === 'CANCELLED' ? null : new Date()
}

export type ImportStatus = 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED'

type ImportResult = {
  batchId: string
  status: ImportStatus
  successCount: number
  errors: { row: number; message: string }[]
}

export function deriveStatus(successCount: number, errorCount: number): ImportStatus {
  if (errorCount === 0) return 'COMPLETED'
  return successCount === 0 ? 'FAILED' : 'COMPLETED_WITH_ERRORS'
}

// A CSV that isn't actually CSV (wrong delimiter, a renamed .xlsx, a stray
// unescaped quote) makes csv-parse throw synchronously rather than reject a
// row. Without this, that throw would propagate all the way to the server
// action with no batch record and no row number — the exact "blank crash on
// a malformed file" failure mode this import flow otherwise avoids.
export function safeParseCsv(content: string): { rows: Record<string, string>[] } | { error: string } {
  try {
    return { rows: parseCsv(content) }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return { error: `Não foi possível ler o arquivo como CSV: ${reason}` }
  }
}

export async function importPolicies(content: string, uploadedById: string, filename: string): Promise<ImportResult> {
  const batch = await prisma.importBatch.create({
    data: { uploadedById, filename, type: 'POLICIES', status: 'PROCESSING' },
  })

  const parseResult = safeParseCsv(content)
  if ('error' in parseResult) {
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { status: 'FAILED', rowErrors: [{ row: 0, message: parseResult.error }] },
    })
    return { batchId: batch.id, status: 'FAILED', successCount: 0, errors: [{ row: 0, message: parseResult.error }] }
  }
  const rows = parseResult.rows

  const errors: { row: number; message: string }[] = []
  let successCount = 0

  for (const [index, rawRow] of rows.entries()) {
    const parsed = PolicyRowSchema.safeParse(rawRow)
    if (!parsed.success) {
      errors.push({ row: index + 2, message: parsed.error.issues.map((i) => i.message).join('; ') })
      continue
    }
    const row = parsed.data
    const agent = await prisma.agent.findUnique({ where: { npn: row.agentNpn } })
    if (!agent) {
      errors.push({ row: index + 2, message: `Nenhum agente encontrado com NPN ${row.agentNpn}` })
      continue
    }
    const client = await prisma.client.upsert({
      where: { id: `${agent.id}:${row.clientName}` },
      create: {
        id: `${agent.id}:${row.clientName}`,
        name: row.clientName,
        email: row.clientEmail || undefined,
        assignedAgentId: agent.id,
      },
      update: {},
    })
    const existingPolicy = await prisma.policy.findUnique({
      where: { policyNumber: row.policyNumber },
      select: { status: true },
    })
    const statusChangedAt = shouldUpdateStatusChangedAt(existingPolicy, row.status)
      ? new Date()
      : undefined
    await prisma.policy.upsert({
      where: { policyNumber: row.policyNumber },
      create: {
        clientId: client.id,
        agentId: agent.id,
        carrier: row.carrier,
        product: row.product,
        policyNumber: row.policyNumber,
        faceAmount: row.faceAmount,
        premium: row.premium,
        status: row.status,
        effectiveDate: row.effectiveDate ? new Date(row.effectiveDate) : null,
        lastPaymentDate: row.lastPaymentDate ? new Date(row.lastPaymentDate) : null,
        statusChangedAt: statusChangedAtForCreate(row.status),
        importBatchId: batch.id,
      },
      update: {
        carrier: row.carrier,
        product: row.product,
        faceAmount: row.faceAmount,
        premium: row.premium,
        status: row.status,
        lastPaymentDate: row.lastPaymentDate ? new Date(row.lastPaymentDate) : null,
        ...(statusChangedAt ? { statusChangedAt } : {}),
        importBatchId: batch.id,
      },
    })
    successCount += 1
  }

  const status = deriveStatus(successCount, errors.length)
  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { status, rowErrors: errors },
  })

  return { batchId: batch.id, status, successCount, errors }
}

export async function importCommissions(content: string, uploadedById: string, filename: string): Promise<ImportResult> {
  const batch = await prisma.importBatch.create({
    data: { uploadedById, filename, type: 'COMMISSIONS', status: 'PROCESSING' },
  })

  const parseResult = safeParseCsv(content)
  if ('error' in parseResult) {
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { status: 'FAILED', rowErrors: [{ row: 0, message: parseResult.error }] },
    })
    return { batchId: batch.id, status: 'FAILED', successCount: 0, errors: [{ row: 0, message: parseResult.error }] }
  }
  const rows = parseResult.rows

  const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true, rank: true } })
  const plans = await prisma.commissionPlan.findMany()
  const lookupPlan = (rank: string, level: number) => {
    const plan = plans.find((p) => p.rank === rank && p.downlineLevel === level)
    return plan ? Number(plan.overridePercent) : null
  }

  const errors: { row: number; message: string }[] = []
  let successCount = 0

  for (const [index, rawRow] of rows.entries()) {
    const parsed = CommissionRowSchema.safeParse(rawRow)
    if (!parsed.success) {
      errors.push({ row: index + 2, message: parsed.error.issues.map((i) => i.message).join('; ') })
      continue
    }
    const row = parsed.data
    const agent = await prisma.agent.findUnique({ where: { npn: row.agentNpn } })
    const policy = await prisma.policy.findUnique({ where: { policyNumber: row.policyNumber } })
    if (!agent || !policy) {
      errors.push({
        row: index + 2,
        message: !agent
          ? `Nenhum agente encontrado com NPN ${row.agentNpn}`
          : `Nenhuma apólice encontrada com número ${row.policyNumber}`,
      })
      continue
    }

    // Upsert (rather than create) on the compound unique key so re-uploading
    // the same commission CSV updates existing records in place instead of
    // duplicating money.
    await prisma.commissionRecord.upsert({
      where: {
        policyId_agentId_period_type_level: {
          policyId: policy.id,
          agentId: agent.id,
          period: row.period,
          type: 'DIRECT',
          level: 0,
        },
      },
      create: {
        policyId: policy.id,
        agentId: agent.id,
        amount: row.amount,
        type: 'DIRECT',
        level: 0,
        period: row.period,
        importBatchId: batch.id,
      },
      update: {
        amount: row.amount,
        importBatchId: batch.id,
      },
    })

    const overrides = computeOverrides(allAgents, agent.id, row.amount, lookupPlan)
    for (const override of overrides) {
      await prisma.commissionRecord.upsert({
        where: {
          policyId_agentId_period_type_level: {
            policyId: policy.id,
            agentId: override.agentId,
            period: row.period,
            type: 'OVERRIDE',
            level: override.level,
          },
        },
        create: {
          policyId: policy.id,
          agentId: override.agentId,
          amount: override.amount,
          type: 'OVERRIDE',
          level: override.level,
          period: row.period,
          importBatchId: batch.id,
        },
        update: {
          amount: override.amount,
          importBatchId: batch.id,
        },
      })
    }

    successCount += 1
  }

  const status = deriveStatus(successCount, errors.length)
  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { status, rowErrors: errors },
  })

  return { batchId: batch.id, status, successCount, errors }
}
