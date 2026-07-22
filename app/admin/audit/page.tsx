import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { diffAuditFields } from '@/lib/audit-diff'
import { Shell } from '@/components/Shell'
import { PageHeader } from '@/components/PageHeader'
import { ContextPanel } from '@/components/ContextPanel'
import { AuditTable } from './AuditTable'

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

  const rows = logs.map((log) => ({
    id: log.id,
    createdAt: log.createdAt.toLocaleString('pt-BR'),
    userName: log.user.name,
    userRole: log.user.role,
    actionLabel: ACTION_LABELS[log.action] ?? log.action,
    diffs: diffAuditFields(log.before, log.after),
  }))

  return (
    <Shell role="ADMIN" userName={session.user.name}>
      <PageHeader title="Auditoria" eyebrow="Controle" description="Últimas 100 alterações de hierarquia e planos de comissão, com o valor antes e depois de cada mudança." />
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section>
          <AuditTable rows={rows} />
        </section>
        <ContextPanel eyebrow="Rastreabilidade" title="O que fica registrado"><p>Cada mudança mostra quem fez, quando fez e quais valores foram alterados.</p><div className="mt-5 border-t border-white/10 pt-4"><p className="font-mono text-2xl text-paper">{logs.length}</p><p className="mt-1 text-xs text-paper/45">eventos recentes</p></div></ContextPanel>
      </div>
    </Shell>
  )
}
