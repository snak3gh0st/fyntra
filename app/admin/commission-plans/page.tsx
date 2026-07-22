import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { Shell } from '@/components/Shell'
import { PageTitle } from '@/components/PageTitle'
import { Table, Thead, Th, Tr, Td, TdNum, EmptyState } from '@/components/Table'
import { NewPlanForm } from './NewPlanForm'

export const dynamic = 'force-dynamic'

export default async function CommissionPlansPage() {
  const session = await requireRole('ADMIN')
  const plans = await prisma.commissionPlan.findMany({ orderBy: [{ rank: 'asc' }, { downlineLevel: 'asc' }] })

  return (
    <Shell role="ADMIN" userName={session.user.name}>
      <PageTitle>Planos de comissão</PageTitle>
      <div className="mt-6">
        <Table>
          <Thead>
            <tr>
              <Th>Rank</Th>
              <Th className="text-right">Nível de downline</Th>
              <Th className="text-right">% de override</Th>
            </tr>
          </Thead>
          <tbody>
            {plans.map((plan) => (
              <Tr key={plan.id}>
                <Td className="font-medium">{plan.rank}</Td>
                <TdNum className="text-ink-muted">{plan.downlineLevel}</TdNum>
                <TdNum>{plan.overridePercent.toString()}%</TdNum>
              </Tr>
            ))}
          </tbody>
        </Table>
        {plans.length === 0 && <EmptyState>Nenhum plano cadastrado ainda.</EmptyState>}
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold text-ink">Novo plano</h2>
      <NewPlanForm />
    </Shell>
  )
}
