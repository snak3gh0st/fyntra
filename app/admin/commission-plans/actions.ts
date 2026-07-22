'use server'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'

export type CreatePlanResult = { ok: true } | { ok: false; message: string }

export async function createCommissionPlan(formData: FormData): Promise<CreatePlanResult> {
  const session = await requireRole('ADMIN')

  const rank = formData.get('rank') as string
  const downlineLevel = Number(formData.get('downlineLevel'))
  const overridePercent = Number(formData.get('overridePercent'))

  if (!Number.isFinite(overridePercent) || overridePercent < 0 || overridePercent > 100) {
    return { ok: false, message: '% de override deve ser um número entre 0 e 100.' }
  }
  if (!Number.isFinite(downlineLevel) || downlineLevel < 1) {
    return { ok: false, message: 'Nível de downline deve ser 1 ou maior.' }
  }

  const before = await prisma.commissionPlan.findUnique({
    where: { rank_downlineLevel: { rank, downlineLevel } },
  })

  const after = await prisma.commissionPlan.upsert({
    where: { rank_downlineLevel: { rank, downlineLevel } },
    create: { rank, downlineLevel, overridePercent },
    update: { overridePercent },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'UPSERT_COMMISSION_PLAN',
      entity: 'CommissionPlan',
      entityId: after.id,
      before: before ? { overridePercent: before.overridePercent.toNumber() } : Prisma.JsonNull,
      after: { overridePercent: after.overridePercent.toNumber() },
    },
  })

  revalidatePath('/admin/commission-plans')
  return { ok: true }
}
