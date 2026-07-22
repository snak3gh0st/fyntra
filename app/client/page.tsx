export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { Shell } from '@/components/Shell'
import { PageTitle } from '@/components/PageTitle'
import { Table, Thead, Th, Tr, Td, TdNum, EmptyState } from '@/components/Table'
import { PolicyStatusPill } from '@/components/StatusPill'

export default async function ClientPortalPage() {
  const session = await requireRole('CLIENT', 'ADMIN')

  const client = await prisma.client.findUnique({ where: { userId: session.user.id } })
  if (!client) {
    return (
      <Shell role="CLIENT" userName={session.user.name}>
        <PageTitle>Minhas apólices</PageTitle>
        <p className="mt-4 text-sm text-ink-muted">
          Não encontramos uma conta de cliente vinculada a este login. Fale com seu agente para
          verificar seu cadastro.
        </p>
      </Shell>
    )
  }

  const policies = await prisma.policy.findMany({ where: { clientId: client.id } })

  return (
    <Shell role="CLIENT" userName={session.user.name}>
      <PageTitle>Minhas apólices</PageTitle>
      <div className="mt-6">
        <Table>
          <Thead>
            <tr>
              <Th>Seguradora</Th>
              <Th className="hidden sm:table-cell">Produto</Th>
              <Th>Nº apólice</Th>
              <Th className="text-right">Prêmio</Th>
              <Th>Status</Th>
            </tr>
          </Thead>
          <tbody>
            {policies.map((policy) => (
              <Tr key={policy.id}>
                <Td className="font-medium">
                  <Link href={`/client/policies/${policy.id}`} className="text-ink hover:text-teal">
                    {policy.carrier}
                  </Link>
                </Td>
                <Td className="hidden text-ink-muted sm:table-cell">{policy.product}</Td>
                <Td className="font-mono text-ink-muted">{policy.policyNumber}</Td>
                <TdNum>${policy.premium.toString()}</TdNum>
                <Td>
                  <PolicyStatusPill status={policy.status} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {policies.length === 0 && (
          <EmptyState>
            Nenhuma apólice encontrada. Se você acredita que isso é um erro, fale com seu agente.
          </EmptyState>
        )}
      </div>
    </Shell>
  )
}
