import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'

export const dynamic = 'force-dynamic'

export default async function PoliciesPage() {
  const agent = await getCurrentAgent()
  const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true } })
  const scopeAgentIds = [agent.id, ...getDownlineIds(allAgents, agent.id)]

  const policies = await prisma.policy.findMany({
    where: { agentId: { in: scopeAgentIds } },
    include: { client: true },
  })

  return (
    <main>
      <h1>Apólices</h1>
      <table>
        <thead>
          <tr>
            <th>Nº apólice</th>
            <th>Cliente</th>
            <th>Carrier</th>
            <th>Produto</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((policy) => (
            <tr key={policy.id}>
              <td>{policy.policyNumber}</td>
              <td>{policy.client.name}</td>
              <td>{policy.carrier}</td>
              <td>{policy.product}</td>
              <td>{policy.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
