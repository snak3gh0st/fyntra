# Fyntra Operational Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first usable Fyntra Distribution OS workflow from prospect intake through an issued policy mirror, with applications, requirements, timeline events, immutable commission transactions and provider-neutral synchronization records.

**Architecture:** Extend the existing Prisma domain without deleting legacy client, policy or commission data. New insurance-case records become the operational workflow, while existing policies remain readable and become linked to cases when issued or imported. Pure domain helpers own status/access/idempotency rules; Next.js Server Components load scoped data and Server Actions perform validated writes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Prisma 6, PostgreSQL, Zod 4, Vitest, Tailwind CSS 4.

## Global Constraints

- Preserve existing `Client`, `Policy`, `CommissionRecord`, hierarchy, import and document history.
- A policy is created only from an issue/placement event or an authorized historical import.
- National Life is the first carrier, but domain records and connector interfaces remain multi-carrier.
- Preliminary calculations must be labeled as estimates; official illustration status requires a carrier-generated source.
- Money uses Prisma `Decimal`; financial corrections are additive transactions, not destructive rewrites.
- Internal statuses are stable English enum values with Portuguese UI labels.
- Agent access is restricted to the current agent and their downline.
- External provider failure must not block core CRM and case operations.
- Do not add iPipeline, SureLC, ForeSight or National Life credentials in Release 1.

---

## File Structure

### Domain and persistence

- `prisma/schema.prisma`: new enums, case/application/timeline/sync/financial models and legacy links.
- `prisma/migrations/<timestamp>_add_distribution_core/migration.sql`: additive database migration.
- `lib/case-workflow.ts`: legal case transitions and labels.
- `lib/case-workflow.test.ts`: transition and label tests.
- `lib/case-access.ts`: hierarchy-scoped case authorization.
- `lib/case-access.test.ts`: access tests.
- `lib/integrations/idempotency.ts`: deterministic provider event key validation.
- `lib/integrations/idempotency.test.ts`: duplicate-event behavior tests.

### Agent workflow

- `app/agent/cases/page.tsx`: scoped case work queue.
- `app/agent/cases/CasesBoard.tsx`: filters and grouped case cards.
- `app/agent/cases/new/page.tsx`: prospect/case intake page.
- `app/agent/cases/new/NewCaseForm.tsx`: client form and case objective fields.
- `app/agent/cases/new/actions.ts`: validated prospect and case creation.
- `app/agent/cases/[id]/page.tsx`: case workspace and timeline.
- `app/agent/cases/[id]/actions.ts`: stage, requirement and timeline actions.
- `app/agent/cases/[id]/CaseWorkspace.tsx`: case header, next action and sections.

### Operational surfaces

- `components/StatusPill.tsx`: case/application status labels and tones.
- `components/Shell.tsx`: work-oriented navigation and route names.
- `app/agent/page.tsx`: agent work queue dashboard.
- `app/agent/policies/page.tsx`: remove manual-create CTA and point to cases/import provenance.
- `app/agent/policies/PoliciesList.tsx`: policy empty state and source presentation.
- `app/agent/clients/page.tsx`: prospect/client context copy and case linkage.
- `app/agent/clients/ClientsList.tsx`: open client/case destinations.

### Imports and compatibility

- `lib/csv/schemas.ts`: optional source identifiers for policy and commission imports.
- `lib/csv/schemas.test.ts`: backward-compatible parsing tests.
- `lib/csv/import-service.ts`: create external references, policy snapshots and immutable commission transactions.
- `lib/csv/import-service.test.ts`: pure import-rule tests.
- `app/agent/policies/new/page.tsx`: retire direct agent policy creation with explanatory redirect UI.
- `app/agent/policies/new/actions.ts`: remove the agent-facing `createPolicy` mutation after call sites move.

---

### Task 1: Add the Distribution Core Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_distribution_core/migration.sql`
- Create: `lib/case-workflow.ts`
- Create: `lib/case-workflow.test.ts`

**Interfaces:**
- Produces: `CaseStage`, `CaseStatus`, `IllustrationKind`, `ApplicationStatus`, `RequirementStatus`, `PolicyTransactionType`, `CommissionTransactionType`, `SyncStatus` Prisma enums.
- Produces: `canTransitionCase(from: CaseStage, to: CaseStage): boolean`.
- Produces: `caseStageLabel: Record<CaseStage, string>` and `caseStageTone(stage: CaseStage): Tone`.

- [ ] **Step 1: Write failing workflow tests**

```ts
import { describe, expect, it } from 'vitest'
import { canTransitionCase, caseStageLabel } from './case-workflow'

describe('canTransitionCase', () => {
  it('allows the normal sales path', () => {
    expect(canTransitionCase('LEAD', 'DISCOVERY')).toBe(true)
    expect(canTransitionCase('SUBMITTED', 'UNDERWRITING')).toBe(true)
    expect(canTransitionCase('ISSUED', 'PLACED')).toBe(true)
  })

  it('blocks creating an issued case directly from a lead', () => {
    expect(canTransitionCase('LEAD', 'ISSUED')).toBe(false)
  })

  it('allows terminal exits only from active stages', () => {
    expect(canTransitionCase('UNDERWRITING', 'DECLINED')).toBe(true)
    expect(canTransitionCase('PLACED', 'WITHDRAWN')).toBe(false)
  })
})

describe('caseStageLabel', () => {
  it('exposes plain Portuguese labels', () => {
    expect(caseStageLabel.ILLUSTRATION_READY).toBe('Ilustração pronta')
    expect(caseStageLabel.UNDERWRITING).toBe('Em análise')
  })
})
```

- [ ] **Step 2: Run the failing test**

Run: `pnpm vitest run lib/case-workflow.test.ts`

Expected: FAIL because `lib/case-workflow.ts` does not exist.

- [ ] **Step 3: Add workflow enums and models to Prisma**

Add additive models with these required relationships and uniqueness rules:

```prisma
model InsuranceCase {
  id              String      @id @default(cuid())
  prospectId      String
  prospect        Prospect    @relation(fields: [prospectId], references: [id])
  assignedAgentId String
  assignedAgent   Agent       @relation(fields: [assignedAgentId], references: [id])
  clientId        String?
  client          Client?     @relation(fields: [clientId], references: [id])
  stage           CaseStage   @default(LEAD)
  status          CaseStatus  @default(OPEN)
  objective       String?
  targetCoverage  Decimal?
  monthlyBudget   Decimal?
  carrier         String?
  productType     String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  illustrations   Illustration[]
  applications    Application[]
  timelineEvents  CaseTimelineEvent[]
  policies        Policy[]

  @@index([assignedAgentId, stage])
  @@index([prospectId])
}

model Prospect {
  id              String   @id @default(cuid())
  firstName       String
  lastName        String
  email           String?
  phone           String?
  dateOfBirth     DateTime?
  state           String?
  tobaccoStatus   String?
  assignedAgentId String
  assignedAgent   Agent    @relation(fields: [assignedAgentId], references: [id])
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  cases           InsuranceCase[]

  @@index([assignedAgentId])
}
```

Also add `Illustration`, `IllustrationScenario`, `Application`, `ApplicationRequirement`, `CaseTimelineEvent`, `PolicySnapshot`, `PolicyTransaction`, `CommissionTransaction`, `IntegrationConnection`, `ExternalReference` and `SyncEvent` exactly as specified in the design. Every external record includes `provider`, `externalId`, `sourceUpdatedAt` and a compound uniqueness constraint where applicable. Add nullable `caseId`, `sourceProvider` and `sourceExternalId` to `Policy`.

- [ ] **Step 4: Implement the transition map**

```ts
export const CASE_STAGES = [
  'LEAD', 'DISCOVERY', 'DESIGN', 'ILLUSTRATION_READY',
  'APPLICATION_STARTED', 'SUBMITTED', 'UNDERWRITING',
  'APPROVED', 'ISSUED', 'PLACED', 'DECLINED', 'WITHDRAWN',
] as const

export type CaseStage = (typeof CASE_STAGES)[number]

const transitions: Record<CaseStage, CaseStage[]> = {
  LEAD: ['DISCOVERY', 'WITHDRAWN'],
  DISCOVERY: ['DESIGN', 'WITHDRAWN'],
  DESIGN: ['ILLUSTRATION_READY', 'DISCOVERY', 'WITHDRAWN'],
  ILLUSTRATION_READY: ['APPLICATION_STARTED', 'DESIGN', 'WITHDRAWN'],
  APPLICATION_STARTED: ['SUBMITTED', 'ILLUSTRATION_READY', 'WITHDRAWN'],
  SUBMITTED: ['UNDERWRITING', 'WITHDRAWN'],
  UNDERWRITING: ['APPROVED', 'DECLINED', 'WITHDRAWN'],
  APPROVED: ['ISSUED', 'UNDERWRITING', 'WITHDRAWN'],
  ISSUED: ['PLACED', 'WITHDRAWN'],
  PLACED: [],
  DECLINED: [],
  WITHDRAWN: [],
}

export function canTransitionCase(from: CaseStage, to: CaseStage): boolean {
  return transitions[from].includes(to)
}
```

- [ ] **Step 5: Generate and apply the development migration**

Run: `pnpm exec prisma migrate dev --name add_distribution_core`

Expected: migration created and Prisma Client generated successfully.

- [ ] **Step 6: Run workflow tests**

Run: `pnpm vitest run lib/case-workflow.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the schema unit**

```bash
git add prisma/schema.prisma prisma/migrations lib/case-workflow.ts lib/case-workflow.test.ts
git commit -m "feat: add insurance case domain"
```

### Task 2: Add Scoped Case Access and Intake

**Files:**
- Create: `lib/case-access.ts`
- Create: `lib/case-access.test.ts`
- Create: `app/agent/cases/new/page.tsx`
- Create: `app/agent/cases/new/NewCaseForm.tsx`
- Create: `app/agent/cases/new/actions.ts`

**Interfaces:**
- Consumes: `InsuranceCase`, `Prospect`, `CaseStage`.
- Produces: `canAccessCase(context, caseRef): boolean`.
- Produces: `createInsuranceCase(formData): Promise<CreateCaseResult>`.

- [ ] **Step 1: Write failing access tests**

```ts
import { describe, expect, it } from 'vitest'
import { canAccessCase } from './case-access'

const caseRef = { assignedAgentId: 'agent-1' }

describe('canAccessCase', () => {
  it('allows admins', () => expect(canAccessCase({ role: 'ADMIN' }, caseRef)).toBe(true))
  it('allows scoped agents', () => expect(canAccessCase({ role: 'AGENT', agentScopeIds: ['agent-1'] }, caseRef)).toBe(true))
  it('blocks agents outside the hierarchy scope', () => expect(canAccessCase({ role: 'AGENT', agentScopeIds: ['agent-2'] }, caseRef)).toBe(false))
})
```

- [ ] **Step 2: Run the failing access test**

Run: `pnpm vitest run lib/case-access.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement access helper**

Use the same explicit union pattern as `lib/policy-access.ts`, but only `ADMIN` and scoped `AGENT` contexts can access cases in Release 1.

- [ ] **Step 4: Implement the intake Server Action**

Validate with Zod:

```ts
const NewCaseSchema = z.object({
  firstName: z.string().trim().min(1, 'Informe o nome.'),
  lastName: z.string().trim().min(1, 'Informe o sobrenome.'),
  email: z.union([z.literal(''), z.string().trim().email('Informe um e-mail válido.')]),
  phone: z.string().trim().optional(),
  dateOfBirth: z.union([z.literal(''), z.iso.date()]),
  state: z.string().trim().length(2, 'Selecione o estado.'),
  tobaccoStatus: z.enum(['NO', 'FORMER', 'YES']),
  objective: z.enum(['PROTECTION', 'ACCUMULATION', 'RETIREMENT', 'LEGACY']),
  productType: z.enum(['TERM', 'IUL', 'UNDECIDED']),
  targetCoverage: z.coerce.number().positive().optional(),
  monthlyBudget: z.coerce.number().positive().optional(),
})
```

Create `Prospect`, `InsuranceCase` and the first `CaseTimelineEvent` in one Prisma transaction. Set `carrier` to `National Life Group` and redirect to `/agent/cases/{id}` only after the transaction succeeds.

- [ ] **Step 5: Build the intake UI**

Preserve existing `Field`, `Input`, `Select`, `Button`, `PageHeader`, `ContextPanel` and `Shell` patterns. The primary button is `Criar caso`, not `Criar apólice`. DOB drives age presentation; do not request a separately editable age.

- [ ] **Step 6: Run access and existing policy-access tests**

Run: `pnpm vitest run lib/case-access.test.ts lib/policy-access.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit intake**

```bash
git add lib/case-access.ts lib/case-access.test.ts app/agent/cases/new
git commit -m "feat: add prospect and case intake"
```

### Task 3: Build the Case Work Queue and Workspace

**Files:**
- Create: `app/agent/cases/page.tsx`
- Create: `app/agent/cases/CasesBoard.tsx`
- Create: `app/agent/cases/[id]/page.tsx`
- Create: `app/agent/cases/[id]/CaseWorkspace.tsx`
- Create: `app/agent/cases/[id]/actions.ts`
- Modify: `components/StatusPill.tsx`

**Interfaces:**
- Consumes: `caseStageLabel`, `canTransitionCase`, scoped agent IDs.
- Produces: `transitionCase(caseId, nextStage)` and `updateRequirement(requirementId, status)` Server Actions.

- [ ] **Step 1: Add case status presentation**

Add `CaseStagePill` using the existing private `Pill` component. Use warning for active sales stages, success for `APPROVED`, `ISSUED`, `PLACED`, danger for `DECLINED`, and neutral for `WITHDRAWN`.

- [ ] **Step 2: Implement scoped work-queue query**

Load cases for `[agent.id, ...downlineIds]`, include prospect and assigned agent, and order active work before terminal cases, then by `updatedAt desc`. Do not fetch full timeline payloads for the list.

- [ ] **Step 3: Build filterable case board**

Provide filters for `Todos`, `Pré-venda`, `Aplicação`, `Em análise`, `Emitidos` and `Encerrados`. Each card shows prospect, assigned agent, product intent, target coverage/budget, stage and time since update.

- [ ] **Step 4: Implement the scoped case detail query**

Fetch one case by ID, verify its `assignedAgentId` against scope before rendering, and include prospect, illustrations, applications with requirements, timeline and linked policies. Return `notFound()` for inaccessible IDs without revealing existence.

- [ ] **Step 5: Implement legal stage transitions**

The action reloads the case, verifies scope, calls `canTransitionCase`, updates stage and appends a `CaseTimelineEvent` in one transaction. Invalid transitions return `{ ok: false, message: 'Esta mudança de etapa não é permitida.' }`.

- [ ] **Step 6: Build the case workspace**

Sections: `Resumo`, `Ilustrações`, `Aplicação`, `Requirements`, `Policy` and `Timeline`. Show one prominent next action derived from stage. Empty sections explain what creates the data and never fabricate carrier values.

- [ ] **Step 7: Run focused tests**

Run: `pnpm vitest run lib/case-workflow.test.ts lib/case-access.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit workspace**

```bash
git add app/agent/cases components/StatusPill.tsx
git commit -m "feat: add insurance case workspace"
```

### Task 4: Add Provider-Neutral Synchronization and Financial Rules

**Files:**
- Create: `lib/integrations/idempotency.ts`
- Create: `lib/integrations/idempotency.test.ts`
- Create: `lib/financial-transactions.ts`
- Create: `lib/financial-transactions.test.ts`

**Interfaces:**
- Produces: `buildExternalEventKey(provider, externalId): string`.
- Produces: `isDuplicateExternalEvent(existingKey, incomingKey): boolean`.
- Produces: `applySignedTransaction(total: Decimal, amount: Decimal, type): Decimal`.

- [ ] **Step 1: Write failing idempotency tests**

```ts
it('normalizes provider event identity', () => {
  expect(buildExternalEventKey(' NATIONAL_LIFE ', ' EVT-42 ')).toBe('national_life:EVT-42')
})

it('rejects missing external identity', () => {
  expect(() => buildExternalEventKey('NATIONAL_LIFE', '')).toThrow('externalId')
})
```

- [ ] **Step 2: Write failing financial direction tests**

Cover `EARNING`, `OVERRIDE`, `ADJUSTMENT`, `CHARGEBACK` and `REVERSAL`. Chargebacks subtract; corrections never mutate the original transaction.

- [ ] **Step 3: Implement pure helpers**

Use `decimal.js`, already installed, for every arithmetic operation. Keep provider normalization deterministic and never include PII in an idempotency key.

- [ ] **Step 4: Run helper tests**

Run: `pnpm vitest run lib/integrations/idempotency.test.ts lib/financial-transactions.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit integration foundations**

```bash
git add lib/integrations lib/financial-transactions.ts lib/financial-transactions.test.ts
git commit -m "feat: add sync and financial transaction rules"
```

### Task 5: Upgrade Imports Without Breaking Existing Files

**Files:**
- Modify: `lib/csv/schemas.ts`
- Modify: `lib/csv/schemas.test.ts`
- Modify: `lib/csv/import-service.ts`
- Modify: `lib/csv/import-service.test.ts`

**Interfaces:**
- Consumes: existing policy and commission CSV columns unchanged.
- Produces: optional `sourceProvider`, `sourceExternalId`, `transactionType`, `sourceTransactionId` columns.
- Produces: policy snapshots and immutable commission transactions for successful imports.

- [ ] **Step 1: Add backward-compatibility schema tests**

Verify the current headers still parse. Add a second fixture with provider identifiers and `CHARGEBACK`. Invalid transaction types must return a row-level validation error.

- [ ] **Step 2: Add optional import columns**

Existing policy CSV remains valid. Default policy provider to `MANUAL_IMPORT`. Existing commission CSV defaults to `EARNING` and derives a stable source ID from batch filename, row number, policy number, agent NPN and period.

- [ ] **Step 3: Make policy import append a snapshot**

After policy upsert, create or idempotently upsert a `PolicySnapshot` containing status, face amount, planned premium, last payment date, source provider and observed timestamp. Do not infer cash value, loan balance or charges from missing columns.

- [ ] **Step 4: Make commission import append transactions**

Write `CommissionTransaction` using the source transaction ID. Preserve legacy `CommissionRecord` updates during Release 1 so existing dashboard and reports continue working. A duplicate source ID must not duplicate money.

- [ ] **Step 5: Run all CSV and commission tests**

Run: `pnpm vitest run lib/csv/schemas.test.ts lib/csv/import-service.test.ts lib/commission.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit compatibility imports**

```bash
git add lib/csv
git commit -m "feat: add sourced policy and commission imports"
```

### Task 6: Replace Policy-First Navigation With Work-First Operations

**Files:**
- Modify: `components/Shell.tsx`
- Modify: `app/agent/page.tsx`
- Modify: `app/agent/policies/page.tsx`
- Modify: `app/agent/policies/PoliciesList.tsx`
- Modify: `app/agent/policies/new/page.tsx`
- Modify: `app/agent/policies/new/actions.ts`
- Modify: `app/agent/clients/page.tsx`
- Modify: `app/agent/clients/ClientsList.tsx`

**Interfaces:**
- Consumes: case counts, open requirements, policy risk fields and commission transaction summaries.
- Produces: discoverable `Casos` navigation and `Novo caso` primary action.

- [ ] **Step 1: Add work-oriented navigation**

Agent navigation order:

```ts
[
  { href: '/agent', label: 'Hoje', icon: 'grid' },
  { href: '/agent/cases', label: 'Casos', icon: 'layers' },
  { href: '/agent/clients', label: 'Clientes', icon: 'users' },
  { href: '/agent/policies', label: 'Apólices', icon: 'document' },
  { href: '/agent/commissions', label: 'Comissões', icon: 'money' },
  { href: '/agent/hierarchy', label: 'Equipe', icon: 'hierarchy' },
]
```

Add route names for `/agent/cases`, `/agent/cases/new` and dynamic case paths.

- [ ] **Step 2: Replace the aggregate-first dashboard**

Query and render actionable groups: follow-ups due, cases awaiting illustration, open requirements, policies at risk, expected/paid/chargeback commissions and annual reviews. Existing production charts move below the work queue and remain available.

- [ ] **Step 3: Retire direct policy creation**

Remove `Nova apólice` CTAs. `/agent/policies/new` renders an explanation and links to `Novo caso` and admin historical import. Remove `createPolicy` only after confirming there are no remaining imports or form references.

- [ ] **Step 4: Update policy and client empty states**

Policies explain that they appear after issue or authorized import. Clients link to their case/workspace. Do not remove existing policy detail or document functionality.

- [ ] **Step 5: Run the complete unit suite**

Run: `pnpm test`

Expected: all Vitest suites pass.

- [ ] **Step 6: Run production build**

Run: `pnpm build`

Expected: Next.js build completes without Client/Server Component boundary errors.

- [ ] **Step 7: Commit operational navigation**

```bash
git add components/Shell.tsx app/agent
git commit -m "feat: make cases the primary agent workflow"
```

### Task 7: Release 1 Acceptance and Migration Safety

**Files:**
- Create: `docs/operations/distribution-core-rollout.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: all Release 1 migrations and routes.
- Produces: repeatable migration, rollback and pilot checklist.

- [ ] **Step 1: Document deployment sequence**

Include backup, migration, Prisma generation, application deployment, import smoke check and rollback decision points. Explicitly state that additive migration rollback restores the previous app version but does not drop new tables automatically.

- [ ] **Step 2: Document the pilot smoke path**

```text
Agent login
-> Novo caso
-> Prospect saved
-> Case appears in work queue
-> Legal stage transition
-> Requirement created and completed
-> Historical policy import links source data
-> Policy snapshot visible
-> Commission import reconciles without duplicate money
-> Downline isolation checked
```

- [ ] **Step 3: Run migration and application gates**

Run:

```bash
pnpm exec prisma validate
pnpm test
pnpm build
```

Expected: all commands exit zero.

- [ ] **Step 4: Commit rollout documentation**

```bash
git add docs/operations/distribution-core-rollout.md README.md
git commit -m "docs: add distribution core rollout guide"
```

## Plan Self-Review

- Every design requirement in Release 1 maps to a task.
- External vendor credentials and live integrations are intentionally excluded.
- Legacy policies and commissions remain readable throughout migration.
- Status, access, money and idempotency rules have focused unit tests.
- The build gate specifically covers the Server Action boundary that previously broke deployment.
- The rollout is independently useful before iPipeline or National Life agreements complete.

