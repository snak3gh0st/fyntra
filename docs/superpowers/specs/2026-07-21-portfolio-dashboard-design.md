# Dashboard de Carteira — Design

## Contexto

Segundo de cinco sub-projetos da fase de "análise de apólices" (ordem
acordada: 1. Detalhe de apólice → 2. Dashboard de carteira → 3. Alertas de
risco → 4. Comparação entre agentes (admin) → 5. Motor de illustration
Term/Final Expense). Este spec cobre só o item 2.

Hoje `/agent` (`app/agent/page.tsx`) mostra só 3 cards soltos: apólices do
próprio agente (não inclui downline), comissão total do agente, tamanho da
downline. Não dá nenhuma visão de composição, saúde ou tendência da
carteira, e não quebra a downline por sub-agente.

## Escopo

Evolui `app/agent/page.tsx` (mesma rota `/agent`, sem página nova) com 5
seções, todas no papel AGENT. Fora de escopo: dashboard equivalente para
ADMIN (fica pro item 4, "Comparação entre agentes").

Sem biblioteca de gráfico nova — barras via CSS (`<div>` com
largura/altura proporcional ao valor), consistente com o princípio
"números primeiro, sem decoração" do DESIGN.md.

### Escopo de dados: "carteira" = agente + downline

Todas as seções abaixo, exceto a de comissão por período (seção 4a) e o
card de comissão total (que já é cálculo correto hoje), usam
`scopeAgentIds = [agent.id, ...getDownlineIds(allAgents, agent.id)]` — o
mesmo padrão já usado em `app/agent/policies/page.tsx`. Comissão usa só
`agent.id` porque `CommissionRecord.agentId` já é o beneficiário (inclui
overrides recebidos da downline); somar por `scopeAgentIds` duplicaria
valores.

## Seções

### 1. Cards de topo (substitui os 3 atuais)

- **Apólices na carteira**: `count` de `Policy` com `agentId in scopeAgentIds`.
- **Comissão total**: `sum(CommissionRecord.amount)` com `agentId: agent.id` (sem mudança de cálculo, só reposicionado).
- **Tamanho da downline**: `scopeAgentIds.length - 1` (sem mudança).

### 2. Status da carteira

Lista horizontal, uma linha por `PolicyStatus` presente (PENDING,
APPROVED, INFORCE, LAPSED, CANCELLED): rótulo do status + contagem + `%`
do total + barra CSS proporcional. Status com contagem zero não aparece.

Query: `prisma.policy.groupBy({ by: ['status'], where: { agentId: { in: scopeAgentIds } }, _count: true })`.

### 3. Composição por carrier e produto

Dois blocos lado a lado no desktop, empilhados em mobile. Cada um lista
top-N (limite 5, resto agregado em "Outros") por contagem de apólices,
com barra CSS.

Query: `groupBy(['carrier'])` e `groupBy(['product'])`, mesmo `where` da
seção 2.

### 4. Evolução no tempo

Dois gráficos de barra CSS lado a lado (empilham em mobile):

**4a. Comissão por período** — `groupBy(['period'])` em
`CommissionRecord` com `where: { agentId: agent.id }`, `_sum: { amount: true }`,
ordenado por `period` (string, já vem ordenável da import, ex:
`"2026-06"`). Sem downline (ver nota de escopo acima).

**4b. Apólices novas por mês** — `Policy` do escopo agente+downline,
`effectiveDate` não nulo, agrupado por `YYYY-MM` em JS (Prisma não agrupa
por mês truncado nativamente sem SQL raw; volume de apólices por agente é
baixo o bastante pra agrupar em memória sem problema de performance).

Ambos os gráficos mostram só os últimos 12 pontos (períodos/meses) pra não
estourar largura horizontal — sem paginação, sem seletor de intervalo.

### 5. Tabela de downline

Uma linha por sub-agente (direto ou indireto, todo `scopeAgentIds` exceto
o próprio agente): nome, nº de apólices dele, comissão override que o
agente logado recebeu por causa dele, e breakdown de status resumido em
texto (ex: "3 inforce · 1 pending · 1 lapsed").

- **Apólices do sub-agente**: `count` de `Policy` com `agentId: <subAgentId>`.
- **Override recebido por causa dele**: `sum(CommissionRecord.amount)` com
  `agentId: agent.id` (o pai, quem recebe), `type: OVERRIDE`, e
  `policy.agentId: <subAgentId>` (join via `policy` — precisa `include`
  ou query separada por apólice do sub-agente).
- **Breakdown de status**: `groupBy(['status'])` de `Policy` com
  `agentId: <subAgentId>`.

Sub-agente sem apólice nenhuma ainda aparece na tabela (linha com zeros),
pra manter visibilidade de toda a downline mesmo que inativa.

Downline vazia → seção inteira não renderiza (sem "tabela vazia" com
0 linhas).

## Fora de escopo

- Filtro de período customizável, exportação, drill-down por clique nos
  gráficos.
- Dashboard equivalente para ADMIN (visão agregada de todos os agentes) —
  fica pro item 4 da fila ("Comparação entre agentes").
- Cache/otimização de query — volume de dados do MVP é pequeno o
  suficiente pra rodar as queries direto a cada load, igual o resto do
  app hoje.

## Testes

Cobertura via teste de função pura para a lógica de agregação que roda em
JS (agrupamento de apólices por mês em 4b, e formatação de breakdown de
status em texto na seção 5) — mesmo padrão do
`lib/policy-access.test.ts` já existente no projeto. As queries Prisma em
si não ganham teste unitário (sem banco em memória no projeto hoje),
igual o restante das páginas.
