import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { updateAgentHierarchy } from './actions'
import { Shell } from '@/components/Shell'
import { Table, Thead, Th, Tr, Td } from '@/components/Table'
import { Select, Input } from '@/components/Field'
import { Button } from '@/components/Button'

export const dynamic = 'force-dynamic'

export default async function AgentsPage() {
  const session = await requireRole('ADMIN')
  const agents = await prisma.agent.findMany({ include: { user: true }, orderBy: { createdAt: 'asc' } })

  return (
    <Shell role="ADMIN" userName={session.user.name}>
      <h1 className="text-[1.5rem] font-semibold tracking-tight text-ink">Agentes e hierarquia</h1>
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
            {agents.map((agent) => (
              <Tr key={agent.id}>
                <Td className="font-medium">{agent.user.name}</Td>
                <Td className="text-ink-muted">{agent.rank}</Td>
                <Td>{agents.find((a) => a.id === agent.parentAgentId)?.user.name ?? '—'}</Td>
                <Td>
                  <form action={updateAgentHierarchy} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="agentId" value={agent.id} />
                    <Select name="parentAgentId" defaultValue={agent.parentAgentId ?? ''} className="w-40">
                      <option value="">— nenhum —</option>
                      {agents
                        .filter((a) => a.id !== agent.id)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.user.name}
                          </option>
                        ))}
                    </Select>
                    <Input name="rank" defaultValue={agent.rank} className="w-28" />
                    <Button type="submit" variant="secondary">
                      Salvar
                    </Button>
                  </form>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Shell>
  )
}
