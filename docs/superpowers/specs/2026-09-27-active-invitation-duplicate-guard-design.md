# Guard Only Active Invitation Duplicates

**Status:** Approved design  
**Date:** 2026-09-27  
**Scope:** Invitation issuance in `agustinturriedf/web`

## Decision

Invitation issuance will reject only a currently usable invitation for the same normalized email. Historical rows remain immutable evidence, while an eligible reinvite creates a new invitation, audit event, and outbox message. A transaction-scoped PostgreSQL advisory lock will serialize same-email issuance so the check and creation remain conflict-safe.

## Problem and evidence

- `InvitationService.create` normalizes the email, then calls broad `invitationRepository.findByEmail(email)` and returns `409 CONFLICT` when any invitation row exists.
- The schema permits repeated `Invitation.email` values so terminal history can be retained.
- The local database has no `User` for `agustintarditi00@gmail.com`, but has one unexpired historical invitation with `status = REVOKED`, `deliveryStatus = PENDING`, and `tokenHash = null`.
- That unusable row currently blocks reinvitation even though it cannot activate an account.
- Moving only to an active-row query would introduce a check-then-create race unless same-email issuance is serialized.

## Goals

- Block issuance when `User.email` is already reserved or a usable invitation is active.
- Permit a fresh issuance after revocation, consumption, expiry, or token removal.
- Preserve every historical invitation and its audits; never delete, update, or reuse it for reinvitation.
- Atomically create one fresh invitation, issuance audit, and encrypted outbox message.
- Preserve `201` for successful issuance and `409 CONFLICT` for active duplicates.

## Non-goals

- Adding a global unique constraint on `Invitation.email` or changing the Prisma schema.
- Changing resend, replacement, activation, revoke, delivery, or list behavior.
- Repairing historical delivery projections or deleting historical data.
- Changing response bodies, authorization, validation, token lifetime, or email normalization.

## Chosen design

Replace the issuance use of `findByEmail` with an explicit, transaction-aware active-conflict lookup. A row conflicts only when all three predicates hold at the same transaction time:

1. `status IN ('PENDING', 'SENT')`;
2. `tokenHash IS NOT NULL`;
3. `expiresAt > now`.

`deliveryStatus` does not determine usability and is not part of this predicate. The existing normalized-email user lookup remains authoritative for reserved accounts. No historical invitation is mutated when the lookup finds no active conflict.

## Transaction and concurrency flow

1. Perform authorization, schema validation, trainer-scope validation, and email normalization as today.
2. Start the existing interactive Prisma transaction.
3. Acquire `pg_advisory_xact_lock(hashtext(normalizedEmail))` through a parameterized tagged-template query. This follows the repository's existing transaction-lock pattern and releases automatically on commit or rollback.
4. After the lock is acquired, capture one `now` value and re-check `User.email` through the transaction client. Return `409 CONFLICT` if reserved.
5. Query for an active invitation using the same transaction client and `now`. Return `409 CONFLICT` if found.
6. Generate the new token and expiry, then insert a new `PENDING` invitation and its `INVITATION_ISSUED` audit and encrypted email outbox message in that transaction.
7. Commit and return the existing safe DTO; the route continues to return `201`.

Same normalized-email issuance attempts contend on one lock. The loser re-checks after the winner commits, sees the new active invitation, returns `409`, and writes no invitation, audit, or outbox row. Hash collisions may serialize unrelated emails but cannot permit duplicate active invitations. No external provider call occurs while the lock is held.

## State table

| Existing state for normalized email | Issuance result | Historical row |
| --- | --- | --- |
| Any `User` exists | `409 CONFLICT` | Unchanged |
| `PENDING` or `SENT`, token present, future expiry | `409 CONFLICT` | Unchanged |
| `PENDING` or `SENT`, token missing | `201`; create fresh cycle | Preserved |
| `PENDING` or `SENT`, expired | `201`; create fresh cycle | Preserved |
| `REVOKED`, `CONSUMED`, or `EXPIRED` | `201`; create fresh cycle | Preserved |
| No user and no invitation | `201`; create fresh cycle | Not applicable |

## Planned file map

Every path below is **planned**; this design task changes none of them.

| Planned path | Planned change |
| --- | --- |
| `agustinturriedf/web/features/invitations/service.ts` | **Planned modification:** move user and active-invitation checks into the issuance transaction after the advisory lock; keep fresh invitation/audit/outbox creation atomic. |
| `agustinturriedf/web/features/invitations/repository.ts` | **Planned modification:** add transaction-aware lock acquisition and active-conflict lookup; remove the broad historical lookup from issuance. |
| `agustinturriedf/web/features/users/repository.ts` | **Planned modification:** allow `findByEmail` to use the caller's transaction for the reserved-user re-check. |
| `agustinturriedf/web/features/invitations/service.test.ts` | **Planned modification:** cover the state matrix, transaction ordering, winner-only side effects, and rollback. |
| `agustinturriedf/web/features/invitations/repository.test.ts` | **Planned modification:** verify the advisory-lock query and exact active predicate use the supplied transaction and clock. |
| `agustinturriedf/web/features/invitations/flow.integration.test.ts` | **Planned modification:** preserve multiple historical rows and exercise concurrent same-email issuance with a lock-aware harness. |
| `agustinturriedf/web/app/api/invitations/route.test.ts` | **Planned modification:** retain `201` for eligible reinvites and `409 CONFLICT` for active duplicates. |

No route, Prisma schema, or migration change is planned.

## Test strategy

- Table-driven service tests: `REVOKED`, `CONSUMED`, `EXPIRED`, expired active-status, and tokenless active-status rows each permit one fresh cycle; usable `PENDING` and `SENT` rows block it.
- Reserved-user test: a user found inside the transaction returns `409` before invitation, audit, or outbox writes.
- Repository tests: active lookup requires every predicate and compares expiry with the supplied `now`; lock and reads use the same transaction client.
- Concurrency test: launch two issuance calls for one normalized email, force lock contention, and assert at most one active invitation plus exactly one winner audit and outbox message; the loser returns `409`.
- Atomicity tests: invitation, audit, and outbox failures roll back the complete winner cycle, and no raw token appears in responses, audits, or logs.
- API regression tests: eligible historical email returns `201`; an active conflict remains `409 CONFLICT` with the existing response shape.

## Rollback

Rollback is code-only: restore the broad issuance lookup and remove the transaction-aware lock and lookup changes. Do not delete invitations created while this design is active; they are valid historical records. No schema or data rollback is required.

## Acceptance criteria

- [ ] Only `PENDING` or `SENT` invitations with a token and future expiry block issuance.
- [ ] Revoked, consumed, expired, and tokenless rows permit a new invitation without mutation or deletion.
- [ ] An existing user still blocks issuance with `409 CONFLICT`.
- [ ] Eligible reinvitation creates a distinct invitation, audit event, and outbox message and returns `201`.
- [ ] Two concurrent same-email requests produce at most one active invitation and one winner audit/outbox cycle.
- [ ] Active duplicate responses and successful response bodies remain unchanged.
- [ ] No global unique `Invitation.email` constraint, migration, unrelated behavior change, or historical cleanup is introduced.
