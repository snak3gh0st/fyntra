import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'
import { Shell } from '@/components/Shell'
import { PageTitle } from '@/components/PageTitle'
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/Table'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const agent = await getCurrentAgent()
  const user = await prisma.user.findUnique({ where: { id: agent.userId } })
  const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true } })
  const scopeAgentIds = [agent.id, ...getDownlineIds(allAgents, agent.id)]

  const clients = await prisma.client.findMany({
    where: { assignedAgentId: { in: scopeAgentIds } },
    include: { assignedAgent: { include: { user: true } } },
  })

  return (
    <Shell role="AGENT" userName={user?.name ?? ''}>
      <PageTitle>Clientes</PageTitle>
      <div className="mt-6">
        <Table>
          <Thead>
            <tr>
              <Th>Nome</Th>
              <Th>Email</Th>
              <Th>Agente responsável</Th>
            </tr>
          </Thead>
          <tbody>
            {clients.map((client) => (
              <Tr key={client.id}>
                <Td className="font-medium">{client.name}</Td>
                <Td className="text-ink-muted">{client.email ?? '—'}</Td>
                <Td>{client.assignedAgent.user.name}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {clients.length === 0 && <EmptyState>Nenhum cliente ainda.</EmptyState>}
      </div>
    </Shell>
  )
}
