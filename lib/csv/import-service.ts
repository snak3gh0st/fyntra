import { parse } from 'csv-parse/sync'
import { prisma } from '@/lib/prisma'
import { computeOverrides } from '@/lib/commission'
import { PolicyRowSchema, CommissionRowSchema } from './schemas'

export function parseCsv(content: string): Record<string, string>[] {
  return parse(content, { columns: true, skip_empty_lines: true, trim: true })
}

type ImportResult = {
  batchId: string
  successCount: number
  errors: { row: number; message: string }[]
}

export async function importPolicies(content: string, uploadedById: string, filename: string): Promise<ImportResult> {
  const rows = parseCsv(content)
  const batch = await prisma.importBatch.create({
    data: { uploadedById, filename, type: 'POLICIES', status: 'PROCESSING' },
  })

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
      errors.push({ row: index + 2, message: `No agent found with NPN ${row.agentNpn}` })
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
        importBatchId: batch.id,
      },
      update: {
        carrier: row.carrier,
        product: row.product,
        faceAmount: row.faceAmount,
        premium: row.premium,
        status: row.status,
        importBatchId: batch.id,
      },
    })
    successCount += 1
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: errors.length > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
      rowErrors: errors,
    },
  })

  return { batchId: batch.id, successCount, errors }
}

export async function importCommissions(content: string, uploadedById: string, filename: string): Promise<ImportResult> {
  const rows = parseCsv(content)
  const batch = await prisma.importBatch.create({
    data: { uploadedById, filename, type: 'COMMISSIONS', status: 'PROCESSING' },
  })

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
        message: !agent ? `No agent found with NPN ${row.agentNpn}` : `No policy found with number ${row.policyNumber}`,
      })
      continue
    }

    await prisma.commissionRecord.create({
      data: {
        policyId: policy.id,
        agentId: agent.id,
        amount: row.amount,
        type: 'DIRECT',
        level: 0,
        period: row.period,
        importBatchId: batch.id,
      },
    })

    const overrides = computeOverrides(allAgents, agent.id, row.amount, lookupPlan)
    for (const override of overrides) {
      await prisma.commissionRecord.create({
        data: {
          policyId: policy.id,
          agentId: override.agentId,
          amount: override.amount,
          type: 'OVERRIDE',
          level: override.level,
          period: row.period,
          importBatchId: batch.id,
        },
      })
    }

    successCount += 1
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: errors.length > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
      rowErrors: errors,
    },
  })

  return { batchId: batch.id, successCount, errors }
}
