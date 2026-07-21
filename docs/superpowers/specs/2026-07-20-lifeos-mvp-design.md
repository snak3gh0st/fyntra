# lifeOS — MVP Design

## Contexto

Sistema interno da RICOS para agentes de seguro de vida ligados à National Life
Group, contratados via os IMOs Five Rings Financial e Alliance Group. Duas
frentes de usuário: agentes (gestão de hierarquia multinível, clientes,
apólices, comissões) e clientes (visão das próprias apólices).

## Pesquisa que moldou o escopo

- **Nenhuma seguradora/IMO (National Life Group, SureLC, Five Rings, Alliance
  Group) expõe API pública** para apólices, comissões ou hierarquia. Esses
  dados são propriedade do negócio da RICOS, não da seguradora — moram no
  banco de dados do lifeOS desde o dia 1, alimentados por import de
  CSV/relatório que os agentes já baixam dos portais dos carriers.
- **Quote/ilustração de IUL não pode ser construído in-house de forma
  legítima.** NAIC Model #582 / ASOP #24 exigem que ilustrações de valor
  não-garantido sejam certificadas por um atuário designado pela seguradora.
  Nenhum precedente de mercado (nem Ethos, nem Ladder, nem Bestow) conseguiu
  contornar isso permanecendo agência — a única forma de deter a
  precificação foi a Bestow virar seguradora licenciada. **Por isso,
  quote/ilustração fica fora do MVP** e vira módulo de fase 2:
  - Term/Final Expense: motor próprio é viável (tábua pública SOA 2017 CSO +
    tarifários públicos dos carriers), ou usar Compulife (API paga, self-serve,
    ~$370–1.080/ano).
  - IUL: embutir (iframe/SSO) o WinFlex ou FireLight que Five Rings/Alliance
    Group já disponibilizam aos agentes — não recalcular por conta própria.
- **Infra já existe**: Coolify de produção rodando em `btapps`
  (135.181.89.138), Postgres compartilhado em `btdb` (204.168.161.153,
  acessível de `btapps` via rede privada 10.0.0.2). lifeOS já tem banco
  (`lifeos`) e role (`lifeos_app`) provisionados lá, seguindo a convenção dos
  outros apps da RICOS/Sigma.

## Escopo do MVP

1. **Portal do Agente**
   - Dashboard: minhas apólices, minhas comissões, resumo da minha downline.
   - Organograma: árvore de quem está acima/abaixo (upline/downline).
   - Lista de clientes (próprios + da downline, conforme permissão).
   - Lista de apólices e extrato de comissão (direta + override).
2. **Portal do Cliente**
   - Minhas apólices, status, documentos. Somente leitura.
3. **Admin**
   - Import de CSV (apólices, comissões) com relatório de erro por linha.
   - Cadastro/edição de hierarquia de agentes (quem reporta a quem).
   - Configuração de planos de comissão (percentual de override por nível/rank).
   - Gestão de usuários e papéis.

**Fora do MVP:** motor de quote/ilustração (fase 2, ver acima).

## Arquitetura

Monolito único, Next.js (App Router) + TypeScript, com controle de acesso por
papel (`ADMIN` | `AGENT` | `CLIENT`) dentro do mesmo app — sem apps separados
para agente/cliente. Justificativa: 1 dev solo mantendo com Claude Code, menor
superfície de manutenção que 2 codebases.

- **ORM**: Prisma.
- **Banco**: PostgreSQL self-hosted em `btdb` (banco `lifeos`), acessado via
  pgbouncer na rede privada Coolify.
- **Auth**: Better Auth (self-hosted, guarda sessão/usuário no mesmo Postgres),
  com suporte a papéis nativo.
- **Deploy**: Coolify em `btapps`, como app Next.js standalone (Nixpacks ou
  Dockerfile — decidir na fase de execução).

## Modelo de dados (núcleo)

```
User             (id, email, role: ADMIN|AGENT|CLIENT, name, createdAt)
Agent            (id, userId, parentAgentId → Agent (self), rank, npn, status)
Client           (id, userId?, name, contato, assignedAgentId → Agent)
Policy           (id, clientId, agentId, carrier, produto, numeroApolice,
                   valorFace, premio, status, datas, importBatchId)
CommissionRecord (id, policyId, agentId, valor, tipo: DIRETA|OVERRIDE,
                   nivel, periodo, importBatchId)
CommissionPlan   (rank, nivelDownline, percentualOverride)
ImportBatch      (id, uploadedByUserId, arquivo, tipo: POLICIES|COMMISSIONS,
                   uploadedAt, status, errosPorLinha)
AuditLog         (id, userId, acao, entidade, entidadeId, dadosAntes,
                   dadosDepois, createdAt)
```

Hierarquia = *adjacency list* via `Agent.parentAgentId`, percorrida com
recursive CTE do Postgres (upline/downline completos). Escala tranquilamente
para ~300 usuários.

## Fluxo de dados

1. Admin sobe CSV (apólices ou comissões) pelo painel de import.
2. Sistema valida linha a linha; linhas inválidas são reportadas
   individualmente, o resto do import segue (nunca falha tudo por 1 linha
   ruim, porque é dado financeiro).
3. Linhas válidas populam `Policy` / `CommissionRecord`, associadas ao
   `ImportBatch`.
4. Comissão de override para o upline é **calculada pelo sistema** a partir de
   `CommissionPlan` — não vem pronta do CSV. Essa é a lógica de negócio central
   que nenhuma ferramenta de mercado pesquisada (nem concorrentes tipo
   SparkLeads) resolve.

## Erros e auditoria

- Toda mudança de hierarquia de agente e todo cálculo/ajuste de comissão gera
  entrada em `AuditLog` — é dinheiro e estrutura organizacional, não pode ser
  silencioso.
- Import de CSV é resiliente a linha ruim (ver acima), com relatório
  downloadable de erros.

## Testes

Cobertura mínima e proporcional ao risco:
- Engine de cálculo de comissão/override: testado (lógica não-trivial, dinheiro
  real).
- Travessia de hierarquia (upline/downline): testado (recursividade, fácil de
  quebrar silenciosamente).
- Telas de CRUD simples (cadastro de cliente, etc.): sem teste dedicado — YAGNI.

## Infra provisionada

- Repo: `github.com/snak3gh0st/lifeOS` (privado).
- Banco: `lifeos` / role `lifeos_app` em `btdb`, acessível de `btapps` via
  `10.0.0.2:6432` (pgbouncer).
- Deploy: a configurar em `btapps` (Coolify) na fase de execução.

## Próximos passos

1. Revisão deste spec pelo usuário.
2. `writing-plans`: plano de implementação (schema Prisma, seed, telas,
   import de CSV, engine de comissão, auth).
