# Fyntra Distribution OS Design

## Objective

Transform Fyntra from a policy and commission registry into the primary operating system for a life insurance distribution organization with more than 3,000 agents. Agents work in Fyntra from lead intake through annual policy review, while regulated calculations and carrier transactions remain with authorized industry systems.

## Product Boundary

Fyntra owns the agent experience, business workflow, organizational hierarchy, operational history and analytics. It does not recreate carrier actuarial engines, electronic applications, producer licensing databases or the carrier's official policy administration system.

The target journey is:

`Lead -> Prospect -> Needs Analysis -> Quote -> Illustration -> Application -> Underwriting -> Policy -> Premiums -> Commissions -> Annual Review`

National Life Group is the first and principal carrier. The architecture must remain multi-carrier so that adding another carrier does not require rebuilding the workflow.

## Architecture Decision

Use a hybrid orchestration architecture:

- Fyntra is the system of engagement and operational source of truth.
- iPipeline supplies specialized quote, underwriting, illustration, e-application and case-management capabilities.
- SureLC supplies producer licensing, appointments and contracting.
- National Life Group, AgencyIntegrator or DTCC supplies carrier-authoritative policy, in-force and compensation data.
- Manual PDF, CSV and batch imports remain supported fallbacks for every external integration.

External vendors are accessed through isolated connector interfaces. Core Fyntra workflows must not import vendor-specific payload shapes directly.

## Systems and Responsibilities

### Fyntra

- Lead, prospect and client records
- Beneficiaries and related parties
- Agent hierarchy and book ownership
- Tasks, follow-ups, communication and timeline
- Needs analysis and case design
- Quote and illustration orchestration
- Application and requirement tracking
- Policy operational mirror
- Commission ledger, splits, overrides and chargebacks
- Persistency, lapse-risk and annual-review workflows
- Documents, audit logs and executive analytics

### iPipeline

- LifePipe for Term and GUL quotes
- XRAE for preliminary field underwriting
- iSolve for permanent-life comparison when National Life products are enabled
- iGO for e-application, signatures and submission
- AgencyIntegrator for carrier pending-case feeds, case operations and commission reconciliation
- DocFast for policy/document delivery when contracted

The contract must grant an approved integration mechanism such as API, webhooks, batch feed, SSO or embedded workflow. Data export and the organization's right to retain its operational data in Fyntra are procurement gates.

### ForeSight and National Life Group

ForeSight remains the preferred official illustration engine when National Life is unavailable through iSolve. The integration order is:

1. Authorized XML/API or embedded service
2. SSO or contextual deep link with case correlation
3. Official PDF upload and structured extraction

Fyntra preliminary calculations must be labeled as estimates. Only carrier-generated output can be labeled as an official National Life illustration.

### SureLC

Use a direct institutional multi-carrier account with API rights for:

- Producer profiles
- State licenses
- Appointments
- Carrier contracts
- E&O and training status
- Can-sell readiness

Sponsored or affiliate access without API rights does not satisfy the target architecture.

### Carrier and DTCC Data

Policy, in-force and compensation connectivity follows this priority:

1. AgencyIntegrator carrier feed
2. Authorized direct National Life feed
3. DTCC/ACORD services
4. SFTP or batch delivery
5. Structured report import
6. Audited manual entry

The carrier remains the official source for policy values and transactions. Fyntra stores a timestamped operational mirror with source, external identifier and synchronization status.

## Domain Model

The first implementation slice introduces these bounded records:

- `Prospect`: pre-client person and contact data
- `InsuranceCase`: sales opportunity and needs-analysis container
- `CaseParty`: insured, owner and beneficiary relationships
- `Illustration`: preliminary or official design and its source
- `IllustrationScenario`: assumptions and summarized results
- `Application`: carrier submission and current new-business state
- `ApplicationRequirement`: underwriting or delivery requirement
- `Policy`: issued contract operational mirror
- `PolicySnapshot`: dated in-force values and payment state
- `PolicyTransaction`: premium, charge, loan, withdrawal or adjustment
- `CommissionTransaction`: immutable carrier compensation entry
- `IntegrationConnection`: organization-level provider configuration
- `ExternalReference`: canonical mapping between Fyntra and provider IDs
- `SyncEvent`: inbound/outbound integration event with retry and audit status

Existing `Client`, `Policy`, `CommissionRecord`, hierarchy and import data must be migrated or adapted without deleting historical records.

## Workflow and Statuses

The top-level case stages are:

- `LEAD`
- `DISCOVERY`
- `DESIGN`
- `ILLUSTRATION_READY`
- `APPLICATION_STARTED`
- `SUBMITTED`
- `UNDERWRITING`
- `APPROVED`
- `ISSUED`
- `PLACED`
- `DECLINED`
- `WITHDRAWN`

Internal status values remain stable and machine-oriented. Portuguese labels describe them in the interface. Vendor statuses are mapped at connector boundaries and the original external value is retained for audit.

Creating a policy is not an agent entry action. A policy is created by an issue/placement event or by an authorized historical import.

## Agent Experience

The agent dashboard prioritizes work rather than aggregate charts:

- Leads and follow-ups due today
- Illustrations awaiting completion or client review
- Applications with open requirements
- Policies in grace period or at lapse risk
- Premiums due and missing
- Expected, paid and charged-back commissions
- Annual reviews due

A client or prospect has one chronological timeline containing contact, case design, illustration, signatures, requirements, issue, payments, policy events, commissions and reviews.

External tools should open through SSO or embedded/contextual launch wherever contracts permit. The user returns to the same Fyntra case and external results synchronize back to it.

## Financial Data Rules

- Money is stored as decimal currency amounts, never floating point.
- Carrier compensation imports are immutable transactions; corrections are additional transactions.
- Expected commission is separate from paid commission.
- Direct commission, split, upline override and agency override are separate entries.
- Chargebacks link to the original earning when a source reference permits it.
- Illustration charges are projections and never overwrite actual policy transactions.
- Policy snapshots are append-only so historical values remain reproducible.

## Integration Reliability

Every connector must support:

- Idempotency using provider and external event identifiers
- Schema validation before persistence
- Raw payload retention with sensitive-field controls
- Retry with bounded backoff
- Dead-letter/manual-review state
- Last successful synchronization timestamp
- User-visible degraded status
- Full audit trail

Failure of an external provider must not make the Fyntra CRM or existing policy records unavailable.

## Security and Compliance

- MFA is required for agents and administrators.
- Access is restricted by organization, role, hierarchy and book ownership.
- Sensitive data is encrypted in transit and at rest.
- Secrets are stored outside the database and application source.
- SSN, health and underwriting data receive field-level access controls and retention rules.
- All reads and writes of restricted client data are auditable.
- Vendor connections use organization credentials, never shared agent passwords.
- Production onboarding requires incident response, backup/restore, vulnerability management and penetration testing.
- SOC 2 readiness is a commercial requirement for the 3,000-agent rollout.

## Delivery Strategy

This program is divided into independently useful releases.

### Release 1: Operational Core

- Prospect and insurance case model
- Real life-insurance pipeline
- Unified timeline and tasks
- Application and requirement tracking
- Policy operational mirror
- Commission transaction foundation
- National Life PDF/CSV import path
- Connector contracts and sync-event infrastructure

### Release 2: Producer Readiness and Sales

- SureLC integration
- LifePipe Term quoting
- XRAE field underwriting
- iGO contextual launch or API
- Official illustration attachment and case correlation

### Release 3: Carrier Operations

- AgencyIntegrator pending-case feed
- Policy and in-force synchronization
- Premium, charge, loan and lapse-risk views
- Commission reconciliation and chargebacks

### Release 4: Scale

- Pilot with 50 to 100 agents
- Security and performance hardening
- Historical book migration
- Rollout in cohorts of 250 to 500 agents
- Additional carriers through the same connector contracts

## Procurement Gates

Before contracting an external platform, require a proof of concept covering:

`Prospect -> Illustration -> e-App -> Underwriting -> Issue -> Policy -> Commission`

The vendor must confirm:

- National Life products and transactions supported
- API, webhook, SSO, embedded or batch capabilities
- Sandbox availability
- Data ownership and export
- Right to retain operational data in Fyntra
- Authentication and agent-identity mapping
- Pricing by agent, case, transaction and professional services
- SLA, rate limits and support escalation
- Security certifications
- Termination and data-portability process

## Testing Strategy

- Unit tests for status mapping, permissions, commission allocation and idempotency
- Integration contract tests using recorded, redacted provider fixtures
- Database tests for append-only financial and snapshot rules
- End-to-end tests for the Release 1 workflow
- Reconciliation tests comparing imported source totals to Fyntra totals
- Load tests before each rollout cohort
- Security tests for hierarchy isolation and restricted data access

## Success Criteria

The first pilot succeeds when:

- An agent can move a prospect from intake to placed policy without creating a policy manually.
- Official illustration documents and IDs remain linked to the correct case.
- Application requirements update without losing their carrier source value.
- Issued policy data is traceable to an authorized source.
- Commission totals reconcile to source statements and hierarchy rules.
- Agents cannot access records outside their permitted book and downline.
- Provider downtime is visible but does not block core Fyntra work.
- Operational staff can identify and resolve failed synchronization events.

## Explicit Non-Goals for Release 1

- Rebuilding the ForeSight actuarial engine
- Processing premium payments on behalf of National Life
- Replacing the carrier's official policy administration system
- Supporting every carrier or every product
- Automating portal access through shared credentials or browser scraping
- Full consumer self-service portal

