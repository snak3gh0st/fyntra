import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'
import { Shell } from '@/components/Shell'
import { PageTitle } from '@/components/PageTitle'
import { ErrorBanner } from '@/components/ErrorBanner'
import { Table, Thead, Th, Tr, Td, TdNum, EmptyState } from '@/components/Table'
import { PolicyStatusPill } from '@/components/StatusPill'

export const dynamic = 'force-dynamic'

function safeDecimalToString(value: unknown): string {
  if (value == null) return '0.00'
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value.toFixed(2)
  const decimalValue = value as { toString?: () => string; toNumber?: () => number }
  if (typeof decimalValue.toNumber === 'function') {
    const num = decimalValue.toNumber()
    return Number.isFinite(num) ? num.toFixed(2) : '0.00'
  }
  if (typeof decimalValue.toString === 'function') return decimalValue.toString()
  return String(value)
}

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
      <PageTitle>Apólices</PageTitle>
      {loadError && (
        <ErrorBanner>Não foi possível carregar suas apólices agora. Tente atualizar a página.</ErrorBanner>
      )}
      <div className="mt-6">
        <Table>
          <Thead>
            <tr>
              <Th>Nº apólice</Th>
              <Th>Cliente</Th>
              <Th className="hidden sm:table-cell">Carrier</Th>
              <Th className="hidden sm:table-cell">Produto</Th>
              <Th className="text-right">Prêmio</Th>
              <Th>Status</Th>
            </tr>
          </Thead>
          <tbody>
            {policies.map((policy) => (
              <Tr key={policy.id}>
                <Td className="font-mono">
                  <Link href={`/agent/policies/${policy.id}`} className="text-teal hover:text-teal-deep">
                    {policy.policyNumber}
                  </Link>
                </Td>
                <Td>{policy.client?.name ?? '—'}</Td>
                <Td className="hidden text-ink-muted sm:table-cell">{policy.carrier}</Td>
                <Td className="hidden text-ink-muted sm:table-cell">{policy.product}</Td>
                <TdNum>${safeDecimalToString(policy.premium)}</TdNum>
                <Td>
                  <PolicyStatusPill status={policy.status} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {policies.length === 0 && !loadError && <EmptyState>Nenhuma apólice ainda.</EmptyState>}
      </div>
    </Shell>
  )
}
