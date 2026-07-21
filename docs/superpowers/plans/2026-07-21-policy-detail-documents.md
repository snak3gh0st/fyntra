# Policy Detail Page + Documents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a policy detail page (agent/admin and client variants) showing full commission history and uploaded documents, with authenticated file access — no timeline of status changes (out of scope, no data source exists yet).

**Architecture:** New `PolicyDocument` Prisma model. Files live on a persistent disk path (`UPLOADS_DIR` env var, mounted as a Coolify volume in production — not inside the container's ephemeral filesystem). A pure `canAccessPolicy` function centralizes the access-control decision (agent self+downline / admin any / client own), consumed by both the download route and the detail pages. Two page variants share the same data-fetching shape but differ in what they render (agent/admin sees commission history, client does not).

**Tech Stack:** Next.js 16 App Router route handlers, Node's `fs/promises`, Prisma 6, existing `requireRole`/`getCurrentAgent`/`getDownlineIds` from prior work.

## Global Constraints

- Never serve a file via a static/public URL — always through the authenticated `/api/documents/[id]` route handler.
- Upload accepts only `application/pdf`, `image/png`, `image/jpeg`, max 10 MB.
- `PolicyDocument.storedPath` is relative to `UPLOADS_DIR`, never an absolute path (portability across environments).
- Package manager: pnpm. Node 22 LTS (existing constraint, unchanged).

---

### Task 1: Prisma schema — PolicyDocument

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `PolicyDocument` model (`id`, `policyId`, `filename`, `storedPath`, `mimeType`, `sizeBytes`, `uploadedById`, `createdAt`), `Policy.documents PolicyDocument[]`, `User.uploadedDocuments PolicyDocument[]`.

- [ ] **Step 1: Add the model and back-relations**

Add to `prisma/schema.prisma`:

```prisma
model PolicyDocument {
  id           String   @id @default(cuid())
  policyId     String
  policy       Policy   @relation(fields: [policyId], references: [id])
  filename     String
  storedPath   String
  mimeType     String
  sizeBytes    Int
  uploadedById String
  uploadedBy   User     @relation(fields: [uploadedById], references: [id])
  createdAt    DateTime @default(now())

  @@index([policyId])
}
```

Add `documents PolicyDocument[]` to the `Policy` model and `uploadedDocuments PolicyDocument[]` to the `User` model (alongside their existing relation fields — do not remove or reorder existing fields).

- [ ] **Step 2: Generate the migration**

Run: `pnpm exec prisma migrate dev --name add_policy_documents`
Expected: if the sandbox has no DB access (same limitation as every prior migration in this project), fall back to `pnpm exec prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` is NOT correct here (that regenerates from empty, ignoring the existing `20260721024558_init` migration) — instead use:
`pnpm exec prisma migrate dev --name add_policy_documents --create-only` to attempt schema-only generation. If that still requires DB access and fails, generate the diff against the PREVIOUS schema state (`git show HEAD:prisma/schema.prisma` as `--from-schema-datamodel` and the new file as `--to-schema-datamodel`) and hand-place the result under `prisma/migrations/<timestamp>_add_policy_documents/migration.sql` following the existing migration folder's naming convention. Note in your report which path you took.

- [ ] **Step 3: Verify**

Run: `pnpm exec prisma validate && pnpm exec prisma generate && pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "Add PolicyDocument model and migration"
```

---

### Task 2: File storage helper (pure-ish, filesystem I/O isolated)

**Files:**
- Create: `lib/storage.ts`
- Test: `lib/storage.test.ts`

**Interfaces:**
- Produces:
  - `sanitizeFilename(name: string): string` (pure — strips path separators and unsafe characters, keeps extension)
  - `buildStoredPath(policyId: string, originalFilename: string): string` (pure — returns `policies/<policyId>/<uuid>-<sanitized-filename>`, uuid injected via a passed-in generator for testability)
  - `saveUploadedFile(uploadsDir: string, relativePath: string, buffer: Buffer): Promise<void>` (I/O — writes the file, creating parent directories)
  - `readStoredFile(uploadsDir: string, relativePath: string): Promise<Buffer>` (I/O — reads the file)
- Consumed by: Task 4 (upload action), Task 5 (download route).

- [ ] **Step 1: Write the failing tests for the pure functions**

Create `lib/storage.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { sanitizeFilename, buildStoredPath } from './storage'

describe('sanitizeFilename', () => {
  it('strips path separators and keeps the extension', () => {
    expect(sanitizeFilename('../../etc/passwd.pdf')).toBe('etc_passwd.pdf')
  })

  it('replaces spaces and special characters with underscores', () => {
    expect(sanitizeFilename('apolice final (v2).pdf')).toBe('apolice_final__v2_.pdf')
  })

  it('leaves a simple safe filename unchanged', () => {
    expect(sanitizeFilename('contrato.pdf')).toBe('contrato.pdf')
  })
})

describe('buildStoredPath', () => {
  it('builds a path scoped to the policy id with a uuid prefix', () => {
    const path = buildStoredPath('policy-123', 'contrato.pdf', () => 'fixed-uuid')
    expect(path).toBe('policies/policy-123/fixed-uuid-contrato.pdf')
  })

  it('sanitizes the original filename before building the path', () => {
    const path = buildStoredPath('policy-123', '../evil.pdf', () => 'fixed-uuid')
    expect(path).toBe('policies/policy-123/fixed-uuid-evil.pdf')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run lib/storage.test.ts`
Expected: FAIL — `Cannot find module './storage'`

- [ ] **Step 3: Implement**

Create `lib/storage.ts`:

```typescript
import { randomUUID } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'

export function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name
  return base.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function buildStoredPath(
  policyId: string,
  originalFilename: string,
  uuidGenerator: () => string = randomUUID,
): string {
  const safeName = sanitizeFilename(originalFilename)
  return `policies/${policyId}/${uuidGenerator()}-${safeName}`
}

export async function saveUploadedFile(
  uploadsDir: string,
  relativePath: string,
  buffer: Buffer,
): Promise<void> {
  const fullPath = join(uploadsDir, relativePath)
  await mkdir(dirname(fullPath), { recursive: true })
  await writeFile(fullPath, buffer)
}

export async function readStoredFile(uploadsDir: string, relativePath: string): Promise<Buffer> {
  return readFile(join(uploadsDir, relativePath))
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run lib/storage.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts lib/storage.test.ts
git commit -m "Add file storage helper with sanitized paths"
```

---

### Task 3: Policy access-control engine (pure + tests)

**Files:**
- Create: `lib/policy-access.ts`
- Test: `lib/policy-access.test.ts`

**Interfaces:**
- Produces:
  - `type AccessContext = { role: 'ADMIN' | 'AGENT' | 'CLIENT'; agentScopeIds?: string[]; clientId?: string }`
  - `type PolicyRef = { agentId: string; clientId: string }`
  - `canAccessPolicy(context: AccessContext, policy: PolicyRef): boolean`
- Consumed by: Task 5 (download route), Task 6/7 (detail pages, to decide whether to even attempt the query / to 404 early).

- [ ] **Step 1: Write the failing tests**

Create `lib/policy-access.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { canAccessPolicy } from './policy-access'

const policy = { agentId: 'agent-1', clientId: 'client-1' }

describe('canAccessPolicy', () => {
  it('ADMIN can always access', () => {
    expect(canAccessPolicy({ role: 'ADMIN' }, policy)).toBe(true)
  })

  it('AGENT can access when the policy agent is in their scope', () => {
    expect(canAccessPolicy({ role: 'AGENT', agentScopeIds: ['agent-1', 'agent-2'] }, policy)).toBe(true)
  })

  it('AGENT cannot access when the policy agent is outside their scope', () => {
    expect(canAccessPolicy({ role: 'AGENT', agentScopeIds: ['agent-2', 'agent-3'] }, policy)).toBe(false)
  })

  it('CLIENT can access their own policy', () => {
    expect(canAccessPolicy({ role: 'CLIENT', clientId: 'client-1' }, policy)).toBe(true)
  })

  it('CLIENT cannot access another client\'s policy', () => {
    expect(canAccessPolicy({ role: 'CLIENT', clientId: 'client-2' }, policy)).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run lib/policy-access.test.ts`
Expected: FAIL — `Cannot find module './policy-access'`

- [ ] **Step 3: Implement**

Create `lib/policy-access.ts`:

```typescript
export type AccessContext =
  | { role: 'ADMIN' }
  | { role: 'AGENT'; agentScopeIds: string[] }
  | { role: 'CLIENT'; clientId: string }

export type PolicyRef = { agentId: string; clientId: string }

export function canAccessPolicy(context: AccessContext, policy: PolicyRef): boolean {
  if (context.role === 'ADMIN') return true
  if (context.role === 'AGENT') return context.agentScopeIds.includes(policy.agentId)
  return context.clientId === policy.clientId
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run lib/policy-access.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/policy-access.ts lib/policy-access.test.ts
git commit -m "Add pure policy access-control engine with tests"
```

---

### Task 4: Upload server action

**Files:**
- Create: `app/agent/policies/[id]/actions.ts`

**Interfaces:**
- Consumes: `requireRole` (`lib/require-role.ts`), `getCurrentAgent`/`getDownlineIds` pattern (Tasks 12/13, prior plan), `canAccessPolicy` (Task 3), `buildStoredPath`/`saveUploadedFile` (Task 2), `prisma`.
- Produces: `uploadPolicyDocument(formData: FormData): Promise<void>` server action, reads `policyId` and `file` from the form.

- [ ] **Step 1: Implement**

Create `app/agent/policies/[id]/actions.ts`:

```typescript
'use server'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'
import { canAccessPolicy } from '@/lib/policy-access'
import { buildStoredPath, saveUploadedFile } from '@/lib/storage'
import { revalidatePath } from 'next/cache'

const ALLOWED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg'])
const MAX_SIZE_BYTES = 10 * 1024 * 1024

export async function uploadPolicyDocument(formData: FormData) {
  const session = await requireRole('ADMIN', 'AGENT')
  const policyId = formData.get('policyId') as string
  const file = formData.get('file') as File

  const policy = await prisma.policy.findUniqueOrThrow({ where: { id: policyId } })

  if (session.user.role === 'AGENT') {
    const agent = await getCurrentAgent()
    const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true } })
    const scopeIds = [agent.id, ...getDownlineIds(allAgents, agent.id)]
    if (!canAccessPolicy({ role: 'AGENT', agentScopeIds: scopeIds }, policy)) {
      throw new Error('Forbidden: policy outside your scope')
    }
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`)
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('File exceeds the 10 MB limit')
  }

  const uploadsDir = process.env.UPLOADS_DIR ?? './uploads'
  const relativePath = buildStoredPath(policyId, file.name)
  const buffer = Buffer.from(await file.arrayBuffer())
  await saveUploadedFile(uploadsDir, relativePath, buffer)

  await prisma.policyDocument.create({
    data: {
      policyId,
      filename: file.name,
      storedPath: relativePath,
      mimeType: file.type,
      sizeBytes: file.size,
      uploadedById: session.user.id,
    },
  })

  revalidatePath(`/agent/policies/${policyId}`)
}
```

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/agent/policies/\[id\]/actions.ts
git commit -m "Add policy document upload server action"
```

---

### Task 5: Authenticated document download route

**Files:**
- Create: `app/api/documents/[id]/route.ts`

**Interfaces:**
- Consumes: `requireRole`, `getCurrentAgent`/`getDownlineIds`, `canAccessPolicy`, `readStoredFile`, `prisma`.
- Produces: `GET` handler at `/api/documents/[id]` returning the file as a binary response, or 403/404.

- [ ] **Step 1: Implement**

Create `app/api/documents/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getDownlineIds } from '@/lib/hierarchy'
import { canAccessPolicy } from '@/lib/policy-access'
import { readStoredFile } from '@/lib/storage'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new NextResponse('Not authenticated', { status: 401 })

  const { id } = await params
  const document = await prisma.policyDocument.findUnique({
    where: { id },
    include: { policy: true },
  })
  if (!document) return new NextResponse('Not found', { status: 404 })

  const role = session.user.role as 'ADMIN' | 'AGENT' | 'CLIENT'
  let allowed = false

  if (role === 'ADMIN') {
    allowed = true
  } else if (role === 'AGENT') {
    const agent = await prisma.agent.findUnique({ where: { userId: session.user.id } })
    if (agent) {
      const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true } })
      const scopeIds = [agent.id, ...getDownlineIds(allAgents, agent.id)]
      allowed = canAccessPolicy({ role: 'AGENT', agentScopeIds: scopeIds }, document.policy)
    }
  } else {
    const client = await prisma.client.findUnique({ where: { userId: session.user.id } })
    if (client) {
      allowed = canAccessPolicy({ role: 'CLIENT', clientId: client.id }, document.policy)
    }
  }

  if (!allowed) return new NextResponse('Forbidden', { status: 403 })

  const uploadsDir = process.env.UPLOADS_DIR ?? './uploads'
  const buffer = await readStoredFile(uploadsDir, document.storedPath)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': document.mimeType,
      'Content-Disposition': `inline; filename="${document.filename}"`,
    },
  })
}
```

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit`
Expected: no errors. Note: this route cannot be exercised end-to-end in the sandbox (no live DB, no real uploaded file) — verified by type-check only, consistent with every prior DB-touching task in this project.

- [ ] **Step 3: Commit**

```bash
git add app/api/documents/
git commit -m "Add authenticated document download route"
```

---

### Task 6: Agent/admin policy detail page

**Files:**
- Create: `app/agent/policies/[id]/page.tsx`

**Interfaces:**
- Consumes: `getCurrentAgent`, `getDownlineIds`, `canAccessPolicy`, `uploadPolicyDocument` (Task 4), `Shell`/`Table`/`Button`/`PolicyStatusPill` (existing components).
- Produces: the `/agent/policies/[id]` route.

- [ ] **Step 1: Implement**

Create `app/agent/policies/[id]/page.tsx`:

```tsx
export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'
import { canAccessPolicy } from '@/lib/policy-access'
import { uploadPolicyDocument } from './actions'
import { Shell } from '@/components/Shell'
import { PolicyStatusPill } from '@/components/StatusPill'
import { Table, Thead, Th, Tr, Td, TdNum, EmptyState } from '@/components/Table'
import { Button } from '@/components/Button'

export default async function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const agent = await getCurrentAgent()
  const user = await prisma.user.findUnique({ where: { id: agent.userId } })
  const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true } })
  const scopeIds = [agent.id, ...getDownlineIds(allAgents, agent.id)]

  const policy = await prisma.policy.findUnique({
    where: { id },
    include: {
      client: true,
      commissionRecords: { include: { agent: { include: { user: true } } }, orderBy: { createdAt: 'desc' } },
      documents: true,
    },
  })
  if (!policy || !canAccessPolicy({ role: 'AGENT', agentScopeIds: scopeIds }, policy)) notFound()

  return (
    <Shell role="AGENT" userName={user?.name ?? ''}>
      <a href="/agent/policies" className="text-sm font-semibold text-teal hover:text-teal-deep">
        ← Voltar
      </a>
      <h1 className="mt-2 text-[1.5rem] font-semibold tracking-tight text-ink">
        Apólice {policy.policyNumber}
      </h1>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Carrier</p>
          <p className="text-sm text-ink">{policy.carrier}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Produto</p>
          <p className="text-sm text-ink">{policy.product}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Prêmio</p>
          <p className="font-mono text-sm text-ink">${policy.premium.toString()}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Status</p>
          <PolicyStatusPill status={policy.status} />
        </div>
      </div>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-ink">Cliente</h2>
      <p className="text-sm text-ink">
        {policy.client.name} {policy.client.email ? `· ${policy.client.email}` : ''}
      </p>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-ink">Comissão gerada por esta apólice</h2>
      <Table>
        <Thead>
          <tr>
            <Th>Agente</Th>
            <Th>Tipo</Th>
            <Th>Nível</Th>
            <Th>Período</Th>
            <Th className="text-right">Valor</Th>
          </tr>
        </Thead>
        <tbody>
          {policy.commissionRecords.map((record) => (
            <Tr key={record.id}>
              <Td>{record.agent.user.name}</Td>
              <Td>{record.type === 'DIRECT' ? 'Direta' : 'Override'}</Td>
              <Td className="text-ink-muted">{record.level}</Td>
              <Td className="font-mono">{record.period}</Td>
              <TdNum>${record.amount.toString()}</TdNum>
            </Tr>
          ))}
        </tbody>
      </Table>
      {policy.commissionRecords.length === 0 && <EmptyState>Nenhuma comissão registrada ainda.</EmptyState>}

      <h2 className="mt-8 mb-2 text-lg font-semibold text-ink">Documentos</h2>
      <ul className="divide-y divide-border-steel rounded-lg border border-border-steel bg-panel">
        {policy.documents.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <a href={`/api/documents/${doc.id}`} target="_blank" className="text-teal hover:text-teal-deep">
              {doc.filename}
            </a>
            <span className="text-ink-muted">{(doc.sizeBytes / 1024).toFixed(0)} KB</span>
          </li>
        ))}
      </ul>
      {policy.documents.length === 0 && <EmptyState>Nenhum documento ainda.</EmptyState>}

      <form action={uploadPolicyDocument} className="mt-4 flex items-center gap-3">
        <input type="hidden" name="policyId" value={policy.id} />
        <input
          type="file"
          name="file"
          accept=".pdf,.png,.jpg,.jpeg"
          required
          className="text-sm text-ink-muted file:mr-3 file:rounded-md file:border-0 file:bg-teal-pale file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal"
        />
        <Button type="submit" variant="secondary">
          Enviar documento
        </Button>
      </form>
    </Shell>
  )
}
```

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit && pnpm build`
Expected: no errors; `/agent/policies/[id]` compiles as a dynamic route.

- [ ] **Step 3: Commit**

```bash
git add app/agent/policies/\[id\]/page.tsx
git commit -m "Add agent/admin policy detail page"
```

---

### Task 7: Client policy detail page

**Files:**
- Create: `app/client/policies/[id]/page.tsx`

**Interfaces:**
- Consumes: `requireRole`, `canAccessPolicy`, `Shell`, existing components.
- Produces: the `/client/policies/[id]` route (read-only, no commission section, no upload form).

- [ ] **Step 1: Implement**

Create `app/client/policies/[id]/page.tsx`:

```tsx
export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { canAccessPolicy } from '@/lib/policy-access'
import { Shell } from '@/components/Shell'
import { PolicyStatusPill } from '@/components/StatusPill'
import { EmptyState } from '@/components/Table'

export default async function ClientPolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireRole('CLIENT', 'ADMIN')

  const client = await prisma.client.findUnique({ where: { userId: session.user.id } })
  if (!client) throw new Error('Signed-in user has no Client record')

  const policy = await prisma.policy.findUnique({
    where: { id },
    include: { documents: true },
  })
  if (!policy || !canAccessPolicy({ role: 'CLIENT', clientId: client.id }, policy)) notFound()

  return (
    <Shell role="CLIENT" userName={session.user.name}>
      <a href="/client" className="text-sm font-semibold text-teal hover:text-teal-deep">
        ← Voltar
      </a>
      <h1 className="mt-2 text-[1.5rem] font-semibold tracking-tight text-ink">
        Apólice {policy.policyNumber}
      </h1>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Carrier</p>
          <p className="text-sm text-ink">{policy.carrier}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Produto</p>
          <p className="text-sm text-ink">{policy.product}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Prêmio</p>
          <p className="font-mono text-sm text-ink">${policy.premium.toString()}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Status</p>
          <PolicyStatusPill status={policy.status} />
        </div>
      </div>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-ink">Documentos</h2>
      <ul className="divide-y divide-border-steel rounded-lg border border-border-steel bg-panel">
        {policy.documents.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <a href={`/api/documents/${doc.id}`} target="_blank" className="text-teal hover:text-teal-deep">
              {doc.filename}
            </a>
            <span className="text-ink-muted">{(doc.sizeBytes / 1024).toFixed(0)} KB</span>
          </li>
        ))}
      </ul>
      {policy.documents.length === 0 && <EmptyState>Nenhum documento ainda.</EmptyState>}
    </Shell>
  )
}
```

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit && pnpm build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/client/policies/
git commit -m "Add client-facing read-only policy detail page"
```

---

### Task 8: Link list pages to the new detail pages

**Files:**
- Modify: `app/agent/policies/page.tsx`
- Modify: `app/client/page.tsx`

**Interfaces:**
- Consumes: nothing new. Pure UI change — wraps the existing policy-number cell in a link.

- [ ] **Step 1: Update the agent policies list**

In `app/agent/policies/page.tsx`, change the policy-number cell from:

```tsx
<Td className="font-mono">{policy.policyNumber}</Td>
```

to:

```tsx
<Td className="font-mono">
  <a href={`/agent/policies/${policy.id}`} className="text-teal hover:text-teal-deep">
    {policy.policyNumber}
  </a>
</Td>
```

- [ ] **Step 2: Update the client policies list**

In `app/client/page.tsx`, apply the same change to its policy-number cell, linking to `/client/policies/${policy.id}` instead.

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit && pnpm build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/agent/policies/page.tsx app/client/page.tsx
git commit -m "Link policy list rows to their detail pages"
```

---

### Task 9: Production deploy — persistent uploads volume

**Files:**
- No repo files change in this task — this is a manual production infra step, documented here so it isn't forgotten. If the plan is executed by a subagent without SSH/production access, this task should be reported as a step for the controller/human to perform, not attempted by the implementer.

- [ ] **Step 1: Add a named volume to the production compose file**

On `btapps`, edit `/data/coolify/applications/lifeos/docker-compose.yaml` to add a named volume mounted at `/data/uploads`, and set `UPLOADS_DIR=/data/uploads` in the container's environment (either in `.env` alongside `DATABASE_URL`, or directly in the compose file's `environment:` block):

```yaml
services:
  lifeos:
    # ...existing config...
    environment:
      - UPLOADS_DIR=/data/uploads
    volumes:
      - lifeos_uploads:/data/uploads
volumes:
  lifeos_uploads:
```

- [ ] **Step 2: Recreate the container**

Run on `btapps`: `cd /data/coolify/applications/lifeos && docker compose up -d`
Expected: container recreated with the new volume; `docker volume ls | grep lifeos_uploads` shows the volume exists.

- [ ] **Step 3: Verify persistence**

Upload a test document through the app, then run `docker compose down && docker compose up -d` again and confirm the document is still downloadable — proves the volume survives container recreation (the exact operation a rebuild/redeploy performs).

---

## Self-Review

**Spec coverage:** `PolicyDocument` model (Task 1), persistent storage (Task 2 + Task 9), access-control engine (Task 3) consumed by both upload (Task 4) and download (Task 5), agent/admin detail page (Task 6), client detail page (Task 7), navigation links (Task 8). Timeline of status changes explicitly out of scope per the spec — no task attempts it.

**Placeholder scan:** No TBD/TODO. Task 9 is intentionally a documented manual step (production infra, not app code) rather than a placeholder — it has concrete commands and an expected verification result.

**Type consistency:** `canAccessPolicy`'s `AccessContext`/`PolicyRef` types (Task 3) are used identically in Task 4 (upload action), Task 5 (download route), Task 6 (agent detail page). `buildStoredPath`/`saveUploadedFile`/`readStoredFile` (Task 2) signatures match their call sites in Tasks 4/5 exactly.
