# Fyntra

**Fyntra** — Finance, Intelligence and Traction.

Sistema interno da RICOS para agentes de seguro de vida (National Life Group / Five Rings Financial / Alliance Group): hierarquia multinível de agentes, comissionamento (direto + override de downline), gestão de apólices e clientes, tudo em um só lugar.

## Status

MVP em produção, evoluindo por incremento. Entregue até agora:

- Hierarquia multinível de agentes, comissão (direta + override), import de CSV, portais admin/agente/cliente, auth com papéis
- Redesign completo de UI/UX (ver `PRODUCT.md` e `DESIGN.md` — sistema de design "The Ledger Room")
- Detalhe de apólice com documentos (upload/download com controle de acesso)
- Dashboard de carteira do agente (composição por status/carrier/produto, evolução mensal)
- Alertas de risco (apólices paradas no funil, sem sinal de pagamento, ou que lapsaram recentemente)
- **Distribution Core (Release 1):** fluxo de vendas por caso (prospect → caso → apólice emitida/importada), com etapas legais, requirements, timeline, snapshots de apólice e ledger imutável de comissões. Apólices deixam de ser criadas manualmente — surgem da emissão de um caso ou de importação de histórico. Ver `docs/operations/distribution-core-rollout.md`.

Specs e planos de cada entrega ficam em `docs/superpowers/specs/` e `docs/superpowers/plans/`.

## Portais

- **Portal do Agente** (`/agent`): fila de trabalho "Hoje" (casos ativos, aguardando ilustração, requirements abertos, apólices em risco, comissões esperadas/pagas/chargeback); casos (`/agent/cases`), clientes, apólices, comissões (diretas + override), equipe/downline. Indicadores de carteira ficam abaixo da fila.
- **Portal do Cliente** (`/client`): apólices próprias (somente leitura), documentos.
- **Admin** (`/admin`): import de CSV (apólices/comissões), configuração de planos de comissão, gestão de agentes/hierarquia.

Fora de escopo por ora: comparação entre agentes/período (admin). A trilha de ilustração já está ativa em `/agent/illustrations/new` com envio por `ILLUSTRATION_REQUEST_URL`.

## Stack

- Next.js 16 (App Router) + TypeScript
- Prisma 6 + PostgreSQL (self-hosted via Coolify — host `btdb`, banco `lifeos` — nome de infra herdado, o produto chama-se Fyntra)
- Auth: Better Auth (self-hosted)
- Tailwind v4
- Deploy: Coolify, container `lifeos` (host `btapps`)

## Desenvolvimento local

```bash
pnpm install
cp .env.example .env   # ajuste DATABASE_URL e BETTER_AUTH_SECRET
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
pnpm dev
```

Depois do seed, todos os usuários seedados (`admin@ricos.test`, `top@ricos.test`,
`mid@ricos.test`, `leaf@ricos.test`, `client@ricos.test`) conseguem entrar em
`/login` com a senha `password123`. Essa senha é **apenas para dev/seed** —
nunca use em produção.

## Verificação antes de commitar

```bash
pnpm exec tsc --noEmit
pnpm build
pnpm exec vitest run
```
