import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'
import { Shell } from '@/components/Shell'
import { PageHeader } from '@/components/PageHeader'
import { ContextPanel } from '@/components/ContextPanel'
import { NewPolicyForm } from '../NewPolicyForm'

export const dynamic = 'force-dynamic'

export default async function NewPolicyPage() {
  const agent = await getCurrentAgent()
  const user = await prisma.user.findUnique({ where: { id: agent.userId } })

  const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true } })
  const scopeAgentIds = [agent.id, ...getDownlineIds(allAgents, agent.id)]

  const clients = await prisma.client.findMany({
    where: { assignedAgentId: { in: scopeAgentIds } },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  return (
    <Shell role="AGENT" userName={user?.name ?? ''}>
      <PageHeader
        title="Nova apólice"
        eyebrow="Carteira"
        description="Cadastre uma apólice no padrão atual da operação."
      >
        <Link
          href="/agent/policies"
          className="inline-flex min-h-10 items-center rounded-md border border-teal px-4 py-2.5 text-sm font-semibold text-teal transition-[background-color,border-color,color,transform] duration-150 hover:border-teal-deep hover:bg-teal-pale focus-visible:ring-[3px] focus-visible:ring-teal-pale focus-visible:outline-none"
        >
          ← Voltar
        </Link>
      </PageHeader>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="max-w-5xl">
          <NewPolicyForm
            clients={clients.map((client) => ({
              id: client.id,
              name: client.name,
              email: client.email,
            }))}
          />
        </div>
        <ContextPanel eyebrow="Dica rápida" title="O que preencher">
          <p>Selecione um cliente da sua carteira para reaproveitar dados existentes.</p>
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-paper/45">Novo cliente</p>
            <p className="mt-2 text-sm text-ink-muted">
              Se o cliente não estiver listado, escolha “Novo cliente” e informe nome e e-mail (opcional).
            </p>
          </div>
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-paper/45">Status</p>
            <p className="mt-2 text-sm text-ink-muted">A data de início e último pagamento são opcionais.</p>
          </div>
        </ContextPanel>
      </div>
    </Shell>
  )
}
