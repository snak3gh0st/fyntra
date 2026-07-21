# Alertas de Risco — Design

## Contexto

Terceiro de cinco sub-projetos da fase de "análise de apólices" (ordem
acordada: 1. Detalhe de apólice → 2. Dashboard de carteira → 3. Alertas de
risco → 4. Comparação entre agentes (admin) → 5. Motor de illustration
Term/Final Expense). Este spec cobre só o item 3.

Objetivo: destacar apólices que precisam de ação do agente antes de virar
perda de comissão — paradas no funil de aprovação, sem sinal de pagamento
recente, ou que acabaram de lapsar.

Hoje o schema (`Policy`) não tem nenhum dado de pagamento ou de quando o
status mudou — só `status`, `effectiveDate` e `createdAt`. Sem esse dado,
"perto de lapsar" e "lapsou recentemente" não dão pra calcular de forma
confiável. Este spec adiciona os dois campos que faltam.

## Escopo

Fora de escopo: alertas para ADMIN ou cross-agente (fica pro item 4,
"Comparação entre agentes"); dispensar/marcar alerta como resolvido
(alertas são sempre recalculados on-the-fly, sem tabela de estado);
downline (alertas são só das apólices do próprio agente logado).

## Modelo de dados

Dois campos novos em `Policy`, ambos nullable (migration não destrutiva,
apólices existentes ficam null até o próximo import trazer o dado):

```prisma
model Policy {
  // ...campos existentes
  lastPaymentDate  DateTime?
  statusChangedAt  DateTime?
}
```

- `lastPaymentDate`: data do último pagamento confirmado. Vem de uma nova
  coluna opcional no CSV de import de apólices (`PolicyRowSchema` em
  `lib/csv/schemas.ts`). Vazia/ausente = null.
- `statusChangedAt`: setado automaticamente pelo import (`import-service.ts`),
  não é coluna do CSV. No `create`, = `now()`. No `update`, só muda se
  `row.status !== apólice atual.status` (senão mantém o valor anterior).
  Isso exige buscar a apólice existente antes do upsert para comparar o
  status — pequena mudança em `importPolicies`.

## Regras de alerta

Calculadas on-the-fly em `lib/alerts.ts`, sem persistência de estado.
Thresholds fixos no código (constantes, fácil de ajustar depois):

1. **Parado no funil** — `status IN (PENDING, APPROVED)` e `createdAt` há
   mais de 15 dias.
2. **Sem pagamento** — `status = INFORCE` e
   `(lastPaymentDate ?? effectiveDate)` há mais de 30 dias, ou ambos null
   (nunca teve nenhum sinal de pagamento/vigência).
3. **Lapsou recentemente** — `status = LAPSED` e `statusChangedAt` dentro
   dos últimos 30 dias. Apólices com `statusChangedAt` null (dado antigo,
   pré-migration) não entram nesse alerta — não dá pra saber quando
   lapsaram.

Cada `Policy` cai em no máximo um alerta (checagem em ordem 1→2→3, primeira
que bater vence — evita uma apólice aparecer duas vezes).

## Camada de dados

Nova função em `lib/alerts.ts`:

```ts
type RiskAlert = {
  type: 'STALLED' | 'NO_PAYMENT' | 'RECENT_LAPSE'
  policy: { id: string; policyNumber: string; carrier: string; product: string; clientName: string }
  daysSince: number
}

export async function getRiskAlerts(agentId: string): Promise<RiskAlert[]>
```

Uma query (`prisma.policy.findMany` com `agentId`, incluindo `client` pro
nome), filtro e classificação em memória (volume por agente é baixo,
não justifica 3 queries separadas).

## UI

Novo bloco "Alertas" em `app/agent/page.tsx`, entre os cards de topo e as
seções de composição (mesma página do dashboard, sem rota nova). Layout:

- Lista compacta agrupada por tipo (3 grupos, cada um só aparece se tiver
  itens), cada linha mostra apólice + cliente + "há N dias", link pra
  `/agent/policies/[id]`.
- Sem alertas em nenhum grupo → bloco inteiro não renderiza (sem
  empty-state "tudo certo", pra não ocupar espaço à toa).
- Cores/ícone seguem DESIGN.md (sem vermelho genérico de erro — usar o
  tom de alerta já definido no sistema, se existir; senão, texto +
  contagem, sem decoração nova).

## Testes

- `lib/alerts.test.ts`: casos para cada regra (limite exato do threshold,
  null em `lastPaymentDate`/`statusChangedAt`, apólice que bateria em mais
  de uma regra só conta uma vez).
- `lib/csv/import-service.test.ts`: caso novo cobrindo `statusChangedAt`
  setado no create e atualizado só quando o status muda no update.
