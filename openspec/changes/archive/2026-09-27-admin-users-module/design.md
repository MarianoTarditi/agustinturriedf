# Design: Admin Users Module

## Approach

Extend Next.js route → service → Prisma slices. PostgreSQL owns lifecycle, versions, audit, activation, throttling, outbox; services own policy/DTOs; routes own queries.

**Routine boundary:** keep `features/routines/storage.ts`; no routine migration, Vercel Blob, or new adapter. Provisioning queues `PENDING`; verified path, directory type, ownership, permissions yield `READY`; otherwise `FAILED`.

## Decisions

| Choice | Tradeoff / rationale |
|---|---|
| Canonical status/version/authVersion | Migration; unified lifecycle/revocation. |
| Service policy, DTOs | Duplication; target authorization, private ORM. |
| Serializable transitions, CAS | Retries; race-safe invariants. |
| Token → hashed 10m secure session | State; removes bearer before passwords. |
| Transactional outbox | Async; atomic domain/audit/work. |
| Append-only scoped audit | Storage; safe attribution/history. |
| Server-rendered three-view UI | Files; stable URLs/client islands. |

## Flows

```mermaid
sequenceDiagram
I->>X: link(token)
X->>DB: hash; CAS exchange; create 10m session
DB-->>I: secure cookie; clean /activation
I->>S: password via session
S->>DB: atomic revalidation + role data + consume + audit + job
DB-->>I: clear cookie; login, no sign-in
```

```mermaid
sequenceDiagram
R->>DB: atomic mutation + audit + PENDING work
W->>DB: claim bounded leased batch
W->>E: idempotent email
W->>FS: ensure/verify via boundary
W->>DB: conditional success/retry/FAILED
Note over W,DB: purge bearer; controlled redrive
```

## Contracts

Lists return `{items,nextCursor}` (25/100); signed cursors bind scope/sort/value/ID. Commands require schemas, `expectedVersion`, and nonblank ≤500-character reasons. Invitation lifecycle/delivery remain separate. Reset increments `authVersion`.

`restore` atomically appends an immutable audit event preserving historical `archivedAt`, `archivedByUserId`, and `archiveReason`; clears those current fields; sets `INACTIVE`; increments both versions. Reactivation is separate.

## Normative Traceability

| Requirement | Implementation; planned RED |
|---|---|
| UD1 Scoped access | policy/routes; RED students allow/team 403 |
| UD2 Bounded queries | scoped cursor; RED bounds/scope/archive |
| UD3 Profile contracts | DTO/CAS; RED secrets/immutable/stale |
| UD4 Assignment | transaction; RED active/invalid trainer |
| AL1 Canonical access | session gate; RED ACTIVE-only |
| AL2 Guarded transitions | state/CAS; RED edges/reason/versions/session |
| AL3 Reversible archival | restore; RED atomically audit prior three values, clear all current markers, return INACTIVE; delete 405 |
| AL4 Admin continuity | serializable transaction; RED concurrent survivor |
| AL5 Immutable role | allowlist; RED injection |
| AI1 Role-aware issuance | policy transaction; RED role/data/email/no-User/48h |
| AI2 Scoped queue | scoped DTO; RED trainer/status/token boundaries |
| AI3 Resend/revoke | versioned commands; RED rotation/reason/conflicts |
| AI4 Secure exchange | session; RED replay/expiry/headers/modal |
| AI5 Atomic activation | transaction; RED rollback/race/redirect |
| AI6 Safe recovery | replacement; RED terminal states/equal 202 |
| AA1 Complete history | transactional audit; RED one/rollback/correction |
| AA2 Authorized access | scoped cursor; RED chronology/team 403 |
| AA3 Secret-safe content | allowlist; RED omissions/bounds/plain-text |
| AA4 Attribution | actor context; RED human/subject/system/public |
| OD1 Durable commitment | transaction; RED all-or-none |
| OD2 Idempotency | key/lease/CAS; RED duplicate/replay/interruption |
| OD3 Recovery | backoff; RED transient/reclaim/terminal/redrive |
| OD4 Secret-safe data | encryption/sanitization; RED omission/purge |
| OD5 Provisioning | storage boundary; RED verified READY/invalid FAILED |
| CR1 Panel authorization | target policy/throttle; RED role/limits |
| CR2 Secrecy | allowlists; RED reject/hide secrets |
| CR3 Durable request | audit/outbox transaction; RED one 202/outage |
| CR4 Anti-enumeration | public throttle; RED equal 202/path |
| CR5 Reset security | reset CAS/session; RED new password/old JWT/replay |

## Files

| Status | Files / change |
|---|---|
| Existing | schema; users/invitations/auth; routine boundary; affected API/UI/navbar/tests — add data, policy, contracts, session checks, verification. |
| Planned | migration; audit/outbox; policy/DTO; exchange/drain/intent routes; views/tests — add safeguards, workers, UI. |

No routine route/service/repository/UI, dependency, Blob adapter, or deletion is planned.

## Testing

Unit/UI: policy, state, allowlists, cursor/crypto/retry, URL/modal. PostgreSQL: migration, scope, atomicity, leases, CAS, provisioning, races. E2E awaits runner. Run web test, lint, build; separate baseline.

## Threat Matrix

HTTP routing changes; no listed execution/VCS boundary exists.

| Boundary / cases | Applicability; safe behavior; RED |
|---|---|
| Documentation-like: requirements, CMake, MDX, README.sh | N/A—no classifier; never execute; RED N/A |
| Git selection: `-C`, relative, absolute | N/A—no Git/cwd; never select repos; RED N/A |
| Commit: staged, `-a`, empty index | N/A—no automation; never change index; RED N/A |
| Push: tracking, first, refspec | N/A—no automation; never update refs; RED N/A |
| PR: `--head`, environment, composition | N/A—no commands; never execute; RED N/A |

## Rollout, Rollback, Dependencies

Verify PostgreSQL/Prisma, keys, authenticated scheduler/email, durable routine postconditions. Deploy schema/backfill; session/policy/405; lifecycle; observe worker; email/provisioning; Invitations, Students, Team. Remove compatibility after clean telemetry.

Rollback disables UI/commands, pauses claims, retains schema/jobs/audit/history; leases recover. Never restore direct creation, shared passwords, role mutation, hard deletion, secret logging, unverified provisioning. Dependencies: approve runner/cadence; prove durable routine storage or open separate platform change; select E2E runner.
