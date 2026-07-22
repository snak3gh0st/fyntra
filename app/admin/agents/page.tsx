import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { buildHierarchyOrder } from '@/lib/hierarchy'
import { Shell } from '@/components/Shell'
import { PageTitle } from '@/components/PageTitle'
import { Table, Thead, Th, Tr, Td } from '@/components/Table'
import { HierarchyRow } from './HierarchyRow'

export const dynamic = 'force-dynamic'

export default async function AgentsPage() {
  const session = await requireRole('ADMIN')
  const agents = await prisma.agent.findMany({ include: { user: true } })
  const byId = new Map(agents.map((a) => [a.id, a]))
  const order = buildHierarchyOrder(agents.map((a) => ({ id: a.id, parentAgentId: a.parentAgentId })))
  const parentOptions = agents.map((a) => ({ id: a.id, name: a.user.name }))

  return (
    <Shell role="ADMIN" userName={session.user.name}>
      <PageTitle>Agentes e hierarquia</PageTitle>
      <div className="mt-6">
        <Table>
          <Thead>
            <tr>
              <Th>Nome</Th>
              <Th>Rank</Th>
              <Th>Reporta para</Th>
              <Th>Ação</Th>
            </tr>
          </Thead>
          <tbody>
            {order.map(({ id, depth }) => {
              const agent = byId.get(id)!
              return (
                <Tr key={agent.id}>
                  <Td className="font-medium">
                    <span style={{ paddingLeft: `${depth * 1.25}rem` }}>
                      {depth > 0 && <span className="mr-1.5 text-ink-muted">└</span>}
                      {agent.user.name}
                    </span>
                  </Td>
                  <Td className="text-ink-muted">{agent.rank}</Td>
                  <Td>{byId.get(agent.parentAgentId ?? '')?.user.name ?? '—'}</Td>
                  <Td>
                    <HierarchyRow
                      agentId={agent.id}
                      parentAgentId={agent.parentAgentId}
                      rank={agent.rank}
                      parentOptions={parentOptions.filter((p) => p.id !== agent.id)}
                    />
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
      </div>
    </Shell>
  )
}
