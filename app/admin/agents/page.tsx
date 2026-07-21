import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { updateAgentHierarchy } from './actions'

export const dynamic = 'force-dynamic'

export default async function AgentsPage() {
  await requireRole('ADMIN')
  const agents = await prisma.agent.findMany({ include: { user: true }, orderBy: { createdAt: 'asc' } })

  return (
    <main>
      <h1>Agentes e hierarquia</h1>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Rank</th>
            <th>Reporta para</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr key={agent.id}>
              <td>{agent.user.name}</td>
              <td>{agent.rank}</td>
              <td>{agents.find((a) => a.id === agent.parentAgentId)?.user.name ?? '—'}</td>
              <td>
                <form action={updateAgentHierarchy}>
                  <input type="hidden" name="agentId" value={agent.id} />
                  <select name="parentAgentId" defaultValue={agent.parentAgentId ?? ''}>
                    <option value="">— nenhum —</option>
                    {agents
                      .filter((a) => a.id !== agent.id)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.user.name}
                        </option>
                      ))}
                  </select>
                  <input name="rank" defaultValue={agent.rank} />
                  <button type="submit">Salvar</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
