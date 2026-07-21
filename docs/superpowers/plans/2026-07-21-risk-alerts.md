# Alertas de Risco Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a risk-alerts block to the agent dashboard (`/agent`) that surfaces policies stalled in the approval pipeline, showing no payment signal, or that recently lapsed — using two new nullable `Policy` columns (`lastPaymentDate`, `statusChangedAt`) fed by CSV import.

**Architecture:** Two new nullable columns on `Policy`, populated by the existing CSV import pipeline (`lib/csv/import-service.ts`). A pure classification function in `lib/alerts.ts` takes plain policy data + a `now: Date` and returns typed alerts (same "inject `now`" pattern as `lib/dashboard.ts`'s `bucketByMonth`) — this keeps it unit-testable without a database. `app/agent/page.tsx` fetches the agent's own policies, calls `getRiskAlerts`, and renders a new "Alertas" section.

**Tech Stack:** Next.js 16 App Router, Prisma 6, PostgreSQL, TypeScript, Zod, Vitest, Tailwind v4.

## Global Constraints

- Migration must be additive/non-destructive: both new columns nullable, no default, no backfill — matches spec's "não-destrutiva" requirement.
- No local dev database is reachable in this environment — the migration SQL must be hand-written (following the existing `prisma/migrations/<timestamp>_<name>/migration.sql` convention) rather than generated via `prisma migrate dev`. Do not attempt to run `prisma migrate dev` or connect to a database.
- `pnpm exec prisma generate` (no DB needed) must succeed after the schema edit, and `pnpm exec tsc --noEmit && pnpm build && pnpm exec vitest run` must all pass before any task is considered done.
- Alerts are agent-only (no downline), calculated on-the-fly (no dismiss/persisted state), one alert type max per policy (checked in order: STALLED → NO_PAYMENT → RECENT_LAPSE).
- Thresholds: STALLED = `PENDING`/`APPROVED` older than 15 days (`createdAt`). NO_PAYMENT = `INFORCE` with `(lastPaymentDate ?? effectiveDate)` older than 30 days, or both null. RECENT_LAPSE = `LAPSED` with `statusChangedAt` within the last 30 days (null `statusChangedAt` excluded from this alert).
- Follow DESIGN.md tones: use existing `bg-gold-pale`/`text-gold` (warning) and `bg-danger-pale`/`text-danger` (danger) color tokens already used by `components/StatusPill.tsx` — no new colors.

---

### Task 1: Schema migration — add `lastPaymentDate` and `statusChangedAt` to `Policy`

**Files:**
- Modify: `prisma/schema.prisma` (Policy model, around line 107-129)
- Create: `prisma/migrations/20260721040000_add_policy_risk_fields/migration.sql`

**Interfaces:**
- Produces: `Policy.lastPaymentDate: DateTime | null`, `Policy.statusChangedAt: DateTime | null` on the generated Prisma Client, consumed by Tasks 2, 3, 5.

- [ ] **Step 1: Edit `prisma/schema.prisma`**

Find the `Policy` model (starts at line 107) and add the two new fields right after `effectiveDate`:

```prisma
model Policy {
  id            String       @id @default(cuid())
  clientId      String
  client        Client       @relation(fields: [clientId], references: [id])
  agentId       String
  agent         Agent        @relation(fields: [agentId], references: [id])
  carrier       String
  product       String
  policyNumber  String       @unique
  faceAmount    Decimal
  premium       Decimal
  status        PolicyStatus
  effectiveDate DateTime?
  lastPaymentDate DateTime?
  statusChangedAt DateTime?
  importBatchId String?
  importBatch   ImportBatch? @relation(fields: [importBatchId], references: [id])
  createdAt     DateTime     @default(now())

  commissionRecords CommissionRecord[]
  documents         PolicyDocument[]

  @@index([agentId])
  @@index([clientId])
}
```

- [ ] **Step 2: Hand-write the migration SQL**

Create `prisma/migrations/20260721040000_add_policy_risk_fields/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "Policy" ADD COLUMN "lastPaymentDate" TIMESTAMP(3),
ADD COLUMN "statusChangedAt" TIMESTAMP(3);
```

- [ ] **Step 3: Regenerate the Prisma Client (no DB connection needed)**

Run: `pnpm exec prisma generate`
Expected: `✔ Generated Prisma Client` with no errors.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no errors (the new fields aren't referenced anywhere yet, so this should be a no-op check).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260721040000_add_policy_risk_fields
git commit -m "Add lastPaymentDate and statusChangedAt columns to Policy"
```

---

### Task 2: CSV import — accept `lastPaymentDate` column and track status changes

**Files:**
- Modify: `lib/csv/schemas.ts` (`PolicyRowSchema`, around line 28-39)
- Modify: `lib/csv/import-service.ts` (`importPolicies`, lines 16-82)
- Test: `lib/csv/schemas.test.ts`
- Test: `lib/csv/import-service.test.ts`

**Interfaces:**
- Consumes: `Policy.lastPaymentDate`, `Policy.statusChangedAt` from Task 1's Prisma Client.
- Produces: `PolicyRow.lastPaymentDate: string | undefined` (raw CSV string, parsed to `Date` in `import-service.ts` same as `effectiveDate`), consumed by no later task directly but completes the data-entry path the spec requires.

- [ ] **Step 1: Write failing test for the schema change**

Add to `lib/csv/schemas.test.ts`, inside the existing `describe('PolicyRowSchema', ...)` block:

```ts
  it('accepts an optional lastPaymentDate', () => {
    const result = PolicyRowSchema.safeParse({
      clientName: 'Cliente Exemplo',
      agentNpn: '1000003',
      carrier: 'National Life Group',
      product: 'Term 20',
      policyNumber: 'NLG-0002',
      faceAmount: '250000',
      premium: '45.50',
      status: 'INFORCE',
      lastPaymentDate: '2026-06-01',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.lastPaymentDate).toBe('2026-06-01')
    }
  })

  it('accepts a row with no lastPaymentDate at all', () => {
    const result = PolicyRowSchema.safeParse({
      clientName: 'Cliente Exemplo',
      agentNpn: '1000003',
      carrier: 'National Life Group',
      product: 'Term 20',
      policyNumber: 'NLG-0002',
      faceAmount: '250000',
      premium: '45.50',
      status: 'INFORCE',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.lastPaymentDate).toBeUndefined()
    }
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run lib/csv/schemas.test.ts`
Expected: FAIL — `lastPaymentDate` is not a recognized key yet (Zod strips unknown keys by default, so `result.data.lastPaymentDate` is `undefined` even on the "accepts" case — the first new test fails because the value isn't preserved).

- [ ] **Step 3: Add the field to `PolicyRowSchema`**

In `lib/csv/schemas.ts`, add `lastPaymentDate` to the schema object (right after `effectiveDate`):

```ts
export const PolicyRowSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional().or(z.literal('')),
  agentNpn: z.string().min(1),
  carrier: z.string().min(1),
  product: z.string().min(1),
  policyNumber: z.string().min(1),
  faceAmount: numericString,
  premium: numericString,
  status: z.enum(['PENDING', 'APPROVED', 'INFORCE', 'LAPSED', 'CANCELLED']),
  effectiveDate: z.string().optional(),
  lastPaymentDate: z.string().optional(),
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run lib/csv/schemas.test.ts`
Expected: PASS (all tests in the file, including the two new ones).

- [ ] **Step 5: Write failing test for `statusChangedAt` tracking in import**

`lib/csv/import-service.ts` currently has no test coverage for `importPolicies`/`importCommissions` (only `parseCsv` is tested — these functions need a live Prisma connection, which isn't available in this environment). Add a **pure helper** instead of testing the DB-calling function directly: extract the "did status change" decision into its own exported function so it's unit-testable without Prisma.

Add to `lib/csv/import-service.test.ts`:

```ts
import { shouldUpdateStatusChangedAt } from './import-service'

describe('shouldUpdateStatusChangedAt', () => {
  it('returns true when there is no existing policy (create case)', () => {
    expect(shouldUpdateStatusChangedAt(null, 'PENDING')).toBe(true)
  })

  it('returns true when the status differs from the existing policy', () => {
    expect(shouldUpdateStatusChangedAt({ status: 'PENDING' }, 'LAPSED')).toBe(true)
  })

  it('returns false when the status is unchanged', () => {
    expect(shouldUpdateStatusChangedAt({ status: 'INFORCE' }, 'INFORCE')).toBe(false)
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm exec vitest run lib/csv/import-service.test.ts`
Expected: FAIL — `shouldUpdateStatusChangedAt` is not exported.

- [ ] **Step 7: Implement `shouldUpdateStatusChangedAt` and wire it into `importPolicies`**

In `lib/csv/import-service.ts`, add the pure helper near the top (after `parseCsv`):

```ts
export function shouldUpdateStatusChangedAt(
  existing: { status: string } | null,
  newStatus: string,
): boolean {
  return existing === null || existing.status !== newStatus
}
```

Then update `importPolicies` (replace the body of the `for` loop from the `agent.findUnique` line through the `policy.upsert` call) to look up the existing policy first and set both new fields:

```ts
  for (const [index, rawRow] of rows.entries()) {
    const parsed = PolicyRowSchema.safeParse(rawRow)
    if (!parsed.success) {
      errors.push({ row: index + 2, message: parsed.error.issues.map((i) => i.message).join('; ') })
      continue
    }
    const row = parsed.data
    const agent = await prisma.agent.findUnique({ where: { npn: row.agentNpn } })
    if (!agent) {
      errors.push({ row: index + 2, message: `No agent found with NPN ${row.agentNpn}` })
      continue
    }
    const client = await prisma.client.upsert({
      where: { id: `${agent.id}:${row.clientName}` },
      create: {
        id: `${agent.id}:${row.clientName}`,
        name: row.clientName,
        email: row.clientEmail || undefined,
        assignedAgentId: agent.id,
      },
      update: {},
    })
    const existingPolicy = await prisma.policy.findUnique({
      where: { policyNumber: row.policyNumber },
      select: { status: true },
    })
    const statusChangedAt = shouldUpdateStatusChangedAt(existingPolicy, row.status)
      ? new Date()
      : undefined
    await prisma.policy.upsert({
      where: { policyNumber: row.policyNumber },
      create: {
        clientId: client.id,
        agentId: agent.id,
        carrier: row.carrier,
        product: row.product,
        policyNumber: row.policyNumber,
        faceAmount: row.faceAmount,
        premium: row.premium,
        status: row.status,
        effectiveDate: row.effectiveDate ? new Date(row.effectiveDate) : null,
        lastPaymentDate: row.lastPaymentDate ? new Date(row.lastPaymentDate) : null,
        statusChangedAt: new Date(),
        importBatchId: batch.id,
      },
      update: {
        carrier: row.carrier,
        product: row.product,
        faceAmount: row.faceAmount,
        premium: row.premium,
        status: row.status,
        lastPaymentDate: row.lastPaymentDate ? new Date(row.lastPaymentDate) : null,
        ...(statusChangedAt ? { statusChangedAt } : {}),
        importBatchId: batch.id,
      },
    })
    successCount += 1
  }
```

Note: on `update`, when `row.lastPaymentDate` is absent the column is explicitly reset to `null` (matches "CSV is the source of truth" — a re-import without the column clears a stale value, consistent with how every other field in this upsert already behaves for re-imports).

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm exec vitest run lib/csv/import-service.test.ts`
Expected: PASS.

- [ ] **Step 9: Run full test suite and typecheck**

Run: `pnpm exec tsc --noEmit && pnpm exec vitest run`
Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add lib/csv/schemas.ts lib/csv/schemas.test.ts lib/csv/import-service.ts lib/csv/import-service.test.ts
git commit -m "Accept lastPaymentDate CSV column and track statusChangedAt on import"
```

---

### Task 3: `lib/alerts.ts` — pure risk-alert classification

**Files:**
- Create: `lib/alerts.ts`
- Create: `lib/alerts.test.ts`

**Interfaces:**
- Consumes: nothing from prior tasks directly (deliberately decoupled from Prisma types — takes a plain input shape so it stays unit-testable without a DB, matching the `bucketByMonth(dates, months, now)` pattern in `lib/dashboard.ts`).
- Produces: `RiskAlertInput` type, `RiskAlertType` union, `RiskAlert` type, and `getRiskAlerts(policies: RiskAlertInput[], now: Date): RiskAlert[]` — consumed by Task 4.

- [ ] **Step 1: Write the failing tests**

Create `lib/alerts.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { getRiskAlerts, type RiskAlertInput } from './alerts'

describe('getRiskAlerts', () => {
  const now = new Date(2026, 6, 21) // July 21, 2026

  function policy(overrides: Partial<RiskAlertInput>): RiskAlertInput {
    return {
      id: 'p1',
      policyNumber: 'NLG-0001',
      carrier: 'National Life Group',
      product: 'Term 20',
      clientName: 'Cliente Exemplo',
      status: 'PENDING',
      createdAt: now,
      effectiveDate: null,
      lastPaymentDate: null,
      statusChangedAt: null,
      ...overrides,
    }
  }

  it('flags PENDING older than 15 days as STALLED', () => {
    const sixteenDaysAgo = new Date(2026, 6, 5)
    const result = getRiskAlerts([policy({ status: 'PENDING', createdAt: sixteenDaysAgo })], now)
    expect(result).toEqual([
      expect.objectContaining({ type: 'STALLED', policy: expect.objectContaining({ id: 'p1' }), daysSince: 16 }),
    ])
  })

  it('does not flag PENDING exactly at the 15-day boundary', () => {
    const fifteenDaysAgo = new Date(2026, 6, 6)
    const result = getRiskAlerts([policy({ status: 'PENDING', createdAt: fifteenDaysAgo })], now)
    expect(result).toEqual([])
  })

  it('flags APPROVED older than 15 days as STALLED', () => {
    const twentyDaysAgo = new Date(2026, 5, 30)
    const result = getRiskAlerts([policy({ status: 'APPROVED', createdAt: twentyDaysAgo })], now)
    expect(result[0].type).toBe('STALLED')
  })

  it('flags INFORCE with lastPaymentDate older than 30 days as NO_PAYMENT', () => {
    const fortyDaysAgo = new Date(2026, 5, 11)
    const result = getRiskAlerts(
      [policy({ status: 'INFORCE', createdAt: new Date(2025, 0, 1), lastPaymentDate: fortyDaysAgo })],
      now,
    )
    expect(result[0]).toEqual(expect.objectContaining({ type: 'NO_PAYMENT', daysSince: 40 }))
  })

  it('falls back to effectiveDate when lastPaymentDate is null', () => {
    const fortyDaysAgo = new Date(2026, 5, 11)
    const result = getRiskAlerts(
      [policy({ status: 'INFORCE', createdAt: new Date(2025, 0, 1), effectiveDate: fortyDaysAgo, lastPaymentDate: null })],
      now,
    )
    expect(result[0].type).toBe('NO_PAYMENT')
  })

  it('flags INFORCE with both dates null as NO_PAYMENT', () => {
    const result = getRiskAlerts(
      [policy({ status: 'INFORCE', createdAt: new Date(2025, 0, 1), effectiveDate: null, lastPaymentDate: null })],
      now,
    )
    expect(result[0].type).toBe('NO_PAYMENT')
  })

  it('does not flag INFORCE with recent payment', () => {
    const tenDaysAgo = new Date(2026, 6, 11)
    const result = getRiskAlerts(
      [policy({ status: 'INFORCE', createdAt: new Date(2025, 0, 1), lastPaymentDate: tenDaysAgo })],
      now,
    )
    expect(result).toEqual([])
  })

  it('flags LAPSED with recent statusChangedAt as RECENT_LAPSE', () => {
    const tenDaysAgo = new Date(2026, 6, 11)
    const result = getRiskAlerts(
      [policy({ status: 'LAPSED', createdAt: new Date(2025, 0, 1), statusChangedAt: tenDaysAgo })],
      now,
    )
    expect(result[0]).toEqual(expect.objectContaining({ type: 'RECENT_LAPSE', daysSince: 10 }))
  })

  it('does not flag LAPSED with null statusChangedAt', () => {
    const result = getRiskAlerts(
      [policy({ status: 'LAPSED', createdAt: new Date(2025, 0, 1), statusChangedAt: null })],
      now,
    )
    expect(result).toEqual([])
  })

  it('does not flag LAPSED that changed status more than 30 days ago', () => {
    const fortyDaysAgo = new Date(2026, 5, 11)
    const result = getRiskAlerts(
      [policy({ status: 'LAPSED', createdAt: new Date(2025, 0, 1), statusChangedAt: fortyDaysAgo })],
      now,
    )
    expect(result).toEqual([])
  })

  it('does not flag CANCELLED policies under any rule', () => {
    const result = getRiskAlerts(
      [policy({ status: 'CANCELLED', createdAt: new Date(2025, 0, 1) })],
      now,
    )
    expect(result).toEqual([])
  })

  it('returns at most one alert per policy', () => {
    // PENDING would never also match NO_PAYMENT/RECENT_LAPSE rules by status,
    // so this asserts the array has exactly one entry for one input policy.
    const sixteenDaysAgo = new Date(2026, 6, 5)
    const result = getRiskAlerts([policy({ status: 'PENDING', createdAt: sixteenDaysAgo })], now)
    expect(result).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run lib/alerts.test.ts`
Expected: FAIL — `./alerts` module does not exist.

- [ ] **Step 3: Implement `lib/alerts.ts`**

```ts
export type RiskAlertInput = {
  id: string
  policyNumber: string
  carrier: string
  product: string
  clientName: string
  status: string
  createdAt: Date
  effectiveDate: Date | null
  lastPaymentDate: Date | null
  statusChangedAt: Date | null
}

export type RiskAlertType = 'STALLED' | 'NO_PAYMENT' | 'RECENT_LAPSE'

export type RiskAlert = {
  type: RiskAlertType
  policy: {
    id: string
    policyNumber: string
    carrier: string
    product: string
    clientName: string
  }
  daysSince: number
}

const STALLED_THRESHOLD_DAYS = 15
const NO_PAYMENT_THRESHOLD_DAYS = 30
const RECENT_LAPSE_WINDOW_DAYS = 30
const MS_PER_DAY = 24 * 60 * 60 * 1000

function daysBetween(earlier: Date, now: Date): number {
  return Math.floor((now.getTime() - earlier.getTime()) / MS_PER_DAY)
}

function toAlert(type: RiskAlertType, policy: RiskAlertInput, daysSince: number): RiskAlert {
  return {
    type,
    daysSince,
    policy: {
      id: policy.id,
      policyNumber: policy.policyNumber,
      carrier: policy.carrier,
      product: policy.product,
      clientName: policy.clientName,
    },
  }
}

export function getRiskAlerts(policies: RiskAlertInput[], now: Date): RiskAlert[] {
  const alerts: RiskAlert[] = []

  for (const policy of policies) {
    if (policy.status === 'PENDING' || policy.status === 'APPROVED') {
      const days = daysBetween(policy.createdAt, now)
      if (days > STALLED_THRESHOLD_DAYS) {
        alerts.push(toAlert('STALLED', policy, days))
      }
      continue
    }

    if (policy.status === 'INFORCE') {
      const referenceDate = policy.lastPaymentDate ?? policy.effectiveDate
      if (referenceDate === null) {
        alerts.push(toAlert('NO_PAYMENT', policy, Infinity))
        continue
      }
      const days = daysBetween(referenceDate, now)
      if (days > NO_PAYMENT_THRESHOLD_DAYS) {
        alerts.push(toAlert('NO_PAYMENT', policy, days))
      }
      continue
    }

    if (policy.status === 'LAPSED' && policy.statusChangedAt !== null) {
      const days = daysBetween(policy.statusChangedAt, now)
      if (days <= RECENT_LAPSE_WINDOW_DAYS) {
        alerts.push(toAlert('RECENT_LAPSE', policy, days))
      }
    }
  }

  return alerts
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run lib/alerts.test.ts`
Expected: PASS (all 12 cases).

Note on the "both dates null" case: `daysSince` is reported as `Infinity` — this is fine for the classification test (`expect(result[0].type).toBe('NO_PAYMENT')` doesn't check `daysSince`) but Task 4's UI must handle it (render as "sem data de referência" instead of "Infinity dias").

- [ ] **Step 5: Commit**

```bash
git add lib/alerts.ts lib/alerts.test.ts
git commit -m "Add pure risk-alert classification in lib/alerts.ts"
```

---

### Task 4: Wire alerts into the agent dashboard UI

**Files:**
- Modify: `app/agent/page.tsx`

**Interfaces:**
- Consumes: `getRiskAlerts(policies: RiskAlertInput[], now: Date): RiskAlert[]` and `RiskAlert` type from Task 3's `lib/alerts.ts`.

- [ ] **Step 1: Add the import and fetch the extra policy fields needed for classification**

In `app/agent/page.tsx`, add the import near the top:

```ts
import { getRiskAlerts, type RiskAlert } from '@/lib/alerts'
```

Extend the existing `Promise.all` data fetch — add one more query for the fields `getRiskAlerts` needs (separate from the existing `policies` query, which only selects `createdAt` for the monthly chart and is agent+downline free of client name):

```ts
  const [policyCount, commissionTotal, byStatus, byCarrier, byProduct, policies, alertPolicies] = await Promise.all([
    prisma.policy.count({ where: { agentId: agent.id } }),
    prisma.commissionRecord.aggregate({ where: { agentId: agent.id }, _sum: { amount: true } }),
    prisma.policy.groupBy({ by: ['status'], where: { agentId: agent.id }, _count: true }),
    prisma.policy.groupBy({ by: ['carrier'], where: { agentId: agent.id }, _count: true }),
    prisma.policy.groupBy({ by: ['product'], where: { agentId: agent.id }, _count: true }),
    prisma.policy.findMany({ where: { agentId: agent.id }, select: { createdAt: true } }),
    prisma.policy.findMany({
      where: { agentId: agent.id },
      select: {
        id: true,
        policyNumber: true,
        carrier: true,
        product: true,
        status: true,
        createdAt: true,
        effectiveDate: true,
        lastPaymentDate: true,
        statusChangedAt: true,
        client: { select: { name: true } },
      },
    }),
  ])

  const riskAlerts = getRiskAlerts(
    alertPolicies.map((p) => ({
      id: p.id,
      policyNumber: p.policyNumber,
      carrier: p.carrier,
      product: p.product,
      clientName: p.client.name,
      status: p.status,
      createdAt: p.createdAt,
      effectiveDate: p.effectiveDate,
      lastPaymentDate: p.lastPaymentDate,
      statusChangedAt: p.statusChangedAt,
    })),
    new Date(),
  )
```

- [ ] **Step 2: Add the `RiskAlertsSection` component**

Add this component in `app/agent/page.tsx`, next to the other section components (e.g. right after `MonthlyChart`):

```tsx
const ALERT_GROUP_LABELS: Record<RiskAlert['type'], string> = {
  STALLED: 'Paradas no funil (mais de 15 dias)',
  NO_PAYMENT: 'Sem sinal de pagamento (mais de 30 dias)',
  RECENT_LAPSE: 'Lapsaram recentemente',
}

const ALERT_GROUP_TONE: Record<RiskAlert['type'], string> = {
  STALLED: 'bg-gold-pale text-gold',
  NO_PAYMENT: 'bg-danger-pale text-danger',
  RECENT_LAPSE: 'bg-danger-pale text-danger',
}

function RiskAlertsSection({ alerts }: { alerts: RiskAlert[] }) {
  if (alerts.length === 0) return null

  const groups = (['STALLED', 'NO_PAYMENT', 'RECENT_LAPSE'] as const)
    .map((type) => ({ type, items: alerts.filter((a) => a.type === type) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="mt-6 rounded-lg border border-border-steel bg-panel px-5 py-4">
      <h2 className="text-sm font-semibold text-ink">Alertas</h2>
      <div className="mt-3 flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.type}>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${ALERT_GROUP_TONE[group.type]}`}
            >
              {ALERT_GROUP_LABELS[group.type]}
            </span>
            <ul className="mt-2 flex flex-col gap-1">
              {group.items.map((alert) => (
                <li key={alert.policy.id} className="flex items-center justify-between text-sm">
                  <a
                    href={`/agent/policies/${alert.policy.id}`}
                    className="text-teal hover:text-teal-deep"
                  >
                    {alert.policy.policyNumber} — {alert.policy.clientName} ({alert.policy.carrier}, {alert.policy.product})
                  </a>
                  <span className="font-mono tabular-nums text-ink-muted">
                    {Number.isFinite(alert.daysSince) ? `há ${alert.daysSince} dias` : 'sem data de referência'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Render the section in the page body**

In the `AgentDashboard` component's returned JSX, add `<RiskAlertsSection alerts={riskAlerts} />` right after the top `StatCard` grid and before the `BreakdownList` grid:

```tsx
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Minhas apólices" value={policyCount} />
        <StatCard
          label="Minhas comissões (total)"
          value={`$${(commissionTotal._sum.amount?.toNumber() ?? 0).toFixed(2)}`}
        />
        <StatCard label="Tamanho da minha downline" value={downlineIds.length} />
      </div>

      <RiskAlertsSection alerts={riskAlerts} />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
```

- [ ] **Step 4: Verify the full build**

Run: `pnpm exec tsc --noEmit && pnpm build && pnpm exec vitest run`
Expected: all pass, no type errors, no build errors.

- [ ] **Step 5: Manual smoke check**

Run: `pnpm dev`, then log in as `agente.teste@fyntra.test` (senha `TesteFyntra2026!`) and load `/agent`. Since seeded/imported test policies likely have `lastPaymentDate`/`statusChangedAt` null and old `createdAt`, confirm at minimum that the page renders without error and that the "Alertas" block either shows sensible groups or doesn't render (no crash, no "Infinity" leaking into the UI).

- [ ] **Step 6: Commit**

```bash
git add app/agent/page.tsx
git commit -m "Show risk alerts on the agent dashboard"
```

---

### Task 5: Update CSV import documentation/fixtures (if any) and final full verification

**Files:**
- Modify: any sample/fixture CSV under a `docs/` or `fixtures/` folder that lists the policy import column headers, if one exists (search first — see Step 1).

**Interfaces:** none (documentation-only task).

- [ ] **Step 1: Search for a sample policy-import CSV or column-list doc**

Run: `grep -rl "clientName,clientEmail\|agentNpn,carrier" --include="*.csv" --include="*.md" .`

- If a sample CSV or documented column list is found, add a `lastPaymentDate` column (with a plausible example value) to it, matching the order fields appear in `PolicyRowSchema`.
- If nothing is found, skip straight to Step 2 — there's no existing doc to update.

- [ ] **Step 2: Run the full verification suite**

Run: `pnpm exec tsc --noEmit && pnpm build && pnpm exec vitest run`
Expected: all three succeed with no errors.

- [ ] **Step 3: Commit (only if Step 1 changed a file)**

```bash
git add -A
git commit -m "Document lastPaymentDate column in policy import CSV sample"
```
