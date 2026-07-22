import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { buildHierarchyOrder } from '@/lib/hierarchy'
import { Shell } from '@/components/Shell'
import { PageTitle } from '@/components/PageTitle'
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
      <PageTitle>Agentes e hierarquia</PageTitle>
      <p className="mt-1 text-sm text-ink-muted">
        Arraste um agente sobre outro para reatribuir o gerente, ou use &quot;Editar&quot; para ajustar rank e gerente diretamente.
      </p>
      <div className="mt-6 max-w-3xl">
        <HierarchyBoard agents={ordered} />
      </div>
    </Shell>
  )
}
