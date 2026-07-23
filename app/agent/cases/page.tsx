import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'
import { decimalToNumber } from '@/lib/decimal'
import { Shell } from '@/components/Shell'
import { PageHeader } from '@/components/PageHeader'
import { ErrorBanner } from '@/components/ErrorBanner'
import { ContextPanel } from '@/components/ContextPanel'
import { CasesBoard } from './CasesBoard'
import type { CaseStage } from '@/lib/case-workflow'

export const dynamic = 'force-dynamic'

const TERMINAL: CaseStage[] = ['PLACED', 'DECLINED', 'WITHDRAWN']

export default async function CasesPage() {
  const agent = await getCurrentAgent()
  const user = await prisma.user.findUnique({ where: { id: agent.userId } })
  const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true } })
  const scopeAgentIds = [agent.id, ...getDownlineIds(allAgents, agent.id)]

  let cases: Awaited<ReturnType<typeof loadCases>> = []
  let loadError = false
  try {
    cases = await loadCases(scopeAgentIds)
  } catch (error) {
    console.error('Cases query error', error)
    loadError = true
  }

  const boardCases = cases
    .map((c) => ({
      id: c.id,
      stage: c.stage,
      prospectName: `${c.prospect.firstName} ${c.prospect.lastName}`.trim(),
      agentName: c.assignedAgent.user?.name ?? '—',
      productType: c.productType ?? 'UNDECIDED',
      objective: c.objective ?? '—',
      targetCoverage: c.targetCoverage != null ? decimalToNumber(c.targetCoverage).toFixed(2) : null,
      monthlyBudget: c.monthlyBudget != null ? decimalToNumber(c.monthlyBudget).toFixed(2) : null,
      updatedAt: c.updatedAt.toISOString(),
    }))
    .sort((a, b) => {
      const at = TERMINAL.includes(a.stage) ? 1 : 0
      const bt = TERMINAL.includes(b.stage) ? 1 : 0
      if (at !== bt) return at - bt
      return b.updatedAt.localeCompare(a.updatedAt)
    })

  return (
    <Shell role="AGENT" userName={user?.name ?? ''}>
      <PageHeader title="Casos" eyebrow="Fluxo de vendas" description="Sua fila de trabalho: do prospect à apólice emitida.">
        <Link
          href="/agent/cases/new"
          className="inline-flex min-h-10 items-center rounded-md bg-teal px-4 py-2.5 text-sm font-semibold text-paper transition-[background-color,transform] duration-150 hover:bg-teal-deep focus-visible:ring-[3px] focus-visible:ring-teal-pale focus-visible:outline-none"
        >
          Novo caso
        </Link>
        <span className="inline-flex rounded-full bg-teal-pale px-3 py-1.5 text-xs font-semibold text-teal">{boardCases.length} casos</span>
      </PageHeader>
      {loadError && <ErrorBanner>Não foi possível carregar seus casos agora. Tente atualizar a página.</ErrorBanner>}
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="max-w-5xl">
          {!loadError && <CasesBoard cases={boardCases} />}
        </div>
        <ContextPanel eyebrow="Leitura rápida" title="Como usar a fila">
          <p>Casos ativos aparecem primeiro. Use os filtros para focar na etapa que precisa de ação.</p>
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-paper/45">Apólice</p>
            <p className="mt-2">A apólice só existe após a emissão do caso ou importação de histórico.</p>
          </div>
        </ContextPanel>
      </div>
    </Shell>
  )
}

function loadCases(scopeAgentIds: string[]) {
  return prisma.insuranceCase.findMany({
    where: { assignedAgentId: { in: scopeAgentIds } },
    select: {
      id: true,
      stage: true,
      objective: true,
      productType: true,
      targetCoverage: true,
      monthlyBudget: true,
      updatedAt: true,
      prospect: { select: { firstName: true, lastName: true } },
      assignedAgent: { select: { user: { select: { name: true } } } },
    },
  })
}
