import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'
import { Shell } from '@/components/Shell'
import { PageHeader } from '@/components/PageHeader'
import { ContextPanel } from '@/components/ContextPanel'
import { ClientsList } from './ClientsList'

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
      <PageHeader title="Clientes" eyebrow="Carteira" description="Clientes vinculados a você e à sua downline.">
        <span className="inline-flex rounded-full bg-teal-pale px-3 py-1.5 text-xs font-semibold text-teal">{clients.length} clientes</span>
      </PageHeader>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="max-w-4xl">
          <ClientsList
            clients={clients.map((c) => ({ id: c.id, name: c.name, email: c.email, agentName: c.assignedAgent.user.name }))}
          />
        </div>
        <ContextPanel eyebrow="Escopo" title="Sua carteira">
          <p>Esta lista reúne seus clientes e os clientes dos agentes abaixo de você na hierarquia.</p>
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-paper/45">Próximo passo</p>
            <p className="mt-2">Abra uma apólice para conferir prêmio, status e documentos.</p>
          </div>
        </ContextPanel>
      </div>
    </Shell>
  )
}
