import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { decimalToNumber } from '@/lib/decimal'
import { Shell } from '@/components/Shell'
import { PageTitle } from '@/components/PageTitle'
import { ErrorBanner } from '@/components/ErrorBanner'
import { EmptyState } from '@/components/Table'
import { EntityCard, EntityCardList } from '@/components/EntityCard'

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
      <PageTitle>Extrato de comissões</PageTitle>
      {loadError && (
        <ErrorBanner>
          Não foi possível carregar seu extrato agora. Tente atualizar a página.
        </ErrorBanner>
      )}
      <p className="mt-2 text-sm text-ink-muted">
        Nível 0 é sua venda direta. Nível 1+ é repasse (override) de uma venda da sua downline —
        &quot;Origem&quot; mostra qual agente vendeu a apólice.
      </p>
      <div className="mt-4 max-w-2xl">
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
    </Shell>
  )
}
