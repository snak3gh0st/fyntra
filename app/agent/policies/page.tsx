import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'
import { Shell } from '@/components/Shell'
import { Table, Thead, Th, Tr, Td, TdNum, EmptyState } from '@/components/Table'
import { PolicyStatusPill } from '@/components/StatusPill'

export const dynamic = 'force-dynamic'

export default async function PoliciesPage() {
  const agent = await getCurrentAgent()
  const user = await prisma.user.findUnique({ where: { id: agent.userId } })
  const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true } })
  const scopeAgentIds = [agent.id, ...getDownlineIds(allAgents, agent.id)]

  const policies = await prisma.policy.findMany({
    where: { agentId: { in: scopeAgentIds } },
    include: { client: true },
  })

  return (
    <Shell role="AGENT" userName={user?.name ?? ''}>
      <h1 className="text-[1.5rem] font-semibold tracking-tight text-ink">Apólices</h1>
      <div className="mt-6">
        <Table>
          <Thead>
            <tr>
              <Th>Nº apólice</Th>
              <Th>Cliente</Th>
              <Th>Carrier</Th>
              <Th>Produto</Th>
              <Th>Prêmio</Th>
              <Th>Status</Th>
            </tr>
          </Thead>
          <tbody>
            {policies.map((policy) => (
              <Tr key={policy.id}>
                <Td className="font-mono">
                  <a href={`/agent/policies/${policy.id}`} className="text-teal hover:text-teal-deep">
                    {policy.policyNumber}
                  </a>
                </Td>
                <Td>{policy.client.name}</Td>
                <Td className="text-ink-muted">{policy.carrier}</Td>
                <Td className="text-ink-muted">{policy.product}</Td>
                <TdNum>${policy.premium.toString()}</TdNum>
                <Td>
                  <PolicyStatusPill status={policy.status} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {policies.length === 0 && <EmptyState>Nenhuma apólice ainda.</EmptyState>}
      </div>
    </Shell>
  )
}
