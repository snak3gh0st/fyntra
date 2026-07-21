'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function updateAgentHierarchy(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Not authenticated')

  const agentId = formData.get('agentId') as string
  const parentAgentId = (formData.get('parentAgentId') as string) || null
  const rank = formData.get('rank') as string

  const before = await prisma.agent.findUniqueOrThrow({ where: { id: agentId } })
  const after = await prisma.agent.update({
    where: { id: agentId },
    data: { parentAgentId, rank },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'UPDATE_AGENT_HIERARCHY',
      entity: 'Agent',
      entityId: agentId,
      before: { parentAgentId: before.parentAgentId, rank: before.rank },
      after: { parentAgentId: after.parentAgentId, rank: after.rank },
    },
  })

  revalidatePath('/admin/agents')
}
