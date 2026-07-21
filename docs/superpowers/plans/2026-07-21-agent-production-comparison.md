# Comparação de Agentes (Admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only page (`/admin/production`) ranking each agent's direct monthly production (policies sold, premium total, commission total) for a selected `YYYY-MM` period.

**Architecture:** A pure data-layer module (`lib/agent-production.ts`) with a month-boundary parser and a ranking-merge function (same "pure function + injected inputs" pattern as `lib/dashboard.ts`'s `bucketByMonth` and `lib/alerts.ts`'s `getRiskAlerts`), fed by two Prisma `groupBy` queries in a new server component page. Period selection is a plain GET form — no client-side state.

**Tech Stack:** Next.js 16 (App Router, async `searchParams`), Prisma 6, PostgreSQL, TypeScript, Vitest, Tailwind v4.

## Global Constraints

- Role: page requires `requireRole('ADMIN')` (see `lib/require-role.ts`) — no AGENT/CLIENT access.
- Ranking is agent-direct-only: no downline/team rollup. Commission total per row is `sum(CommissionRecord.amount)` where `agentId` = that agent and `period` = selected month — this already includes any override commission that agent personally received (matches the existing calc in `app/agent/page.tsx:143`).
- Policy metrics (count, premium sum) are filtered by `Policy.createdAt` within `[start, end)` of the selected month — same period as the commission filter, so every column in a row reflects the same month.
- All agents appear in the table, even with zero production in the selected period (rows with zeros, not omitted).
- Table sorted by commission total descending; no interactive re-sort by other columns.
- Period selector: union of distinct `CommissionRecord.period` values plus the current month (`YYYY-MM` from `new Date()`) if not already present, sorted descending, defaulting to the most recent.
- No new client-side JS/state — the period selector is a plain `<form method="GET">` with a `<select>` that auto-submits on change via a `<noscript>`-safe native form (see Task 2 for the exact approach).
- Reuse existing components: `Table`, `Thead`, `Th`, `Tr`, `Td`, `TdNum` from `components/Table.tsx`; `Select` from `components/Field.tsx`; `Shell` from `components/Shell.tsx`.

---

### Task 1: `lib/agent-production.ts` — pure month-boundary and ranking-merge functions

**Files:**
- Create: `lib/agent-production.ts`
- Create: `lib/agent-production.test.ts`

**Interfaces:**
- Consumes: nothing from prior tasks (standalone, no Prisma import).
- Produces: `getMonthBounds(period: string): { start: Date; end: Date }`, `ProductionRow` type, `buildProductionRanking(agents, policyStats, commissionStats): ProductionRow[]` — both consumed by Task 2.

- [ ] **Step 1: Write the failing tests**

Create `lib/agent-production.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { getMonthBounds, buildProductionRanking } from './agent-production'

describe('getMonthBounds', () => {
  it('returns the first instant of the month through the first instant of the next month', () => {
    const { start, end } = getMonthBounds('2026-07')
    expect(start).toEqual(new Date(2026, 6, 1))
    expect(end).toEqual(new Date(2026, 7, 1))
  })

  it('rolls over correctly across a year boundary', () => {
    const { start, end } = getMonthBounds('2026-12')
    expect(start).toEqual(new Date(2026, 11, 1))
    expect(end).toEqual(new Date(2027, 0, 1))
  })

  it('pads single-digit months correctly (January)', () => {
    const { start, end } = getMonthBounds('2026-01')
    expect(start).toEqual(new Date(2026, 0, 1))
    expect(end).toEqual(new Date(2026, 1, 1))
  })
})

describe('buildProductionRanking', () => {
  const agents = [
    { id: 'a1', name: 'Agente Um' },
    { id: 'a2', name: 'Agente Dois' },
    { id: 'a3', name: 'Agente Três (sem produção)' },
  ]

  it('merges policy and commission stats by agentId', () => {
    const policyStats = [
      { agentId: 'a1', count: 3, premiumSum: 150.5 },
      { agentId: 'a2', count: 1, premiumSum: 40 },
    ]
    const commissionStats = [
      { agentId: 'a1', sum: 200 },
      { agentId: 'a2', sum: 500 },
    ]
    const result = buildProductionRanking(agents, policyStats, commissionStats)
    expect(result).toEqual([
      { agentId: 'a2', agentName: 'Agente Dois', policyCount: 1, premiumTotal: 40, commissionTotal: 500 },
      { agentId: 'a1', agentName: 'Agente Um', policyCount: 3, premiumTotal: 150.5, commissionTotal: 200 },
      { agentId: 'a3', agentName: 'Agente Três (sem produção)', policyCount: 0, premiumTotal: 0, commissionTotal: 0 },
    ])
  })

  it('sorts by commissionTotal descending', () => {
    const policyStats: { agentId: string; count: number; premiumSum: number }[] = []
    const commissionStats = [
      { agentId: 'a1', sum: 10 },
      { agentId: 'a2', sum: 999 },
      { agentId: 'a3', sum: 50 },
    ]
    const result = buildProductionRanking(agents, policyStats, commissionStats)
    expect(result.map((r) => r.agentId)).toEqual(['a2', 'a3', 'a1'])
  })

  it('includes agents with zero production in every column', () => {
    const result = buildProductionRanking(agents, [], [])
    expect(result).toEqual([
      { agentId: 'a1', agentName: 'Agente Um', policyCount: 0, premiumTotal: 0, commissionTotal: 0 },
      { agentId: 'a2', agentName: 'Agente Dois', policyCount: 0, premiumTotal: 0, commissionTotal: 0 },
      { agentId: 'a3', agentName: 'Agente Três (sem produção)', policyCount: 0, premiumTotal: 0, commissionTotal: 0 },
    ])
  })

  it('returns an empty array when there are no agents', () => {
    expect(buildProductionRanking([], [], [])).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run lib/agent-production.test.ts`
Expected: FAIL — `./agent-production` module does not exist.

- [ ] **Step 3: Implement `lib/agent-production.ts`**

```ts
export function getMonthBounds(period: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = period.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr) - 1
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 1)
  return { start, end }
}

export type ProductionRow = {
  agentId: string
  agentName: string
  policyCount: number
  premiumTotal: number
  commissionTotal: number
}

export function buildProductionRanking(
  agents: { id: string; name: string }[],
  policyStats: { agentId: string; count: number; premiumSum: number }[],
  commissionStats: { agentId: string; sum: number }[],
): ProductionRow[] {
  const policyByAgent = new Map(policyStats.map((p) => [p.agentId, p]))
  const commissionByAgent = new Map(commissionStats.map((c) => [c.agentId, c.sum]))

  const rows = agents.map((agent) => {
    const policy = policyByAgent.get(agent.id)
    return {
      agentId: agent.id,
      agentName: agent.name,
      policyCount: policy?.count ?? 0,
      premiumTotal: policy?.premiumSum ?? 0,
      commissionTotal: commissionByAgent.get(agent.id) ?? 0,
    }
  })

  return rows.sort((a, b) => b.commissionTotal - a.commissionTotal)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run lib/agent-production.test.ts`
Expected: PASS (all 7 cases).

- [ ] **Step 5: Commit**

```bash
git add lib/agent-production.ts lib/agent-production.test.ts
git commit -m "Add pure month-bounds and production-ranking functions in lib/agent-production.ts"
```

---

### Task 2: Period-list helper and `/admin/production` page

**Files:**
- Create: `app/admin/production/page.tsx`

**Interfaces:**
- Consumes: `getMonthBounds`, `ProductionRow`, `buildProductionRanking` from Task 1's `lib/agent-production.ts`.

- [ ] **Step 1: Read the current-month helper convention**

`bucketByMonth` in `lib/dashboard.ts` and the risk-alerts page both build a `YYYY-MM` string via `new Date()`. This page needs the same format for its "current month" fallback in the period list. Use this inline (no new shared helper needed — it's a two-line expression used once):

```ts
function currentPeriod(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
```

- [ ] **Step 2: Write `app/admin/production/page.tsx`**

```tsx
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { getMonthBounds, buildProductionRanking } from '@/lib/agent-production'
import { Shell } from '@/components/Shell'
import { Table, Thead, Th, Tr, Td, TdNum } from '@/components/Table'
import { Select } from '@/components/Field'

function currentPeriod(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const session = await requireRole('ADMIN')
  const { period: periodParam } = await searchParams

  const distinctPeriods = await prisma.commissionRecord.findMany({
    distinct: ['period'],
    select: { period: true },
    orderBy: { period: 'desc' },
  })
  const periods = Array.from(
    new Set([...distinctPeriods.map((p) => p.period), currentPeriod(new Date())]),
  ).sort((a, b) => b.localeCompare(a))

  const period = periodParam && periods.includes(periodParam) ? periodParam : periods[0]
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
    policyStats.map((p) => ({
      agentId: p.agentId,
      count: p._count,
      premiumSum: p._sum.premium?.toNumber() ?? 0,
    })),
    commissionStats.map((c) => ({
      agentId: c.agentId,
      sum: c._sum.amount?.toNumber() ?? 0,
    })),
  )

  return (
    <Shell role="ADMIN" userName={session.user.name}>
      <h1 className="text-[1.5rem] font-semibold tracking-tight text-ink">Produção por agente</h1>

      <form method="GET" className="mt-4">
        <Select name="period" defaultValue={period} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
          {periods.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </form>

      <div className="mt-6">
        <Table>
          <Thead>
            <tr>
              <Th>Agente</Th>
              <Th className="text-right">Apólices</Th>
              <Th className="text-right">Prêmio total</Th>
              <Th className="text-right">Comissão total</Th>
            </tr>
          </Thead>
          <tbody>
            {rows.map((row) => (
              <Tr key={row.agentId}>
                <Td className="font-medium">{row.agentName}</Td>
                <TdNum>{row.policyCount}</TdNum>
                <TdNum>${row.premiumTotal.toFixed(2)}</TdNum>
                <TdNum>${row.commissionTotal.toFixed(2)}</TdNum>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Shell>
  )
}
```

Note on the `onChange` auto-submit: this runs `requestSubmit()` on the native `<form>` element from a Server Component's rendered HTML — no client component, no `'use client'`, no extra state needed, since `onChange` on a plain DOM `<select>` inside a Server Component still works as an inline DOM event handler serialized by React (this is standard App Router behavior for native-element event handlers in a Server Component's JSX — it does not require the component itself to be a Client Component). If `tsc`/`build` flags this (Server Components cannot pass function props to Client Components, but CAN attach native DOM event handlers directly), see Step 4 for the fallback.

- [ ] **Step 3: Verify the build**

Run: `pnpm exec tsc --noEmit && pnpm build`
Expected: no type errors, build succeeds.

- [ ] **Step 4: If Step 3 fails specifically on the `onChange` handler**

Next.js Server Components cannot serialize inline function event handlers passed to elements when the file has no `'use client'` directive, even for native DOM elements — if `pnpm build` errors here (message like "Event handlers cannot be passed to Client Component props" or similar), replace the auto-submit `<select>` with an explicit submit button instead (no client component needed):

```tsx
      <form method="GET" className="mt-4 flex items-center gap-2">
        <Select name="period" defaultValue={period}>
          {periods.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <button
          type="submit"
          className="rounded-md border border-border-steel bg-paper px-4 py-2.5 text-sm font-semibold text-ink hover:border-teal"
        >
          Aplicar
        </button>
      </form>
```

Re-run `pnpm exec tsc --noEmit && pnpm build` and confirm it passes with this version instead.

- [ ] **Step 5: Run the full test suite**

Run: `pnpm exec vitest run`
Expected: all tests pass (including Task 1's new tests).

- [ ] **Step 6: Manual smoke check**

Run: `pnpm dev`, log in as `admin.teste@fyntra.test` (or the local seed `admin@ricos.test` / `password123`), and load `/admin/production`. Confirm: the page renders without error, the period dropdown lists at least the current month, switching periods reloads with the right `?period=` in the URL, and the table shows every agent (including ones with all-zero columns) sorted by commission descending.

- [ ] **Step 7: Commit**

```bash
git add app/admin/production/page.tsx
git commit -m "Add admin agent-production comparison page"
```

---

### Task 3: Link the new page from admin navigation

**Files:**
- Modify: `components/Shell.tsx` (admin nav links)

**Interfaces:** none (UI-only, no new exports).

- [ ] **Step 1: Find the admin nav links**

Run: `grep -n "admin/agents\|admin/commission-plans\|admin/import" components/Shell.tsx`

- [ ] **Step 2: Add a nav entry for the new page**

Read the surrounding code at the matched lines (the exact array/JSX structure isn't known ahead of time — inspect it directly) and add an entry for `/admin/production` with label "Produção", following the exact same shape (object literal or JSX element) as the existing ADMIN-role nav entries for `/admin/agents`, `/admin/commission-plans`, and `/admin/import`. Place it in a position that reads naturally alongside the existing admin links (e.g., after "Agentes", before "Planos de comissão" — match whatever ordering convention the existing entries already follow).

- [ ] **Step 3: Verify the build**

Run: `pnpm exec tsc --noEmit && pnpm build`
Expected: no errors.

- [ ] **Step 4: Manual smoke check**

Run: `pnpm dev`, log in as an ADMIN user, confirm "Produção" (or the chosen label) appears in the nav and links to `/admin/production`.

- [ ] **Step 5: Commit**

```bash
git add components/Shell.tsx
git commit -m "Link agent-production page from admin navigation"
```

---

### Task 4: Final full verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Run the complete verification suite**

Run: `pnpm exec tsc --noEmit && pnpm build && pnpm exec vitest run`
Expected: all three succeed with no errors, full test suite passing (Task 1's 7 new tests plus all pre-existing tests).

- [ ] **Step 2: Confirm no stray files**

Run: `git status`
Expected: working tree clean (everything from Tasks 1-3 already committed) — if anything is uncommitted, review and commit it before finishing.
