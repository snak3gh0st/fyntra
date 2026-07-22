import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { Shell } from '@/components/Shell'
import { PageTitle } from '@/components/PageTitle'
import { EmptyState } from '@/components/Table'
import { EntityCard, EntityCardList } from '@/components/EntityCard'
import { NewPlanForm } from './NewPlanForm'

export const dynamic = 'force-dynamic'

export default async function CommissionPlansPage() {
  const session = await requireRole('ADMIN')
  const plans = await prisma.commissionPlan.findMany({ orderBy: [{ rank: 'asc' }, { downlineLevel: 'asc' }] })

  return (
    <Shell role="ADMIN" userName={session.user.name}>
      <PageTitle>Planos de comissão</PageTitle>
      <div className="mt-6 max-w-2xl">
        <EntityCardList>
          {plans.map((plan, i) => (
            <EntityCard key={plan.id} index={i}>
              <span className="rounded-full bg-panel px-2.5 py-[3px] text-xs font-semibold text-ink-muted">
                {plan.rank}
              </span>
              <span className="flex-1 text-sm text-ink-muted">Nível {plan.downlineLevel} de downline</span>
              <span className="shrink-0 font-mono text-lg font-semibold tabular-nums text-teal">
                {plan.overridePercent.toString()}%
              </span>
            </EntityCard>
          ))}
        </EntityCardList>
        {plans.length === 0 && <EmptyState>Nenhum plano cadastrado ainda.</EmptyState>}
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold text-ink">Novo plano</h2>
      <NewPlanForm />
    </Shell>
  )
}
