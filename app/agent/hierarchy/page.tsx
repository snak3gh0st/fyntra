export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineWithLevels, getUplineIds } from '@/lib/hierarchy'
import { Shell } from '@/components/Shell'
import { PageTitle } from '@/components/PageTitle'
import { EmptyState } from '@/components/Table'

function UplineList({ names }: { names: string[] }) {
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

function DownlineList({ rows }: { rows: { name: string; level: number }[] }) {
  if (rows.length === 0) {
    return <EmptyState>Ninguém aqui.</EmptyState>
  }
  return (
    <ul className="divide-y divide-border-steel rounded-lg border border-border-steel bg-panel">
      {rows.map((row, i) => (
        <li key={i} className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink">
          <span style={{ paddingLeft: `${(row.level - 1) * 1.25}rem` }} className="flex items-center gap-2">
            {row.level > 1 && <span className="text-ink-muted">└</span>}
            {row.name}
          </span>
          <span className="ml-auto shrink-0 font-mono text-xs text-ink-muted">Nível {row.level}</span>
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
  const downline = getDownlineWithLevels(allAgents, agent.id)

  return (
    <Shell role="AGENT" userName={user?.name ?? ''}>
      <PageTitle>Minha hierarquia</PageTitle>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">Acima de mim</h2>
          <UplineList names={uplineIds.map((id) => nameById.get(id) ?? '—')} />
        </section>
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">Abaixo de mim</h2>
          <DownlineList
            rows={downline.map((d) => ({ name: nameById.get(d.id) ?? '—', level: d.level }))}
          />
        </section>
      </div>
    </Shell>
  )
}
