export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'
import { Shell } from '@/components/Shell'

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border-steel bg-panel px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-medium tabular-nums text-ink">
        {value}
      </p>
    </div>
  )
}

export default async function AgentDashboard() {
  const agent = await getCurrentAgent()
  const user = await prisma.user.findUnique({ where: { id: agent.userId } })
  const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true } })
  const downlineIds = getDownlineIds(allAgents, agent.id)

  const [policyCount, commissionTotal] = await Promise.all([
    prisma.policy.count({ where: { agentId: agent.id } }),
    prisma.commissionRecord.aggregate({ where: { agentId: agent.id }, _sum: { amount: true } }),
  ])

  return (
    <Shell role="AGENT" userName={user?.name ?? ''}>
      <h1 className="text-[1.5rem] font-semibold tracking-tight text-ink">Meu painel</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Minhas apólices" value={policyCount} />
        <StatCard
          label="Minhas comissões (total)"
          value={`$${(commissionTotal._sum.amount?.toNumber() ?? 0).toFixed(2)}`}
        />
        <StatCard label="Tamanho da minha downline" value={downlineIds.length} />
      </div>
    </Shell>
  )
}
