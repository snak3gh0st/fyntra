import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { Shell } from '@/components/Shell'
import { PageHeader } from '@/components/PageHeader'
import { ContextPanel } from '@/components/ContextPanel'
import { NewIllustrationForm } from '../NewIllustrationForm'

export const dynamic = 'force-dynamic'

export default async function NewIllustrationPage() {
  const agent = await getCurrentAgent()
  const user = await prisma.user.findUnique({ where: { id: agent.userId } })

  return (
    <Shell role="AGENT" userName={user?.name ?? ''}>
      <PageHeader
        title="Nova ilustração"
        eyebrow="Carteira"
        description="Crie uma solicitação de ilustração com dados do prospect."
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
          <NewIllustrationForm />
        </div>
        <ContextPanel eyebrow="Dica rápida" title="O que enviar">
          <p>Informe o nome, sobrenome, data de nascimento, idade e situação de tabagismo.</p>
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-paper/45">Tabagismo</p>
            <p className="mt-2 text-sm text-ink-muted">Use “Não fumante”, “Fumante” ou “Ex-fumante” para manter consistência de cotação.</p>
          </div>
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-paper/45">Integração</p>
            <p className="mt-2 text-sm text-ink-muted">
              O botão é construído a partir de <span className="font-mono">ILLUSTRATION_REQUEST_URL</span>.
            </p>
          </div>
        </ContextPanel>
      </div>
    </Shell>
  )
}

