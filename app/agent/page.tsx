export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'
import { bucketByMonth } from '@/lib/dashboard'
import { decimalToNumber } from '@/lib/decimal'
import { periodFromDate, shiftPeriod, percentChange } from '@/lib/period'
import { Shell } from '@/components/Shell'
import { PageHeader } from '@/components/PageHeader'
import { ErrorBanner } from '@/components/ErrorBanner'
import { policyStatusLabel } from '@/components/StatusPill'

function StatCard({
  label,
  value,
  delta,
  emphasis = false,
}: {
  label: string
  value: React.ReactNode
  delta?: number | null
  emphasis?: boolean
}) {
  return (
    <div
      className={`rounded-lg border px-5 py-4 ${
        emphasis ? 'border-gold-pale bg-gold-pale' : 'border-border-steel bg-panel'
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          emphasis ? 'text-gold-ink' : 'text-ink-muted'
        }`}
      >
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <p
          className={`font-mono tabular-nums ${
            emphasis ? 'text-3xl font-semibold text-gold-ink' : 'text-2xl font-medium text-ink'
          }`}
        >
          {value}
        </p>
        {delta !== undefined && delta !== null && (
          <span className={`font-mono text-xs font-semibold ${delta >= 0 ? 'text-success' : 'text-danger'}`}>
            {delta >= 0 ? '+' : ''}
            {delta.toFixed(0)}% vs mês anterior
          </span>
        )}
      </div>
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

function safeGroupCount(groupCount: unknown): number {
  if (groupCount && typeof groupCount === 'object' && '_all' in groupCount) {
    const countObj = groupCount as { _all?: number }
    return countObj._all ?? 0
  }
  return 0
}

export default async function AgentDashboard() {
  const agent = await getCurrentAgent()
  const user = await prisma.user.findUnique({ where: { id: agent.userId } })
  const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true } })
  const downlineIds = getDownlineIds(allAgents, agent.id)

  const now = new Date()
  const currentP = periodFromDate(now)
  const previousP = shiftPeriod(currentP, -1)

  let policyCount = 0
  let commissionTotalAmount = 0
  let commissionThisMonth = 0
  let commissionLastMonth = 0
  let byStatus: { status: string; _count: { _all: number } }[] = []
  let byCarrier: { carrier: string; _count: { _all: number } }[] = []
  let byProduct: { product: string; _count: { _all: number } }[] = []
  let policies: { createdAt: Date }[] = []
  let loadError = false

  try {
    const [
      policyTotal,
      commissionAgg,
      commissionThisMonthAgg,
      commissionLastMonthAgg,
      statusBuckets,
      carrierBuckets,
      productBuckets,
      monthBuckets,
    ] = await Promise.all([
      prisma.policy.count({ where: { agentId: agent.id } }),
      prisma.commissionRecord.aggregate({ where: { agentId: agent.id }, _sum: { amount: true } }),
      prisma.commissionRecord.aggregate({ where: { agentId: agent.id, period: currentP }, _sum: { amount: true } }),
      prisma.commissionRecord.aggregate({ where: { agentId: agent.id, period: previousP }, _sum: { amount: true } }),
      prisma.policy.groupBy({
        by: ['status'],
        where: { agentId: agent.id },
        _count: { _all: true },
        orderBy: { status: 'asc' },
      }),
      prisma.policy.groupBy({
        by: ['carrier'],
        where: { agentId: agent.id },
        _count: { _all: true },
        orderBy: { carrier: 'asc' },
      }),
      prisma.policy.groupBy({
        by: ['product'],
        where: { agentId: agent.id },
        _count: { _all: true },
        orderBy: { product: 'asc' },
      }),
      prisma.policy.findMany({ where: { agentId: agent.id }, select: { createdAt: true } }),
    ])

    policyCount = policyTotal
    commissionTotalAmount = decimalToNumber(commissionAgg._sum.amount)
    commissionThisMonth = decimalToNumber(commissionThisMonthAgg._sum.amount)
    commissionLastMonth = decimalToNumber(commissionLastMonthAgg._sum.amount)
    byStatus = statusBuckets
    byCarrier = carrierBuckets
    byProduct = productBuckets
    policies = monthBuckets
  } catch (error) {
    console.error('AgentDashboard query error', error)
    loadError = true
  }

  const monthlyBuckets = bucketByMonth(policies.map((p) => p.createdAt), 6, now)

  return (
    <Shell role="AGENT" userName={user?.name ?? ''}>
      <PageHeader title="Meu painel" eyebrow="Visão geral" description="Veja o andamento da sua carteira, comissão e downline." />
      {loadError && (
        <ErrorBanner>
          Não foi possível carregar seus dados agora. Os números abaixo podem estar incompletos — tente atualizar a página.
        </ErrorBanner>
      )}
      <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border-steel bg-border-steel sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Comissão este mês"
          value={`$${commissionThisMonth.toFixed(2)}`}
          delta={percentChange(commissionThisMonth, commissionLastMonth)}
          emphasis
        />
        <StatCard label="Comissão total" value={`$${commissionTotalAmount.toFixed(2)}`} />
        <StatCard label="Minhas apólices" value={policyCount} />
        <StatCard label="Tamanho da minha downline" value={downlineIds.length} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BreakdownList
          title="Por status"
          rows={byStatus.map((s) => ({ label: policyStatusLabel[s.status] ?? s.status, count: safeGroupCount(s._count) }))}
        />
        <BreakdownList
          title="Por carrier"
          rows={byCarrier.map((c) => ({ label: c.carrier, count: safeGroupCount(c._count) }))}
        />
        <BreakdownList
          title="Por produto"
          rows={byProduct.map((p) => ({ label: p.product, count: safeGroupCount(p._count) }))}
        />
      </div>

      <div className="mt-8">
        <MonthlyChart buckets={monthlyBuckets} />
      </div>
    </Shell>
  )
}
