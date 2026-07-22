import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'
import { decimalToNumber } from '@/lib/decimal'
import { Shell } from '@/components/Shell'
import { PageHeader } from '@/components/PageHeader'
import { ErrorBanner } from '@/components/ErrorBanner'
import { ContextPanel } from '@/components/ContextPanel'
import { PoliciesList } from './PoliciesList'

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
      <PageHeader title="Apólices" eyebrow="Carteira" description="Consulte o status, prêmio e detalhes das apólices da sua operação.">
        <span className="inline-flex rounded-full bg-teal-pale px-3 py-1.5 text-xs font-semibold text-teal">{policies.length} apólices</span>
      </PageHeader>
      {loadError && (
        <ErrorBanner>Não foi possível carregar suas apólices agora. Tente atualizar a página.</ErrorBanner>
      )}
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="max-w-5xl">
        {!loadError && (
          <PoliciesList
            policies={policies.map((p) => ({
              id: p.id,
              policyNumber: p.policyNumber,
              carrier: p.carrier,
              product: p.product,
              premium: decimalToNumber(p.premium).toFixed(2),
              status: p.status,
              clientName: p.client?.name ?? '—',
            }))}
          />
        )}
      </div>
      <ContextPanel eyebrow="Leitura rápida" title="O que importa aqui">
        <p>O status mostra a situação atual da apólice. O prêmio é o valor recorrente registrado para ela.</p>
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-paper/45">Detalhes</p>
          <p className="mt-2">Selecione uma linha para abrir a apólice completa e seus documentos.</p>
        </div>
      </ContextPanel>
      </div>
    </Shell>
  )
}
