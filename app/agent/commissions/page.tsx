import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'

export const dynamic = 'force-dynamic'

export default async function CommissionsPage() {
  const agent = await getCurrentAgent()
  const records = await prisma.commissionRecord.findMany({
    where: { agentId: agent.id },
    include: { policy: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main>
      <h1>Extrato de comissões</h1>
      <table>
        <thead>
          <tr>
            <th>Período</th>
            <th>Apólice</th>
            <th>Tipo</th>
            <th>Nível</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td>{record.period}</td>
              <td>{record.policy.policyNumber}</td>
              <td>{record.type === 'DIRECT' ? 'Direta' : 'Override'}</td>
              <td>{record.level}</td>
              <td>{record.amount.toString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
