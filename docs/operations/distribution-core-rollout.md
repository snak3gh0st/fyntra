# Distribution Core — Rollout Guide (Release 1)

The Distribution Core adds the case-centric sales workflow (prospect → case →
issued/imported policy), provider-neutral sync records and an immutable
commission/policy transaction ledger. This release is **additive**: no existing
`Client`, `Policy`, `CommissionRecord`, hierarchy, import or document data is
removed or rewritten.

## What ships in Release 1

- `InsuranceCase`, `Prospect`, `Illustration(+Scenario)`, `Application(+Requirement)`,
  `CaseTimelineEvent`, `PolicySnapshot`, `PolicyTransaction`, `CommissionTransaction`,
  `IntegrationConnection`, `ExternalReference`, `SyncEvent` tables (migration
  `20260722222500_add_distribution_core`).
- Nullable `caseId`, `sourceProvider`, `sourceExternalId`, `sourceUpdatedAt` on `Policy`.
- Agent case work queue (`/agent/cases`), intake (`/agent/cases/new`) and workspace
  (`/agent/cases/[id]`).
- Case-first agent navigation and dashboard; manual policy creation retired.
- CSV imports optionally carry provider identifiers and write policy snapshots +
  immutable commission transactions (legacy `CommissionRecord` still written).

Intentionally **excluded**: iPipeline / SureLC / ForeSight / National Life
credentials and any live integration. Connector models exist but no vendor is
wired up.

## Deployment sequence

1. **Backup the database.** Take a full logical backup of `lifeos` before any
   migration. This is the only true rollback for data.
2. **Deploy code + run the migration.** The container runs
   `pnpm exec prisma migrate deploy` on boot, which applies
   `20260722222500_add_distribution_core`. The migration is additive (new tables +
   nullable columns) — it does not lock or rewrite existing rows.
3. **Prisma Client is generated at build time** (`prisma generate` runs in the
   image build). No separate generate step is needed in production.
4. **Deploy the application** (Coolify webhook on push to `main`).
5. **Import smoke check.** Re-run a known-good policy CSV and a known-good
   commission CSV. Confirm: existing rows update in place (no duplicate policies),
   a `PolicySnapshot` row appears, and re-uploading the same commission file does
   **not** duplicate money (upsert on `provider + sourceTransactionId`).
6. **Rollback decision point.** See below.

## Rollback

- **App rollback:** redeploy the previous image/commit. Because the migration is
  additive, the old app version runs fine against the new schema — it simply
  ignores the new tables and columns.
- **Schema rollback is NOT automatic.** Rolling back the app does **not** drop the
  new tables or columns. If you must remove them, restore the pre-migration
  database backup (step 1) or write an explicit down-migration. Do not hand-drop
  tables on a live database.

## Pilot smoke path

```text
Agent login
-> Novo caso
-> Prospect saved
-> Case appears in work queue
-> Legal stage transition (illegal transitions are rejected)
-> Requirement created and completed
-> Historical policy import links source data
-> Policy snapshot visible
-> Commission import reconciles without duplicate money
-> Downline isolation checked (an agent sees only their own + downline cases)
```

## Acceptance gates

Run before tagging the release:

```bash
pnpm exec prisma validate
pnpm exec vitest run
pnpm build
```

All three must exit zero. `pnpm build` specifically guards the Server Action /
Client Component boundary that previously broke deployment.
