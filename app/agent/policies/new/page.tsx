import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { Shell } from '@/components/Shell'
import { PageHeader } from '@/components/PageHeader'
import { ContextPanel } from '@/components/ContextPanel'

export const dynamic = 'force-dynamic'

export default async function NewPolicyPage() {
  const agent = await getCurrentAgent()
  const user = await prisma.user.findUnique({ where: { id: agent.userId } })

  return (
    <Shell role="AGENT" userName={user?.name ?? ''}>
      <PageHeader
        title="Apólices não são criadas manualmente"
        eyebrow="Como funciona"
        description="Uma apólice representa um contrato real — ela surge da emissão de um caso ou de uma importação de histórico autorizada."
      >
        <Link
          href="/agent/policies"
          className="inline-flex min-h-10 items-center rounded-md border border-teal px-4 py-2.5 text-sm font-semibold text-teal transition-[background-color,border-color,color,transform] duration-150 hover:border-teal-deep hover:bg-teal-pale focus-visible:ring-[3px] focus-visible:ring-teal-pale focus-visible:outline-none"
        >
          ← Voltar
        </Link>
      </PageHeader>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="max-w-3xl rounded-md border border-border-steel bg-paper p-6">
          <h2 className="text-base font-semibold text-ink">Por onde uma apólice aparece</h2>
          <ol className="mt-4 space-y-4 text-sm text-ink-muted">
            <li>
              <strong className="text-ink">1. Abra um caso.</strong> Registre o prospect e conduza a venda pelas etapas até a emissão.
              A apólice é criada quando o caso é emitido.
            </li>
            <li>
              <strong className="text-ink">2. Importação de histórico.</strong> Apólices já existentes entram por importação
              autorizada (feita pela administração), preservando a origem e o número original.
            </li>
          </ol>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/agent/cases/new"
              className="inline-flex min-h-10 items-center rounded-md bg-teal px-4 py-2.5 text-sm font-semibold text-paper transition-[background-color] duration-150 hover:bg-teal-deep"
            >
              Novo caso
            </Link>
            <Link
              href="/agent/cases"
              className="inline-flex min-h-10 items-center rounded-md border border-teal px-4 py-2.5 text-sm font-semibold text-teal transition-[background-color,border-color] duration-150 hover:border-teal-deep hover:bg-teal-pale"
            >
              Ver meus casos
            </Link>
          </div>
        </div>
        <ContextPanel eyebrow="Por quê" title="Origem controlada">
          <p>Impedir a criação manual garante que toda apólice tenha um caso ou uma importação por trás — sem números soltos.</p>
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-paper/45">Importação</p>
            <p className="mt-2 text-sm text-ink-muted">A importação de histórico é feita pela administração em “Importar dados”.</p>
          </div>
        </ContextPanel>
      </div>
    </Shell>
  )
}
