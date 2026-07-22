import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { diffAuditFields } from '@/lib/audit-diff'
import { Shell } from '@/components/Shell'
import { PageHeader } from '@/components/PageHeader'
import { Table, Thead, Th, Tr, Td, EmptyState } from '@/components/Table'
import { RolePill } from '@/components/StatusPill'

export const dynamic = 'force-dynamic'

const ACTION_LABELS: Record<string, string> = {
  UPDATE_AGENT_HIERARCHY: 'Hierarquia atualizada',
  UPSERT_COMMISSION_PLAN: 'Plano de comissão salvo',
}

export default async function AuditPage() {
  const session = await requireRole('ADMIN')
  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <Shell role="ADMIN" userName={session.user.name}>
      <PageHeader title="Auditoria" eyebrow="Controle" description="Últimas 100 alterações de hierarquia e planos de comissão, com o valor antes e depois de cada mudança." />
      <div className="mt-8">
        <Table>
          <Thead>
            <tr>
              <Th>Data</Th>
              <Th>Quem</Th>
              <Th>Ação</Th>
              <Th>O que mudou</Th>
            </tr>
          </Thead>
          <tbody>
            {logs.map((log) => {
              const diffs = diffAuditFields(log.before, log.after)
              return (
                <Tr key={log.id}>
                  <Td className="whitespace-nowrap font-mono text-ink-muted">
                    {log.createdAt.toLocaleString('pt-BR')}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span>{log.user.name}</span>
                      <RolePill role={log.user.role} />
                    </div>
                  </Td>
                  <Td>{ACTION_LABELS[log.action] ?? log.action}</Td>
                  <Td>
                    {diffs.length === 0 ? (
                      <span className="text-ink-muted">—</span>
                    ) : (
                      <ul className="flex flex-col gap-0.5">
                        {diffs.map((d) => (
                          <li key={d.field} className="font-mono text-xs">
                            <span className="text-ink-muted">{d.field}:</span> {d.before} → {d.after}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
        {logs.length === 0 && <EmptyState>Nenhuma alteração registrada ainda.</EmptyState>}
      </div>
    </Shell>
  )
}
