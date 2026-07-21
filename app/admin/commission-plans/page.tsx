import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { createCommissionPlan } from './actions'
import { Shell } from '@/components/Shell'
import { Table, Thead, Th, Tr, Td, TdNum, EmptyState } from '@/components/Table'
import { Field, Input } from '@/components/Field'
import { Button } from '@/components/Button'

export const dynamic = 'force-dynamic'

export default async function CommissionPlansPage() {
  const session = await requireRole('ADMIN')
  const plans = await prisma.commissionPlan.findMany({ orderBy: [{ rank: 'asc' }, { downlineLevel: 'asc' }] })

  return (
    <Shell role="ADMIN" userName={session.user.name}>
      <h1 className="text-[1.5rem] font-semibold tracking-tight text-ink">Planos de comissão</h1>
      <div className="mt-6">
        <Table>
          <Thead>
            <tr>
              <Th>Rank</Th>
              <Th>Nível de downline</Th>
              <Th className="text-right">% de override</Th>
            </tr>
          </Thead>
          <tbody>
            {plans.map((plan) => (
              <Tr key={plan.id}>
                <Td className="font-medium">{plan.rank}</Td>
                <Td className="text-ink-muted">{plan.downlineLevel}</Td>
                <TdNum>{plan.overridePercent.toString()}%</TdNum>
              </Tr>
            ))}
          </tbody>
        </Table>
        {plans.length === 0 && <EmptyState>Nenhum plano cadastrado ainda.</EmptyState>}
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold text-ink">Novo plano</h2>
      <form action={createCommissionPlan} className="flex flex-wrap items-end gap-3">
        <Field label="Rank">
          <Input name="rank" placeholder="ex: MANAGER" required className="w-40" />
        </Field>
        <Field label="Nível">
          <Input name="downlineLevel" type="number" min={1} placeholder="1" required className="w-24" />
        </Field>
        <Field label="% override">
          <Input name="overridePercent" type="number" step="0.01" placeholder="10.00" required className="w-28" />
        </Field>
        <Button type="submit" variant="primary">
          Salvar
        </Button>
      </form>
    </Shell>
  )
}
