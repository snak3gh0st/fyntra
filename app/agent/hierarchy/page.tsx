export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineWithLevels, getUplineIds } from '@/lib/hierarchy'
import { Shell } from '@/components/Shell'
import { PageHeader } from '@/components/PageHeader'
import { HierarchyList } from './HierarchyLists'
import { ContextPanel } from '@/components/ContextPanel'

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
      <PageHeader title="Minha hierarquia" eyebrow="Estrutura" description="Veja quem está acima de você e acompanhe os agentes da sua downline." />
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <section className="rounded-lg border border-border-steel bg-paper p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">Acima de mim</h2>
          <HierarchyList rows={uplineRows} />
        </section>
        <section className="rounded-lg border border-border-steel bg-paper p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">Abaixo de mim</h2>
          <HierarchyList rows={downlineRows} />
        </section>
        </div>
        <ContextPanel eyebrow="Sua posição" title="Como ler a hierarquia">
          <p>Acima de você estão os responsáveis pela sua linha. Abaixo estão os agentes que fazem parte da sua downline.</p>
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-paper/45">Impacto</p>
            <p className="mt-2">A estrutura define de onde vêm seus repasses de comissão.</p>
          </div>
        </ContextPanel>
      </div>
    </Shell>
  )
}
