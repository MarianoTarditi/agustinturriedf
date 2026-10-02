# Tasks: Admin Users Module

## Review Workload Forecast
| Field | Value |
|---|---|
| Estimated changed lines | PR6 state machine 158; PR7 worker/control 345; PR8 issuance/queue 238; PR9 resend/revoke is an independent ≤400 slice |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Resolved: PR6 state machine → PR7 worker/control → PR8 issuance/queue → PR9 resend/revoke |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

Resolved by maintainer: `auto-chain`, `feature-branch-chain`; no `size:exception`. PR6 base=PR5 branch; PR7 base=PR6 branch; PR8 base=`a782a51`; PR9 follows PR8. Retarget/rebase polluted diffs. Tracker merges to main.

Ordering: audit 2.3–2.4 precedes lifecycle 2.1–2.2; PR6 precedes PR7 and invitations.

`T(path)` = `npm test --workspace @agustinturriedf/web -- path`; runtime `:3010`. Rollbacks retain schema/audit/invitations/jobs.

### Suggested Work Units
| Unit/cap | Focused command | Runtime harness | Rollback |
|---|---|---|---|
| 6 Durable state/158 | `T(features/outbox/state-machine.test.ts)` | Lease/CAS/retry/redrive harness→safe state | Revert migration/repository/test commit |
| 7 Worker/control/345 | `T(features/outbox/worker.test.ts app/api/internal/outbox/drain/route.test.ts)` | Concurrent drain→one effect; denied control→same response | Revert adapters/worker/controls/test commit |
| 8 Invitation issuance/queue/238 | `T(features/invitations/service.test.ts)` | Transaction-composition harness→no direct email or user creation | Revert issuance/repository/validation/test slice |
| 9 Invitation resend/revoke/≤400 | `T(features/invitations/service.test.ts)` | Version/CAS route harness→one update | Revert resend/revoke slice |

## Phase 1: Foundations
- [x] 1.1 Gate PostgreSQL/Prisma-6 serializable errors, keys, scheduler/email, cadence, routine postconditions; E2E non-blocking.
- [x] 1.2 RED `agustinturriedf/web/features/users/foundation.test.ts`: AL2 AL4.
- [x] 1.3 GREEN `agustinturriedf/web/prisma/schema.prisma`, `agustinturriedf/web/prisma/migrations/20260913_admin_users_foundation/migration.sql`; migrate PostgreSQL and reconcile.
- [x] 1.4 RED `agustinturriedf/web/features/users/policy.test.ts`: UD1 AL1 AL5 CR1; GET-200, POST-405, DELETE-405.
- [x] 1.5 GREEN `agustinturriedf/web/features/users/policy.ts`, `agustinturriedf/web/features/users/dto.ts`, `agustinturriedf/web/features/users/service.ts`, `agustinturriedf/web/features/users/repository.ts`, `agustinturriedf/web/lib/validation/users.ts`.
- [x] 1.6 GREEN `agustinturriedf/web/features/auth/session.ts`, `agustinturriedf/web/features/auth/authorization.ts`, `agustinturriedf/web/auth.ts`, `agustinturriedf/web/types/auth.d.ts`, `agustinturriedf/web/app/api/users/route.ts`, `agustinturriedf/web/app/api/users/[userId]/route.ts`.

## Phase 2: Lifecycle, audit, delivery
- [x] 2.1 RED `agustinturriedf/web/app/api/users/lifecycle.test.ts`: AL2 AL3; restore→INACTIVE; DELETE-405.
- [x] 2.2 GREEN `agustinturriedf/web/app/api/users/[userId]/transitions/route.ts`, `agustinturriedf/web/features/users/service.ts`, `agustinturriedf/web/features/users/repository.ts`.
- [x] 2.3 RED `agustinturriedf/web/features/audit/repository.test.ts`: AA1–AA4.
- [x] 2.4 GREEN `agustinturriedf/web/features/audit/repository.ts`, `agustinturriedf/web/features/audit/event-factory.ts`, `agustinturriedf/web/app/api/users/[userId]/audit/route.ts`.
- [x] 2.5 RED `agustinturriedf/web/features/outbox/state-machine.test.ts`: OD1–OD4; keep incomplete until PR6 and PR7 satisfy all OD1–OD5 cases.
- [x] 2.5.1 RED PR6 `agustinturriedf/web/features/outbox/state-machine.test.ts`: atomic rollback; fenced stale/duplicate claims; conditional settlement; retry, purge/retention, redrive/replay.
- [x] 2.5.2 GREEN PR6 `agustinturriedf/web/prisma/schema.prisma`, `agustinturriedf/web/prisma/migrations/20260918_outbox_state_machine/migration.sql`, `agustinturriedf/web/features/outbox/repository.ts`: state machine; verify `T(features/outbox/state-machine.test.ts)`, `prisma validate`, lease/CAS harness; autonomous commit, rollback it.
- [x] 2.6 GREEN worker/control execution; keep incomplete until PR7 proves OD2/OD5 and AA1/AA4 without weakening PR6 fencing or retention.
- [x] 2.6.1 RED PR7 `agustinturriedf/web/features/outbox/worker.test.ts`, `agustinturriedf/web/app/api/internal/outbox/drain/route.test.ts`: concurrent idempotency/replay; email/routine outcomes; `PENDING`→`READY`/`FAILED`; SYSTEM audit; length-hiding denials.
- [x] 2.6.2 GREEN PR7 `agustinturriedf/web/features/outbox/worker.ts`, `agustinturriedf/web/features/outbox/email-adapter.ts`, `agustinturriedf/web/features/routines/storage.ts`, `agustinturriedf/web/app/api/internal/outbox/drain/route.ts`: adapters/controls; verify `T(features/outbox/worker.test.ts app/api/internal/outbox/drain/route.test.ts)` and fake-adapter harness; autonomous commit, rollback it.

## Phase 3: Invitations and credentials
> Sequencing: complete PR6, then PR7; do not start PR8 invitations (3.1–3.2) until 2.5–2.6 pass.
- [x] 3.1 RED `agustinturriedf/web/features/invitations/service.test.ts`: AI1–AI3.
  - [x] 3.1.1 RED PR8 issuance/queue: AI1 role-aware issuance and AI2 scoped safe queue DTO boundaries.
  - [x] 3.1.2 RED PR9 resend/revoke: AI3 version, token rotation, terminal-state, and conflict boundaries.
- [x] 3.2 GREEN `agustinturriedf/web/features/invitations/service.ts`, `agustinturriedf/web/features/invitations/repository.ts`, `agustinturriedf/web/features/invitations/email.ts`, `agustinturriedf/web/lib/validation/invitations.ts`, `agustinturriedf/web/app/api/invitations/route.ts`, `agustinturriedf/web/app/api/invitations/[invitationId]/resend/route.ts`, `agustinturriedf/web/app/api/invitations/[invitationId]/revoke/route.ts`.
  - [x] 3.2.1 GREEN PR8 issuance/queue: `service.ts`, `repository.ts`, `validation/invitations.ts`, and aligned service tests; atomic invitation/audit/encrypted-outbox composition with safe queue DTOs.
  - [x] 3.2.2 GREEN PR9 resend/revoke: versioned commands, encrypted re-delivery enqueue, and resend/revoke handlers.
- [x] 3.3 RED `agustinturriedf/web/app/(auth)/activation/page.test.tsx`: AI4 AI5.
  - [x] 3.3.1 RED PR10a activation primitives: eligible token/session state, terminal/replay rejection, lost CAS, and transaction composition.
   - [x] 3.3.2 RED PR10b exchange/UI: HttpOnly cookie, clean URL, mandatory accessible modal, and public-route recovery behavior.
- [x] 3.4 GREEN `agustinturriedf/web/app/api/activations/route.ts`, `agustinturriedf/web/app/(auth)/activation/exchange/route.ts`, `agustinturriedf/web/app/(auth)/activation/page.tsx`, `agustinturriedf/web/app/(auth)/activation/_components/activation-form.tsx`.
  - [x] 3.4.1 GREEN PR10a `agustinturriedf/web/features/invitations/activation.ts`: opaque hashed session and atomic activation primitives.
   - [x] 3.4.2 GREEN PR10b exchange route, activation route, page, and form: consume the primitive through the public cookie/UI boundary.
- [x] 3.5 RED `agustinturriedf/web/features/auth/password-reset/service.test.ts`: AI6 CR1–CR5.
- [x] 3.6 GREEN `agustinturriedf/web/features/auth/password-reset/service.ts`, `agustinturriedf/web/features/auth/password-reset/repository.ts`, `agustinturriedf/web/features/auth/password-reset/logger.ts`, `agustinturriedf/web/lib/validation/password-reset.ts`, `agustinturriedf/web/app/api/invitations/replacement-requests/route.ts`, `agustinturriedf/web/app/api/users/[userId]/password-reset/route.ts`, `agustinturriedf/web/app/api/password-reset/request/route.ts`, `agustinturriedf/web/app/api/password-reset/confirm/route.ts`, `agustinturriedf/web/app/(auth)/reset-password/page.tsx`.

## Phase 4: Views
- [x] 4.1 RED `agustinturriedf/web/features/users/directory.test.ts`: UD1–UD4. PR16 proves UD1–UD3 only; defer UD4 assignment and lifecycle/deactivation coordination to PR17.
- [x] 4.2 GREEN `agustinturriedf/web/features/users/service.ts`, `agustinturriedf/web/features/users/repository.ts`, `agustinturriedf/web/app/api/users/route.ts`: directory query and profile edits only. PR17 owns student assignment.
- [x] 4.3 RED `agustinturriedf/web/app/(private)/usuarios/estudiantes/page.test.tsx`.
- [x] 4.4 GREEN `agustinturriedf/web/app/(private)/usuarios/estudiantes/page.tsx`.
- [x] 4.5 RED `agustinturriedf/web/app/(private)/usuarios/equipo/page.test.tsx`.
- [x] 4.6 GREEN `agustinturriedf/web/app/(private)/usuarios/equipo/page.tsx`, `agustinturriedf/web/components/private-navbar.tsx`.
- [x] 4.7 RED `agustinturriedf/web/app/(private)/usuarios/invitaciones/page.test.tsx`.
- [x] 4.8 GREEN `agustinturriedf/web/app/(private)/usuarios/invitaciones/page.tsx`.

## Phase 5: Verification
- [x] 5.1 Run `npm test --workspace @agustinturriedf/web`, `npm run lint --workspace @agustinturriedf/web`, `npm run build --workspace @agustinturriedf/web`; separate baseline failures.
