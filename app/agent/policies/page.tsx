import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'
import { decimalToNumber } from '@/lib/decimal'
import { Shell } from '@/components/Shell'
import { PageHeader } from '@/components/PageHeader'
import { ErrorBanner } from '@/components/ErrorBanner'
import { EmptyState } from '@/components/Table'
import { EntityCard, EntityCardList } from '@/components/EntityCard'
import { PolicyStatusPill } from '@/components/StatusPill'

export const dynamic = 'force-dynamic'

export default async function PoliciesPage() {
  const agent = await getCurrentAgent()
  const user = await prisma.user.findUnique({ where: { id: agent.userId } })
  const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true } })
  const scopeAgentIds = [agent.id, ...getDownlineIds(allAgents, agent.id)]

  let policies: {
    id: string
    policyNumber: string
    carrier: string
    product: string
    premium: unknown
    status: string
    client: { name: string } | null
  }[] = []
  let loadError = false

  try {
    policies = await prisma.policy.findMany({
      where: { agentId: { in: scopeAgentIds } },
      include: { client: true },
    })
  } catch (error) {
    console.error('Policies query error', error)
    loadError = true
  }

  return (
    <Shell role="AGENT" userName={user?.name ?? ''}>
      <PageHeader title="Apólices" eyebrow="Carteira" description="Consulte o status, prêmio e detalhes das apólices da sua operação." />
      {loadError && (
        <ErrorBanner>Não foi possível carregar suas apólices agora. Tente atualizar a página.</ErrorBanner>
      )}
      <div className="mt-8 max-w-2xl">
        <EntityCardList>
          {policies.map((policy, i) => (
            <EntityCard key={policy.id} index={i} href={`/agent/policies/${policy.id}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{policy.client?.name ?? '—'}</p>
                <p className="truncate text-xs text-ink-muted">
                  <span className="font-mono">{policy.policyNumber}</span> · {policy.carrier} · {policy.product}
                </p>
              </div>
              <span className="shrink-0 font-mono font-medium tabular-nums text-ink">
                ${decimalToNumber(policy.premium).toFixed(2)}
              </span>
              <PolicyStatusPill status={policy.status} />
            </EntityCard>
          ))}
        </EntityCardList>
        {policies.length === 0 && !loadError && <EmptyState>Nenhuma apólice ainda.</EmptyState>}
      </div>
    </Shell>
  )
}
