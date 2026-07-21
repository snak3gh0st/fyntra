export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'
import { bucketByMonth } from '@/lib/dashboard'
import { getRiskAlerts, type RiskAlert } from '@/lib/alerts'
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

const ALERT_GROUP_LABELS: Record<RiskAlert['type'], string> = {
  STALLED: 'Paradas no funil (mais de 15 dias)',
  NO_PAYMENT: 'Sem sinal de pagamento (mais de 30 dias)',
  RECENT_LAPSE: 'Lapsaram recentemente',
}

const ALERT_GROUP_TONE: Record<RiskAlert['type'], string> = {
  STALLED: 'bg-gold-pale text-gold',
  NO_PAYMENT: 'bg-danger-pale text-danger',
  RECENT_LAPSE: 'bg-danger-pale text-danger',
}

function RiskAlertsSection({ alerts }: { alerts: RiskAlert[] }) {
  if (alerts.length === 0) return null

  const groups = (['STALLED', 'NO_PAYMENT', 'RECENT_LAPSE'] as const)
    .map((type) => ({ type, items: alerts.filter((a) => a.type === type) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="mt-6 rounded-lg border border-border-steel bg-panel px-5 py-4">
      <h2 className="text-sm font-semibold text-ink">Alertas</h2>
      <div className="mt-3 flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.type}>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${ALERT_GROUP_TONE[group.type]}`}
            >
              {ALERT_GROUP_LABELS[group.type]}
            </span>
            <ul className="mt-2 flex flex-col gap-1">
              {group.items.map((alert) => (
                <li key={alert.policy.id} className="flex items-center justify-between text-sm">
                  <a
                    href={`/agent/policies/${alert.policy.id}`}
                    className="text-teal hover:text-teal-deep"
                  >
                    {alert.policy.policyNumber} — {alert.policy.clientName} ({alert.policy.carrier}, {alert.policy.product})
                  </a>
                  <span className="font-mono tabular-nums text-ink-muted">
                    {Number.isFinite(alert.daysSince) ? `há ${alert.daysSince} dias` : 'sem data de referência'}
                  </span>
                </li>
              ))}
            </ul>
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

  const [policyCount, commissionTotal, byStatus, byCarrier, byProduct, policies, alertPolicies] = await Promise.all([
    prisma.policy.count({ where: { agentId: agent.id } }),
    prisma.commissionRecord.aggregate({ where: { agentId: agent.id }, _sum: { amount: true } }),
    prisma.policy.groupBy({ by: ['status'], where: { agentId: agent.id }, _count: true }),
    prisma.policy.groupBy({ by: ['carrier'], where: { agentId: agent.id }, _count: true }),
    prisma.policy.groupBy({ by: ['product'], where: { agentId: agent.id }, _count: true }),
    prisma.policy.findMany({ where: { agentId: agent.id }, select: { createdAt: true } }),
    prisma.policy.findMany({
      where: { agentId: agent.id },
      select: {
        id: true,
        policyNumber: true,
        carrier: true,
        product: true,
        status: true,
        createdAt: true,
        effectiveDate: true,
        lastPaymentDate: true,
        statusChangedAt: true,
        client: { select: { name: true } },
      },
    }),
  ])

  const riskAlerts = getRiskAlerts(
    alertPolicies.map((p) => ({
      id: p.id,
      policyNumber: p.policyNumber,
      carrier: p.carrier,
      product: p.product,
      clientName: p.client.name,
      status: p.status,
      createdAt: p.createdAt,
      effectiveDate: p.effectiveDate,
      lastPaymentDate: p.lastPaymentDate,
      statusChangedAt: p.statusChangedAt,
    })),
    new Date(),
  )

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

      <RiskAlertsSection alerts={riskAlerts} />

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
