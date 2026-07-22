export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { getMonthBounds, buildProductionRanking } from '@/lib/agent-production'
import { periodFromDate } from '@/lib/period'
import { Shell } from '@/components/Shell'
import { PageHeader } from '@/components/PageHeader'
import { Table, Thead, Th, Tr, Td, TdNum } from '@/components/Table'
import { Select } from '@/components/Field'
import { Button } from '@/components/Button'
import { ContextPanel } from '@/components/ContextPanel'

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const session = await requireRole('ADMIN')
  const { period: periodParam } = await searchParams

  const distinctPeriods = await prisma.commissionRecord.findMany({
    distinct: ['period'],
    select: { period: true },
    orderBy: { period: 'desc' },
  })
  const periods = Array.from(
    new Set([...distinctPeriods.map((p) => p.period), periodFromDate(new Date())]),
  ).sort((a, b) => b.localeCompare(a))

  const period = periodParam && periods.includes(periodParam) ? periodParam : periods[0]
  const bounds = getMonthBounds(period)

  const [agents, policyStats, commissionStats] = await Promise.all([
    prisma.agent.findMany({ include: { user: true } }),
    prisma.policy.groupBy({
      by: ['agentId'],
      where: { createdAt: { gte: bounds.start, lt: bounds.end } },
      _count: true,
      _sum: { premium: true },
    }),
    prisma.commissionRecord.groupBy({
      by: ['agentId'],
      where: { period },
      _sum: { amount: true },
    }),
  ])

  const rows = buildProductionRanking(
    agents.map((a) => ({ id: a.id, name: a.user.name })),
    policyStats.map((p) => ({
      agentId: p.agentId,
      count: p._count,
      premiumSum: p._sum.premium?.toNumber() ?? 0,
    })),
    commissionStats.map((c) => ({
      agentId: c.agentId,
      sum: c._sum.amount?.toNumber() ?? 0,
    })),
  )

  return (
    <Shell role="ADMIN" userName={session.user.name}>
      <PageHeader title="Produção por agente" eyebrow="Desempenho" description="Compare apólices, prêmio e comissão por período." />

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section>
          <div className="mb-4 flex items-baseline justify-between"><h2 className="text-base font-semibold text-ink">Ranking do período</h2><span className="text-xs text-ink-muted">{rows.length} agentes</span></div>
        <Table>
          <Thead>
            <tr>
              <Th>Agente</Th>
              <Th className="text-right">Apólices</Th>
              <Th className="text-right">Prêmio total</Th>
              <Th className="text-right">Comissão total</Th>
            </tr>
          </Thead>
          <tbody>
            {rows.map((row) => (
              <Tr key={row.agentId}>
                <Td className="font-medium">{row.agentName}</Td>
                <TdNum>{row.policyCount}</TdNum>
                <TdNum>${row.premiumTotal.toFixed(2)}</TdNum>
                <TdNum>${row.commissionTotal.toFixed(2)}</TdNum>
              </Tr>
            ))}
          </tbody>
        </Table>
        </section>
        <aside className="space-y-5 lg:sticky lg:top-6">
          <form method="GET" className="rounded-lg border border-border-steel bg-paper p-5"><h2 className="text-base font-semibold text-ink">Filtrar período</h2><p className="mt-1 text-sm text-ink-muted">Escolha o mês que deseja comparar.</p><label className="mt-4 flex flex-col gap-2"><span className="text-xs font-semibold text-ink-muted">Mês</span><Select name="period" defaultValue={period}>{periods.map((p) => <option key={p} value={p}>{p}</option>)}</Select></label><Button type="submit" variant="primary" className="mt-4 w-full">Aplicar filtro</Button></form>
          <ContextPanel eyebrow="Leitura" title="Como usar"><p>O ranking combina apólices criadas, prêmio total e comissão no mês selecionado.</p></ContextPanel>
        </aside>
      </div>
    </Shell>
  )
}
