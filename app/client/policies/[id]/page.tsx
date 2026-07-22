export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { canAccessPolicy } from '@/lib/policy-access'
import { Shell } from '@/components/Shell'
import { PageTitle } from '@/components/PageTitle'
import { PolicyStatusPill } from '@/components/StatusPill'
import { EmptyState } from '@/components/Table'

export default async function ClientPolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireRole('CLIENT', 'ADMIN')

  const policy = await prisma.policy.findUnique({
    where: { id },
    include: { documents: true },
  })
  if (!policy) notFound()

  let allowed = session.user.role === 'ADMIN'
  if (session.user.role === 'CLIENT') {
    const client = await prisma.client.findUnique({ where: { userId: session.user.id } })
    if (!client) notFound()
    allowed = canAccessPolicy({ role: 'CLIENT', clientId: client.id }, policy)
  }
  if (!allowed) notFound()

  return (
    <Shell role="CLIENT" userName={session.user.name}>
      <Link href="/client" className="text-sm font-semibold text-teal hover:text-teal-deep">
        ← Voltar
      </Link>
      <div className="mt-3 border-b border-border-steel pb-6">
        <PageTitle>Apólice {policy.policyNumber}</PageTitle>
        <p className="mt-2 text-sm text-ink-muted">Resumo da sua cobertura e documentos disponíveis.</p>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border-steel bg-border-steel sm:grid-cols-4">
        <div className="bg-panel px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Seguradora</p>
          <p className="text-sm text-ink">{policy.carrier}</p>
        </div>
        <div className="bg-panel px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Produto</p>
          <p className="text-sm text-ink">{policy.product}</p>
        </div>
        <div className="bg-panel px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Prêmio</p>
          <p className="font-mono text-sm text-ink">${policy.premium.toString()}</p>
        </div>
        <div className="bg-panel px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Status</p>
          <PolicyStatusPill status={policy.status} />
        </div>
      </div>

      <section className="mt-10">
      <h2 className="mb-3 text-base font-semibold text-ink">Documentos</h2>
      <ul className="divide-y divide-border-steel rounded-lg border border-border-steel bg-panel">
        {policy.documents.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <a href={`/api/documents/${doc.id}`} target="_blank" className="text-teal hover:text-teal-deep">
              {doc.filename}
            </a>
            <span className="text-ink-muted">{(doc.sizeBytes / 1024).toFixed(0)} KB</span>
          </li>
        ))}
      </ul>
      {policy.documents.length === 0 && <EmptyState>Nenhum documento ainda.</EmptyState>}
      </section>
    </Shell>
  )
}
