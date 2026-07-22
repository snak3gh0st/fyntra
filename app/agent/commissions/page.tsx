import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { decimalToNumber } from '@/lib/decimal'
import { Shell } from '@/components/Shell'
import { PageHeader } from '@/components/PageHeader'
import { ErrorBanner } from '@/components/ErrorBanner'
import { EmptyState } from '@/components/Table'
import { EntityCard, EntityCardList } from '@/components/EntityCard'
import { ContextPanel } from '@/components/ContextPanel'

export const dynamic = 'force-dynamic'

type Record_ = {
  id: string
  period: string
  type: string
  level: number
  amount: unknown
  policy: { id: string; policyNumber: string; agent: { user: { name: string } } } | null
}

export default async function CommissionsPage() {
  const agent = await getCurrentAgent()
  const user = await prisma.user.findUnique({ where: { id: agent.userId } })
  let records: Record_[] = []
  let loadError = false

  try {
    records = await prisma.commissionRecord.findMany({
      where: { agentId: agent.id },
      include: { policy: { include: { agent: { include: { user: true } } } } },
      orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
    })
  } catch (error) {
    console.error('Commissions query error', error)
    loadError = true
  }

  const periods = Array.from(new Set(records.map((r) => r.period)))
  const byPeriod = periods.map((period) => {
    const rows = records.filter((r) => r.period === period)
    const subtotal = rows.reduce((sum, r) => sum + decimalToNumber(r.amount), 0)
    return { period, rows, subtotal }
  })

  return (
    <Shell role="AGENT" userName={user?.name ?? ''}>
      <PageHeader title="Extrato de comissões" eyebrow="Financeiro" description="Nível 0 é sua venda direta. Nível 1+ é repasse de uma venda da sua downline. A origem mostra quem vendeu a apólice.">
        <span className="inline-flex rounded-full bg-gold-pale px-3 py-1.5 text-xs font-semibold text-gold-ink">{records.length} lançamentos</span>
      </PageHeader>
      {loadError && (
        <ErrorBanner>
          Não foi possível carregar seu extrato agora. Tente atualizar a página.
        </ErrorBanner>
      )}
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="max-w-4xl">
        {byPeriod.map(({ period, rows, subtotal }) => (
          <div key={period} className="mb-6">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-mono text-sm font-semibold text-ink-muted">{period}</h2>
              <span className="font-mono text-xs text-ink-muted">
                Subtotal <span className="font-semibold text-ink">${subtotal.toFixed(2)}</span>
              </span>
            </div>
            <EntityCardList>
              {rows.map((record, i) => (
                <EntityCard key={record.id} index={i}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {record.policy ? (
                        <Link
                          href={`/agent/policies/${record.policy.id}`}
                          className="font-mono hover:text-teal"
                        >
                          {record.policy.policyNumber}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {record.policy?.agent.user.name ?? '—'} · {record.type === 'DIRECT' ? 'Direta' : 'Repasse'} ·
                      Nível {record.level}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono font-medium tabular-nums text-ink">
                    ${decimalToNumber(record.amount).toFixed(2)}
                  </span>
                </EntityCard>
              ))}
            </EntityCardList>
          </div>
        ))}
        {records.length === 0 && !loadError && (
          <EmptyState>Nenhuma comissão registrada ainda.</EmptyState>
        )}
      </div>
      <ContextPanel eyebrow="Como ler" title="Seu extrato">
        <p>Cada lançamento mostra o período, a origem da venda e o nível da comissão dentro da sua hierarquia.</p>
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-paper/45">Nível 0</p>
          <p className="mt-2">Venda direta feita por você.</p>
        </div>
      </ContextPanel>
      </div>
    </Shell>
  )
}
