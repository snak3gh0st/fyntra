export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { Shell } from '@/components/Shell'
import { Table, Thead, Th, Tr, Td, TdNum, EmptyState } from '@/components/Table'
import { PolicyStatusPill } from '@/components/StatusPill'

export default async function ClientPortalPage() {
  const session = await requireRole('CLIENT', 'ADMIN')

  const client = await prisma.client.findUnique({ where: { userId: session.user.id } })
  if (!client) throw new Error('Signed-in user has no Client record')

  const policies = await prisma.policy.findMany({ where: { clientId: client.id } })

  return (
    <Shell role="CLIENT" userName={session.user.name}>
      <h1 className="text-[1.5rem] font-semibold tracking-tight text-ink">Minhas apólices</h1>
      <div className="mt-6">
        <Table>
          <Thead>
            <tr>
              <Th>Nº apólice</Th>
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
                  <a href={`/client/policies/${policy.id}`} className="text-teal hover:text-teal-deep">
                    {policy.policyNumber}
                  </a>
                </Td>
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
        {policies.length === 0 && <EmptyState>Nenhuma apólice encontrada.</EmptyState>}
      </div>
    </Shell>
  )
}
