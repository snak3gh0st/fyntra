export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds, getUplineIds } from '@/lib/hierarchy'

export default async function HierarchyPage() {
  const agent = await getCurrentAgent()
  const allAgents = await prisma.agent.findMany({ include: { user: true } })
  const nameById = new Map(allAgents.map((a) => [a.id, a.user.name]))

  const uplineIds = getUplineIds(allAgents, agent.id)
  const downlineIds = getDownlineIds(allAgents, agent.id)

  return (
    <main>
      <h1>Minha hierarquia</h1>
      <h2>Acima de mim</h2>
      <ul>
        {uplineIds.map((id) => (
          <li key={id}>{nameById.get(id)}</li>
        ))}
      </ul>
      <h2>Abaixo de mim</h2>
      <ul>
        {downlineIds.map((id) => (
          <li key={id}>{nameById.get(id)}</li>
        ))}
      </ul>
    </main>
  )
}
