import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { Shell } from '@/components/Shell'
import { PageTitle } from '@/components/PageTitle'
import { ErrorBanner } from '@/components/ErrorBanner'
import { Table, Thead, Th, Tr, Td, TdNum, EmptyState } from '@/components/Table'

export const dynamic = 'force-dynamic'

function safeDecimalToString(value: unknown): string {
  if (value == null) return '0.00'
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value.toFixed(2)
  const decimalValue = value as { toString?: () => string; toNumber?: () => number }
  if (typeof decimalValue.toNumber === 'function') {
    const num = decimalValue.toNumber()
    return Number.isFinite(num) ? num.toFixed(2) : '0.00'
  }
  if (typeof decimalValue.toString === 'function') return decimalValue.toString()
  return String(value)
}

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
    const subtotal = rows.reduce((sum, r) => sum + Number(safeDecimalToString(r.amount)), 0)
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
        a coluna &quot;Origem&quot; mostra qual agente vendeu a apólice.
      </p>
      <div className="mt-4">
        {byPeriod.map(({ period, rows, subtotal }) => (
          <div key={period} className="mb-6">
            <h2 className="mb-2 font-mono text-sm font-semibold text-ink-muted">{period}</h2>
            <Table>
              <Thead>
                <tr>
                  <Th>Apólice</Th>
                  <Th>Origem</Th>
                  <Th>Tipo</Th>
                  <Th className="text-right">Nível</Th>
                  <Th className="text-right">Valor</Th>
                </tr>
              </Thead>
              <tbody>
                {rows.map((record) => (
                  <Tr key={record.id}>
                    <Td className="font-mono">
                      {record.policy ? (
                        <a
                          href={`/agent/policies/${record.policy.id}`}
                          className="text-teal hover:text-teal-deep"
                        >
                          {record.policy.policyNumber}
                        </a>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td className="text-ink-muted">{record.policy?.agent.user.name ?? '—'}</Td>
                    <Td>{record.type === 'DIRECT' ? 'Direta' : 'Repasse'}</Td>
                    <TdNum className="text-ink-muted">{record.level}</TdNum>
                    <TdNum>${safeDecimalToString(record.amount)}</TdNum>
                  </Tr>
                ))}
                <Tr className="hover:bg-transparent">
                  <Td colSpan={4} className="text-right font-semibold text-ink-muted">
                    Subtotal do período
                  </Td>
                  <TdNum className="font-semibold">${subtotal.toFixed(2)}</TdNum>
                </Tr>
              </tbody>
            </Table>
          </div>
        ))}
        {records.length === 0 && !loadError && (
          <EmptyState>Nenhuma comissão registrada ainda.</EmptyState>
        )}
      </div>
    </Shell>
  )
}
