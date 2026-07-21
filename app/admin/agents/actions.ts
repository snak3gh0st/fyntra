'use server'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { getDownlineIds } from '@/lib/hierarchy'
import { revalidatePath } from 'next/cache'

export async function updateAgentHierarchy(formData: FormData) {
  const session = await requireRole('ADMIN')

  const agentId = formData.get('agentId') as string
  const parentAgentId = (formData.get('parentAgentId') as string) || null
  const rank = formData.get('rank') as string

  if (parentAgentId) {
    if (parentAgentId === agentId) {
      throw new Error('An agent cannot report to itself')
    }
    const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true } })
    const downlineIds = getDownlineIds(allAgents, agentId)
    if (downlineIds.includes(parentAgentId)) {
      throw new Error('Cannot set parentAgentId to one of the agent\'s own descendants (would create a cycle)')
    }
  }

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
