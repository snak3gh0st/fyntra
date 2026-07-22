# Fyntra Internal Workspace Redesign

## Goal

Rebuild the authenticated Fyntra experience so admin, agent, and client users can understand their current context, primary work, and next action without scanning a vertical stack of generic cards.

## Design direction

Fyntra becomes an operations workspace for insurance data, not a generic dashboard. The login's teal identity becomes the anchor, while authenticated screens use a cool canvas, a compact dark rail, wide primary work surfaces, and deliberate secondary context panels. The hierarchy is always: page context, primary work, supporting explanation/action.

## Information architecture

- Admin dashboard: operation health, financial movement, attention queue, recent audit.
- Admin features: data table or rule matrix as primary surface, filters/forms in a secondary column.
- Agent dashboard: personal money first, policy activity second, hierarchy context third.
- Agent lists: searchable/filterable primary list with scope/count context beside it.
- Policy details: summary strip, main commission/document work surface, supporting client and document context.
- Client portal: policy list and policy detail with plain language and no agent-only concepts.

## Shared visual system

- `Shell` owns rail, responsive navigation, workspace canvas, and account context.
- `PageHeader` owns eyebrow, title, description, count/action affordances.
- `ContextPanel` owns secondary explanation and guided next steps.
- `Table`, `EntityCard`, `Field`, `Button`, and `StatusPill` share one vocabulary: small radius, flat surfaces, strong borders, no decorative shadows.
- Mobile collapses secondary columns below the primary surface and keeps actions visible.

## Constraints

- Preserve all routes, authorization, Prisma queries, server actions, and URL contracts.
- Do not change database schema or seed data.
- Portuguese user-facing copy; no backend jargon in primary UI.
- WCAG AA contrast, visible keyboard focus, and no status communicated by color alone.
- Verify with lint, tests, build, and the actual Coolify container commit.
