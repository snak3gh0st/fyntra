# Fyntra Internal Workspace Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild all authenticated Fyntra surfaces as organized role-specific workspaces without changing business logic.

**Architecture:** Keep existing server-rendered routes and Prisma queries. Replace the repeated vertical-card composition with shared shell/header/panel primitives and role-specific two-column workspace layouts. Keep each primary data surface full-width and move filters, explanations, and secondary details into supporting regions.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, IBM Plex Sans/Mono, existing Motion components, Prisma.

## Global Constraints

- Preserve all routes, authorization, Prisma queries, server actions, and URL contracts.
- Do not change database schema or seed data.
- Portuguese user-facing copy; no backend jargon in primary UI.
- WCAG AA contrast, visible keyboard focus, and no status communicated by color alone.
- Verify with `pnpm lint`, `pnpm test`, `pnpm build`, and the actual Coolify container commit.

### Task 1: Shared workspace foundation

**Files:** `components/Shell.tsx`, `components/PageHeader.tsx`, `components/ContextPanel.tsx`, `components/Table.tsx`, `components/EntityCard.tsx`, `components/Field.tsx`, `components/Button.tsx`, `app/globals.css`.

- [ ] Define the rail/canvas/surface tokens and responsive shell behavior.
- [ ] Keep one navigation vocabulary per role and show the current location with text plus icon.
- [ ] Ensure shared table, card, input, button, and empty-state primitives have default, hover, focus, disabled, and error-readable states.
- [ ] Run `pnpm lint` and `pnpm build`.

### Task 2: Admin workspace surfaces

**Files:** `app/admin/page.tsx`, `app/admin/production/page.tsx`, `app/admin/import/page.tsx`, `app/admin/import/ImportForms.tsx`, `app/admin/commission-plans/page.tsx`, `app/admin/audit/page.tsx`, `app/admin/agents/page.tsx`, `app/admin/agents/HierarchyBoard.tsx`.

- [ ] Make the admin dashboard prioritize financial health, attention queue, and recent activity in distinct regions.
- [ ] Place production ranking and period controls into primary/secondary columns.
- [ ] Present import types as parallel workflows with clear file/result states.
- [ ] Present commission plans as a rule matrix/list beside the creation form.
- [ ] Present audit and hierarchy work surfaces beside concise guidance panels.
- [ ] Run `pnpm lint` and focused admin tests.

### Task 3: Agent and client workspaces

**Files:** `app/agent/page.tsx`, `app/agent/clients/page.tsx`, `app/agent/policies/page.tsx`, `app/agent/commissions/page.tsx`, `app/agent/hierarchy/page.tsx`, `app/client/page.tsx`.

- [ ] Make each list page use a primary data surface plus scope/explanation context.
- [ ] Give agent dashboard a clear money-first hierarchy and avoid identical KPI cards.
- [ ] Keep client language limited to policy ownership, status, premium, and documents.
- [ ] Ensure empty and error states explain the next action.
- [ ] Run tests and build.

### Task 4: Detail and responsive pass

**Files:** `app/agent/policies/[id]/page.tsx`, `app/client/policies/[id]/page.tsx`, `app/login/page.tsx`, `app/not-found.tsx`, `app/error.tsx`.

- [ ] Use a summary strip plus two-column details for policy pages.
- [ ] Keep commissions, client identity, documents, and upload action visually grouped by purpose.
- [ ] Test the collapse order at mobile width and preserve touch-visible actions.
- [ ] Run full `pnpm lint`, `pnpm test`, and `pnpm build`.

### Task 5: Publish and live proof

**Files:** none beyond the implementation files above.

- [ ] Commit the complete redesign as one intentional commit.
- [ ] Push `main` and inspect the GitHub webhook delivery.
- [ ] Confirm the Coolify resource `fyntra` / application 11 runs the pushed commit.
- [ ] Request `/login` over HTTPS and report any runtime errors separately from UI completion.
