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
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <section className="rounded-md border border-border-steel bg-paper p-5">
          <div className="flex items-baseline justify-between gap-4 border-b border-border-steel pb-4"><div><h2 className="text-base font-semibold text-ink">Regras ativas</h2><p className="mt-1 text-sm text-ink-muted">{plans.length} regras cadastradas</p></div><span className="font-mono text-xs text-ink-muted">override</span></div>
          <div className="mt-4"><EntityCardList>{plans.map((plan, i) => <EntityCard key={plan.id} index={i}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-teal-pale text-xs font-bold text-teal">{plan.downlineLevel}</span><div className="min-w-0 flex-1"><p className="font-medium text-ink">{plan.rank}</p><p className="text-xs text-ink-muted">Nível de downline</p></div><span className="shrink-0 font-mono text-lg font-semibold tabular-nums text-teal">{plan.overridePercent.toString()}%</span></EntityCard>)}</EntityCardList>{plans.length === 0 && <EmptyState>Nenhum plano cadastrado ainda.</EmptyState>}</div>
        </section>
        <section className="rounded-md border border-border-steel bg-panel p-5 lg:sticky lg:top-6"><h2 className="text-base font-semibold text-ink">Adicionar regra</h2><p className="mt-1 text-sm text-ink-muted">Adicione um rank, nível e percentual de override.</p><div className="mt-5"><NewPlanForm /></div></section>
      </div>
    </Shell>
  )
}
