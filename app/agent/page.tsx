export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'

export default async function AgentDashboard() {
  const agent = await getCurrentAgent()
  const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true } })
  const downlineIds = getDownlineIds(allAgents, agent.id)

  const [policyCount, commissionTotal] = await Promise.all([
    prisma.policy.count({ where: { agentId: agent.id } }),
    prisma.commissionRecord.aggregate({ where: { agentId: agent.id }, _sum: { amount: true } }),
  ])

  return (
    <main>
      <h1>Meu painel</h1>
      <p>Minhas apólices: {policyCount}</p>
      <p>Minhas comissões (total): {commissionTotal._sum.amount?.toString() ?? '0'}</p>
      <p>Tamanho da minha downline: {downlineIds.length}</p>
    </main>
  )
}
