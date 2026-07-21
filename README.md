# lifeOS

Sistema interno da RICOS para agentes de seguro de vida (National Life Group / Five Rings Financial / Alliance Group).

## Escopo (MVP)

- **Portal do Agente**: dashboard, hierarquia multinível (quem está debaixo de quem), clientes, apólices, comissões (diretas + override de downline).
- **Portal do Cliente**: apólices próprias, status, documentos.
- **Admin**: import de CSV (apólices/comissões), configuração de planos de comissão, gestão de usuários/hierarquia.

Fora do MVP (fase 2): motor de quote/ilustração (Compulife para Term/Final Expense; embed de WinFlex/FireLight para IUL).

## Stack

- Next.js (App Router) + TypeScript
- Prisma + PostgreSQL (self-hosted via Coolify — host `btdb`, banco `lifeos`)
- Auth: Better Auth (self-hosted)
- Deploy: Coolify (host `btapps`)

## Status

Em fase de design — ver spec em `docs/`.
