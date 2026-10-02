## Exploration: admin-users-module

### Current State
The Next.js application already uses route handlers, feature services, repositories, Prisma, Zod, and Vitest. The current users module is unsafe for the approved scope: `GET /api/users` returns an unbounded, unscoped list; direct `POST` creates users with a bootstrap password; `PATCH` can change roles; and `DELETE` hard-deletes records before removing a student routine directory.

Student state currently belongs to `StudentProfile`; team accounts have no equivalent lifecycle. Invitations are student-only, require a trainer, have a globally unique email, send email synchronously through Resend, and activate only a student. Activation already uses hashed single-use tokens and a transaction, but its token is in a query string and filesystem work occurs after commit. Password reset hashes and consumes tokens but logs the token-bearing reset URL instead of delivering email. `requireSession` reloads the user and current student status on requests, which is a reusable enforcement point but must move to canonical user lifecycle/auth-version checks.

Focused relevant tests pass: 5 files / 26 tests. The full web suite has an existing unrelated failing baseline (four routine-upload failures, one videoteca-upload failure, four zero-test route suites) and exceeded the 120-second command timeout.

### Affected Areas
- `agustinturriedf/web/prisma/schema.prisma` — Move lifecycle ownership to `User`; generalize invitations; add audit, outbox, version, and archival structures.
- `agustinturriedf/web/prisma/migrations/` — Additive/backfill migration is required; current invitation email uniqueness and non-null trainer relation prevent historical multi-role invitations.
- `agustinturriedf/web/features/users/{service,repository}.ts` — Replace unrestricted list/direct create/hard delete/role mutation with scoped queries and intent-specific commands.
- `agustinturriedf/web/features/invitations/{service,repository,email,logger}.ts` — Generalize target roles, fragment-based activation, delivery state, audit, and asynchronous idempotent delivery.
- `agustinturriedf/web/features/auth/{session,authorization}.ts` and `features/auth/password-reset/` — Enforce account lifecycle/auth-version and replace reset-link logging with outbox email delivery.
- `agustinturriedf/web/app/api/{users,invitations,activations,password-reset}/` — Introduce explicit paginated DTO contracts and retire unsafe methods with the approved `405` responses.
- `agustinturriedf/web/app/(private)/usuarios/` and `components/private-navbar.tsx` — Evolve the current single users surface into scoped Students, Team, and Invitations views; remove hard-delete interactions.
- `agustinturriedf/web/features/{users,invitations,auth}/**/*.test.ts` and route tests — Existing tests encode legacy behavior and provide a starting point, but require authorization, transaction, concurrency, DTO secrecy, and UI coverage.

### Approaches
1. **Incremental vertical slices on the current modules** — Introduce shared policy/state/DTO boundaries while evolving existing routes, Prisma relations, invitation flow, and users UI in the approved slice order.
   - Pros: Reuses token hashing, compare-and-set consumption, Resend integration, payment/routine creation, and established service/repository patterns; limits compatibility risk and supports additive migration/backfill.
   - Cons: Requires temporary dual reads for `StudentProfile.status` and careful retirement of legacy contracts/tests.
   - Effort: High

2. **Parallel v2 module with compatibility adapters** — Build independent v2 routes/services/tables and bridge existing UI and consumers until cutover.
   - Pros: Strong isolation from unsafe legacy contracts during initial development.
   - Cons: Duplicates authorization/lifecycle authority, increases migration and audit reconciliation risk, and conflicts with the approved non-rewrite, vertical-slice delivery strategy.
   - Effort: High

### Recommendation
Use incremental vertical slices on the existing feature modules. First land the server-side security boundary and additive schema/audit foundation, then generalized invitations, Students, Team, and recovery delivery. Keep legacy reads only as narrowly and temporarily as the documented migration sequence requires; do not expose replacement UI until its service contract and invariants are complete.

### Risks
- Existing schema constraints (`Invitation.email @unique`, mandatory `trainerId`) and `StudentProfile.status` require verified backfills, partial unique indexing, and compatibility reads before cleanup.
- No durable outbox, encrypted delivery payload mechanism, worker/cron runner, or audit model exists today; the implementation must select and test these technical mechanisms without weakening the approved guarantees.
- Current email/reset logging and query-string activation links can expose secrets; logging/template/client handling must change together before the new flows are enabled.
- Auth currently derives access from student status and payment state; lifecycle/auth-version changes must cover login and protected requests without bypassing payment rules.
- The full Vitest baseline is already failing outside this module; verification must report those failures separately from admin-users regressions.

### Ready for Proposal
Yes — the approved design, repository evidence, migration constraints, reusable foundations, and baseline status are sufficient to create the proposal. Record the outbox runner, encrypted payload/key management, and cursor encoding as implementation choices rather than reopening product decisions.
