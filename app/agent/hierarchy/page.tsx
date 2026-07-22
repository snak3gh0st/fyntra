export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineWithLevels, getUplineIds } from '@/lib/hierarchy'
import { Shell } from '@/components/Shell'
import { PageHeader } from '@/components/PageHeader'
import { HierarchyCanvas } from './HierarchyCanvas'
import { ContextPanel } from '@/components/ContextPanel'

export default async function HierarchyPage() {
  const agent = await getCurrentAgent()
  const user = await prisma.user.findUnique({ where: { id: agent.userId } })
  const allAgents = await prisma.agent.findMany({ include: { user: true } })

  const uplineIds = getUplineIds(allAgents, agent.id)
  const downline = getDownlineWithLevels(allAgents, agent.id)
  const levelById = new Map(downline.map((d) => [d.id, d.level]))
  const relevantIds = new Set([...uplineIds, agent.id, ...downline.map((d) => d.id)])

  const canvasAgents = allAgents
    .filter((a) => relevantIds.has(a.id))
    .map((a) => ({
      id: a.id,
      name: a.user.name,
      rank: a.rank,
      parentAgentId: a.parentAgentId,
      level: levelById.get(a.id) ?? null,
    }))

  return (
    <Shell role="AGENT" userName={user?.name ?? ''}>
      <PageHeader title="Minha hierarquia" eyebrow="Estrutura" description="Sua linha de liderança acima, você no meio, sua downline abaixo. Arraste os cartões para reorganizar a visualização.">
        <span className="inline-flex rounded-full bg-teal-pale px-3 py-1.5 text-xs font-semibold text-teal">{canvasAgents.length} agentes</span>
      </PageHeader>
      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(240px,280px)]">
        <HierarchyCanvas agents={canvasAgents} youId={agent.id} />
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
