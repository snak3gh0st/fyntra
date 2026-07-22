export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { Shell } from '@/components/Shell'
import { PageTitle } from '@/components/PageTitle'
import { EmptyState } from '@/components/Table'
import { EntityCard, EntityCardList } from '@/components/EntityCard'
import { PolicyStatusPill } from '@/components/StatusPill'

export default async function ClientPortalPage() {
  const session = await requireRole('CLIENT', 'ADMIN')

  const client = await prisma.client.findUnique({ where: { userId: session.user.id } })
  if (!client) {
    return (
      <Shell role="CLIENT" userName={session.user.name}>
        <PageTitle>Minhas apólices</PageTitle>
        <p className="mt-4 text-sm text-ink-muted">
          Não encontramos uma conta de cliente vinculada a este login. Fale com seu agente para
          verificar seu cadastro.
        </p>
      </Shell>
    )
  }

  const policies = await prisma.policy.findMany({ where: { clientId: client.id } })

  return (
    <Shell role="CLIENT" userName={session.user.name}>
      <PageTitle>Minhas apólices</PageTitle>
      <div className="mt-6 max-w-2xl">
        <EntityCardList>
          {policies.map((policy, i) => (
            <EntityCard key={policy.id} index={i} href={`/client/policies/${policy.id}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{policy.carrier}</p>
                <p className="truncate text-xs text-ink-muted">
                  {policy.product} · <span className="font-mono">{policy.policyNumber}</span>
                </p>
              </div>
              <span className="shrink-0 font-mono font-medium tabular-nums text-ink">
                ${policy.premium.toString()}
              </span>
              <PolicyStatusPill status={policy.status} />
            </EntityCard>
          ))}
        </EntityCardList>
        {policies.length === 0 && (
          <EmptyState>
            Nenhuma apólice encontrada. Se você acredita que isso é um erro, fale com seu agente.
          </EmptyState>
        )}
      </div>
    </Shell>
  )
}
