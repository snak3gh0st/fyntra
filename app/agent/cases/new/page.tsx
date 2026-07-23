import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { Shell } from '@/components/Shell'
import { PageHeader } from '@/components/PageHeader'
import { ContextPanel } from '@/components/ContextPanel'
import { NewCaseForm } from './NewCaseForm'

export const dynamic = 'force-dynamic'

export default async function NewCasePage() {
  const agent = await getCurrentAgent()
  const user = await prisma.user.findUnique({ where: { id: agent.userId } })

  return (
    <Shell role="AGENT" userName={user?.name ?? ''}>
      <PageHeader
        title="Novo caso"
        eyebrow="Fluxo de vendas"
        description="Registre um prospect e abra o caso que conduzirá a venda até a apólice."
      >
        <Link
          href="/agent/cases"
          className="inline-flex min-h-10 items-center rounded-md border border-teal px-4 py-2.5 text-sm font-semibold text-teal transition-[background-color,border-color,color,transform] duration-150 hover:border-teal-deep hover:bg-teal-pale focus-visible:ring-[3px] focus-visible:ring-teal-pale focus-visible:outline-none"
        >
          ← Voltar
        </Link>
      </PageHeader>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="max-w-5xl">
          <NewCaseForm />
        </div>
        <ContextPanel eyebrow="Como funciona" title="Do prospect à apólice">
          <p>O caso começa como <strong>Lead</strong> e avança pelas etapas de venda até a emissão.</p>
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-paper/45">Apólice</p>
            <p className="mt-2 text-sm text-ink-muted">
              Nenhuma apólice é criada aqui. Ela aparece quando o caso é emitido ou por importação autorizada de histórico.
            </p>
          </div>
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-paper/45">Seguradora</p>
            <p className="mt-2 text-sm text-ink-muted">National Life Group é a primeira seguradora do fluxo.</p>
          </div>
        </ContextPanel>
      </div>
    </Shell>
  )
}
