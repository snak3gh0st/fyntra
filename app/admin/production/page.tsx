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

      <form method="GET" className="mt-8 flex flex-wrap items-end gap-2 rounded-lg border border-border-steel bg-panel p-4">
        <Select name="period" defaultValue={period}>
          {periods.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          Aplicar
        </Button>
      </form>

      <div className="mt-6">
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
      </div>
    </Shell>
  )
}
