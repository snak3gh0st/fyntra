import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { Shell } from '@/components/Shell'
import { Table, Thead, Th, Tr, Td, TdNum, EmptyState } from '@/components/Table'

export const dynamic = 'force-dynamic'

export default async function CommissionsPage() {
  const agent = await getCurrentAgent()
  const user = await prisma.user.findUnique({ where: { id: agent.userId } })
  const records = await prisma.commissionRecord.findMany({
    where: { agentId: agent.id },
    include: { policy: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <Shell role="AGENT" userName={user?.name ?? ''}>
      <h1 className="text-[1.5rem] font-semibold tracking-tight text-ink">Extrato de comissões</h1>
      <div className="mt-6">
        <Table>
          <Thead>
            <tr>
              <Th>Período</Th>
              <Th>Apólice</Th>
              <Th>Tipo</Th>
              <Th>Nível</Th>
              <Th className="text-right">Valor</Th>
            </tr>
          </Thead>
          <tbody>
            {records.map((record) => (
              <Tr key={record.id}>
                <Td className="font-mono">{record.period}</Td>
                <Td className="font-mono">{record.policy.policyNumber}</Td>
                <Td>{record.type === 'DIRECT' ? 'Direta' : 'Override'}</Td>
                <Td className="text-ink-muted">{record.level}</Td>
                <TdNum>${record.amount.toString()}</TdNum>
              </Tr>
            ))}
          </tbody>
        </Table>
        {records.length === 0 && <EmptyState>Nenhuma comissão registrada ainda.</EmptyState>}
      </div>
    </Shell>
  )
}
