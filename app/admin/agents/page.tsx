import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { buildHierarchyOrder } from '@/lib/hierarchy'
import { Shell } from '@/components/Shell'
import { PageHeader } from '@/components/PageHeader'
import { HierarchyBoard } from './HierarchyBoard'

export const dynamic = 'force-dynamic'

export default async function AgentsPage() {
  const session = await requireRole('ADMIN')
  const agents = await prisma.agent.findMany({ include: { user: true } })
  const byId = new Map(agents.map((a) => [a.id, a]))
  const order = buildHierarchyOrder(agents.map((a) => ({ id: a.id, parentAgentId: a.parentAgentId })))

  const ordered = order.map(({ id, depth }) => {
    const agent = byId.get(id)!
    return { id: agent.id, name: agent.user.name, rank: agent.rank, parentAgentId: agent.parentAgentId, depth }
  })

  return (
    <Shell role="ADMIN" userName={session.user.name}>
      <PageHeader title="Agentes e hierarquia" eyebrow="Estrutura" description={'Arraste um agente sobre outro para reatribuir o gerente, ou use "Editar" para ajustar rank e gerente diretamente.'} />
      <div className="mt-8 max-w-3xl">
        <HierarchyBoard agents={ordered} />
      </div>
    </Shell>
  )
}
