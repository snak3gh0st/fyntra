'use server'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'

export async function createCommissionPlan(formData: FormData) {
  const session = await requireRole('ADMIN')

  const rank = formData.get('rank') as string
  const downlineLevel = Number(formData.get('downlineLevel'))
  const overridePercent = Number(formData.get('overridePercent'))

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
}
