export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds, getUplineIds } from '@/lib/hierarchy'
import { Shell } from '@/components/Shell'
import { EmptyState } from '@/components/Table'

function NameList({ names }: { names: string[] }) {
  if (names.length === 0) {
    return <EmptyState>Ninguém aqui.</EmptyState>
  }
  return (
    <ul className="divide-y divide-border-steel rounded-lg border border-border-steel bg-panel">
      {names.map((name, i) => (
        <li key={i} className="px-4 py-2.5 text-sm text-ink">
          {name}
        </li>
      ))}
    </ul>
  )
}

export default async function HierarchyPage() {
  const agent = await getCurrentAgent()
  const user = await prisma.user.findUnique({ where: { id: agent.userId } })
  const allAgents = await prisma.agent.findMany({ include: { user: true } })
  const nameById = new Map(allAgents.map((a) => [a.id, a.user.name]))

  const uplineIds = getUplineIds(allAgents, agent.id)
  const downlineIds = getDownlineIds(allAgents, agent.id)

  return (
    <Shell role="AGENT" userName={user?.name ?? ''}>
      <h1 className="text-[1.5rem] font-semibold tracking-tight text-ink">Minha hierarquia</h1>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">Acima de mim</h2>
          <NameList names={uplineIds.map((id) => nameById.get(id) ?? '—')} />
        </section>
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">Abaixo de mim</h2>
          <NameList names={downlineIds.map((id) => nameById.get(id) ?? '—')} />
        </section>
      </div>
    </Shell>
  )
}
