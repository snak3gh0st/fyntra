export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineWithLevels, getUplineIds } from '@/lib/hierarchy'
import { Shell } from '@/components/Shell'
import { PageTitle } from '@/components/PageTitle'
import { HierarchyList } from './HierarchyLists'

export default async function HierarchyPage() {
  const agent = await getCurrentAgent()
  const user = await prisma.user.findUnique({ where: { id: agent.userId } })
  const allAgents = await prisma.agent.findMany({ include: { user: true } })
  const agentById = new Map(allAgents.map((a) => [a.id, { name: a.user.name, rank: a.rank }]))

  const uplineIds = getUplineIds(allAgents, agent.id)
  const downline = getDownlineWithLevels(allAgents, agent.id)

  const uplineRows = uplineIds.map((id) => agentById.get(id) ?? { name: '—', rank: '' })
  const downlineRows = downline.map((d) => ({ ...(agentById.get(d.id) ?? { name: '—', rank: '' }), level: d.level }))

  return (
    <Shell role="AGENT" userName={user?.name ?? ''}>
      <PageTitle>Minha hierarquia</PageTitle>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">Acima de mim</h2>
          <HierarchyList rows={uplineRows} />
        </section>
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">Abaixo de mim</h2>
          <HierarchyList rows={downlineRows} />
        </section>
      </div>
    </Shell>
  )
}
