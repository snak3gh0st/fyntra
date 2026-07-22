import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'
import { Shell } from '@/components/Shell'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/Table'
import { EntityCard, EntityCardList } from '@/components/EntityCard'
import { Avatar } from '@/components/Avatar'

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
      <PageHeader title="Clientes" eyebrow="Carteira" description="Clientes vinculados a você e à sua downline." />
      <div className="mt-8 max-w-2xl">
        <EntityCardList>
          {clients.map((client, i) => (
            <EntityCard key={client.id} index={i}>
              <Avatar name={client.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{client.name}</p>
                <p className="truncate text-xs text-ink-muted">{client.email ?? 'Sem email cadastrado'}</p>
              </div>
              <span className="shrink-0 text-xs text-ink-muted">{client.assignedAgent.user.name}</span>
            </EntityCard>
          ))}
        </EntityCardList>
        {clients.length === 0 && <EmptyState>Nenhum cliente ainda.</EmptyState>}
      </div>
    </Shell>
  )
}
