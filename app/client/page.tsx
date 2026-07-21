export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'

export default async function ClientPortalPage() {
  const session = await requireRole('CLIENT', 'ADMIN')

  const client = await prisma.client.findUnique({ where: { userId: session.user.id } })
  if (!client) throw new Error('Signed-in user has no Client record')

  const policies = await prisma.policy.findMany({ where: { clientId: client.id } })

  return (
    <main>
      <h1>Minhas apólices</h1>
      <table>
        <thead>
          <tr>
            <th>Nº apólice</th>
            <th>Carrier</th>
            <th>Produto</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((policy) => (
            <tr key={policy.id}>
              <td>{policy.policyNumber}</td>
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
