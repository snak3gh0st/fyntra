# lifeOS MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the lifeOS MVP — a single Next.js app where RICOS agents manage their multi-level hierarchy, clients, policies, and commissions (fed by CSV import), and clients view their own policies.

**Architecture:** Next.js 15 (App Router, TypeScript) monolith, Prisma + PostgreSQL (`btdb`, database `lifeos`), Better Auth for session/roles (`ADMIN` | `AGENT` | `CLIENT`), deployed on Coolify (`btapps`). Hierarchy and commission-override logic are pure, dependency-free TypeScript functions (the org is capped at ~300 agents, so loading the whole agent table into memory and computing in-process is simpler and just as fast as a recursive SQL CTE — no need for that complexity at this scale).

**Tech Stack:** Next.js 15, TypeScript, Prisma 6, PostgreSQL, Better Auth, Zod (CSV row validation), csv-parse (CSV parsing), Vitest (tests), pnpm.

## Global Constraints

- Database: PostgreSQL at `10.0.0.2:6432` (pgbouncer), database `lifeos`, role `lifeos_app`. Connection string lives in `.env` (never committed) — see `.env.example`.
- Every mutation to `Agent.parentAgentId`/`rank` and every `CommissionRecord` write must produce an `AuditLog` row — no silent financial/organizational changes.
- CSV import must never abort entirely because one row is invalid — collect per-row errors, persist valid rows, report the rest.
- Package manager: pnpm.
- Node version: 22 LTS.

---

### Task 1: Project scaffold & Prisma connection

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`
- Create: `prisma/schema.prisma` (datasource/generator only — models come in Task 2)
- Create: `vitest.config.ts`
- Modify: `.env.example` (already exists — confirm `DATABASE_URL` shape matches)

**Interfaces:**
- Produces: a running `pnpm dev` Next.js app and a `pnpm exec prisma db pull`-able connection to `lifeos`.

- [ ] **Step 1: Scaffold Next.js app**

```bash
pnpm dlx create-next-app@latest . --typescript --app --eslint --tailwind --src-dir=false --import-alias "@/*" --use-pnpm --no-git
```

When prompted about the non-empty directory (README.md, .gitignore, .env.example, docs/ already exist), confirm to proceed in the current directory.

- [ ] **Step 2: Install Prisma and initialize**

```bash
pnpm add -D prisma
pnpm add @prisma/client
pnpm exec prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma` and appends `DATABASE_URL` to `.env` — replace that line with the real connection string (see README for the value) rather than committing it.

- [ ] **Step 3: Verify DB connectivity**

Run: `pnpm exec prisma db pull`
Expected: `Introspecting based on datasource defined in prisma/schema.prisma … The introspected database was empty` (empty is correct — no tables exist yet).

- [ ] **Step 4: Add Vitest**

```bash
pnpm add -D vitest
```

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app, connect Prisma to lifeos database"
```

---

### Task 2: Prisma schema & migration

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: Prisma models `User`, `Agent`, `Client`, `Policy`, `CommissionPlan`, `CommissionRecord`, `ImportBatch`, `AuditLog`, and enums `Role`, `AgentStatus`, `PolicyStatus`, `CommissionType`, `ImportType`, `ImportStatus` — every later task's Prisma calls depend on these exact field names.

- [ ] **Step 1: Write the full schema**

Append to `prisma/schema.prisma` (keep the existing `generator`/`datasource` blocks at the top):

```prisma
enum Role {
  ADMIN
  AGENT
  CLIENT
}

enum AgentStatus {
  ACTIVE
  INACTIVE
}

enum PolicyStatus {
  PENDING
  APPROVED
  INFORCE
  LAPSED
  CANCELLED
}

enum CommissionType {
  DIRECT
  OVERRIDE
}

enum ImportType {
  POLICIES
  COMMISSIONS
}

enum ImportStatus {
  PROCESSING
  COMPLETED
  COMPLETED_WITH_ERRORS
  FAILED
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      Role
  createdAt DateTime @default(now())

  agent     Agent?
  client    Client?
  imports   ImportBatch[]
  auditLogs AuditLog[]
}

model Agent {
  id            String      @id @default(cuid())
  userId        String      @unique
  user          User        @relation(fields: [userId], references: [id])
  parentAgentId String?
  parentAgent   Agent?      @relation("AgentHierarchy", fields: [parentAgentId], references: [id])
  subAgents     Agent[]     @relation("AgentHierarchy")
  rank          String
  npn           String?     @unique
  status        AgentStatus @default(ACTIVE)
  createdAt     DateTime    @default(now())

  clients           Client[]
  policies          Policy[]
  commissionRecords CommissionRecord[]

  @@index([parentAgentId])
}

model Client {
  id              String   @id @default(cuid())
  userId          String?  @unique
  user            User?    @relation(fields: [userId], references: [id])
  name            String
  email           String?
  phone           String?
  assignedAgentId String
  assignedAgent   Agent    @relation(fields: [assignedAgentId], references: [id])
  createdAt       DateTime @default(now())

  policies Policy[]

  @@index([assignedAgentId])
}

model Policy {
  id            String        @id @default(cuid())
  clientId      String
  client        Client        @relation(fields: [clientId], references: [id])
  agentId       String
  agent         Agent         @relation(fields: [agentId], references: [id])
  carrier       String
  product       String
  policyNumber  String        @unique
  faceAmount    Decimal
  premium       Decimal
  status        PolicyStatus
  effectiveDate DateTime?
  importBatchId String?
  importBatch   ImportBatch?  @relation(fields: [importBatchId], references: [id])
  createdAt     DateTime      @default(now())

  commissionRecords CommissionRecord[]

  @@index([agentId])
  @@index([clientId])
}

model CommissionPlan {
  id              String  @id @default(cuid())
  rank            String
  downlineLevel   Int
  overridePercent Decimal

  @@unique([rank, downlineLevel])
}

model CommissionRecord {
  id            String         @id @default(cuid())
  policyId      String
  policy        Policy         @relation(fields: [policyId], references: [id])
  agentId       String
  agent         Agent          @relation(fields: [agentId], references: [id])
  amount        Decimal
  type          CommissionType
  level         Int            @default(0)
  period        String
  importBatchId String?
  importBatch   ImportBatch?   @relation(fields: [importBatchId], references: [id])
  createdAt     DateTime       @default(now())

  @@index([agentId])
  @@index([policyId])
}

model ImportBatch {
  id           String       @id @default(cuid())
  uploadedById String
  uploadedBy   User         @relation(fields: [uploadedById], references: [id])
  filename     String
  type         ImportType
  status       ImportStatus @default(PROCESSING)
  rowErrors    Json?
  createdAt    DateTime     @default(now())

  policies          Policy[]
  commissionRecords CommissionRecord[]
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  action    String
  entity    String
  entityId  String
  before    Json?
  after     Json?
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2: Run the migration**

Run: `pnpm exec prisma migrate dev --name init`
Expected: `Your database is now in sync with your schema.` and a new file under `prisma/migrations/`.

- [ ] **Step 3: Generate the client and verify it compiles**

Run: `pnpm exec prisma generate && pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "Add core Prisma schema and initial migration"
```

---

### Task 3: Better Auth setup with roles

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...all]/route.ts`
- Create: `lib/auth-client.ts`
- Create: `middleware.ts`
- Modify: `prisma/schema.prisma` (Better Auth's required tables, added via its CLI)

**Interfaces:**
- Consumes: Prisma `User` model (Task 2), extended with a `role` field already present.
- Produces: `auth` (server instance, `lib/auth.ts`), `authClient` (`lib/auth-client.ts`) with `authClient.signIn`, `authClient.signUp`, `authClient.useSession`. `middleware.ts` exports the route matcher that redirects unauthenticated requests to `/login`.

- [ ] **Step 1: Install Better Auth**

```bash
pnpm add better-auth
```

- [ ] **Step 2: Configure the server instance**

Create `lib/auth.ts`:

```typescript
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@/lib/prisma'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: { type: 'string', required: true, defaultValue: 'AGENT' },
    },
  },
})
```

Create `lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 3: Generate and run Better Auth's schema migration**

Run: `pnpm exec @better-auth/cli generate && pnpm exec prisma migrate dev --name add_better_auth`
Expected: new `session`, `account`, `verification` models appended to `prisma/schema.prisma`, migration applied cleanly.

- [ ] **Step 4: Wire the API route**

Create `app/api/auth/[...all]/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

- [ ] **Step 5: Client instance**

Create `lib/auth-client.ts`:

```typescript
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()
```

- [ ] **Step 6: Route protection middleware**

Create `middleware.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request)
  if (!sessionCookie && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/agent/:path*', '/client/:path*'],
}
```

- [ ] **Step 7: Verify the app builds**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Add Better Auth with role field and route protection middleware"
```

---

### Task 4: Seed script

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add `"prisma": { "seed": "tsx prisma/seed.ts" }`)

**Interfaces:**
- Consumes: `prisma` client (Task 3), all models from Task 2.
- Produces: a runnable `pnpm exec prisma db seed` that creates 1 admin, a 3-level agent hierarchy (5 agents), 2 clients, 2 policies, and a `CommissionPlan` with 2 levels — used as manual-testing fixtures for every UI task below.

- [ ] **Step 1: Install tsx**

```bash
pnpm add -D tsx
```

- [ ] **Step 2: Write the seed script**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.create({
    data: { email: 'admin@ricos.test', name: 'Admin RICOS', role: 'ADMIN' },
  })

  const topUser = await prisma.user.create({
    data: { email: 'top@ricos.test', name: 'Agente Topo', role: 'AGENT' },
  })
  const top = await prisma.agent.create({
    data: { userId: topUser.id, rank: 'DIRECTOR', npn: '1000001', status: 'ACTIVE' },
  })

  const midUser = await prisma.user.create({
    data: { email: 'mid@ricos.test', name: 'Agente Meio', role: 'AGENT' },
  })
  const mid = await prisma.agent.create({
    data: {
      userId: midUser.id,
      parentAgentId: top.id,
      rank: 'MANAGER',
      npn: '1000002',
      status: 'ACTIVE',
    },
  })

  const leafUser = await prisma.user.create({
    data: { email: 'leaf@ricos.test', name: 'Agente Base', role: 'AGENT' },
  })
  const leaf = await prisma.agent.create({
    data: {
      userId: leafUser.id,
      parentAgentId: mid.id,
      rank: 'AGENT',
      npn: '1000003',
      status: 'ACTIVE',
    },
  })

  await prisma.commissionPlan.createMany({
    data: [
      { rank: 'MANAGER', downlineLevel: 1, overridePercent: 10 },
      { rank: 'DIRECTOR', downlineLevel: 2, overridePercent: 5 },
    ],
  })

  const clientUser = await prisma.user.create({
    data: { email: 'client@ricos.test', name: 'Cliente Exemplo', role: 'CLIENT' },
  })
  const client = await prisma.client.create({
    data: { userId: clientUser.id, name: 'Cliente Exemplo', assignedAgentId: leaf.id },
  })

  await prisma.policy.create({
    data: {
      clientId: client.id,
      agentId: leaf.id,
      carrier: 'National Life Group',
      product: 'Term 20',
      policyNumber: 'NLG-0001',
      faceAmount: 250000,
      premium: 45.5,
      status: 'INFORCE',
    },
  })

  console.log({ admin: admin.email, top: top.id, mid: mid.id, leaf: leaf.id })
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
```

- [ ] **Step 3: Register the seed command**

In `package.json`, add:

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 4: Run it**

Run: `pnpm exec prisma db seed`
Expected: logs the created `admin`/`top`/`mid`/`leaf` ids, exits 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add Prisma seed script with sample hierarchy and policy"
```

---

### Task 5: Hierarchy engine (pure functions + tests)

**Files:**
- Create: `lib/hierarchy.ts`
- Test: `lib/hierarchy.test.ts`

**Interfaces:**
- Produces:
  - `type AgentNode = { id: string; parentAgentId: string | null }`
  - `getDownlineIds(agents: AgentNode[], rootId: string): string[]`
  - `getUplineIds(agents: AgentNode[], startId: string): string[]`
- Consumed by: Task 6 (commission engine), Task 12/13 (agent UI queries all `Agent` rows then calls these).

- [ ] **Step 1: Write the failing tests**

Create `lib/hierarchy.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { getDownlineIds, getUplineIds, type AgentNode } from './hierarchy'

const agents: AgentNode[] = [
  { id: 'top', parentAgentId: null },
  { id: 'mid', parentAgentId: 'top' },
  { id: 'leaf', parentAgentId: 'mid' },
  { id: 'other-top', parentAgentId: null },
]

describe('getDownlineIds', () => {
  it('returns all descendants, not siblings or unrelated trees', () => {
    expect(getDownlineIds(agents, 'top')).toEqual(['mid', 'leaf'])
  })

  it('returns an empty array for a leaf node', () => {
    expect(getDownlineIds(agents, 'leaf')).toEqual([])
  })
})

describe('getUplineIds', () => {
  it('returns all ancestors in order from immediate parent upward', () => {
    expect(getUplineIds(agents, 'leaf')).toEqual(['mid', 'top'])
  })

  it('returns an empty array for a root node', () => {
    expect(getUplineIds(agents, 'top')).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run lib/hierarchy.test.ts`
Expected: FAIL — `Cannot find module './hierarchy'`

- [ ] **Step 3: Implement**

Create `lib/hierarchy.ts`:

```typescript
export type AgentNode = { id: string; parentAgentId: string | null }

export function getDownlineIds(agents: AgentNode[], rootId: string): string[] {
  const childrenByParent = new Map<string, string[]>()
  for (const agent of agents) {
    if (agent.parentAgentId === null) continue
    const siblings = childrenByParent.get(agent.parentAgentId) ?? []
    siblings.push(agent.id)
    childrenByParent.set(agent.parentAgentId, siblings)
  }

  const result: string[] = []
  const queue = [...(childrenByParent.get(rootId) ?? [])]
  while (queue.length > 0) {
    const current = queue.shift() as string
    result.push(current)
    queue.push(...(childrenByParent.get(current) ?? []))
  }
  return result
}

export function getUplineIds(agents: AgentNode[], startId: string): string[] {
  const parentById = new Map(agents.map((a) => [a.id, a.parentAgentId]))
  const result: string[] = []
  let currentParent = parentById.get(startId) ?? null
  while (currentParent !== null && currentParent !== undefined) {
    result.push(currentParent)
    currentParent = parentById.get(currentParent) ?? null
  }
  return result
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run lib/hierarchy.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/hierarchy.ts lib/hierarchy.test.ts
git commit -m "Add hierarchy traversal engine with tests"
```

---

### Task 6: Commission override engine (pure functions + tests)

**Files:**
- Create: `lib/commission.ts`
- Test: `lib/commission.test.ts`

**Interfaces:**
- Consumes: `AgentNode`, `getUplineIds` from `lib/hierarchy.ts` (Task 5).
- Produces:
  - `type AgentRankInfo = { id: string; parentAgentId: string | null; rank: string }`
  - `type PlanLookup = (rank: string, downlineLevel: number) => number | null` (returns override percent, or `null` if no plan matches)
  - `type OverrideResult = { agentId: string; level: number; amount: number }`
  - `computeOverrides(agents: AgentRankInfo[], directAgentId: string, baseAmount: number, lookupPlan: PlanLookup): OverrideResult[]`
- Consumed by: Task 8 (CSV import service persists these as `CommissionRecord` rows with `type: 'OVERRIDE'`).

- [ ] **Step 1: Write the failing tests**

Create `lib/commission.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { computeOverrides, type AgentRankInfo, type PlanLookup } from './commission'

const agents: AgentRankInfo[] = [
  { id: 'top', parentAgentId: null, rank: 'DIRECTOR' },
  { id: 'mid', parentAgentId: 'top', rank: 'MANAGER' },
  { id: 'leaf', parentAgentId: 'mid', rank: 'AGENT' },
]

const lookupPlan: PlanLookup = (rank, level) => {
  if (rank === 'MANAGER' && level === 1) return 10
  if (rank === 'DIRECTOR' && level === 2) return 5
  return null
}

describe('computeOverrides', () => {
  it('computes an override for every ancestor with a matching plan', () => {
    const result = computeOverrides(agents, 'leaf', 100, lookupPlan)
    expect(result).toEqual([
      { agentId: 'mid', level: 1, amount: 10 },
      { agentId: 'top', level: 2, amount: 5 },
    ])
  })

  it('skips ancestors whose rank/level has no matching plan', () => {
    const noPlan: PlanLookup = () => null
    expect(computeOverrides(agents, 'leaf', 100, noPlan)).toEqual([])
  })

  it('returns an empty array for a root agent (no upline)', () => {
    expect(computeOverrides(agents, 'top', 100, lookupPlan)).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run lib/commission.test.ts`
Expected: FAIL — `Cannot find module './commission'`

- [ ] **Step 3: Implement**

Create `lib/commission.ts`:

```typescript
import { getUplineIds, type AgentNode } from './hierarchy'

export type AgentRankInfo = AgentNode & { rank: string }
export type PlanLookup = (rank: string, downlineLevel: number) => number | null
export type OverrideResult = { agentId: string; level: number; amount: number }

export function computeOverrides(
  agents: AgentRankInfo[],
  directAgentId: string,
  baseAmount: number,
  lookupPlan: PlanLookup,
): OverrideResult[] {
  const rankById = new Map(agents.map((a) => [a.id, a.rank]))
  const uplineIds = getUplineIds(agents, directAgentId)

  const results: OverrideResult[] = []
  uplineIds.forEach((agentId, index) => {
    const level = index + 1
    const rank = rankById.get(agentId)
    if (!rank) return
    const percent = lookupPlan(rank, level)
    if (percent === null) return
    results.push({ agentId, level, amount: (baseAmount * percent) / 100 })
  })
  return results
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run lib/commission.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/commission.ts lib/commission.test.ts
git commit -m "Add commission override engine with tests"
```

---

### Task 7: CSV row validators (Zod schemas + tests)

**Files:**
- Create: `lib/csv/schemas.ts`
- Test: `lib/csv/schemas.test.ts`

**Interfaces:**
- Produces:
  - `PolicyRowSchema` (Zod schema), `type PolicyRow = z.infer<typeof PolicyRowSchema>`
  - `CommissionRowSchema` (Zod schema), `type CommissionRow = z.infer<typeof CommissionRowSchema>`
- Consumed by: Task 8 (import service parses raw CSV rows through these schemas).

- [ ] **Step 1: Install Zod and csv-parse**

```bash
pnpm add zod csv-parse
```

- [ ] **Step 2: Write the failing tests**

Create `lib/csv/schemas.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { PolicyRowSchema, CommissionRowSchema } from './schemas'

describe('PolicyRowSchema', () => {
  it('accepts a valid row and coerces numeric/date fields', () => {
    const result = PolicyRowSchema.safeParse({
      clientName: 'Cliente Exemplo',
      clientEmail: 'cliente@example.com',
      agentNpn: '1000003',
      carrier: 'National Life Group',
      product: 'Term 20',
      policyNumber: 'NLG-0002',
      faceAmount: '250000',
      premium: '45.50',
      status: 'INFORCE',
      effectiveDate: '2026-01-15',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.faceAmount).toBe(250000)
      expect(result.data.premium).toBe(45.5)
    }
  })

  it('rejects a row missing policyNumber', () => {
    const result = PolicyRowSchema.safeParse({
      clientName: 'Cliente Exemplo',
      agentNpn: '1000003',
      carrier: 'National Life Group',
      product: 'Term 20',
      faceAmount: '250000',
      premium: '45.50',
      status: 'INFORCE',
    })
    expect(result.success).toBe(false)
  })
})

describe('CommissionRowSchema', () => {
  it('accepts a valid row', () => {
    const result = CommissionRowSchema.safeParse({
      policyNumber: 'NLG-0002',
      agentNpn: '1000003',
      amount: '45.50',
      period: '2026-01',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-numeric amount', () => {
    const result = CommissionRowSchema.safeParse({
      policyNumber: 'NLG-0002',
      agentNpn: '1000003',
      amount: 'not-a-number',
      period: '2026-01',
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm exec vitest run lib/csv/schemas.test.ts`
Expected: FAIL — `Cannot find module './schemas'`

- [ ] **Step 4: Implement**

Create `lib/csv/schemas.ts`:

```typescript
import { z } from 'zod'

const numericString = z.string().transform((val, ctx) => {
  const parsed = Number(val)
  if (Number.isNaN(parsed)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `"${val}" is not a number` })
    return z.NEVER
  }
  return parsed
})

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
})

export type PolicyRow = z.infer<typeof PolicyRowSchema>

export const CommissionRowSchema = z.object({
  policyNumber: z.string().min(1),
  agentNpn: z.string().min(1),
  amount: numericString,
  period: z.string().regex(/^\d{4}-\d{2}$/, 'period must be YYYY-MM'),
})

export type CommissionRow = z.infer<typeof CommissionRowSchema>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run lib/csv/schemas.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/csv/
git commit -m "Add CSV row validators for policy and commission imports"
```

---

### Task 8: CSV import service

**Files:**
- Create: `lib/csv/import-service.ts`
- Test: `lib/csv/import-service.test.ts`

**Interfaces:**
- Consumes: `PolicyRowSchema`, `CommissionRowSchema` (Task 7); `computeOverrides` (Task 6); Prisma models (Task 2).
- Produces:
  - `parseCsv(content: string): Record<string, string>[]`
  - `importPolicies(content: string, uploadedById: string): Promise<{ batchId: string; successCount: number; errors: { row: number; message: string }[] }>`
  - `importCommissions(content: string, uploadedById: string): Promise<{ batchId: string; successCount: number; errors: { row: number; message: string }[] }>`
- Consumed by: Task 9 (admin import UI calls these from a server action).

- [ ] **Step 1: Write the failing test for `parseCsv`**

Create `lib/csv/import-service.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { parseCsv } from './import-service'

describe('parseCsv', () => {
  it('parses a header row into keyed objects', () => {
    const content = 'policyNumber,agentNpn,amount,period\nNLG-0002,1000003,45.50,2026-01'
    expect(parseCsv(content)).toEqual([
      { policyNumber: 'NLG-0002', agentNpn: '1000003', amount: '45.50', period: '2026-01' },
    ])
  })

  it('returns an empty array for a header-only file', () => {
    const content = 'policyNumber,agentNpn,amount,period'
    expect(parseCsv(content)).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run lib/csv/import-service.test.ts`
Expected: FAIL — `Cannot find module './import-service'`

- [ ] **Step 3: Implement the service**

Create `lib/csv/import-service.ts`:

```typescript
import { parse } from 'csv-parse/sync'
import { prisma } from '@/lib/prisma'
import { computeOverrides } from '@/lib/commission'
import { PolicyRowSchema, CommissionRowSchema } from './schemas'

export function parseCsv(content: string): Record<string, string>[] {
  return parse(content, { columns: true, skip_empty_lines: true, trim: true })
}

type ImportResult = {
  batchId: string
  successCount: number
  errors: { row: number; message: string }[]
}

export async function importPolicies(content: string, uploadedById: string): Promise<ImportResult> {
  const rows = parseCsv(content)
  const batch = await prisma.importBatch.create({
    data: { uploadedById, filename: 'policies.csv', type: 'POLICIES', status: 'PROCESSING' },
  })

  const errors: { row: number; message: string }[] = []
  let successCount = 0

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
        importBatchId: batch.id,
      },
      update: {
        carrier: row.carrier,
        product: row.product,
        faceAmount: row.faceAmount,
        premium: row.premium,
        status: row.status,
        importBatchId: batch.id,
      },
    })
    successCount += 1
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: errors.length > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
      rowErrors: errors,
    },
  })

  return { batchId: batch.id, successCount, errors }
}

export async function importCommissions(content: string, uploadedById: string): Promise<ImportResult> {
  const rows = parseCsv(content)
  const batch = await prisma.importBatch.create({
    data: { uploadedById, filename: 'commissions.csv', type: 'COMMISSIONS', status: 'PROCESSING' },
  })

  const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true, rank: true } })
  const plans = await prisma.commissionPlan.findMany()
  const lookupPlan = (rank: string, level: number) => {
    const plan = plans.find((p) => p.rank === rank && p.downlineLevel === level)
    return plan ? Number(plan.overridePercent) : null
  }

  const errors: { row: number; message: string }[] = []
  let successCount = 0

  for (const [index, rawRow] of rows.entries()) {
    const parsed = CommissionRowSchema.safeParse(rawRow)
    if (!parsed.success) {
      errors.push({ row: index + 2, message: parsed.error.issues.map((i) => i.message).join('; ') })
      continue
    }
    const row = parsed.data
    const agent = await prisma.agent.findUnique({ where: { npn: row.agentNpn } })
    const policy = await prisma.policy.findUnique({ where: { policyNumber: row.policyNumber } })
    if (!agent || !policy) {
      errors.push({
        row: index + 2,
        message: !agent ? `No agent found with NPN ${row.agentNpn}` : `No policy found with number ${row.policyNumber}`,
      })
      continue
    }

    await prisma.commissionRecord.create({
      data: {
        policyId: policy.id,
        agentId: agent.id,
        amount: row.amount,
        type: 'DIRECT',
        level: 0,
        period: row.period,
        importBatchId: batch.id,
      },
    })

    const overrides = computeOverrides(allAgents, agent.id, row.amount, lookupPlan)
    for (const override of overrides) {
      await prisma.commissionRecord.create({
        data: {
          policyId: policy.id,
          agentId: override.agentId,
          amount: override.amount,
          type: 'OVERRIDE',
          level: override.level,
          period: row.period,
          importBatchId: batch.id,
        },
      })
    }

    successCount += 1
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: errors.length > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
      rowErrors: errors,
    },
  })

  return { batchId: batch.id, successCount, errors }
}
```

- [ ] **Step 4: Run the parseCsv tests to verify they pass**

Run: `pnpm exec vitest run lib/csv/import-service.test.ts`
Expected: PASS (2 tests — `importPolicies`/`importCommissions` are exercised manually against the seeded DB in Task 9/10, since they need real Postgres rows and are covered end-to-end there)

- [ ] **Step 5: Commit**

```bash
git add lib/csv/import-service.ts lib/csv/import-service.test.ts
git commit -m "Add CSV import service for policies and commissions"
```

---

### Task 9: Admin UI — CSV import page

**Files:**
- Create: `app/admin/import/page.tsx`
- Create: `app/admin/import/actions.ts`

**Interfaces:**
- Consumes: `importPolicies`, `importCommissions` (Task 8).
- Produces: `/admin/import` route — a form posting to server actions `submitPolicyImport`/`submitCommissionImport`.

- [ ] **Step 1: Server actions**

Create `app/admin/import/actions.ts`:

```typescript
'use server'

import { importPolicies, importCommissions } from '@/lib/csv/import-service'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function submitPolicyImport(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Not authenticated')
  const file = formData.get('file') as File
  const content = await file.text()
  return importPolicies(content, session.user.id)
}

export async function submitCommissionImport(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Not authenticated')
  const file = formData.get('file') as File
  const content = await file.text()
  return importCommissions(content, session.user.id)
}
```

- [ ] **Step 2: Page**

Create `app/admin/import/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { submitPolicyImport, submitCommissionImport } from './actions'

type Result = { batchId: string; successCount: number; errors: { row: number; message: string }[] }

export default function ImportPage() {
  const [policyResult, setPolicyResult] = useState<Result | null>(null)
  const [commissionResult, setCommissionResult] = useState<Result | null>(null)

  return (
    <main>
      <h1>Import de dados</h1>

      <section>
        <h2>Apólices (CSV)</h2>
        <form
          action={async (formData) => setPolicyResult(await submitPolicyImport(formData))}
        >
          <input type="file" name="file" accept=".csv" required />
          <button type="submit">Importar apólices</button>
        </form>
        {policyResult && (
          <p>
            {policyResult.successCount} linhas importadas, {policyResult.errors.length} erros.
            {policyResult.errors.map((e) => (
              <span key={e.row}> Linha {e.row}: {e.message}. </span>
            ))}
          </p>
        )}
      </section>

      <section>
        <h2>Comissões (CSV)</h2>
        <form
          action={async (formData) => setCommissionResult(await submitCommissionImport(formData))}
        >
          <input type="file" name="file" accept=".csv" required />
          <button type="submit">Importar comissões</button>
        </form>
        {commissionResult && (
          <p>
            {commissionResult.successCount} linhas importadas, {commissionResult.errors.length} erros.
            {commissionResult.errors.map((e) => (
              <span key={e.row}> Linha {e.row}: {e.message}. </span>
            ))}
          </p>
        )}
      </section>
    </main>
  )
}
```

- [ ] **Step 3: Manual verification**

Run: `pnpm dev`, sign in as `admin@ricos.test` (create a password for this seeded user via `/api/auth/sign-up` or a one-off script if Better Auth requires it), visit `/admin/import`.

Create a file `tmp-policies.csv`:

```csv
clientName,clientEmail,agentNpn,carrier,product,policyNumber,faceAmount,premium,status,effectiveDate
Cliente Novo,novo@example.com,1000003,National Life Group,Final Expense,NLG-0002,15000,32.00,APPROVED,2026-02-01
```

Upload it. Expected: page shows "1 linhas importadas, 0 erros." Confirm with `pnpm exec prisma studio` that a `Policy` row with `policyNumber = NLG-0002` exists.

- [ ] **Step 4: Commit**

```bash
git add app/admin/import/
git commit -m "Add admin CSV import page for policies and commissions"
```

---

### Task 10: Admin UI — agent hierarchy management

**Files:**
- Create: `app/admin/agents/page.tsx`
- Create: `app/admin/agents/actions.ts`

**Interfaces:**
- Consumes: Prisma `Agent`, `User` models; writes `AuditLog` on every change (Global Constraint).
- Produces: `/admin/agents` route listing all agents with their `parentAgentId`/`rank`, and a form to reassign an agent's parent or rank.

- [ ] **Step 1: Server actions with audit logging**

Create `app/admin/agents/actions.ts`:

```typescript
'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function updateAgentHierarchy(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Not authenticated')

  const agentId = formData.get('agentId') as string
  const parentAgentId = (formData.get('parentAgentId') as string) || null
  const rank = formData.get('rank') as string

  const before = await prisma.agent.findUniqueOrThrow({ where: { id: agentId } })
  const after = await prisma.agent.update({
    where: { id: agentId },
    data: { parentAgentId, rank },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'UPDATE_AGENT_HIERARCHY',
      entity: 'Agent',
      entityId: agentId,
      before: { parentAgentId: before.parentAgentId, rank: before.rank },
      after: { parentAgentId: after.parentAgentId, rank: after.rank },
    },
  })

  revalidatePath('/admin/agents')
}
```

- [ ] **Step 2: Page**

Create `app/admin/agents/page.tsx`:

```tsx
import { prisma } from '@/lib/prisma'
import { updateAgentHierarchy } from './actions'

export default async function AgentsPage() {
  const agents = await prisma.agent.findMany({ include: { user: true }, orderBy: { createdAt: 'asc' } })

  return (
    <main>
      <h1>Agentes e hierarquia</h1>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Rank</th>
            <th>Reporta para</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr key={agent.id}>
              <td>{agent.user.name}</td>
              <td>{agent.rank}</td>
              <td>{agents.find((a) => a.id === agent.parentAgentId)?.user.name ?? '—'}</td>
              <td>
                <form action={updateAgentHierarchy}>
                  <input type="hidden" name="agentId" value={agent.id} />
                  <select name="parentAgentId" defaultValue={agent.parentAgentId ?? ''}>
                    <option value="">— nenhum —</option>
                    {agents
                      .filter((a) => a.id !== agent.id)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.user.name}
                        </option>
                      ))}
                  </select>
                  <input name="rank" defaultValue={agent.rank} />
                  <button type="submit">Salvar</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
```

- [ ] **Step 3: Manual verification**

Run: `pnpm dev`, visit `/admin/agents`. Reassign `leaf`'s parent to `top` directly, save, confirm the table updates and `pnpm exec prisma studio` shows a new `AuditLog` row with `action = 'UPDATE_AGENT_HIERARCHY'`.

- [ ] **Step 4: Commit**

```bash
git add app/admin/agents/
git commit -m "Add admin agent hierarchy management page with audit logging"
```

---

### Task 11: Admin UI — commission plan configuration

**Files:**
- Create: `app/admin/commission-plans/page.tsx`
- Create: `app/admin/commission-plans/actions.ts`

**Interfaces:**
- Consumes: Prisma `CommissionPlan` model.
- Produces: `/admin/commission-plans` route to list and create `(rank, downlineLevel, overridePercent)` rows.

- [ ] **Step 1: Server action**

Create `app/admin/commission-plans/actions.ts`:

```typescript
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createCommissionPlan(formData: FormData) {
  const rank = formData.get('rank') as string
  const downlineLevel = Number(formData.get('downlineLevel'))
  const overridePercent = Number(formData.get('overridePercent'))

  await prisma.commissionPlan.upsert({
    where: { rank_downlineLevel: { rank, downlineLevel } },
    create: { rank, downlineLevel, overridePercent },
    update: { overridePercent },
  })

  revalidatePath('/admin/commission-plans')
}
```

- [ ] **Step 2: Page**

Create `app/admin/commission-plans/page.tsx`:

```tsx
import { prisma } from '@/lib/prisma'
import { createCommissionPlan } from './actions'

export default async function CommissionPlansPage() {
  const plans = await prisma.commissionPlan.findMany({ orderBy: [{ rank: 'asc' }, { downlineLevel: 'asc' }] })

  return (
    <main>
      <h1>Planos de comissão</h1>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Nível de downline</th>
            <th>% de override</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan.id}>
              <td>{plan.rank}</td>
              <td>{plan.downlineLevel}</td>
              <td>{plan.overridePercent.toString()}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Novo plano</h2>
      <form action={createCommissionPlan}>
        <input name="rank" placeholder="Rank (ex: MANAGER)" required />
        <input name="downlineLevel" type="number" min={1} placeholder="Nível" required />
        <input name="overridePercent" type="number" step="0.01" placeholder="% override" required />
        <button type="submit">Salvar</button>
      </form>
    </main>
  )
}
```

- [ ] **Step 3: Manual verification**

Run: `pnpm dev`, visit `/admin/commission-plans`. Confirm the two seeded plans (`MANAGER`/1/10, `DIRECTOR`/2/5) render, add a third plan, confirm it appears after submit.

- [ ] **Step 4: Commit**

```bash
git add app/admin/commission-plans/
git commit -m "Add admin commission plan configuration page"
```

---

### Task 12: Agent portal — dashboard & hierarchy tree

**Files:**
- Create: `app/agent/page.tsx`
- Create: `app/agent/hierarchy/page.tsx`
- Create: `lib/agent-context.ts`

**Interfaces:**
- Consumes: `getDownlineIds` (Task 5), Prisma `Agent`/`Policy`/`CommissionRecord`.
- Produces: `getCurrentAgent(): Promise<Agent>` (throws if the signed-in user has no `Agent` row) — used by Task 13 as well.

- [ ] **Step 1: Shared helper**

Create `lib/agent-context.ts`:

```typescript
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function getCurrentAgent() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Not authenticated')
  const agent = await prisma.agent.findUnique({ where: { userId: session.user.id } })
  if (!agent) throw new Error('Signed-in user has no Agent record')
  return agent
}
```

- [ ] **Step 2: Dashboard page**

Create `app/agent/page.tsx`:

```tsx
import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'

export default async function AgentDashboard() {
  const agent = await getCurrentAgent()
  const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true } })
  const downlineIds = getDownlineIds(allAgents, agent.id)

  const [policyCount, commissionTotal] = await Promise.all([
    prisma.policy.count({ where: { agentId: agent.id } }),
    prisma.commissionRecord.aggregate({ where: { agentId: agent.id }, _sum: { amount: true } }),
  ])

  return (
    <main>
      <h1>Meu painel</h1>
      <p>Minhas apólices: {policyCount}</p>
      <p>Minhas comissões (total): {commissionTotal._sum.amount?.toString() ?? '0'}</p>
      <p>Tamanho da minha downline: {downlineIds.length}</p>
    </main>
  )
}
```

- [ ] **Step 3: Hierarchy tree page**

Create `app/agent/hierarchy/page.tsx`:

```tsx
import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds, getUplineIds } from '@/lib/hierarchy'

export default async function HierarchyPage() {
  const agent = await getCurrentAgent()
  const allAgents = await prisma.agent.findMany({ include: { user: true } })
  const nameById = new Map(allAgents.map((a) => [a.id, a.user.name]))

  const uplineIds = getUplineIds(allAgents, agent.id)
  const downlineIds = getDownlineIds(allAgents, agent.id)

  return (
    <main>
      <h1>Minha hierarquia</h1>
      <h2>Acima de mim</h2>
      <ul>
        {uplineIds.map((id) => (
          <li key={id}>{nameById.get(id)}</li>
        ))}
      </ul>
      <h2>Abaixo de mim</h2>
      <ul>
        {downlineIds.map((id) => (
          <li key={id}>{nameById.get(id)}</li>
        ))}
      </ul>
    </main>
  )
}
```

- [ ] **Step 4: Manual verification**

Sign in as `leaf@ricos.test`, visit `/agent` and `/agent/hierarchy`. Expected: dashboard shows 1 policy and the seeded commission total; hierarchy page shows "Agente Meio" and "Agente Topo" under "Acima de mim", nothing under "Abaixo de mim".

- [ ] **Step 5: Commit**

```bash
git add app/agent/page.tsx app/agent/hierarchy/ lib/agent-context.ts
git commit -m "Add agent dashboard and hierarchy tree pages"
```

---

### Task 13: Agent portal — clients, policies, commissions

**Files:**
- Create: `app/agent/clients/page.tsx`
- Create: `app/agent/policies/page.tsx`
- Create: `app/agent/commissions/page.tsx`

**Interfaces:**
- Consumes: `getCurrentAgent`, `getDownlineIds` (Task 12/5).
- Produces: three read-only list routes scoped to the signed-in agent plus their downline.

- [ ] **Step 1: Clients page**

Create `app/agent/clients/page.tsx`:

```tsx
import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'

export default async function ClientsPage() {
  const agent = await getCurrentAgent()
  const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true } })
  const scopeAgentIds = [agent.id, ...getDownlineIds(allAgents, agent.id)]

  const clients = await prisma.client.findMany({
    where: { assignedAgentId: { in: scopeAgentIds } },
    include: { assignedAgent: { include: { user: true } } },
  })

  return (
    <main>
      <h1>Clientes</h1>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Agente responsável</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id}>
              <td>{client.name}</td>
              <td>{client.email ?? '—'}</td>
              <td>{client.assignedAgent.user.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
```

- [ ] **Step 2: Policies page**

Create `app/agent/policies/page.tsx`:

```tsx
import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'

export default async function PoliciesPage() {
  const agent = await getCurrentAgent()
  const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true } })
  const scopeAgentIds = [agent.id, ...getDownlineIds(allAgents, agent.id)]

  const policies = await prisma.policy.findMany({
    where: { agentId: { in: scopeAgentIds } },
    include: { client: true },
  })

  return (
    <main>
      <h1>Apólices</h1>
      <table>
        <thead>
          <tr>
            <th>Nº apólice</th>
            <th>Cliente</th>
            <th>Carrier</th>
            <th>Produto</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((policy) => (
            <tr key={policy.id}>
              <td>{policy.policyNumber}</td>
              <td>{policy.client.name}</td>
              <td>{policy.carrier}</td>
              <td>{policy.product}</td>
              <td>{policy.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
```

- [ ] **Step 3: Commissions page**

Create `app/agent/commissions/page.tsx`:

```tsx
import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'

export default async function CommissionsPage() {
  const agent = await getCurrentAgent()
  const records = await prisma.commissionRecord.findMany({
    where: { agentId: agent.id },
    include: { policy: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main>
      <h1>Extrato de comissões</h1>
      <table>
        <thead>
          <tr>
            <th>Período</th>
            <th>Apólice</th>
            <th>Tipo</th>
            <th>Nível</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td>{record.period}</td>
              <td>{record.policy.policyNumber}</td>
              <td>{record.type === 'DIRECT' ? 'Direta' : 'Override'}</td>
              <td>{record.level}</td>
              <td>{record.amount.toString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
```

- [ ] **Step 4: Manual verification**

Sign in as `mid@ricos.test`. Visit `/agent/clients` and `/agent/policies` — expected to see "Cliente Exemplo" and policy `NLG-0001`, because `leaf` is `mid`'s downline. Visit `/agent/commissions` — expected to see the `OVERRIDE` record created for `mid` when the seeded/imported commission for `leaf` was processed (run the commission CSV import from Task 9 against `leaf`'s NPN first if the seed script didn't create commission records directly).

- [ ] **Step 5: Commit**

```bash
git add app/agent/clients/ app/agent/policies/ app/agent/commissions/
git commit -m "Add agent clients, policies, and commissions pages scoped to downline"
```

---

### Task 14: Client portal — policies view

**Files:**
- Create: `app/client/page.tsx`

**Interfaces:**
- Consumes: Prisma `Client`/`Policy`, Better Auth session.
- Produces: `/client` route showing only the signed-in client's own policies.

- [ ] **Step 1: Page**

Create `app/client/page.tsx`:

```tsx
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export default async function ClientPortalPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Not authenticated')

  const client = await prisma.client.findUnique({ where: { userId: session.user.id } })
  if (!client) throw new Error('Signed-in user has no Client record')

  const policies = await prisma.policy.findMany({ where: { clientId: client.id } })

  return (
    <main>
      <h1>Minhas apólices</h1>
      <table>
        <thead>
          <tr>
            <th>Nº apólice</th>
            <th>Carrier</th>
            <th>Produto</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((policy) => (
            <tr key={policy.id}>
              <td>{policy.policyNumber}</td>
              <td>{policy.carrier}</td>
              <td>{policy.product}</td>
              <td>{policy.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
```

- [ ] **Step 2: Manual verification**

Sign in as `client@ricos.test`, visit `/client`. Expected: table with one row, policy `NLG-0001`.

- [ ] **Step 3: Commit**

```bash
git add app/client/
git commit -m "Add client portal policies view"
```

---

### Task 15: Deployment to Coolify

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

**Interfaces:**
- Produces: a container image Coolify can build and run on host `btapps`, listening on port 3000, reading `DATABASE_URL`/`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` from Coolify's environment variable configuration.

- [ ] **Step 1: Write the Dockerfile**

Create `Dockerfile`:

```dockerfile
FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm exec prisma generate
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 2: Enable standalone output**

In `next.config.ts`, set:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
}

export default nextConfig
```

- [ ] **Step 3: `.dockerignore`**

Create `.dockerignore`:

```
node_modules
.next
.git
docs
*.md
.env
.env.local
```

- [ ] **Step 4: Verify the image builds locally**

Run: `docker build -t lifeos:local .`
Expected: build completes with exit code 0.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile .dockerignore next.config.ts
git commit -m "Add Dockerfile for Coolify deployment"
```

- [ ] **Step 6: Configure the Coolify app (manual, on `btapps`)**

In the Coolify dashboard on `btapps`: create a new application from the `snak3gh0st/lifeOS` GitHub repo, build pack "Dockerfile", set environment variables `DATABASE_URL` (the `lifeos_app` connection string), `BETTER_AUTH_SECRET` (generate with `openssl rand -base64 32`), `BETTER_AUTH_URL` (the public domain Coolify assigns or your custom domain), then deploy. After the first successful deploy, run migrations against production with:

```bash
ssh btapps "docker exec <lifeos-container-name> npx prisma migrate deploy"
```

Expected: container reports healthy, and visiting the assigned domain shows the `/login` redirect from `middleware.ts`.

---

## Self-Review

**Spec coverage:** Portal do Agente (Tasks 12–13), Portal do Cliente (Task 14), Admin import/hierarquia/planos (Tasks 9–11), modelo de dados (Task 2), hierarquia via adjacency list em memória (Task 5), engine de comissão com override (Task 6, 8), auditoria (Task 10, and CommissionRecord/Policy writes are themselves the audit trail for financial data via `ImportBatch`), CSV resiliente a linha ruim (Task 8). Deploy no Coolify (Task 15). No gaps against the MVP scope in the spec.

**Placeholder scan:** No TBD/TODO; every step has runnable code or an exact command with expected output.

**Type consistency:** `AgentNode`/`AgentRankInfo` (Task 5/6), `PlanLookup`/`OverrideResult` (Task 6), `PolicyRow`/`CommissionRow` (Task 7) are used with matching names and shapes everywhere they're consumed (Task 8's `import-service.ts`, Task 12/13's page components). `getCurrentAgent` (Task 12) is reused as-is in Task 13.
