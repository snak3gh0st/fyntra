export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { periodFromDate, shiftPeriod, percentChange } from '@/lib/period'
import { sumByMonth } from '@/lib/dashboard'
import { decimalToNumber } from '@/lib/decimal'
import { diffAuditFields } from '@/lib/audit-diff'
import { Shell } from '@/components/Shell'
import { PageTitle } from '@/components/PageTitle'
import { ImportStatusPill, RolePill } from '@/components/StatusPill'

function Kpi({
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
      <p className={`text-xs font-semibold uppercase tracking-wide ${emphasis ? 'text-gold-ink' : 'text-ink-muted'}`}>
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className={`font-mono tabular-nums ${emphasis ? 'text-3xl font-semibold text-gold-ink' : 'text-2xl font-medium text-ink'}`}>
          {value}
        </p>
        {delta !== undefined && delta !== null && (
          <span className={`font-mono text-xs font-semibold ${delta >= 0 ? 'text-success' : 'text-danger'}`}>
            {delta >= 0 ? '+' : ''}
            {delta.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  )
}

function PremiumChart({ buckets }: { buckets: { month: string; total: number }[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.total))
  return (
    <div className="rounded-lg border border-border-steel bg-panel px-5 py-4">
      <h2 className="text-sm font-semibold text-ink">Novo prêmio por mês</h2>
      <div className="mt-4 flex h-32 items-end gap-2">
        {buckets.map((b) => (
          <div key={b.month} className="flex flex-1 flex-col items-center gap-1">
            <span className="font-mono text-[10px] text-ink-muted">
              {b.total > 0 ? `$${Math.round(b.total)}` : ''}
            </span>
            <div
              className="w-full rounded-t-sm bg-teal"
              style={{ height: `${(b.total / max) * 100}%`, minHeight: b.total > 0 ? '4px' : '0' }}
            />
            <span className="text-[10px] text-ink-muted">{b.month.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function AdminDashboard() {
  const session = await requireRole('ADMIN')

  const now = new Date()
  const currentP = periodFromDate(now)
  const previousP = shiftPeriod(currentP, -1)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [
    agentsActive,
    policiesTotal,
    policiesInforce,
    premiumAgg,
    commissionCurrentAgg,
    commissionPreviousAgg,
    recentPolicies,
    recentImports,
    recentAudit,
  ] = await Promise.all([
    prisma.agent.count({ where: { status: 'ACTIVE' } }),
    prisma.policy.count(),
    prisma.policy.count({ where: { status: 'INFORCE' } }),
    prisma.policy.aggregate({ where: { status: 'INFORCE' }, _sum: { premium: true } }),
    prisma.commissionRecord.aggregate({ where: { period: currentP }, _sum: { amount: true } }),
    prisma.commissionRecord.aggregate({ where: { period: previousP }, _sum: { amount: true } }),
    prisma.policy.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, premium: true },
    }),
    prisma.importBatch.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { uploadedBy: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { user: true } }),
  ])

  const commissionCurrent = decimalToNumber(commissionCurrentAgg._sum.amount)
  const commissionPrevious = decimalToNumber(commissionPreviousAgg._sum.amount)
  const premiumBuckets = sumByMonth(
    recentPolicies.map((p) => ({ date: p.createdAt, amount: decimalToNumber(p.premium) })),
    6,
    now,
  )
  const importsNeedingAttention = recentImports.filter((b) => b.status !== 'COMPLETED')

  return (
    <Shell role="ADMIN" userName={session.user.name}>
      <PageTitle>Painel</PageTitle>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Comissão paga (este mês)"
          value={`$${commissionCurrent.toFixed(2)}`}
          delta={percentChange(commissionCurrent, commissionPrevious)}
          emphasis
        />
        <Kpi label="Prêmio sob gestão" value={`$${decimalToNumber(premiumAgg._sum.premium).toFixed(2)}`} />
        <Kpi label="Apólices em vigor" value={`${policiesInforce} / ${policiesTotal}`} />
        <Kpi label="Agentes ativos" value={agentsActive} />
      </div>

      <div className="mt-6">
        <PremiumChart buckets={premiumBuckets} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border-steel bg-panel px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Precisa de atenção</h2>
            <Link href="/admin/import" className="text-xs font-semibold text-teal hover:text-teal-deep">
              Importar dados →
            </Link>
          </div>
          {importsNeedingAttention.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">Nenhum import pendente de revisão.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {importsNeedingAttention.map((batch) => (
                <li key={batch.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-ink">{batch.filename}</span>
                  <ImportStatusPill status={batch.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border-steel bg-panel px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Atividade recente</h2>
            <Link href="/admin/audit" className="text-xs font-semibold text-teal hover:text-teal-deep">
              Ver tudo →
            </Link>
          </div>
          {recentAudit.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">Nenhuma alteração registrada ainda.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {recentAudit.map((log) => {
                const diffs = diffAuditFields(log.before, log.after)
                const summary = diffs[0] ? `${diffs[0].field}: ${diffs[0].before} → ${diffs[0].after}` : log.action
                return (
                  <li key={log.id} className="flex items-center gap-2 text-sm">
                    <RolePill role={log.user.role} />
                    <span className="truncate text-ink-muted">
                      <span className="font-medium text-ink">{log.user.name}</span> · {summary}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </Shell>
  )
}
