import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { Shell } from '@/components/Shell'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/Table'
import { EntityCard, EntityCardList } from '@/components/EntityCard'
import { NewPlanForm } from './NewPlanForm'

export const dynamic = 'force-dynamic'

export default async function CommissionPlansPage() {
  const session = await requireRole('ADMIN')
  const plans = await prisma.commissionPlan.findMany({ orderBy: [{ rank: 'asc' }, { downlineLevel: 'asc' }] })

  return (
    <Shell role="ADMIN" userName={session.user.name}>
      <PageHeader title="Planos de comissão" eyebrow="Configuração" description="Defina os percentuais de override aplicados a cada nível da hierarquia." />
      <div className="mt-8 max-w-2xl">
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

      <section className="mt-10 max-w-2xl rounded-lg border border-border-steel bg-panel p-5">
        <h2 className="text-lg font-semibold text-ink">Novo plano</h2>
        <p className="mt-1 text-sm text-ink-muted">Adicione uma regra para um rank e nível de downline.</p>
        <div className="mt-5"><NewPlanForm /></div>
      </section>
    </Shell>
  )
}
