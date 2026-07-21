export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'
import { bucketByMonth } from '@/lib/dashboard'
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

function BreakdownList({
  title,
  rows,
}: {
  title: string
  rows: { label: string; count: number }[]
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className="rounded-lg border border-border-steel bg-panel px-5 py-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-3 text-sm">
            <span className="w-28 shrink-0 truncate text-ink-muted">{row.label}</span>
            <span className="h-2 flex-1 rounded-full bg-teal-pale">
              <span
                className="block h-2 rounded-full bg-teal"
                style={{ width: `${(row.count / max) * 100}%` }}
              />
            </span>
            <span className="w-8 shrink-0 text-right font-mono tabular-nums text-ink">
              {row.count}
            </span>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-ink-muted">Nenhum dado ainda.</li>}
      </ul>
    </div>
  )
}

function MonthlyChart({ buckets }: { buckets: { month: string; count: number }[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count))
  return (
    <div className="rounded-lg border border-border-steel bg-panel px-5 py-4">
      <h2 className="text-sm font-semibold text-ink">Apólices criadas por mês</h2>
      <div className="mt-4 flex h-32 items-end gap-2">
        {buckets.map((b) => (
          <div key={b.month} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t-sm bg-teal"
              style={{ height: `${(b.count / max) * 100}%`, minHeight: b.count > 0 ? '4px' : '0' }}
            />
            <span className="text-[10px] text-ink-muted">{b.month.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const STATUS_LABELS: Record<string, string> = {
  INFORCE: 'Em vigor',
  APPROVED: 'Aprovada',
  PENDING: 'Pendente',
  LAPSED: 'Lapsada',
  CANCELLED: 'Cancelada',
}

export default async function AgentDashboard() {
  const agent = await getCurrentAgent()
  const user = await prisma.user.findUnique({ where: { id: agent.userId } })
  const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true } })
  const downlineIds = getDownlineIds(allAgents, agent.id)

  const [policyCount, commissionTotal, byStatus, byCarrier, byProduct, policies] = await Promise.all([
    prisma.policy.count({ where: { agentId: agent.id } }),
    prisma.commissionRecord.aggregate({ where: { agentId: agent.id }, _sum: { amount: true } }),
    prisma.policy.groupBy({ by: ['status'], where: { agentId: agent.id }, _count: true }),
    prisma.policy.groupBy({ by: ['carrier'], where: { agentId: agent.id }, _count: true }),
    prisma.policy.groupBy({ by: ['product'], where: { agentId: agent.id }, _count: true }),
    prisma.policy.findMany({ where: { agentId: agent.id }, select: { createdAt: true } }),
  ])

  const monthlyBuckets = bucketByMonth(policies.map((p) => p.createdAt), 6, new Date())

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

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BreakdownList
          title="Por status"
          rows={byStatus.map((s) => ({ label: STATUS_LABELS[s.status] ?? s.status, count: s._count }))}
        />
        <BreakdownList
          title="Por carrier"
          rows={byCarrier.map((c) => ({ label: c.carrier, count: c._count }))}
        />
        <BreakdownList
          title="Por produto"
          rows={byProduct.map((p) => ({ label: p.product, count: p._count }))}
        />
      </div>

      <div className="mt-4">
        <MonthlyChart buckets={monthlyBuckets} />
      </div>
    </Shell>
  )
}
