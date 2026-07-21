'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createCommissionPlan(formData: FormData) {
  const rank = formData.get('rank') as string
  const downlineLevel = Number(formData.get('downlineLevel'))
  const overridePercent = Number(formData.get('overridePercent'))

  await prisma.commissionPlan.upsert({
    where: { rank_downlineLevel: { rank, downlineLevel } },
    create: { rank, downlineLevel, overridePercent },
    update: { overridePercent },
  })

  revalidatePath('/admin/commission-plans')
}
