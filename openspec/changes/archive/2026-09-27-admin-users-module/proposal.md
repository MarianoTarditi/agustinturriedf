# Proposal: Admin Users Module

## Intent

Replace unsafe user administration with role-scoped Students, Team, and Invitations workflows. Accounts will be invitation-created, lifecycle-controlled, concurrency-safe, auditable, and supported by reliable asynchronous delivery.

## Scope

### In Scope
- Separate route-backed views with server pagination, filtering, explicit DTOs, and service-enforced authorization.
- Invitation-only activation through a one-time token exchange, short-lived HttpOnly session, clean URL, and mandatory compliant-password modal.
- Canonical user lifecycle, reversible archival, immutable roles, assignment, recovery email, safe audit history, optimistic concurrency, and durable side effects.

### Out of Scope
- Multi-tenancy, role conversion, physical panel deletion, shared/operator-assigned passwords, rewrites, and unrelated refactors.

## Capabilities

### New Capabilities
- `user-directory`: Scoped Students and Team queries, profiles, assignment, pagination, filtering, DTOs, and views.
- `account-lifecycle`: Canonical states, reversible archival, transition guards, optimistic concurrency, and session invalidation.
- `account-invitations`: Role-aware issuance, queue management, 48-hour expiry, secure activation exchange, and password setup.
- `administration-audit`: Append-only, authorized, secret-safe history for invitations and account actions.
- `operational-delivery`: Transactional outbox and idempotent workers for email and student-directory provisioning.
- `credential-recovery`: Authorized reset requests that send email without exposing or assigning credentials.

### Modified Capabilities
None; no existing OpenSpec capability specs are present.

## Approach

Extend the existing Next.js feature/service/repository architecture through incremental vertical slices: secure legacy routes first; add schema, lifecycle, audit, and authorization foundations; generalize invitations and activation; then release Students, Team, and recovery workflows. Use additive/backfill Prisma migrations, PostgreSQL safeguards, mutation-plus-outbox transactions, stable idempotency keys, and bounded worker retries.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `agustinturriedf/web` | Modified | Only affected workspace project. |
| `prisma/schema.prisma`, `prisma/migrations/` | Modified | Lifecycle, invitations, audit, outbox, versions, backfills. |
| `features/{users,invitations,auth}/`, `app/api/` | Modified | Policies, DTOs, commands, activation, recovery, workers. |
| `app/(private)/usuarios/`, `components/private-navbar.tsx` | Modified | Three scoped administration views. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migration/state inconsistency | High | Additive rollout, reconciliation, compatibility reads, backup. |
| Concurrent admin/token races | Medium | Serializable guards, compare-and-set, bounded retries. |
| Secret leakage or duplicate side effects | Medium | HttpOnly exchange, allowlisted logs, encryption, idempotency. |

## Rollback Plan

Disable affected capabilities and pause workers while retaining additive schema, queued jobs, invitations, and old status fields. Restore prior read UI only; never restore direct creation, shared passwords, role mutation, or hard delete.

## Dependencies

- PostgreSQL migration support, Prisma 6 transaction behavior, email provider, encryption key management, and an outbox runner.

## Success Criteria

- [ ] Authorization tests prove trainers manage all students and no team accounts; admin safeguards hold under concurrency.
- [ ] All accounts activate only after valid 48-hour invitation exchange and compliant password submission.
- [ ] Lifecycle, assignment, recovery, audit, pagination, DTO secrecy, concurrency, and worker-idempotency tests pass.
- [ ] No supported API directly creates, role-converts, or physically deletes users.
