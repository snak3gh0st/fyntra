# Comparação de Agentes (Admin) — Design

## Contexto

Quarto de cinco sub-projetos da fase de "análise de apólices" (ordem
acordada: 1. Detalhe de apólice → 2. Dashboard de carteira → 3. Alertas de
risco → 4. Comparação entre agentes (admin) → 5. Motor de illustration
Term/Final Expense). Este spec cobre só o item 4.

Hoje o admin não tem nenhuma visão agregada de produção entre agentes — só
`/admin/agents` (gestão de hierarquia/rank) e `/admin/commission-plans`
(configuração de planos). Não há como comparar quem vendeu mais, gerou mais
comissão, ou está parado, mês a mês.

## Escopo

Nova página `/admin/production` ("Produção por agente"), papel ADMIN.
Ranking mês a mês da produção **direta** de cada agente (sem rollup de
downline/equipe — cada linha é só o próprio agente). Fora de escopo:
comparação de equipe (agente + downline agregados), intervalo de datas
livre, exportação, drill-down por clique.

## Seletor de período

Dropdown com os meses (`YYYY-MM`) que existem em `CommissionRecord.period`,
mais o mês corrente (formato `YYYY-MM` da data atual) se ainda não houver
nenhum registro de comissão para ele — união das duas fontes, ordenada
decrescente, sem duplicar o mês corrente caso ele já exista na lista.
Default: o mês mais recente da lista.

Implementação: `<select>` num `<form>` GET que recarrega a página com
`?period=YYYY-MM` — server component puro, sem estado client-side (mesmo
padrão de formulário simples já usado em `app/admin/agents/page.tsx`).

## Tabela de ranking

Uma linha por agente — **todos** os agentes existentes, mesmo os sem
nenhuma produção no mês selecionado (aparecem com zeros, pra deixar visível
quem não produziu). Ordenada por comissão total decrescente, sem
reordenação interativa por outras colunas (YAGNI).

Colunas:
- **Nome do agente**
- **Apólices vendidas**: `count` de `Policy` com `agentId` = o agente e
  `createdAt` dentro do mês selecionado (`[start, end)` do mês, ver seção
  de limites abaixo).
- **Prêmio total**: `sum(Policy.premium)` das mesmas apólices (mesmo filtro
  de `createdAt` no mês).
- **Comissão total**: `sum(CommissionRecord.amount)` com `agentId` = o
  agente e `period` = o mês selecionado (string `YYYY-MM`, comparação
  direta — sem parsing de data). Inclui overrides que esse agente recebeu
  da própria downline, já que `CommissionRecord.agentId` é sempre o
  beneficiário do valor — mesmo cálculo já usado no dashboard do agente em
  `app/agent/page.tsx`.

## Camada de dados

Novo arquivo `lib/agent-production.ts`, duas peças:

### 1. `getMonthBounds(period: string): { start: Date; end: Date }`

Função pura: parseia `"YYYY-MM"` pros limites `[start, end)` do mês (`start`
= dia 1 00:00 do mês, `end` = dia 1 00:00 do mês seguinte). Usada para
filtrar `Policy.createdAt` na query. Testável sem banco.

### 2. `buildProductionRanking(agents, policyStats, commissionStats): ProductionRow[]`

Função pura que junta três listas já buscadas/agrupadas via Prisma:

```ts
type ProductionRow = {
  agentId: string
  agentName: string
  policyCount: number
  premiumTotal: number
  commissionTotal: number
}

function buildProductionRanking(
  agents: { id: string; name: string }[],
  policyStats: { agentId: string; count: number; premiumSum: number }[],
  commissionStats: { agentId: string; sum: number }[],
): ProductionRow[]
```

Junta por `agentId` (agentes sem entrada em `policyStats`/`commissionStats`
recebem `0`), retorna ordenado por `commissionTotal` decrescente. Testável
sem banco, mesmo padrão de `getRiskAlerts`/`bucketByMonth`.

## Página (`app/admin/production/page.tsx`)

Duas queries Prisma agrupadas, filtradas pelo período:

```ts
const bounds = getMonthBounds(period)
const [agents, policyStats, commissionStats] = await Promise.all([
  prisma.agent.findMany({ include: { user: true } }),
  prisma.policy.groupBy({
    by: ['agentId'],
    where: { createdAt: { gte: bounds.start, lt: bounds.end } },
    _count: true,
    _sum: { premium: true },
  }),
  prisma.commissionRecord.groupBy({
    by: ['agentId'],
    where: { period },
    _sum: { amount: true },
  }),
])
const rows = buildProductionRanking(
  agents.map((a) => ({ id: a.id, name: a.user.name })),
  policyStats.map((p) => ({ agentId: p.agentId, count: p._count, premiumSum: p._sum.premium?.toNumber() ?? 0 })),
  commissionStats.map((c) => ({ agentId: c.agentId, sum: c._sum.amount?.toNumber() ?? 0 })),
)
```

Renderiza numa `Table` (mesmo componente já usado em `/admin/agents`).

## Fora de escopo

- Comparação de equipe (agente + downline agregados) — cada linha é só
  produção direta.
- Intervalo de datas livre, exportação, drill-down por clique.
- Reordenação interativa da tabela por coluna diferente de comissão.
- Cache/otimização de query — mesmo raciocínio dos specs anteriores: volume
  do MVP é pequeno o suficiente pra rodar direto a cada load.

## Testes

- `lib/agent-production.test.ts`: `getMonthBounds` (limites corretos de
  mês, incluindo mudança de ano em dezembro) e `buildProductionRanking`
  (merge correto por `agentId`, agente sem produção aparece com zeros,
  ordenação por comissão decrescente, desempate estável quando duas
  comissões são iguais).
- Sem teste de banco para as queries Prisma em si, mesmo padrão do resto
  do projeto.
