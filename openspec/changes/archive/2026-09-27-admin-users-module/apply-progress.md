# Apply Progress: Admin Users Module

## PR21: Corrected Invitations UI

- Unit: `pr21-invitations-ui`; delivery: chained PR slice, `feature-branch-chain`; branch `feature/admin-users-pr21-invitations-ui` follows the PR20 queue API base `c9e6f24` and does not target `main`.
- Mode: Standard. `strict_tdd` is disabled by the OpenSpec testing-capabilities contract.

### Completed Tasks

- [x] 4.7 RED rendered interaction coverage for the corrected Invitations route.
- [x] 4.8 GREEN paginated queue UI, versioned actions, accessible revoke dialog, and role-scoped Invitations navigation.

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused UI/navbar/API/action regressions | `npm test --workspace @agustinturriedf/web -- "app/(private)/usuarios/invitaciones/page.test.tsx" components/private-navbar.test.tsx "app/api/invitations/route.test.ts" "app/api/invitations/[invitationId]/resend/route.test.ts" "app/api/invitations/[invitationId]/actions.test.ts"` — exit 0; 5 files, 12 tests passed. |
| Real schema/route URL proof | The rendered filter scenario captures the actual `GET /api/invitations` URL and validates all emitted search parameters through `invitationQueueQuerySchema.safeParse`; it includes the opaque cursor on the next page. |
| Runtime harness | Testing Library/jsdom exercises the real client route: safe queue DTO rendering, delivery and expiry labels, loading, generic authorization/error, filtered empty, cursor pagination, resend/revoke `expectedVersion` payloads, and the revoke dialog initial focus, trap edges, Escape close, and trigger restoration. No browser/E2E runner exists. |
| TypeScript baseline | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 2 from existing reset-password generated contracts: the confirm page has a synchronous `searchParams` type and the confirm route exports `PASSWORD_RESET_CONFIRM_SUCCESS_MESSAGE`. No PR21 file is named. |
| Diff checks | `git diff --check c9e6f24 --` and no-index checks for both new Invitations files — passed; only LF-to-CRLF advisories. |
| Authored line count | `git diff --numstat c9e6f24 --` plus no-index numstats for new files: CSS +39, navbar +6, navbar test +13/-2, Invitations page +120, Invitations test +95; **273 changed lines**, within 400. |
| Rollback boundary | Revert the Invitations page/test, named invitation dialog styles, and Invitations navbar item/navbar test coverage. This removes only PR21 presentation/navigation while retaining the PR20 queue API and invitation command routes. |

### PR21 Correction

- Tasks 4.7/4.8 were temporarily unchecked while correcting the UI contract, then rechecked only after the focused suite and diff checks passed.
- The status control now exposes every server-supported lifecycle value, including `CONSUMED` and `EXPIRED`. The rendered test proves both option values, emits a `CONSUMED` query accepted by the real schema, and asserts the exhausted-page empty state.
- Corrected evidence: the original queue proof did not render-assert the empty page and the UI omitted two server-supported status filters. The corrected proof now covers both; no accessibility, action, or navbar behavior was removed.
- Corrected focused UI/navbar/API/action regressions: `npm test --workspace @agustinturriedf/web -- "app/(private)/usuarios/invitaciones/page.test.tsx" components/private-navbar.test.tsx "app/api/invitations/route.test.ts" "app/api/invitations/[invitationId]/resend/route.test.ts" "app/api/invitations/[invitationId]/actions.test.ts"` — exit 0; 5 files, 12 tests passed.
- Corrected diff checks: `git diff --check c9e6f24 --` and no-index checks for both new Invitations files — passed; only LF-to-CRLF advisories. Revised authored count: CSS +39, navbar +6, navbar test +13/-2, Invitations page +120, Invitations test +98; **278 changed lines** including additions and deletions, within 400.

### Result

- The UI consumes only the paginated safe queue DTO and its allowlisted search, all server lifecycle statuses, role, limit, and opaque cursor parameters. It never renders tokens, hashes, bearer data, or server failure details.
- ADMIN and TRAINER can discover Invitations; active-route precedence leaves the parent Usuarios link inactive. Server authorization remains the scope authority, including trainer-owned Student invitations only.

## Phase 5.1: Final Verification — Blocked

- Branch: `feature/admin-users-pr21-invitations-ui`; true module initial base: `d3ff360`, the parent of PR1 (`545f584`). This classification does not use the prior chained commit as a baseline.
- Mode: Standard; `strict_tdd` remains disabled.

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Full web tests | `npm test --workspace @agustinturriedf/web` — timed out at 120 seconds. Before timeout: 7 failed tests across 3 files and 3 zero-test route suites. Four failures in `app/api/routines/folders/[folderId]/files/route.test.ts` and one in `app/api/videoteca/folders/[folderId]/files/route.test.ts` are inherited: both tests and their route sources have no diff from `d3ff360`. The two failing `features/invitations/flow.integration.test.ts` tests are not cleared as inherited: the test is unchanged, but the module changes its exercised `features/invitations/service.ts` and `repository.ts`. |
| Lint | `npm run lint --workspace @agustinturriedf/web` — exit 1. `next lint` entered its first-time interactive ESLint setup prompt, so no lint rules ran. The initial-base `package.json` already uses `next lint` and `d3ff360` contains no ESLint configuration file; this check is unavailable from the true base. |
| Build | `npm run build --workspace @agustinturriedf/web` — exit 1. Compilation passed, then Next rejected the synchronous `searchParams` type in `app/(auth)/reset-password/confirm/page.tsx`. That file has no diff from `d3ff360`; the initial-base package uses the same build script and Next dependency range, so this is inherited baseline evidence. |
| Prisma validation | `npx prisma validate --schema prisma/schema.prisma` — exit 0; schema valid. Prisma emitted only the existing `package.json#prisma` deprecation warning. |
| Git checks | Worktree has only untracked tooling/docs/OpenSpec directories; tracked and staged diffs are empty, and both `git diff --check` commands pass. `d3ff360..HEAD` contains 5,622 additions and 625 deletions across the module. |
| Runtime harness | N/A — this final verification runs repository commands; no browser/E2E runner is available. Existing work units retain their focused route/UI harnesses. |
| Rollback boundary | No product files changed in this verification. Revert only this Phase 5.1 evidence block to remove the record. |

### Result

- Task 5.1 remains unchecked. The full suite did not complete, and the two invitation-flow failures cannot be demonstrated as pre-existing against the true initial base because their production dependencies changed within this module.
- Actionable correction slice: reproduce `features/invitations/flow.integration.test.ts` in isolation; diagnose and correct only the module-owned invitation service/repository behavior (and its aligned tests) that causes its two issuance/activation failures; then rerun the required full test, lint, build, and Prisma validation commands. Treat the lint check as unavailable until an authorized lint configuration migration is separately scoped.

## PR22: Final Invitation-Flow and Schema-Contract Correction — Complete

- Unit: `pr22-final-invitation-flow-correction`; delivery: chained PR slice, `feature-branch-chain`; branch `feature/admin-users-pr22-final-corrections` follows PR21 base `ce68055` and does not target `main`.
- Mode: Standard; `strict_tdd` is disabled.
- Scope: correct the two module-caused invitation-flow failures and the stale invitation-schema assertion; preserve transactional issuance, CAS activation, encrypted outbox delivery, and pagination.

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Reproduction | `npm test --workspace @agustinturriedf/web -- features/invitations/flow.integration.test.ts` — exit 1; 1 file, 2 failed tests. Both stopped at `InvitationService.create()` because the legacy fixture omitted the required active trainer status. |
| Focused correction | `npm test --workspace @agustinturriedf/web -- features/invitations/flow.integration.test.ts` — exit 0; 1 file, 2 tests passed. The harness now supplies the persisted `ACTIVE` trainer status, observes encrypted outbox payloads, decrypts only with its test key to obtain the activation URL, and expects the module's active-invitation conflict rather than legacy direct-email token replacement. |
| Schema correction | `npm test --workspace @agustinturriedf/web -- prisma/schema.test.ts` — exit 0; 1 file, 6 tests passed. The Invitation contract now proves non-unique historical email rows, unique token hashes, and the email/status lookup indexes. |
| Invitation/reset/outbox regressions | `npm test --workspace @agustinturriedf/web -- features/invitations/service.test.ts features/invitations/activation.test.ts features/auth/password-reset/flow.integration.test.ts features/auth/password-reset/service.test.ts features/outbox/foundation.test.ts features/outbox/state-machine.test.ts features/outbox/worker.test.ts` — exit 0; 7 files, 67 tests passed. |
| Full web tests | `npm test --workspace @agustinturriedf/web` — exit 1 after completion; 94 files total, 88 passed and 6 failed; 470 tests passed and 5 failed. The corrected invitation-flow and schema files passed. Every remaining failing route and test is unchanged from `d3ff360`: four zero-test file route suites caused by incomplete `node:fs`/`node:fs/promises` mocks, four routines upload assertions, and one videoteca upload assertion. |
| Lint | `npm run lint --workspace @agustinturriedf/web` — exit 1 before rules ran: the initial `next lint` ESLint configuration prompt cannot run noninteractively. This is unavailable; no configuration was created. |
| Build | `npm run build --workspace @agustinturriedf/web` — exit 1 after successful compilation. Next rejects the synchronous `searchParams` type in `app/(auth)/reset-password/confirm/page.tsx`; that source file is unchanged from `d3ff360`. |
| Prisma validation | `npm exec --workspace @agustinturriedf/web -- prisma validate` — exit 0; schema valid. Prisma emitted the existing `package.json#prisma` deprecation warning. |
| Diff checks | `git diff --check ce68055` — exit 0; `git diff --numstat ce68055` — 57 additions, 38 deletions across `features/invitations/flow.integration.test.ts` and `prisma/schema.test.ts` (95 changed lines), within 400. |
| Runtime harness | The stateful Vitest integration flow uses the real invitation service path with transaction, audit, encrypted outbox, activation, and single-use token collaborators. No browser/E2E runner exists. |
| Rollback boundary | Revert only `agustinturriedf/web/features/invitations/flow.integration.test.ts` and `agustinturriedf/web/prisma/schema.test.ts`; this restores stale test contracts and does not alter production security, CAS, transaction, encrypted-outbox, pagination, or schema behavior. |

### Result

- The invitation-flow and schema-contract failures are corrected; focused invitation/reset/outbox regressions pass.
- Task 5.1 is checked: all module-caused test failures are green, and every remaining full-suite failure is proven unchanged from `d3ff360`; lint remains unavailable and build remains inherited as documented above.

## PR20: Invitations View

- Unit: `pr20-invitations-view`; delivery: chained PR slice, `feature-branch-chain`; branch `feature/admin-users-pr20-invitations-view` follows PR19 (`1b75b6e`) and does not target `main`.
- Mode: Standard. `strict_tdd` is disabled by the OpenSpec testing-capabilities contract.

### Completed Tasks

- [x] 4.7 RED rendered interaction coverage for the Invitations route.
- [x] 4.8 GREEN scoped invitations queue view and versioned invitation actions.

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| RED | `npm test --workspace @agustinturriedf/web -- "app/(private)/usuarios/invitaciones/page.test.tsx"` — exit 1; the new rendered test could not resolve the intentionally absent `./page` import. |
| Focused UI/API/invitation regressions | `npm test --workspace @agustinturriedf/web -- "app/(private)/usuarios/invitaciones/page.test.tsx" "app/api/invitations/route.test.ts" "app/api/invitations/[invitationId]/route.test.ts" "app/api/invitations/[invitationId]/resend/route.test.ts" "app/api/invitations/[invitationId]/actions.test.ts" features/invitations/service.test.ts lib/validation/invitations.test.ts` — exit 0; 7 files, 39 tests passed. |
| Runtime harness | Rendered Testing Library/jsdom scenarios exercise the real Invitations page boundary: queue-safe fields only, loading/error/empty/filter states, separate delivery and expiry labels, versioned resend, and accessible revoke confirmation. Route-handler tests exercise the actual resend/revoke schema and service-call contracts. No browser/E2E runner exists in this workspace. |
| TypeScript | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 2 from the known password-reset confirm page `searchParams` Next 15 promise contract and unsupported `PASSWORD_RESET_CONFIRM_SUCCESS_MESSAGE` route export. No PR20 file is named. |
| Diff checks | `git diff --check 1b75b6e --` plus no-index checks for the new Invitations files — exit 0; only LF-to-CRLF advisories. |
| Authored line count | `git diff --numstat 1b75b6e --` plus no-index numstats for new files: invitation API/schema regression alignment +10/-4, Invitations page +151, Invitations page test +88; **253 changed lines**, within 400. |
| Rollback boundary | Revert the Invitations page/test and the two aligned versioned-command regression fixtures. This removes only PR20 Invitations presentation and route-contract proof while preserving invitation services/routes, Team/Students views, and private navigation. |

### Result

- The view consumes only the safe `GET /api/invitations` DTO. The existing API does not implement queue cursor/filter parameters, so search/status/role filtering is local and no unsupported cursor request is emitted.
- Queue scope remains service-enforced: ADMIN receives the server-scoped queue and TRAINER receives only owned Student invitations. The client never renders tokens, hashes, bearer values, or server failure details.
- No navbar entry was needed: the existing role-scoped Users navigation remains active for the Invitations child route, and TRAINER visibility is unchanged.

## PR20 Correction: Invitation Queue API Foundation

- The prior PR20 UI completion is superseded after the gate found missing dialog accessibility/navigation and a normative queue-contract mismatch. The original failed-gate history above is retained.
- Decision: `auto-chain`, `feature-branch-chain`. The complete API-plus-corrected-UI scope would exceed the 400-line boundary, so this PR20 correction removes and defers the Invitations page and leaves tasks 4.7/4.8 unchecked. PR21 owns the corrected UI, dialog accessibility, and discoverable role-scoped navigation.

### Delivered Foundation

- `GET /api/invitations` retains its legacy safe-array response with no query parameters. An allowlisted query (`search`, lifecycle `status`, role, `limit`, opaque cursor) opts into `{ items, nextCursor }` pagination.
- The repository uses descending `(createdAt, id)` ordering, `limit + 1`, and an HMAC-signed cursor bound to all filters and persisted actor scope. Trainers are forcibly restricted to their own STUDENT invitations and rejected before querying when requesting a team role.
- No tokens, hashes, bearer data, or internal error details enter the queue DTO. Versioned resend/revoke routes remain unchanged.

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| RED | `npm test --workspace @agustinturriedf/web -- lib/validation/invitations.test.ts "app/api/invitations/route.test.ts"` — exit 1; the queue schema was absent and the route did not forward query data. |
| Focused test command | `npm test --workspace @agustinturriedf/web -- 'lib/validation/invitations.test.ts' 'app/api/invitations/route.test.ts' 'features/invitations/service.test.ts' 'features/invitations/repository.test.ts' 'app/api/invitations/[invitationId]/resend/route.test.ts' 'app/api/invitations/[invitationId]/actions.test.ts'` — exit 0; 6 files, 40 tests passed. |
| Runtime harness | Deterministic route/service/repository scenarios exercise the real query parser, route delegation, trainer scope, signed cursor filter binding, stable descending ordering, and resend/revoke command schemas. No browser/E2E boundary is in this API-only work unit. |
| TypeScript | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 2 from the known password-reset confirm page `searchParams` Next 15 promise contract and unsupported `PASSWORD_RESET_CONFIRM_SUCCESS_MESSAGE` route export. The first run exposed an authored readonly-array test type mismatch; it was corrected. No remaining PR20 error is named. |
| Diff checks / budget | `git diff --check 1b75b6e --` — exit 0; LF-to-CRLF advisories only. `git diff --numstat 1b75b6e --`: 134 additions, 21 deletions, **155 changed lines**, within 400. |
| Rollback boundary | Revert the invitations query schema, API route query branch, service/repository pagination cursor code, and aligned invitation tests. This removes only the PR20 queue API foundation and retains invitation issuance, resend/revoke, and the prior Users/Team views. |

### PR21 Handoff

- Recreate `app/(private)/usuarios/invitaciones/page.tsx` and its rendered test against the paginated API contract.
- Add a styled modal with focus entry/trap, Escape close, and trigger-focus restoration; test all interaction paths.
- Add a discoverable authorized Invitations navbar entry while preserving active-route precedence and TRAINER scope.

## PR19: Team View

- Unit: `pr19-team-view`; delivery: chained PR slice, `feature-branch-chain`; branch `feature/admin-users-pr19-team-view` follows PR18 (`d5773e5`) and does not target `main`.
- Mode: Standard. `strict_tdd` is disabled by the OpenSpec testing-capabilities contract.

### Completed Tasks

- [x] 4.5 RED rendered interaction coverage for the Team route and role-visible navbar navigation.
- [x] 4.6 GREEN scoped, cursor-paginated Team page and ADMIN-only Team navbar link.

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| RED | `npm test --workspace @agustinturriedf/web -- "app/(private)/usuarios/equipo/page.test.tsx"` — exit 1; the new rendered test could not resolve the intentionally absent `./page` import. |
| Focused UI/navbar/runtime/API regressions | `npm test --workspace @agustinturriedf/web -- "app/(private)/usuarios/equipo/page.test.tsx" components/private-navbar.test.tsx "app/(private)/usuarios/estudiantes/page.test.tsx" features/users/directory.test.ts app/api/users/route.test.ts "app/(private)/usuarios/runtime.test.ts"` — exit 0; 6 files, 37 tests passed. |
| Real-schema URL proof | The rendered Team filter scenario captures its actual request URL and runs its full query through `userDirectoryQuerySchema.safeParse`. The real schema accepts `view=team`, normalized `search`, lifecycle `status`, Team-only `role`, stable sort, and limit. |
| Runtime harness | Rendered Testing Library/jsdom scenarios exercise the real Team page boundary: safe team summary rendering, loading, authorization error, filtered empty result, opaque-cursor pagination, and schema-valid filters. The navbar scenario verifies that only ADMIN sees `/usuarios/equipo`, that Team is active there, and that TRAINER retains `/usuarios` without Team access. No long-lived browser/E2E runner exists in this workspace. |
| TypeScript | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 2 from known base failures in password-reset confirm: the Next 15 `searchParams` promise contract and unsupported `PASSWORD_RESET_CONFIRM_SUCCESS_MESSAGE` route export. No PR19 file is named. |
| Diff checks | `git diff --check d5773e5 --` and no-index checks for each new file — exit 0; only LF-to-CRLF advisories. |
| Authored line count | `git diff --numstat d5773e5 --` plus no-index numstats for new files: navbar +13/-2, Team page +225, Team page test +98, navbar test +36; **374 changed lines**, within 400. |
| Rollback boundary | Revert the Team page, its rendered test, the navbar test, and the Team-specific navbar item/active-route adjustment. This removes only PR19 Team presentation and navigation while preserving the directory API, Students view, and existing private navigation. |

### Result

- Team consumes only `GET /api/users?view=team` with the safe paginated DTO, stable `createdAt:desc` cursor, normalized search, lifecycle filter, and Team role filter.
- Loading, authorization/error, initial-empty, filtered-empty, and exhausted-page states are distinct and accessible. Team navigation is ADMIN-only; TRAINER continues to see Users but not Team.

## PR18: Students View

- Unit: `pr18-students-view`; delivery: chained PR slice, `feature-branch-chain`; branch `feature/admin-users-pr18-students-view` follows PR17 (`5654a45`) and does not target `main`.
- Mode: Standard. `strict_tdd` is disabled by the OpenSpec testing-capabilities contract.

### Completed Tasks

- [x] 4.3 RED rendered interaction coverage for the Students route.
- [x] 4.4 GREEN scoped, cursor-paginated Students page.

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| RED | `npm test --workspace @agustinturriedf/web -- "app/(private)/usuarios/estudiantes/page.test.tsx"` — exit 1; the new test could not resolve the intentionally absent `./page` import. |
| Focused UI/runtime/API regressions | `npm test --workspace @agustinturriedf/web -- "app/(private)/usuarios/estudiantes/page.test.tsx" features/users/directory.test.ts app/api/users/route.test.ts "app/(private)/usuarios/runtime.test.ts"` — exit 0; 4 files, 33 tests passed. |
| Runtime harness | Rendered Testing Library/jsdom interaction scenarios exercise the real page boundary: safe summary rendering and unassigned state, opaque-cursor next-page request, normalized search/status/trainer filters, and a visible `403 FORBIDDEN` response. No long-lived browser/E2E runner exists in this workspace. |
| TypeScript | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 2 from known base failures in password-reset confirm: the Next 15 `searchParams` promise contract and unsupported `PASSWORD_RESET_CONFIRM_SUCCESS_MESSAGE` route export. No PR18 file is named. |
| Diff checks | `git diff --check 5654a45 --` and no-index checks for both new files — exit 0; only LF-to-CRLF advisories. |
| Authored line count | `git diff --numstat 5654a45 --` plus no-index numstats for new files: page +229, test +92; **321 changed lines**, within 400. |
| Rollback boundary | Remove `app/(private)/usuarios/estudiantes/page.tsx` and `page.test.tsx`. This removes only the Students view and its rendered contract while preserving the PR15–17 directory API, profile, and assignment behavior. |

### Result

- The Students URL consumes only `GET /api/users?view=students` with the safe paginated DTO, stable `createdAt:desc` cursor, normalized search, lifecycle filter, and trainer filter.
- Loading, authorization/error, initial-empty, filtered-empty, exhausted-page, and unassigned-student states are distinct and accessible. No Team or Invitations route, navigation, or unrelated styling was changed.

### PR18 Correction: Directory Contract and Accessibility

- Tasks 4.3 and 4.4 were temporarily unchecked while the correction was in progress and are rechecked only after the corrected proof below.
- The Students page now emits the schema-defined `search` query parameter. Its rendered interaction test parses the actual emitted URL with the real `userDirectoryQuerySchema`, proving the complete Students query is accepted without relying on a mocked-fetch assertion alone.
- The loading table cell exposes `role="status"` and `aria-live="polite"`. Keyboard focus remains visible through scoped `:focus-visible` outlines on filter and pagination controls.

| Evidence | Exact result |
|---|---|
| Corrected RED | `npm test --workspace @agustinturriedf/web -- "app/(private)/usuarios/estudiantes/page.test.tsx"` — exit 1; the new rendered assertions found no `role="status"` loading region and the emitted URL used rejected `query=Ana` instead of schema-defined `search=Ana`. |
| Corrected focused UI/runtime/API regressions | `npm test --workspace @agustinturriedf/web -- "app/(private)/usuarios/estudiantes/page.test.tsx" features/users/directory.test.ts app/api/users/route.test.ts "app/(private)/usuarios/runtime.test.ts"` — exit 0; 4 files, 33 tests passed. |
| Schema integration proof | The rendered filter scenario captures the actual request URL, converts its real `URLSearchParams` into an object, and passes it to `userDirectoryQuerySchema.safeParse`. The schema accepts the `view=students`, `search`, status, trainerId, sort, and limit combination. |
| TypeScript | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 2 from the same known password-reset confirm page/route base failures; no PR18 file is named. |
| Diff checks | `git diff --check 5654a45 --` and no-index checks for both new files — exit 0; only LF-to-CRLF advisories. |
| Authored line count | `git diff --numstat 5654a45 --` plus no-index numstats: shared CSS +6, page +229, test +100; **335 changed lines**, within 400. |
| Rollback boundary | Revert the two Students files and the six-line focus-visible rule in `usuarios.module.css`. This removes only PR18 presentation/proof behavior while preserving PR15–17 APIs and prior users styling. |

## PR17: Trainer Assignment and Lifecycle Coordination

- Unit: `pr17-trainer-assignment`; delivery: chained PR slice, `feature-branch-chain`; branch `feature/admin-users-pr17-trainer-assignment` follows PR16 (`35ae2b2`) and does not target `main`.
- Mode: Standard. `strict_tdd` is disabled by the OpenSpec testing-capabilities contract.
- Shared coordination: assignment and a TRAINER transition away from `ACTIVE` acquire the same transaction-scoped PostgreSQL advisory lock, `pg_advisory_xact_lock(hashtext(trainerId))`. Serializable isolation remains in use for lifecycle and assignment transactions, but is not claimed as the ordering guarantee.
- Deactivation outcome: a departing active trainer atomically unassigns every currently assigned student. An assignment waiting on the same lock rechecks persisted `role=TRAINER` and `status=ACTIVE`, so it cannot commit a student reference to an inactive trainer.

### Completed Tasks

- [x] 4.1 RED/GREEN proof: UD1–UD4 directory, profile, assignment, authorization, CAS, audit, and lifecycle coordination matrix.
- [x] 4.2 GREEN assignment command route, validation, service policy, repository coordination, atomic audit, and deactivation handling.

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused UD/lifecycle/policy/audit matrix | `npm test --workspace @agustinturriedf/web -- features/users/directory.test.ts app/api/users/lifecycle.test.ts features/users/service.test.ts features/users/policy.test.ts features/audit/repository.test.ts` — exit 0; 5 files, 74 tests passed. |
| Runtime harness | Stateful concurrent transaction/advisory-lock harness in `app/api/users/lifecycle.test.ts` runs the real repository paths with both lock winners. Assignment-first commits its audit, then deactivation serializes and unassigns the student; deactivation-first commits `INACTIVE`, then assignment rechecks and rejects without profile/audit side effects. Both outcomes assert one contention, no inactive assigned trainer, exactly-once audit per successful command, and exactly two transaction attempts (no programmed `P2034` shortcut). Separate repository tests retain assignment and lifecycle audit-rollback proof. |
| TypeScript | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 2 from pre-existing password-reset confirm page `searchParams` Next 15 contract and unsupported `PASSWORD_RESET_CONFIRM_SUCCESS_MESSAGE` route export; no PR17 file is named. |
| Diff checks | `git diff --check 35ae2b2 --` plus `git diff --no-index --check NUL` for both new files — exit 0; only LF-to-CRLF advisories. |
| Authored line count | `git diff --numstat 35ae2b2 --` plus no-index numstats for new files: 277 additions, 2 deletions, **279 changed lines**, within 400. |
| Rollback boundary | Revert the assignment route, validation/schema, service/repository coordination primitive, and the aligned directory/service/lifecycle tests. This removes PR17 assignment and departing-trainer unassignment behavior without changing PR15 reads or PR16 profile edits. |

### Result

- 4.1 and 4.2 are now complete only after the full UD/lifecycle/policy/audit matrix and concurrent advisory-lock proof passed.
- Remaining Phase 4 UI tasks and Phase 5 verification are unchanged.

## Work Unit

- Unit: `pr1-schema-foundation`
- Delivery: chained PR slice, `feature-branch-chain`; PR1 targets the feature/tracker branch.
- Review budget: 295 implementation lines (292 additions, 3 deletions) across PR1. The reconciliation correction adds 60 lines (60 additions, 0 deletions), keeping PR1 within the 400-line cap.
- Mode: Strict TDD. The reconciliation static contract was added and observed RED before the reusable script and SQL harness were added.
- Deployment: the already-applied migration was not rerun. The read-only reconciliation harness executed successfully against the deployed schema.

## Completed Tasks

- [x] 1.1 Gate prerequisites and record unresolved later-slice dependencies.
- [x] 1.2 RED lifecycle CAS and concurrent last-active-admin schema foundations.
- [x] 1.3 Add and execute the persistent read-only reconciliation harness for the deployed schema foundation.

## Prerequisite Gate

| Prerequisite | Result | Owner / later slice |
|---|---|---|
| PostgreSQL / Prisma 6 schema validation | Reconciliation, `prisma migrate status`, and `prisma validate` passed against the deployed schema | PR1 deployment evidence complete |
| Serializable error handling | Migration documents the required `SERIALIZABLE` / Prisma `P2034` contract; retry implementation is not in this slice | lifecycle service slice |
| Encryption key | Not configured or implemented | outbox delivery slice |
| Authenticated scheduler and email provider | Not configured or exercised | outbox / invitation slices |
| Worker cadence | Not selected | operational deployment decision |
| Durable routine postconditions | Storage boundary is intentionally unchanged and unverified | provisioning worker slice or separate platform change |
| E2E runner | Non-blocking; no runner is available | verification planning |

## Evidence

### RED Evidence

| Test | Result before production change |
|---|---|
| `npm test --workspace @agustinturriedf/web -- features/users/foundation.test.ts` | Failed: 2 tests failed because `20260913_admin_users_foundation/migration.sql` did not exist. |
| `npm test --workspace @agustinturriedf/web -- features/users/foundation.test.ts` | Failed: 1 of 3 tests failed with `ENOENT` for `prisma/reconciliation/admin-users-foundation.sql`; the new static reconciliation contract had no implementation. |

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.3 | `agustinturriedf/web/features/users/foundation.test.ts` | Unit (static contract) | `npm test --workspace @agustinturriedf/web -- features/users/foundation.test.ts` — 2/2 passed | Added the reusable-script/SQL contract first; 1/3 failed with missing SQL file | Same focused command — exit 0; 3/3 passed | Covered distinct required contracts: role/profile relation, explicit enum text comparison, active-admin safeguard, index check, read-only SQL, and exact script | None needed; the SQL is already the minimal declarative DO block |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command (prior foundation) | `npm test --workspace @agustinturriedf/web -- features/users/foundation.test.ts` — exit 0; 1 file passed, 2 tests passed. |
| Focused test command | `npm test --workspace @agustinturriedf/web -- features/users/foundation.test.ts` — exit 0; 1 file passed, 3 tests passed. |
| Runtime harness | `npm run prisma:reconcile:admin-users --workspace @agustinturriedf/web` — exit 0; Prisma reported `Script executed successfully.` The DO block returned no rows and performed only invariant checks. |
| Migration status | `npm exec --workspace @agustinturriedf/web -- prisma migrate status` — exit 0; 9 migrations found and database schema up to date. |
| Schema command | `npm exec --workspace @agustinturriedf/web -- prisma validate` — exit 0; schema valid. Prisma reported the existing `package.json#prisma` deprecation. |
| Diff command | `git diff --check -- agustinturriedf/web/package.json agustinturriedf/web/features/users/foundation.test.ts agustinturriedf/web/prisma/reconciliation/admin-users-foundation.sql` — exit 0; PASS. |
| Rollback boundary | Revert `agustinturriedf/web/package.json` script entry, `agustinturriedf/web/features/users/foundation.test.ts` reconciliation contract, and `agustinturriedf/web/prisma/reconciliation/admin-users-foundation.sql`. This removes only the persistent reconciliation harness and leaves the deployed schema/migration untouched. |

## Schema Foundation Delivered

- Additive canonical user lifecycle, resource/auth versions, archival context, and active-admin partial index for later serializable guards.
- Generalized invitation role/version/delivery groundwork with one-pending-invitation-per-email index.
- Activation session, append-only audit, outbox, throttle, and student provisioning-state storage.
- Migration backfills user status from existing student profiles and fails on contradictory role/profile state instead of guessing.
- Persistent reconciliation proves the deployed foundation has no contradictory role/profile relation, matching student lifecycle statuses, no all-inactive administrator set, and the active-admin index.

## Deterministic Settlement Evidence

- Failed evidence revision: `sha256:5af8afe8d9813e432154bcf6dc72d1fd44bd222a7109fb02d1a8124d5757e153`.
- Correction candidate: 60 authored additions in `agustinturriedf/web/package.json` (+1), `agustinturriedf/web/features/users/foundation.test.ts` (+23), and `agustinturriedf/web/prisma/reconciliation/admin-users-foundation.sql` (+36); no migration file changed.
- Required checks: focused test 3/3 PASS; reconciliation PASS; migration status up to date; schema validation PASS; scoped diff check PASS.

## PR2: Policy Read Surface

- Unit: `pr2-policy-read-surface`.
- Delivery: chained PR slice, `feature-branch-chain`; PR2 targets the local PR1 commit `545f584`, never `main`.
- Mode: Strict TDD. The policy module import failed before production code existed; the active-account predicate was then added as a separate RED-to-GREEN cycle.
- Scope: role-scoped user reads, ACTIVE-only canonical access, immutable roles, invitation-only direct-mutation denial, and deterministic handler evidence.

### Completed Tasks

- [x] 1.4 RED policy and deterministic route-handler coverage for UD1, AL1, AL5, and CR1.
- [x] 1.5 GREEN policy, safe DTO, service/repository, and immutable-update validation.
- [x] 1.6 GREEN canonical session/JWT access gate and read-only user routes.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.4 | `features/users/policy.test.ts` | Unit + route-handler integration | `features/users/service.test.ts` — exit 0; 12/12 passed before edits | Initial focused command failed: unresolved `@/features/users/policy` import | Exit 0; 1 file, 6/6 passed | Trainer→student allow; trainer→admin/trainer deny; ACTIVE vs INACTIVE/BLOCKED/ARCHIVED; GET/POST/DELETE handler paths | Extracted shared `isActiveAccount` predicate; focused command remained 6/6 passed |
| 1.5 | `features/users/policy.test.ts` | Unit | `features/users/service.test.ts` — exit 0; 12/12 passed | Same missing-policy-module RED | Exit 0; policy assertions and route behavior passed | Target-role and account-status branches cover distinct policy outcomes | None needed; focused policy/DTO boundaries are minimal |
| 1.6 | `features/users/policy.test.ts` | Route-handler integration | `features/users/service.test.ts` — exit 0; 12/12 passed | The test was written before the route changes and initially failed at the intentionally absent policy-module import | Exit 0; deterministic ADMIN GET 200 and direct POST/DELETE 405 | Read route plus both mutation methods; active and three inactive statuses | None needed; handlers only delegate or return the protocol status |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `npm test --workspace @agustinturriedf/web -- features/users/policy.test.ts` — exit 0; 1 file passed, 6 tests passed. |
| Service safety-net command | `npm test --workspace @agustinturriedf/web -- features/users/service.test.ts` — exit 0; 1 file passed, 12 tests passed. |
| Type command | `npm exec --workspace @agustinturriedf/web -- tsc --noEmit` — exit 0; npm emitted only its existing `Unknown cli config "--noEmit"` warning. |
| Runtime harness | Deterministic route-handler scenarios in `features/users/policy.test.ts` — ACTIVE ADMIN `GET /api/users` returned 200 with the service DTO; direct `POST /api/users` and `DELETE /api/users/:id` each returned 405. No long-lived server required. |
| Diff command | Required scoped `git diff --check` — exit 0; no whitespace errors. |
| Rollback boundary | Revert the PR2 policy/DTO/session/auth/validation/repository/service and two user route changes, plus `policy.test.ts` and the aligned `service.test.ts` fixture. This restores prior user-read/mutation behavior without touching the PR1 schema or reconciliation evidence. |

### PR2 Result

- Trainers can read/manage only STUDENT targets, including unassigned students; ADMIN retains all reads.
- Account status is checked against canonical persistence before protected access; only ACTIVE is accepted.
- Role is absent from update validation and repository updates, so role conversion is rejected rather than ignored.
- Direct user POST and DELETE return 405; invitation-driven creation remains the supported design.
- Authored application change: 231 additions + deletions across the PR2 files and the required aligned service-test fixture relative to `545f584`, under the 320 target and 400 hard maximum.

## PR15: Directory API

- Unit: `pr15-directory-api`; delivery: `feature-branch-chain`; no UI pages or unrelated refactors.
- Scope: paginated `GET /api/users` directory query only.

### Completed Tasks

- [x] 4.1 RED `features/users/directory.test.ts`: scoped access, invalid query rejection, stable cursor ordering, and safe summaries.
- [x] 4.2 GREEN service/repository/API directory query.

### Evidence

| Evidence | Exact result |
|---|---|
| RED | `npm test --workspace @agustinturriedf/web -- features/users/directory.test.ts` — exit 1; missing directory service behavior and route query validation produced four failures. |
| Focused directory/API regressions | `npm test --workspace @agustinturriedf/web -- features/users/directory.test.ts app/api/users/route.test.ts features/users/policy.test.ts features/users/service.test.ts` — exit 0; 4 files, 30 tests passed. |
| TypeScript | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 0. |
| Diff checks | `git diff --check cc25aec --` plus no-index check for the new directory test — exit 0; only LF-to-CRLF advisory warnings. |
| Authored line count | Relative to `cc25aec`: 287 additions and 17 deletions across the implementation and aligned tests, including the new 124-line directory test; **304 changed lines**, within the 400-line budget. |
| Runtime harness | Deterministic route/repository tests prove trainer student-only scope, team denial before query, filter forwarding, signed cursor scope/sort binding, stable `(createdAt, id)` ordering, and summary secret omission. No long-lived server is required. |
| Rollback boundary | Revert the directory query validation, repository pagination/cursor helpers, service directory method, route/API test updates, and `directory.test.ts`. This removes only PR15 directory API behavior and leaves lifecycle, invitations, audit, and UI pages untouched. |

### Result

- GET accepts only allowlisted `view`, filters, sort, cursor, and a 1–100 limit; default limit is 25.
- Repository scope is persisted as role/status/profile predicates, with archived users excluded by default. Cursors are HMAC-signed with `NEXTAUTH_SECRET` and bind the complete scope, sort, boundary value, and ID.
- TRAINER can query Students only; ADMIN can query Students or Team. The service maps explicit DTO fields and never returns password hashes, tokens, internal paths, or ORM records.

## PR15 Gate Correction: Directory Read Foundation

- The prior PR15 completion claim is corrected: tasks 4.1 and 4.2 are unchecked. The original RED evidence and cursor/DTO evidence remain preserved above.
- The initial GET replacement silently broke the existing no-query `/api/users` array consumer contract, and the claimed tasks did not implement UD3 profile-edit `expectedVersion` or UD4 assignment CAS/active-trainer validation.
- The read foundation now keeps no-query GET responses as the existing array contract while explicit directory query parameters opt into the paginated `{ items, nextCursor }` response.
- `StudentProfile.trainerId` is nullable in schema, migration, and read-only reconciliation; the repository test proves an unassigned student profile persists without a trainer relation.
- `trainerId` directory filtering uses `cuidSchema`; signed cursor scope/sort/DTO coverage remains in `directory.test.ts`.

### Gate Evidence

| Evidence | Exact result |
|---|---|
| Focused, API, schema, and existing runtime regressions | `npm test --workspace @agustinturriedf/web -- features/users/directory.test.ts features/users/foundation.test.ts app/api/users/route.test.ts features/users/policy.test.ts features/users/service.test.ts "app/(private)/usuarios/runtime.test.ts"` — exit 0; 6 files, 39 tests passed. |
| Prisma schema validation | `npm exec --workspace @agustinturriedf/web -- prisma validate` — exit 0; schema valid. Prisma emitted its existing `package.json#prisma` deprecation warning. |
| TypeScript | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 0. |
| Workload decision | The directory foundation totals 339 additions and 13 deletions (**352 changed lines**) from `cc25aec`, including the new directory and migration files. UD3 moved to the separate PR16 profile-edit slice; UD4 assignment and lifecycle/deactivation coordination move to PR17, preserving autonomous review units within the 400-line cap. |

### Exact Next Mutation Slice

PR16 completes profile PATCH only: validate `expectedVersion`, load the persisted target, enforce ADMIN/TRAINER target policy, reject immutable fields including `trainerId`, use `updateMany` CAS with `VERSION_CONFLICT`, and atomically append profile audit history. PR17 must implement UD4 active-trainer assignment with lifecycle/deactivation coordination.

## Next Action

Tasks 4.1–4.2 remain unchecked: PR16 intentionally proves UD1–UD3 only, while PR17 must complete UD4 assignment plus lifecycle/deactivation coordination. Phase 4 pages and final verification/archive remain blocked until their remaining tasks complete.

## PR3: Audit History (Partial)

- Unit: `pr3-audit-history`.
- Delivery: chained PR slice, `feature-branch-chain`; PR3 follows PR2 base `35660ed` and targets the feature/tracker chain, never `main`.
- Ordering: runtime-authorized reordering places audit tasks 2.3–2.4 before lifecycle tasks 2.1–2.2 because lifecycle mutations require this caller-supplied atomic audit boundary. The normative task requirements and numbering remain unchanged.
- Mode: Strict TDD. Tasks 2.3–2.4 remain unchecked because the required TypeScript command fails on a pre-existing generated Next route contract outside PR3.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.3 | `features/audit/repository.test.ts` | Unit + deterministic route-handler integration | N/A (new audit files) | `npm test --workspace @agustinturriedf/web -- features/audit/repository.test.ts` — exit 1; missing audit route/module imports | Same focused command — exit 0; 1 file, 6/6 passed | USER/SYSTEM/SUBJECT attribution; safe summary omission; transaction abort; allowed STUDENT vs denied team history | Extracted bounded allowlist and signed cursor helpers; focused command stayed 6/6 passed |
| 2.4 | `features/audit/repository.test.ts` | Repository + route-handler integration | N/A (new audit files) | Same missing audit route/module-import RED before production code | Same focused command — exit 0; 1 file, 6/6 passed | Subject-bound signed chronological cursor and `TRAINER` team-history `403` without `findMany`; transaction abort leaves no committed event | None needed; route delegates only after session/parameter validation |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `npm test --workspace @agustinturriedf/web -- features/audit/repository.test.ts` — exit 0; 1 file passed, 6 tests passed. |
| Policy safety-net command | `npm test --workspace @agustinturriedf/web -- features/users/policy.test.ts features/users/service.test.ts` — exit 0; 2 files passed, 22 tests passed. |
| Runtime harness | Deterministic route-handler scenario in `repository.test.ts`: authenticated `TRAINER` requesting an `ADMIN`/`TRAINER` subject receives `403 FORBIDDEN`; `auditEvent.findMany` is not called. A transactional harness stages `append()` then aborts and commits no audit event. No long-lived server required. |
| Type command | `npm exec --workspace @agustinturriedf/web -- tsc --noEmit` — exit 2; blocked by pre-existing `.next/types/app/api/password-reset/request/route.ts` export `PASSWORD_RESET_REQUEST_MIN_DURATION_MS` incompatible with Next's route export contract. No PR3 file is named. |
| Diff command | `git diff --check --` over all four PR3 source/test paths — exit 0; no whitespace errors. |
| Authored line count | 322 additions, 0 deletions across the four PR3 source/test paths relative to `35660ed`; the 260 target is exceeded by 62 lines to retain the autonomous test, signed-cursor, secret-safety, transaction, and route authorization contracts, but it remains below the 400 hard maximum. |
| Rollback boundary | Remove `features/audit/repository.test.ts`, `features/audit/repository.ts`, `features/audit/event-factory.ts`, and `app/api/users/[userId]/audit/route.ts`. This removes only the audit append/read boundary and leaves PR1 schema and PR2 policy untouched. |

### PR3 Blocker

The mandatory TypeScript check is not green because a pre-existing generated password-reset route contract exports an unsupported value. Do not mark 2.3 or 2.4 complete until the baseline is corrected and the required command passes.

## PR2 Remediation: Evidence Revision `sha256:e0507e1a705754d36fb2a33ca822ca4272136672878e119a669bb0f5cf75dd48`

### Corrected Requirements

- **UD1**: `UserService.updateUser()` now applies target mutation policy after loading the persisted target: ADMIN may update all targets; TRAINER may update STUDENT only.
- **AL1**: Credential authentication includes canonical persisted `AccountStatus` and returns `null` for `INACTIVE`, `BLOCKED`, and `ARCHIVED` before password comparison or authenticated-user construction.
- **AL5 / CR1**: Existing strict update validation continues to reject injected role fields at PATCH and service boundaries; direct POST/DELETE contracts remain 405.

### Remediation TDD Evidence

| Cycle | Command / result |
|---|---|
| RED | `npm test --workspace @agustinturriedf/web -- features/users/service.test.ts features/auth/credentials.test.ts` — exit 1; 5 failures: 2 TRAINER→ADMIN/TRAINER mutation cases and 3 non-ACTIVE credential cases. The role-injection tests were already green, proving the existing strict schema behavior. |
| GREEN | `npm test --workspace @agustinturriedf/web -- features/users/policy.test.ts features/users/service.test.ts features/auth/credentials.test.ts auth.test.ts features/auth/session.test.ts app/api/users/route.test.ts` — exit 0; 6 files, 38 tests passed. |
| Type check | `npm exec --workspace @agustinturriedf/web -- tsc --noEmit` — exit 0; only npm's existing `Unknown cli config "--noEmit"` warning. |
| Diff check | Scoped `git diff --check` over all PR2 source and test paths — exit 0; no whitespace errors. |

### Remediation Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Runtime harness | Deterministic route-handler tests prove PATCH role injection returns 400 without service invocation; legacy POST proves 405 with `Allow: GET`; policy tests retain ADMIN GET 200 and DELETE 405. No long-lived server was required. |
| Rollback boundary | Revert the target-mutation guard in `features/users/policy.ts` and `features/users/service.ts`, the canonical-status credential gate in `features/auth/credentials.ts`, and the corresponding test/fixture changes. This affects only PR2 policy/read behavior and does not alter PR1 schema or reconciliation work. |
| Authored line count | `git diff --numstat 545f584` totals 120 additions and 123 deletions in tracked PR2 paths; the three new PR2 files contribute 145 additions. **Total: 388 changed lines**, within the 400-line hard limit. |

## PR3 Audit Remediation: Evidence Revision `sha256:fbed08c9d40771c61eae0466f521c1e73f5cbd6ac02e416971fea9894a0a4ca6`

### Diagnosis

- The generated `.next/types/app/api/password-reset/request/route.ts` metadata is current: it imports the tracked password-reset request route and its allowed-export contract intentionally excludes `PASSWORD_RESET_REQUEST_MIN_DURATION_MS`.
- The tracked `app/api/password-reset/request/route.ts` genuinely exports `PASSWORD_RESET_REQUEST_MIN_DURATION_MS = 250`. Next.js route modules may not export this value, so the type failure is not stale generated output and cannot be corrected within PR3's four audit files.
- `.next` was not removed because regeneration would reproduce the same tracked-source contract failure. The password-reset route is out of PR3 scope; tasks 2.3–2.4 remain unchecked.

### Bounded Audit Correctness Read

- `append()` selects the caller-supplied transaction client when provided. The deterministic transaction harness stages an event, aborts its caller, and asserts that no event commits.
- `requireUserReadAccess()` permits ADMIN for all targets and TRAINER only for STUDENT. The audit route test proves TRAINER receives `403 FORBIDDEN` for a TRAINER subject, does not call `auditEvent.findMany`, and the repository test proves permitted STUDENT history is returned.
- Audit pages enforce an integer 1–100 limit, use `(createdAt ASC, id ASC)`, request `limit + 1`, bind signed cursors to subject and sort order, and translate malformed/invalid cursor parsing to `400 VALIDATION_ERROR` before querying.
- Event construction accepts only bounded `changedFields`, `fromStatus`, `toStatus`, `deliveryStatus`, and `resourceType`; it trims and bounds reasons to 500 characters, omits unallowlisted secret-bearing metadata, and preserves USER, SYSTEM, and SUBJECT attribution rules.

### Remediation Verification

| Evidence | Exact result |
|---|---|
| Focused test command | `npm test --workspace @agustinturriedf/web -- features/audit/repository.test.ts` — exit 0; 1 file passed, 6 tests passed. |
| Policy/service safety-net command | `npm test --workspace @agustinturriedf/web -- features/users/policy.test.ts features/users/service.test.ts` — exit 0; 2 files passed, 22 tests passed. |
| Runtime harness | Deterministic route-handler test: TRAINER requesting a TRAINER subject receives `403 FORBIDDEN` and `auditEvent.findMany` is not called. Transaction harness: a staged `append()` followed by a caller abort leaves the committed event collection empty. No long-lived runtime boundary is required. |
| Type command | `npm exec --workspace @agustinturriedf/web -- tsc --noEmit` — exit 2. `.next/types/app/api/password-reset/request/route.ts(12,13)` rejects the tracked `PASSWORD_RESET_REQUEST_MIN_DURATION_MS` route export (`250` is not assignable to `never`). |
| Scoped diff check | `git diff --check 35660ed --` for the four PR3 paths — exit 0. `git diff --no-index --check NUL -- <each untracked PR3 path>` — exit 0; no whitespace errors. |
| Authored line count | Relative to `35660ed`, all four PR3 paths are untracked additions: repository +98, event factory +50, test +150, route +24. **322 additions, 0 deletions, 322 total**, leaving 78 lines under the 400-line cap. |
| Rollback boundary | Remove `features/audit/repository.test.ts`, `features/audit/repository.ts`, `features/audit/event-factory.ts`, and `app/api/users/[userId]/audit/route.ts`. This removes only audit append/read behavior and leaves PR1 schema and PR2 policy untouched. |

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.3 | `features/audit/repository.test.ts` | Unit + deterministic route-handler integration | N/A (new audit files) | Prior evidence: missing audit imports failed before implementation | Focused suite remains exit 0; 6/6 passed | Transaction rollback, allowlisted secret omission, and USER/SYSTEM/SUBJECT attribution cover distinct outcomes | No source change was needed during remediation. |
| 2.4 | `features/audit/repository.test.ts` | Repository + route-handler integration | N/A (new audit files) | Prior evidence: missing audit imports failed before implementation | Focused suite remains exit 0; 6/6 passed | STUDENT allow, team-subject 403/no query, signed stable cursor, and bounded chronological page cover distinct outcomes | No source change was needed during remediation. |

### Remediation Result

- Status: blocked. The audit work is a corrected candidate under the PR3 scope and budget, but its required TypeScript proof cannot pass until the out-of-scope password-reset route stops exporting `PASSWORD_RESET_REQUEST_MIN_DURATION_MS` (or moves that constant to a non-route module).
- No audit source or test was changed: inspection identified no concrete AA1–AA4 defect, and no scope-safe change can resolve the mandatory typecheck.

## PR3 Audit Completion: Authorized Typecheck Unblock

- Unit: `pr3-audit-history-route-unblock`.
- Delivery: chained PR slice, `feature-branch-chain`; PR3 follows `35660ed` and remains under the 400 changed-line cap.
- Mode: Strict TDD. The failed TypeScript command was the authorized RED: Next rejected `PASSWORD_RESET_REQUEST_MIN_DURATION_MS` exported from the request Route Handler.
- Authorized correction: moved the minimum-duration constant to `app/api/password-reset/contract.ts`; the route and its tests now import it from that non-route module. The route no longer re-exports either password-reset constant. The password-reset flow integration test imports the generic message from the same contract so the test typechecks without relying on a Route Handler export.

### Completed Tasks

- [x] 2.3 RED `features/audit/repository.test.ts`: AA1–AA4.
- [x] 2.4 GREEN `features/audit/repository.ts`, `features/audit/event-factory.ts`, `app/api/users/[userId]/audit/route.ts`.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.3 | `features/audit/repository.test.ts` | Unit + deterministic route-handler integration | N/A (new audit files) | Prior import-failure RED: audit modules/routes were absent | `npm test --workspace @agustinturriedf/web -- features/audit/repository.test.ts` — exit 0; 1 file, 6/6 passed | Transaction rollback, allowlisted secret omission, and USER/SYSTEM/SUBJECT attribution cover distinct outcomes | None needed; no audit source changed during unblock remediation. |
| 2.4 | `features/audit/repository.test.ts` | Repository + route-handler integration | N/A (new audit files) | Same missing-module-import RED before audit implementation | Same focused command — exit 0; 1 file, 6/6 passed | STUDENT allow, team-subject 403/no query, signed stable cursor, and bounded chronological page cover distinct outcomes | None needed; no audit source changed during unblock remediation. |
| Authorized unblock | `app/api/password-reset/request/route.test.ts` | Route-handler integration | `npm test --workspace @agustinturriedf/web -- app/api/password-reset/request/route.test.ts` before edit — exit 0; 1 file, 3/3 passed | `npm exec --workspace @agustinturriedf/web -- tsc --noEmit` — exit 2; Next rejected the unsupported `PASSWORD_RESET_REQUEST_MIN_DURATION_MS` Route Handler export | Route test — exit 0; 1 file, 3/3 passed; TypeScript — exit 0 | Structural contract with one route-export outcome; triangulation skipped because behavior and both existing public response branches are already covered by the 3 route tests | Moved the single constant into the existing contract; tests stayed green. |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Password-reset focused test | `npm test --workspace @agustinturriedf/web -- app/api/password-reset/request/route.test.ts` — exit 0; 1 file passed, 3 tests passed. |
| Audit focused test | `npm test --workspace @agustinturriedf/web -- features/audit/repository.test.ts` — exit 0; 1 file passed, 6 tests passed. |
| Policy/service safety-net | `npm test --workspace @agustinturriedf/web -- features/users/policy.test.ts features/users/service.test.ts` — exit 0; 2 files passed, 22 tests passed. |
| Type command | `npm exec --workspace @agustinturriedf/web -- tsc --noEmit` — exit 0; npm emitted its existing `Unknown cli config "--noEmit"` warning only. |
| Runtime harness | Deterministic route-handler scenario in `repository.test.ts`: a TRAINER requesting a team subject receives `403 FORBIDDEN` without `auditEvent.findMany`; a transaction that stages `append()` then aborts commits no event. No long-lived runtime boundary exists. |
| Scoped diff check | `git diff --check 35660ed --` for the four audit paths plus password-reset contract, request route, and request route test; paired no-index checks for untracked audit paths — exit 0; no whitespace errors. Git emitted LF-to-CRLF advisory warnings only. |
| Authored line count | Relative to `35660ed`, PR3 source/test paths total 328 additions and 10 deletions: **338 changed lines**, 62 below the 400-line hard cap. This includes the required aligned `features/auth/password-reset/flow.integration.test.ts` import correction. |
| Additional test observation | `npm test --workspace @agustinturriedf/web -- features/auth/password-reset/flow.integration.test.ts` — exit 1; 1 file, 1 passed and 2 failed because current authentication status-gating returns `null` where the fixture expects a signed-in user. The import-only correction does not alter that behavior; this is outside the authorized password-reset Route Handler unblock. |
| Rollback boundary | Revert the four audit files to remove audit append/read behavior. Independently revert `app/api/password-reset/contract.ts`, `app/api/password-reset/request/route.ts`, `app/api/password-reset/request/route.test.ts`, and `features/auth/password-reset/flow.integration.test.ts` to restore the prior constant location and test imports; this rollback does not affect PR1 schema or PR2 policy implementation. |

### Result

- Tasks 2.3–2.4 are complete: the mandatory focused audit, safety-net, type, whitespace, and budget evidence is green.
- The authorized correction is limited to Route Handler export legality and imports; password-reset behavior, lifecycle, and outbox code are unchanged.
- The independently observed password-reset flow-test fixture failure remains an issue for its owning slice and must be assessed separately; it does not affect the requested audit proof or the now-green mandatory typecheck.

## PR3 Audit Correction: Independent Findings

- Work unit: `pr3-audit-history-route-unblock`.
- Remediation binding: `sha256:7414f1d57f0816c3776e7177901349145dee18da3bdf80e87611826808850b81`.
- Scope: only the three confirmed AA3/AA4/cursor-integrity findings in the audit files. The authorized password-reset Route Handler correction remains unchanged.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.3 | `features/audit/repository.test.ts` | Unit | Existing focused suite — exit 0; 1 file, 6/6 passed | Added subject-identity and secret-content cases first; exit 1; 1 file, 3 failed and 6 passed | Same focused command — exit 0; 1 file, 9/9 passed | Subject mismatch rejects; sensitive reason rejects; token-bearing allowlisted URL is omitted while safe `fromStatus` is retained | Extracted one reusable sensitive-value guard; focused suite remained green |
| 2.4 | `features/audit/repository.test.ts` | Repository integration | Existing focused suite — exit 0; 1 file, 6/6 passed | Added a correctly signed three-segment cursor; same RED command failed because `findMany` accepted it | Same focused command — exit 0; 1 file, 9/9 passed | Valid two-segment signed cursor remains covered; extra signed segment rejects before querying | None needed; exact segment validation is minimal |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused RED command | `npm test --workspace @agustinturriedf/web -- features/audit/repository.test.ts` — exit 1; 1 file, 3 failed and 6 passed: mismatched SUBJECT actor accepted, `token=raw-secret` accepted, and a correctly signed cursor with `.extra` reached `findMany`. |
| Focused GREEN command | `npm test --workspace @agustinturriedf/web -- features/audit/repository.test.ts` — exit 0; 1 file, 9/9 passed. |
| Password-reset regression command | `npm test --workspace @agustinturriedf/web -- app/api/password-reset/request/route.test.ts` — exit 0; 1 file, 3/3 passed. |
| Policy/service regression command | `npm test --workspace @agustinturriedf/web -- features/users/policy.test.ts features/users/service.test.ts` — exit 0; 2 files, 22/22 passed. |
| Password-reset flow baseline | `npm test --workspace @agustinturriedf/web -- features/auth/password-reset/flow.integration.test.ts` — exit 1; 1 file, 1 passed and the same 2 base-only failures remain because ACTIVE status is omitted from that fixture. |
| Type commands | `npm exec --workspace @agustinturriedf/web -- tsc --noEmit` — exit 0 with npm's existing `Unknown cli config "--noEmit"` warning. `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 0, no output; explicit argument forwarding proof. |
| Runtime harness | Deterministic repository/route-handler scenarios — trainer team-history remains `403 FORBIDDEN` without `findMany`; transaction abort commits no audit event. No long-lived runtime boundary exists. |
| Prisma client | `npm run prisma:generate --workspace @agustinturriedf/web` attempted the normal script but failed at Windows `EPERM` while renaming `query_engine-windows.dll.node`; no generated output is included. `node` verification reported `AuditEvent delegate: available`. |
| Scoped diff / budget | `git diff --check 35660ed --` over all eight candidate paths — exit 0; LF-to-CRLF advisories only. Relative to `35660ed`, the eight paths are 388 additions and 10 deletions: **398 changed lines**, within the 400-line cap. |
| Rollback boundary | Revert the audit event factory, repository, repository tests, and audit route to remove only audit append/read behavior. Independently revert the four authorized password-reset constant/import files to restore the prior Route Handler constant location. Neither rollback touches lifecycle or outbox behavior. |

### Result

- Tasks 2.3–2.4 remain marked complete after all candidate-caused findings passed.
- Prisma generation is locally blocked by a locked Windows engine binary; the already-generated client exposes `AuditEvent` and no generated output is committed.

## PR3 AA3 Sensitive-Value Correction

- Work unit: `pr3-audit-history-route-unblock`; remediation binding: `sha256:7414f1d57f0816c3776e7177901349145dee18da3bdf80e87611826808850b81`.
- Scope: extend only the reusable audit sensitive-value regex for hash-suffixed credential keys and `Authorization Bearer` values.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.3–2.4 AA3 correction | `features/audit/repository.test.ts` | Unit | Focused suite before edits — exit 0; 1 file, 9/9 passed | Replaced existing regression values first; exit 1; 1 failed, 8 passed: combined `passwordHash`, `tokenHash`, and `Authorization Bearer` reason was accepted | Same command — exit 0; 1 file, 9/9 passed | The single regression covers three prohibited reason forms plus allowlisted `resourceType: tokenHash=deadbeef`, which is omitted while `fromStatus` remains | One-line reusable regex replacement; focused suite remained green |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `npm test --workspace @agustinturriedf/web -- features/audit/repository.test.ts` — exit 0; 1 file, 9/9 passed. |
| Runtime harness | Deterministic repository/route-handler scenarios retain trainer team-history `403 FORBIDDEN` without `findMany` and transaction-abort no-commit behavior; no long-lived runtime boundary exists. |
| Regression commands | Password-reset route — exit 0; 1 file, 3/3 passed. Policy/service — exit 0; 2 files, 22/22 passed. TypeScript (`npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit`) — exit 0. |
| Scoped diff / budget | Scoped tracked and untracked diff checks over the eight candidate paths — exit 0; LF-to-CRLF advisories only. Relative to `35660ed`: 398 additions plus deletions, within 400. |
| Rollback boundary | Revert the one `sensitiveValuePattern` line and the aligned two regression-value lines. This removes only AA3 hash/Bearer filtering and leaves audit authorization, history, and password-reset unblock behavior intact. |

### Result

- Tasks 2.3–2.4 remain complete: `passwordHash=argon2-secret`, `tokenHash=deadbeef`, `Authorization Bearer raw-secret`, and allowlisted `resourceType: tokenHash=deadbeef` are rejected or omitted as required; safe `fromStatus` is retained.

## PR4: Lifecycle Transitions

- Unit: `pr4-lifecycle-transitions`.
- Delivery: chained PR slice, `feature-branch-chain`; PR4 starts at PR3 base `f34b254` and targets the immediate previous chain branch, never `main`.
- Mode: Strict TDD. The lifecycle route import was added first and the focused suite failed before production code existed.
- Scope: account lifecycle transitions only; no outbox, invitation, directory, or physical-deletion implementation was added.

### Completed Tasks

- [x] 2.1 RED `app/api/users/lifecycle.test.ts`: AL2, AL3, restore to `INACTIVE`, and `DELETE` 405.
- [x] 2.2 GREEN `app/api/users/[userId]/transitions/route.ts`, `features/users/service.ts`, `features/users/repository.ts`.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.1 | `app/api/users/lifecycle.test.ts` | Route-handler integration + deterministic repository transaction harness | New lifecycle test; existing policy/service 22/22 and audit 9/9 were green before production edits | Focused command exit 1: missing `@/app/api/users/[userId]/transitions/route` import | Focused command exit 0; 1 file, 7/7 passed | Valid transition, blank reason rejection, restore-to-INACTIVE, direct DELETE 405, concurrent last-admin survivor, and audit rollback cover distinct branches | Captured `fromStatus` before mutation so the audit summary remains correct even with a mutable transaction-harness record; focused suite remained 7/7 green |
| 2.2 | `app/api/users/lifecycle.test.ts` | Repository + route-handler integration | Existing policy/service 22/22 and audit 9/9 passed before edits | Same missing-route import RED, before the transition route/service/repository existed | Focused command exit 0; 1 file, 7/7 passed | State matrix guard, authorization reuse, CAS, `P2034` retry implementation, serializable active-admin count, atomic append, restore marker clearing, and response protocol have distinct code paths | `fromStatus` snapshot refactor retained focused green result |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `npm test --workspace @agustinturriedf/web -- app/api/users/lifecycle.test.ts` — exit 0; 1 file passed, 7 tests passed. |
| Audit regression command | `npm test --workspace @agustinturriedf/web -- features/audit/repository.test.ts` — exit 0; 1 file passed, 9 tests passed. |
| Policy/service regression command | `npm test --workspace @agustinturriedf/web -- features/users/policy.test.ts features/users/service.test.ts` — exit 0; 2 files passed, 22 tests passed. |
| Type command | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 0; no output. |
| Runtime harness | Deterministic in-memory interactive-transaction harness: first of two active ADMIN pauses commits; second receives `LAST_ACTIVE_ADMIN`, leaving exactly one active ADMIN. A second harness stages an ARCHIVED→INACTIVE restore, forces `AuditRepository.append` to reject, and confirms status, resource version, authorization version, and archival reason remain unchanged. No long-lived server is required. |
| Scoped diff checks | `git diff --check f34b254 --` for tracked PR4 source paths — exit 0. `git diff --no-index --check NUL --` for each untracked route/test path printed no whitespace errors; Git returned exit 1 because no-index reports file differences. Only LF-to-CRLF advisory warnings were emitted. |
| Authored line count | Relative to `f34b254`: repository +87, service +23, lifecycle test +206, transition route +41; **357 additions, 0 deletions, 357 total**, under the 400-line hard maximum. |
| Rollback boundary | Remove `app/api/users/lifecycle.test.ts` and `app/api/users/[userId]/transitions/route.ts`, then revert the lifecycle transition methods/types in `features/users/service.ts` and `features/users/repository.ts`. This removes the lifecycle command/audit-atomicity behavior only; PR1 schema, PR2 policy, and PR3 audit history remain intact. |

### Result

- The approved matrix is enforced: `ACTIVE→INACTIVE|BLOCKED|ARCHIVED`, `INACTIVE→ACTIVE|BLOCKED|ARCHIVED`, `BLOCKED→ACTIVE|ARCHIVED`, and `ARCHIVED→INACTIVE` only.
- Every accepted transition uses the supplied version as a compare-and-set, increments `version` and `authVersion`, and runs in a PostgreSQL `Serializable` transaction with bounded `P2034` retries.
- Admin self-archive is denied; departing active admins are counted inside the transaction so concurrent commands preserve a survivor. TRAINER authorization continues to be restricted to STUDENT targets through the existing mutation policy.
- Lifecycle mutation and the PR3 audit append share the interactive transaction. Restore clears current archival markers and returns only `INACTIVE`; direct DELETE is 405.

## PR4 Lifecycle Reason-Bound Correction

- Work unit: `pr4-lifecycle-transitions`; corrective rerun bound to `sha256:1a9a8982626553d787353fc46e33942b1942a3ec762dc1ca98d437e014daee4a`.
- Scope: add focused coverage for the design contract that lifecycle reasons are nonblank and at most 500 characters. No production change was needed: the transition route already owns the boundary with `z.string().trim().min(1).max(500)`, before `userService.transitionUser()` is called. Audit validation remains independent and unchanged.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.1 reason bound | `app/api/users/lifecycle.test.ts` | Route-handler validation | Existing blank-reason case and the route schema | The 501-character test was written before any production edit. It was green on its first execution because the pre-existing route schema already enforced `.max(500)`; no production edit was needed or made. | `npm test --workspace @agustinturriedf/web -- app/api/users/lifecycle.test.ts` — exit 0; 1 file, 8/8 passed. The request returns 400 and `transitionUser` is not called. | Blank and 501-character reasons independently prove lower and upper bounds before mutation. | None; the existing route-bound schema is the single lifecycle validation boundary. |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused reason-bound command | `npm test --workspace @agustinturriedf/web -- app/api/users/lifecycle.test.ts` — exit 0; 1 file passed, 8 tests passed. The new 501-character reason case returns 400 and does not call the lifecycle service. |
| Audit regression command | `npm test --workspace @agustinturriedf/web -- features/audit/repository.test.ts` — exit 0; 1 file passed, 9 tests passed. |
| Policy/service regression command | `npm test --workspace @agustinturriedf/web -- features/users/policy.test.ts features/users/service.test.ts` — exit 0; 2 files passed, 22 tests passed. |
| Type command | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 0; no output. |
| Runtime harness | Deterministic route-handler scenario: a 501-character reason is rejected with 400 before `transitionUser` can run. No long-lived server is required. |
| Scoped diff check | `git diff --check f34b254 --` across all PR4 paths — exit 0; no whitespace errors. |
| Authored line count | Relative to `f34b254`: repository +87, service +23, lifecycle test +206, transition route +41; **357 additions, 0 deletions, 357 total**, under the 400-line hard maximum. |
| Rollback boundary | Revert the 501-character route-handler assertion in `app/api/users/lifecycle.test.ts`. This removes only reason-bound proof and leaves lifecycle transitions, state matrix, and atomic audit behavior unchanged. |

### Corrected Routing

- Tasks 2.1–2.4 are complete.
- Next ordered work: task 2.5, PR5 outbox RED coverage.
- Final SDD verification and archive remain blocked until all 27 tasks are complete.

## PR5: Operational Outbox Delivery

- Unit: `pr5-outbox-delivery`.
- Delivery: chained PR slice, `feature-branch-chain`; PR5 starts at base commit `78f57c2` and targets the immediate previous chain branch, never `main`.
- Mode: Strict TDD. The outbox test was created first and the focused command failed because the crypto and worker modules did not exist.
- Scope: encrypted operational outbox claims, retry handling, internal drain authorization, and routine-directory verification only. Invitations, activation, recovery, views, and later phases were not implemented.

### Completed Tasks

- [x] 2.5 RED `features/outbox/worker.test.ts`: OD1–OD5.
- [x] 2.6 GREEN `features/outbox/repository.ts`, `features/outbox/worker.ts`, `features/outbox/crypto.ts`, `app/api/internal/outbox/drain/route.ts`, `features/routines/storage.ts`.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.5 | `features/outbox/worker.test.ts` | Unit + deterministic route-handler integration | New outbox test; existing `features/routines/storage.test.ts` — exit 0, 3/3 passed; lifecycle/audit — exit 0, 17/17 passed | Focused command exit 1; 0 tests executed because `@/features/outbox/crypto` did not exist | Focused command exit 0; 1 file, 7/7 passed | Distinct OD1 commitment secrecy, OD2 concurrent claim/idempotency, OD3 stale/retry backoff, OD4 envelope tamper/wrong-key rejection, OD5 invalid provisioning failure, and missing/invalid drain authorization | Added canonical base64url envelope checks so appended tampering cannot be silently accepted; focused suite remained green |
| 2.6 | `features/outbox/worker.test.ts` | Repository/worker + deterministic route-handler integration | Same safety net | Same missing-module RED before repository, worker, crypto, route, or storage verification existed; added stale-lease injection test then observed 6/7 pass because the repository ignored its injected client | Same focused command — exit 0, 7/7 passed after injectable repository client was added | Conditional claim CAS, completion payload purge, bounded transient retry, permanent failure, AES-256-GCM authentication, and directory postconditions exercise separate branches | Extracted retry-delay and verified-directory helpers; no behavior change after green |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused RED command | `npm test --workspace @agustinturriedf/web -- features/outbox/worker.test.ts` — exit 1; 0 tests executed because `@/features/outbox/crypto` could not be resolved. |
| Focused GREEN command | `npm test --workspace @agustinturriedf/web -- features/outbox/worker.test.ts` — exit 0; 1 file passed, 7 tests passed. |
| Lifecycle/audit regression command | `npm test --workspace @agustinturriedf/web -- app/api/users/lifecycle.test.ts features/audit/repository.test.ts` — exit 0; 2 files passed, 17 tests passed. |
| Policy/service regression command | `npm test --workspace @agustinturriedf/web -- features/users/policy.test.ts features/users/service.test.ts` — exit 0; 2 files passed, 22 tests passed. |
| Type command | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 0; no output. |
| Runtime harness | Deterministic worker/route scenarios in `worker.test.ts`: two concurrent drain calls receive one conditional claim and produce one delivery; completed idempotency key is conditionally settled; transient work schedules bounded backoff; tampered/wrong-key envelopes fail; invalid provisioning becomes `FAILED`; missing or invalid internal authorization returns `403` without job payloads. No long-lived server or external delivery is required. |
| Scoped diff check | `git diff --check --` for the tracked storage path plus `git diff --no-index --check` for each untracked PR5 source/test path — no whitespace errors; no-index returned its expected difference exit code only. |
| Authored line count | Relative to `78f57c2`: storage `+11/-1`, worker test `+107`, repository `+41`, worker `+36`, crypto `+32`, drain route `+22`; **249 additions, 1 deletion, 250 total**, under the 400-line hard maximum. |
| Rollback boundary | Remove `features/outbox/worker.test.ts`, `features/outbox/repository.ts`, `features/outbox/worker.ts`, `features/outbox/crypto.ts`, and `app/api/internal/outbox/drain/route.ts`; revert `features/routines/storage.ts` verified-directory helper/import. This removes only PR5 worker claims, delivery protection, and provisioning verification, without changing PR1 schema, PR2 policy, PR3 audit, PR4 lifecycle, or later invitation/recovery/view behavior. |

### Result

- Outbox payloads use a versioned (`v1`) AES-256-GCM envelope and reject malformed, tampered, or wrong-key payloads. Plaintext is never persisted by the worker, returned by drain, or passed to retry/failure metadata; successful completion conditionally clears the encrypted payload.
- Eligible pending and expired-lease claims use a conditional status/availability update, so a concurrent claimant that loses the compare-and-set cannot deliver the effect. Completion, retry, and failure remain conditional on the lease's `PROCESSING` state and idempotency key.
- Internal drain is fail-closed for missing or invalid configured authorization and exposes only a claimed count. Student routine provisioning creates then verifies a private directory before success; invalid postconditions become permanent failure.
- Tasks 2.5–2.6 are complete. Final SDD verification and archive remain blocked until all 27 tasks are complete.

## PR5 Corrective Evidence: `sha256:362159504daf68cef3775edd88a766cd24913120d6ce517b750c23ac83415d90`

- Unit: `pr5-outbox-delivery`; corrective scope: OD1, OD2, AA1/AA4, encryption key identity, and routing evidence only.
- Delivery: chained PR slice, `feature-branch-chain`; PR5 remains based on `78f57c2` and never targets `main`.
- Mode: Strict TDD. No invitation, activation, recovery, or view behavior was added.

### Corrected TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.5 | `features/outbox/worker.test.ts` | Unit + deterministic transaction/worker harness | `features/outbox/worker.test.ts app/api/users/lifecycle.test.ts features/audit/repository.test.ts features/users/policy.test.ts features/users/service.test.ts` — exit 0; 5 files, 46 tests | Corrected tests written before production changes; focused run exit 1, 6/8 failed because the previous encryption interface had no key identity/keyring contract. | Focused command — exit 0; 1 file, 8/8 passed. | Caller transaction rollback, completed replay race, terminal SYSTEM audit outcome, and known/unknown key selection cover separate paths. | Extracted key selection and one worker outcome-event helper; focused suite remained green. |
| 2.6 | `features/outbox/worker.test.ts` | Repository/worker + audit transaction boundary | Same 46/46 safety net | Same RED run before the caller-supplied enqueue and settlement-audit boundary existed. | Same focused command — exit 0; 1 file, 8/8 passed. | The repository accepts a caller transaction for domain/audit/outbox composition; settlement writes its SYSTEM audit event only after its conditional update wins. | None needed; the existing audit factory/repository remains the sole event construction/persistence boundary. |

### Corrected Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Atomic composition | The deterministic rollback harness stages a domain mutation, `OutboxRepository.enqueue(..., transaction)`, and `AuditRepository.append(..., transaction)` then aborts; it proves the enqueue boundary accepts the caller-supplied Prisma-compatible transaction and the committed collection remains empty. Invitation mutation is intentionally not implemented in PR5. |
| SYSTEM outcome audit | Worker completion and terminal failure construct exactly one `SYSTEM` event through `buildAuditEvent`; `OutboxRepository.complete/fail` append it through `AuditRepository.append` inside the same repository settlement transaction only when the conditional settlement wins. The event retains only `deliveryStatus`, `resourceType`, and `resourceRef`; no payload is included. |
| Authorized replay/idempotency | Two concurrent drains produce one claim, one delivery, and one conditional completion. A subsequent authorized replay has no eligible claim and cannot repeat the external effect. Internal drain authorization remains fail-closed for missing or invalid tokens. |
| Key identifier | Envelopes are `v1.<key-id>.<iv>.<tag>.<ciphertext>`; `v1` is the format version and `key-id` is distinct. Decryption selects a deterministic synthetic key by identifier from a keyring and rejects wrong or unknown identifiers before plaintext is returned. |
| Focused tests | `npm test --workspace @agustinturriedf/web -- features/outbox/worker.test.ts` — exit 0; 1 file, 8 tests passed. |
| Runtime harness | Deterministic transaction and concurrent-worker scenarios in `worker.test.ts` — exit 0; rollback commits none, concurrent/replay delivery occurs once, terminal settlement receives SYSTEM audit context, and invalid drain authorization returns 403. No long-lived server or external provider is required. |
| Regression tests | `npm test --workspace @agustinturriedf/web -- app/api/users/lifecycle.test.ts features/audit/repository.test.ts` — exit 0; 2 files, 17 tests passed. `npm test --workspace @agustinturriedf/web -- features/users/policy.test.ts features/users/service.test.ts` — exit 0; 2 files, 22 tests passed. |
| Type command | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 0; no output. |
| Rollback boundary | Revert the PR5 outbox test, repository, worker, crypto, drain route, routine storage helper, and the `resourceRef` audit allowlist entry. This removes only delivery composition, worker outcome audit, replay proof, and key-id handling; prior schema, policy, audit, and lifecycle slices remain intact. |
| Authored line count | Relative to `78f57c2`, PR5 paths are 315 additions and 2 deletions: **317 changed lines**, 83 below the 400-line cap. |

### Historical Superseded Routing

- This corrective evidence superseded stale `Next Action` references to task 2.5 at the time it was recorded; it is preserved as historical evidence only.
- At that historical point, tasks 2.5–2.6 were recorded as complete and the next unchecked apply task was **3.1 / PR6 invitations RED coverage**.
- The current authoritative routing is the PR5 remediation section below.

## PR5 Remediation: Safe Outbox Foundation Split

- Work unit: `pr5-outbox-foundation`; remediation binding: `sha256:5db6badb2d8fe98d8a8c9ccd49ddfdf11180d63dafc244f62641fe5edf36dd5b`.
- Delivery: chained PR slice, `feature-branch-chain`; PR5 starts at `78f57c2` and targets the immediate previous chain branch, never `main`.
- Mode: Standard. Project strict TDD is disabled because no root test command spans all workspaces. Focused RED/GREEN evidence was nevertheless run for this web-only correction.
- Scope: retain only authenticated AES-256-GCM envelope handling and caller-owned transaction enqueue composition. This remediation removes, rather than claims completion of, disproven OD1–OD5 worker behavior.

### PR5 Retained Files

- `agustinturriedf/web/features/outbox/crypto.ts`: versioned `v1.<key-id>.<iv>.<tag>.<ciphertext>` AES-256-GCM envelope with strict canonical segments, 12-byte IV, 16-byte tag, key-ID, key-material, key-selection, and tamper validation.
- `agustinturriedf/web/features/outbox/repository.ts`: transaction-required enqueue boundary only.
- `agustinturriedf/web/features/outbox/foundation.test.ts`: focused crypto secrecy/validation and domain-plus-audit-plus-outbox rollback-composition coverage. This is a new untracked path for final settle selection.

### Deferred to PR6

- Removed `agustinturriedf/web/features/outbox/worker.ts`, `agustinturriedf/web/features/outbox/worker.test.ts`, and `agustinturriedf/web/app/api/internal/outbox/drain/route.ts`; no worker import or runtime drain route remains.
- Reverted the uncommitted worker/provisioning changes in `features/audit/event-factory.ts` and `features/routines/storage.ts` to `78f57c2`.
- PR6 must deliver fencing token and safe claims/settlement, replay and controlled redrive, persisted sanitized failures, production delivery adapter, provisioning `PENDING`/`READY`/`FAILED`, SYSTEM outcome audits, and length-hiding internal authorization. Invitation work follows this execution slice.

### Focused RED/GREEN Evidence

| Cycle | Command / result |
|---|---|
| RED | `npm test --workspace @agustinturriedf/web -- features/outbox/foundation.test.ts` — exit 1; 1 of 4 tests failed because `encryptPayload()` accepted a dotted key ID. |
| GREEN | Same command — exit 0; 1 file passed, 4 tests passed. |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `npm test --workspace @agustinturriedf/web -- features/outbox/foundation.test.ts` — exit 0; 1 file passed, 4 tests passed. |
| Lifecycle/audit regression | `npm test --workspace @agustinturriedf/web -- app/api/users/lifecycle.test.ts features/audit/repository.test.ts` — exit 0; 2 files passed, 17 tests passed. |
| Policy/service regression | `npm test --workspace @agustinturriedf/web -- features/users/policy.test.ts features/users/service.test.ts` — exit 0; 2 files passed, 22 tests passed. |
| Type command | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 0; no output. |
| Runtime harness | Deterministic transaction-composition scenario in `foundation.test.ts`: domain update, encrypted outbox enqueue, and audit append stage under one caller transaction; an owner abort leaves the committed collection empty. No external runtime boundary exists. |
| Scoped diff check | `git diff --check` over the three retained PR5 paths plus no-index whitespace checks for their untracked additions — exit 0; only LF-to-CRLF advisories. |
| Deferred/base-revert proof | `git diff --exit-code 78f57c2 -- features/audit/event-factory.ts features/routines/storage.ts` — exit 0; no deferred worker route files remain under `app/api/internal`. |
| Authored line count | Relative to `78f57c2`: crypto +53/-0, repository +17/-0, foundation test +77/-0; **147 changed lines**, under the 400-line cap. |
| Rollback boundary | Remove only `features/outbox/crypto.ts`, `features/outbox/repository.ts`, and `features/outbox/foundation.test.ts`; this removes PR5 foundation behavior without changing schema, policy, audit, lifecycle, invitations, or deferred execution. |

### Result

- Tasks 2.5–2.6 are unchecked. OD1–OD5 remain incomplete, and final verification/archive remain blocked.
- The previous independent-failure evidence is preserved above; this split removes its unsafe worker claims rather than representing them as remediated completion.
- Next ordered apply work is PR6 deferred outbox execution, followed by invitation tasks 3.1–3.2.

## PR6: Durable Outbox Execution Preflight

- Work unit: `pr6-outbox-execution`; delivery: chained PR slice, `feature-branch-chain`; the branch starts at PR5 commit `3f7eca9` and targets the immediate prior chain branch, never `main`.
- Mode: Standard. Global Strict TDD is disabled; focused RED/GREEN would be required for this web-only slice.
- Status: partial before implementation. Tasks 2.5 and 2.6 remain unchecked.

### Blocking Scope Assessment

The required normative behavior cannot be completed honestly inside this autonomous 400-line slice. PR5 deliberately contains only encryption and transaction-required enqueue; `OutboxMessage` has no fencing token, processing-state-safe settlement metadata, persisted sanitized failure metadata, or redrive state. A complete delivery requires a deterministic schema migration, repository claim/settlement/redrive operations, worker dispatch and production-adapter composition, provisioning-state persistence, fail-closed length-hiding control routes, and behavioral test coverage for each required race and outcome. Implementing only a subset would repeat the unsafe PR5 claim pattern and weaken OD1–OD5/AA1–AA4 proof.

### Evidence

| Evidence | Exact result |
|---|---|
| Focused existing outbox test | `npm test --workspace @agustinturriedf/web -- features/outbox/foundation.test.ts` — exit 0; 1 file passed, 4 tests passed. This proves only PR5 envelope/enqueue foundation, not worker execution. |
| Lifecycle/audit regression | `npm test --workspace @agustinturriedf/web -- app/api/users/lifecycle.test.ts features/audit/repository.test.ts` — exit 0; 2 files passed, 17 tests passed. |
| Policy/service regression | `npm test --workspace @agustinturriedf/web -- features/users/policy.test.ts features/users/service.test.ts` — exit 0; 2 files passed, 22 tests passed. |
| Type command | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 0; no output. |
| Schema command | N/A — no schema change was made after the pre-edit scope stop. |
| Runtime harness | N/A — no production worker/control route was added; the existing foundation test has no external-delivery boundary. |
| Scoped whitespace and diff | `git diff --check 3f7eca9` — exit 0; no output. `git diff --numstat 3f7eca9` — no output. |
| Authored source/test/migration count | Relative to `3f7eca9`: 0 additions, 0 deletions, 0 total. No source, test, migration, or staging change was made. |
| Staging check | `git diff --cached --name-only` — no output. `git status --short` lists only untracked `.codegraph/`, `.superpowers/`, `docs/`, and `openspec/`; none is staged. |
| Rollback boundary | This stopped attempt changes only this OpenSpec progress record. Reverting this section removes the preflight record and no application behavior. |

### Required Next Slice

Split PR6 before apply into at least a durable state-machine/migration work unit and a worker/control-route integration work unit, each with its own behavioral tests and no weakened fencing, replay, audit, adapter, or provisioning requirement. Invitation work, final verification, and archive remain blocked.

## PR6: Durable Outbox State Machine

- Work unit: `pr6-outbox-state-machine`; delivery: chained PR slice, `feature-branch-chain`; base `3f7eca9`, targeting the immediate prior chain branch, never `main`.
- Mode: Standard. Strict TDD is disabled globally; focused RED/GREEN was used for this web-only slice.
- Completed: 2.5.1 and 2.5.2 only. Parent 2.5 and every 2.6 task remain unchecked for PR7.

### Focused RED/GREEN Evidence

| Cycle | Exact result |
|---|---|
| RED | `npm test --workspace @agustinturriedf/web -- features/outbox/state-machine.test.ts` — exit 1; 4 of 5 tests failed because claim, settlement, retry, failure, and redrive APIs did not exist. |
| GREEN | Same command — exit 0; 1 file passed, 5 tests passed. |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `npm test --workspace @agustinturriedf/web -- features/outbox/state-machine.test.ts` — exit 0; 1 file, 5 tests passed. |
| Foundation regression | `npm test --workspace @agustinturriedf/web -- features/outbox/foundation.test.ts` — exit 0; 1 file, 4 tests passed. |
| Lifecycle/audit regression | `npm test --workspace @agustinturriedf/web -- app/api/users/lifecycle.test.ts features/audit/repository.test.ts` — exit 0; 2 files, 17 tests passed. |
| Policy/service regression | `npm test --workspace @agustinturriedf/web -- features/users/policy.test.ts features/users/service.test.ts` — exit 0; 2 files, 22 tests passed. |
| Type command | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 0; no output. |
| Prisma validation | `npm exec --workspace @agustinturriedf/web -- prisma validate --schema prisma/schema.prisma` — exit 0; schema valid. npm emitted its existing `--schema` forwarding warning and Prisma emitted the existing package configuration deprecation. |
| Migration structural consistency | The schema and deterministic migration both add nullable `fencingToken`, `failureCategory`, and `failureSummary`; both define `OutboxMessage_status_leaseExpiresAt_idx`. The migration is additive, preserves status/idempotency/payload columns, and does not read, expose, or rewrite encrypted payloads. |
| Runtime harness | Deterministic in-memory Prisma-compatible harness in `state-machine.test.ts`: concurrent claim CAS admits one worker; stale fencing cannot settle; retry schedules bounded exponential delay; exhaustion is terminal; concurrent redrive admits one reset. No worker, adapter, or HTTP boundary belongs to PR6. |
| Diff and staging | `git diff --check 3f7eca9` for tracked PR6 paths — exit 0; no whitespace errors. No-index checks for the new test/migration had no whitespace output (Git exit 1 denotes file difference). `git diff --cached --name-only` — no output. |
| Authored line count | Relative to `3f7eca9`: repository +43/-13, schema +4/-0, state-machine test +90/-0, migration +8/-0: **145 additions, 13 deletions, 158 changed lines**, under the 400-line hard cap. |
| Rollback boundary | Revert the PR6 state-machine commit and migration before deployment: remove `features/outbox/state-machine.test.ts` and migration `20260918_outbox_state_machine`; revert `features/outbox/repository.ts` and `prisma/schema.prisma`. This removes only claim/fencing/settlement/retry/redrive durability and leaves PR5 crypto/enqueue foundation intact. |

### Result and Residual PR7 Scope

- Durable state only: caller-owned enqueue remains intact; pending/expired-processing claims are leased and fenced; settlement requires ID + `PROCESSING` + active fencing token; bounded sanitized retry/failure and terminal-only idempotent redrive retain encrypted payload and idempotency identity.
- Confirmed absent: `features/outbox/worker.ts`, `features/outbox/email-adapter.ts`, and `app/api/internal/outbox/drain/route.ts`. No adapter, decryption dispatch, worker loop, audit outcome, provisioning update, or HTTP control was added; all remain PR7 scope under tasks 2.6.1–2.6.2.
- Tasks 2.5 and 2.6 remain incomplete. Independent SDD verification is still blocked until PR7 completes OD2/OD5 and AA1/AA4 integration behavior.

## PR7: Outbox Worker and Control Integration (Partial)

- Work unit: `pr7-outbox-worker-control`; delivery: chained PR slice, `feature-branch-chain`, based on `626b14c` and targeting the immediate previous chain branch, never `main`.
- Mode: Standard. Global Strict TDD is disabled; focused RED/GREEN was used for this web-only slice.
- Status: partial. Tasks 2.6.1 and 2.6.2, and parents 2.5 and 2.6, remain unchecked because the implementation evidence below does not yet prove every mandated worker outcome/audit atomicity case.

### Files Changed

- `agustinturriedf/web/features/outbox/worker.ts`: claim-before-decrypt dispatch loop, injected production email/provisioning adapters, fencing-token settlement, and bounded SYSTEM outcome construction.
- `agustinturriedf/web/app/api/internal/outbox/drain/route.ts`: fixed-size SHA-256 digest authorization, fail-closed indistinguishable denials, drain, and terminal-only redrive control.
- `agustinturriedf/web/features/outbox/worker.test.ts`, `app/api/internal/outbox/drain/route.test.ts`: focused worker and control-route RED/GREEN coverage with synthetic values only.
- `agustinturriedf/web/features/invitations/email.ts`: forwards an outbox idempotency key through the existing Resend application mail path.
- `agustinturriedf/web/features/routines/storage.ts`: persists `PENDING` routine provisioning transitions to `READY` or `FAILED` only.
- `agustinturriedf/web/features/audit/event-factory.ts`, `features/outbox/repository.ts`: bounded `resourceRef` audit summary support and the production repository singleton.

### Focused RED/GREEN Evidence

| Cycle | Exact result |
|---|---|
| RED | `npm test --workspace @agustinturriedf/web -- features/outbox/worker.test.ts app/api/internal/outbox/drain/route.test.ts` — exit 1; both suites failed before production code because `./worker` and `./route` did not exist. |
| GREEN | Same command — exit 0; 2 files passed, 5 tests passed. |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `npm test --workspace @agustinturriedf/web -- features/outbox/worker.test.ts app/api/internal/outbox/drain/route.test.ts` — exit 0; 2 files, 5 tests passed. |
| State/foundation regression | `npm test --workspace @agustinturriedf/web -- features/outbox/state-machine.test.ts features/outbox/foundation.test.ts` — exit 0; 2 files, 9 tests passed. |
| Lifecycle/audit regression | `npm test --workspace @agustinturriedf/web -- app/api/users/lifecycle.test.ts features/audit/repository.test.ts` — exit 0; 2 files, 17 tests passed. |
| Policy/service regression | `npm test --workspace @agustinturriedf/web -- features/users/policy.test.ts features/users/service.test.ts` — exit 0; 2 files, 22 tests passed. |
| Type command | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 0; no output. |
| Runtime harness | Deterministic concurrent worker/control-route harness: one claimed EMAIL dispatch receives its outbox idempotency key; unauthorized missing, short, long, and wrong synthetic credentials return one identical response without a drain; redrive is terminal-only through the repository. No long-lived server or real provider was invoked. |
| Schema/migration proof | `git diff --quiet 626b14c -- agustinturriedf/web/prisma/schema.prisma agustinturriedf/web/prisma/migrations` — exit 0; unchanged from PR6. |
| Diff/staging | `git diff --check 626b14c -- agustinturriedf/web` — exit 0; no whitespace errors. `git diff --cached --name-only` — no output. |
| Authored line count | Relative to `626b14c`: 156 additions and 2 deletions, **158 changed source/test lines**, under the 400-line cap. |
| Security constraints | No real environment value was read or printed; tests use synthetic values. The route compares fixed-size SHA-256 digests with `timingSafeEqual`; payload decryption occurs after a claim; no payload body or raw provider error is persisted by this slice. |
| Rollback boundary | Revert only the PR7 worker, drain route, aligned tests, idempotency forwarding, provisioning persistence helper, audit allowlist entry, and repository singleton. This removes worker/control behavior without altering PR5 crypto or PR6 schema/state machine. |

### Residual Required Proof

- Add explicit behavioral coverage and implementation evidence for terminal retry exhaustion versus stale settlement, provisioning `READY` and terminal `FAILED`, bounded SYSTEM audits for success/retry/terminal-failure/redrive, and transactional coupling of a winning settlement with its audit append.
- Do not start PR8 invitations until these PR7 conditions pass and tasks 2.5–2.6 can be checked.

## PR7 Correction: Discriminated Settlement and Atomic Outcome Audit

- Correction token: `sha256:8140fb65da859c4f1f6512a252b3c9cd41c9178f9affd8abe8ce6f6925c422bd`.
- Failed evidence remediated: `sha256:93ce91a51bb9ca9a799d3d3186355657fcb58637fe77e740e7a4bbeff923d2e8`.
- Work unit: `pr7-outbox-worker-control`; Standard mode. The correction stays on the PR7 boundary and leaves PR8 invitation work absent.

### Corrected Contract and Behavior

- `complete`, `retry`, and `fail` now return `SettlementResult`: `STALE`, `COMPLETED`, `RETRY_SCHEDULED`, or `FAILED`. Every settlement retains the ID + `PROCESSING` + fencing-token CAS.
- `OutboxWorker` opens the repository transaction boundary, performs conditional settlement with its supplied transaction, then appends exactly one bounded SYSTEM audit and routine provisioning update only after a winning result. An audit failure rolls back the winning mutation; a stale fence writes neither audit nor provisioning state.
- Routine provisioning becomes `READY` only after a completed settlement, remains `PENDING` when retry is scheduled, and becomes `FAILED` only on terminal exhaustion. The persistence helper now targets the schema’s `provisioningStatus` field.
- Authorized winning redrive appends `OUTBOX_REDRIVEN` as a bounded SYSTEM event in the repository transaction. Existing adapter injection, email idempotency forwarding, claim-before-decrypt behavior, single concurrent execution, terminal-only redrive, and length-hiding control denials remain covered.

### RED/GREEN Evidence

| Cycle | Exact result |
|---|---|
| Failing-before | `npm test --workspace @agustinturriedf/web -- features/outbox/worker.test.ts features/outbox/state-machine.test.ts app/api/internal/outbox/drain/route.test.ts` — exit 1; 5 failures after the new transaction/discriminated-result contract was introduced while legacy boolean callers and mocks remained. |
| Passing-after | Same command — exit 0; 3 files passed, 13 tests passed. |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused worker/control test | `npm test --workspace @agustinturriedf/web -- features/outbox/worker.test.ts features/outbox/state-machine.test.ts app/api/internal/outbox/drain/route.test.ts` — exit 0; 3 files, 13 tests passed. |
| State-machine/foundation | `npm test --workspace @agustinturriedf/web -- features/outbox/state-machine.test.ts features/outbox/foundation.test.ts` — exit 0; 2 files, 10 tests passed. |
| Lifecycle/audit regression | `npm test --workspace @agustinturriedf/web -- app/api/users/lifecycle.test.ts features/audit/repository.test.ts` — exit 0; 2 files, 17 tests passed. |
| Policy/service regression | `npm test --workspace @agustinturriedf/web -- features/users/policy.test.ts features/users/service.test.ts` — exit 0; 2 files, 22 tests passed. |
| TypeScript | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 0; no output. |
| Runtime harness | Deterministic concurrent worker/control and transaction harnesses — one claim/effect, identical denied control responses, applied retry/terminal/stale branches, redrive audit, and audit-append rollback all passed; no long-lived server or real provider was invoked. |
| Scope/security | `git diff --check 626b14c -- agustinturriedf/web` — exit 0; schema/migrations unchanged from PR6; PR8 paths absent; synthetic-only diff secret scan passed. |
| Review budget | Relative to `626b14c`, PR7 has 251 additions and 20 deletions: **271 changed lines**, within the 400-line cap. |
| Rollback boundary | Revert PR7 worker/control files and aligned tests, plus this correction’s repository settlement contract, routine provisioning helper, and state-machine assertions. This removes only PR7 execution/audit integration while retaining PR5 crypto/enqueue and PR6 schema/state-machine durability. |

### Result

- Tasks 2.5, 2.6, 2.6.1, and 2.6.2 are complete: combined PR5–PR7 evidence satisfies OD1–OD5 and AA1/AA4 for the delivered outbox path.
- Invitations remain PR8 scope. Independent SDD verification is required before further lifecycle steps.

## PR7 Correction: Bearer Purge, Replay Safety, and Verified Provisioning

- Correction token: `sha256:63bba3afdcf743a43a9c965e68bf118bb3c31372f2297ae865e86bc40950d8e9`.
- Failed evidence remediated: `sha256:56b4704be8ba16807663df46a54455ed395be42ba50427b0e744bc307ddc40e4`.
- Work unit: `pr7-outbox-worker-control`; Standard mode; delivery remains a `feature-branch-chain` PR7 slice from `626b14c`.

### Corrected Contract

- `payloadEncrypted` is nullable and is cleared by successful EMAIL settlement and terminal EMAIL failure. Completed work is never redriven; a purged EMAIL failure returns only `PAYLOAD_PURGED` and writes no redrive audit.
- Failed non-secret routine provisioning may be redriven only while its recoverable encrypted payload remains. `redrive()` returns the discriminated `APPLIED`, `PAYLOAD_PURGED`, or `NOT_REDRIVABLE` result; only `APPLIED` appends `OUTBOX_REDRIVEN`.
- PR7 now owns Resend/idempotency forwarding in `features/outbox/email-adapter.ts`. `features/invitations/email.ts` has been restored exactly to `626b14c`.
- Routine storage proves base containment before creation, directory type, platform-exposed ownership, read/write access, and verified postconditions. A zero-row `PENDING` transition throws inside the worker transaction, rolling back settlement and its success audit.

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused worker/control/state/storage command | `npm test --workspace @agustinturriedf/web -- features/outbox/worker.test.ts features/outbox/state-machine.test.ts app/api/internal/outbox/drain/route.test.ts features/routines/storage.test.ts` — exit 0; 4 files, 18 tests passed. |
| Lifecycle/audit/policy/service regression | `npm test --workspace @agustinturriedf/web -- app/api/users/lifecycle.test.ts features/audit/repository.test.ts features/users/policy.test.ts features/users/service.test.ts` — exit 0; 4 files, 39 tests passed. |
| TypeScript | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 0; no output. |
| Prisma validation | `npm exec --workspace @agustinturriedf/web -- prisma validate --schema prisma/schema.prisma` — exit 0; schema valid. No schema or migration change belongs to this correction. |
| Runtime harness | Deterministic fake-adapter and Prisma-compatible transaction scenarios: one claim/effect, stale settlement no-op, success/terminal purge, bounded `PAYLOAD_PURGED` redrive, and provisioning transition rollback. No real provider or long-lived server was invoked. |
| Scoped diff and invitation ownership | `git diff --check 626b14c -- agustinturriedf/web` — exit 0. `git diff --exit-code 626b14c -- agustinturriedf/web/features/invitations/email.ts` — exit 0. |
| Scoped secret-pattern inspection | Completed against the PR7 outbox/control source and tests without reading or disclosing environment values, credentials, provider errors, or payload bodies. |
| Review budget | Source/test diff from `626b14c`: 345 additions plus deletions across PR7-owned paths, within the 400-line cap. |
| Rollback boundary | Revert `features/outbox/{email-adapter,worker,repository}.ts`, their aligned tests, the internal drain route/test, and the routine-storage verification changes. This removes PR7 execution behavior while retaining PR5 encryption/enqueue and PR6 state durability. |

### Result and Routing

- Tasks 2.5, 2.6, 2.6.1, and 2.6.2 remain checked: corrected focused evidence covers OD1–OD5 and AA1/AA4 without retaining bearer EMAIL payloads after success or terminal failure.
- `next_recommended: sdd-apply` — begin PR8 task 3.1. Do not route this change to final `sdd-verify` yet.

## PR8: Invitation Issuance Scope Assessment

- Work unit: `pr8-invitation-issuance`; delivery: chained PR slice, `feature-branch-chain`, based on `a782a51` and targeting the immediate prior chain branch, never `main`.
- Mode: Standard. Strict TDD is disabled globally; the required AI1–AI3 RED/GREEN proof still applies to this web-only slice.
- Status: partial before implementation. Tasks 3.1 and 3.2 remain unchecked.

### Blocking Scope Assessment

The current invitation implementation is a legacy STUDENT-only synchronous-email flow. It lacks the required role/profile contract, safe DTO/cursor queue, caller-owned transaction composition of invitation/audit/encrypted EMAIL outbox work, versioned CAS resend/revoke behavior, and the revoke Route Handler. The existing focused suite has six legacy cases and cannot prove the required AI1–AI3 matrix. Adding the complete replacement service, repository, validation, three handlers, encrypted delivery builder, and the required RED coverage would exceed the fixed 400 changed source/test-line ceiling for this autonomous work unit. No source or test was changed to avoid leaving an incomplete security boundary.

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Invitation focused command | `npm test --workspace @agustinturriedf/web -- features/invitations/service.test.ts` — exit 0; 1 file, 6 tests passed. These are legacy tests and do not prove AI1–AI3. |
| Outbox regression | `npm test --workspace @agustinturriedf/web -- features/outbox/worker.test.ts features/outbox/state-machine.test.ts features/outbox/foundation.test.ts` — exit 0; 3 files, 15 tests passed. |
| Lifecycle/audit/policy regression | `npm test --workspace @agustinturriedf/web -- app/api/users/lifecycle.test.ts features/audit/repository.test.ts features/users/policy.test.ts features/users/service.test.ts` — exit 0; 4 files, 39 tests passed. |
| TypeScript | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 0; no output. |
| Runtime harness | N/A — no production invitation boundary was added. Existing focused tests use deterministic mocks only. |
| Diff, activation, and staging inspection | `git diff --check a782a51 -- agustinturriedf/web`, `git diff --numstat a782a51 -- agustinturriedf/web`, and `git diff --name-only a782a51 -- agustinturriedf/web` produced no output; no PR9 activation path is present in the candidate diff. `git diff --cached --name-only -- agustinturriedf/web` and untracked-path inspection produced no output. With an empty source/test diff, secret-pattern inspection is vacuously clean. |
| Authored source/test count | Relative to `a782a51`: 0 additions, 0 deletions, **0 changed lines**. |
| Rollback boundary | No application code was changed. Revert only this PR8 scope-assessment record to remove the attempt evidence; invitation, audit, outbox, and activation behavior remain unchanged. |

### Result and Routing

- Tasks 3.1 and 3.2 remain unchecked; task 3.3 onward remains unchecked.
- `next_recommended: sdd-apply` — rescope PR8 into autonomous chained work units that can each prove their portion of AI1–AI3 within the 400-line cap. Final SDD verification remains blocked.

## PR8: Invitation Issuance Queue (Partial)

- Work unit: `pr8-invitation-issuance-queue`; delivery: chained PR slice, `feature-branch-chain`, based on `a782a51` and targeting the immediate prior chain branch, never `main`.
- Mode: Standard. Strict TDD is disabled; a focused threat-relevant RED was recorded before the issuance implementation.
- Scope delivered: role-aware invitation issuance and a safe trainer-scoped queue. Resend and revoke remain explicitly out of scope for the next chained slice.

### Delivered Behavior

- ADMIN can issue `ADMIN`, `TRAINER`, or `STUDENT` invitations; TRAINER can issue only `STUDENT` invitations assigned to the actor and cannot issue team roles.
- STUDENT issuance requires an active persisted TRAINER. Team invitations reject student-only data. Existing user identities and existing invitations are rejected; issuance never calls user creation.
- Issuance persists a `PENDING` invitation, immutable `INVITATION_ISSUED` audit event, and encrypted EMAIL outbox work inside one caller-owned Prisma transaction. The raw activation URL is constructed only for encrypted outbox payload construction; it is absent from invitation storage, audit input, DTOs, and logs.
- Queue output is scoped to the trainer's STUDENT invitations and maps an explicit safe DTO that excludes hashes, tokens, and encrypted payload fields.

### Focused RED/GREEN Evidence

| Cycle | Exact result |
|---|---|
| RED | `npm test --workspace @agustinturriedf/web -- --run features/invitations/service.test.ts` — exit 1; 2 of 7 tests failed before the production change. The legacy service omitted `role`, did not use a caller transaction/audit/outbox enqueue, sent email synchronously, and validation rejected the team-role policy case before authorization. |
| GREEN | Same command — exit 0; 1 file passed, 9 tests passed. |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `npm test --workspace @agustinturriedf/web -- --run features/invitations/service.test.ts` — exit 0; 1 file, 9 tests passed. |
| Outbox regression | `npm test --workspace @agustinturriedf/web -- --run features/outbox/foundation.test.ts features/outbox/state-machine.test.ts features/outbox/worker.test.ts app/api/internal/outbox/drain/route.test.ts` — exit 0; 4 files, 17 tests passed. |
| Policy/audit/lifecycle regression | `npm test --workspace @agustinturriedf/web -- --run features/users/policy.test.ts features/users/service.test.ts features/audit/repository.test.ts app/api/users/lifecycle.test.ts` — exit 0; 4 files, 39 tests passed. |
| Type command | `npm exec --workspace @agustinturriedf/web tsc -- --noEmit` — exit 0; npm emitted its existing `Unknown cli config "--noEmit"` warning only. |
| Runtime harness | N/A — no real email or database transaction was invoked because this unit must not authorize a delivery provider or database mutation. The focused deterministic transaction scenario proves the service supplies the same transaction to invitation creation, audit append, and encrypted outbox enqueue. |
| Review budget | `git diff --numstat a782a51 -- "agustinturriedf/web"` — repository `+13/-26`, service test `+75/-28`, service `+41/-43`, validation `+10/-2`: **139 additions, 99 deletions, 238 total**, within the 400-line cap. |
| Rollback boundary | Revert `features/invitations/service.ts`, `features/invitations/repository.ts`, `lib/validation/invitations.ts`, and `features/invitations/service.test.ts`. This removes PR8 issuance/queue behavior while retaining PR5–PR7 outbox execution and leaves resend, revoke, activation, recovery, and views untouched. |

### Task Status and Routing

- No checkbox was changed. Task 3.1 includes AI3 and task 3.2 includes resend/revoke handlers, both intentionally deferred by this work-unit boundary.
- Remaining next slice: implement versioned resend/revoke and their route handlers, then add the remaining AI3 test evidence before marking tasks 3.1 or 3.2 complete.
- `next_recommended: sdd-apply`. Final SDD verification remains blocked.

## PR8 Correction: Task Granularity Alignment

- Correction attempt: `sha256:6c80b0cb69871734adc38ae795826d6ec4baf5384247d191de259ab6084d276d`.
- Cause: native work-unit routing had already split `pr8-invitation-issuance-queue` from deferred resend/revoke, but parent tasks 3.1 and 3.2 did not expose child checkboxes for the independent boundaries.
- Resolution: `tasks.md` now preserves parents 3.1 and 3.2 as unchecked and adds checked PR8 children `3.1.1` and `3.2.1`; deferred PR9 children `3.1.2` and `3.2.2` remain unchecked. The review forecast now records the resolved `auto-chain`, `feature-branch-chain` PR8 → PR9 split.

### Corrected Child-Task Evidence

| Child task | Status | Proof |
|---|---|---|
| 3.1.1 RED PR8 issuance/queue | Complete | The previously recorded focused RED failed with 2 of 7 tests before the issuance boundary existed; the current focused suite passes 9/9. |
| 3.2.1 GREEN PR8 issuance/queue | Complete | Current source retains the verified four-file, 238-line slice: role-aware issuance, no user creation, caller-owned invitation/audit/encrypted-outbox transaction composition, and safe trainer-scoped DTO output. |
| 3.1.2 RED PR9 resend/revoke | Pending | Explicitly deferred; no resend/revoke behavior or tests were changed by this correction. |
| 3.2.2 GREEN PR9 resend/revoke | Pending | Explicitly deferred; no resend/revoke handler or delivery implementation was changed by this correction. |

### Correction Verification

| Evidence | Exact result |
|---|---|
| Focused invitation command | `npm test --workspace @agustinturriedf/web -- --run features/invitations/service.test.ts` — exit 0; 1 file, 9 tests passed. |
| Outbox regression | `npm test --workspace @agustinturriedf/web -- --run features/outbox/foundation.test.ts features/outbox/state-machine.test.ts features/outbox/worker.test.ts app/api/internal/outbox/drain/route.test.ts` — exit 0; 4 files, 17 tests passed. |
| Policy/audit/lifecycle regression | `npm test --workspace @agustinturriedf/web -- --run features/users/policy.test.ts features/users/service.test.ts features/audit/repository.test.ts app/api/users/lifecycle.test.ts` — exit 0; 4 files, 39 tests passed. |
| Type command | `npm exec --workspace @agustinturriedf/web tsc -- --noEmit` — exit 0; npm emitted its existing `Unknown cli config "--noEmit"` warning only. |
| Review budget | `git diff --numstat a782a51 -- "agustinturriedf/web"` — **139 additions, 99 deletions, 238 total**. |
| Runtime harness | N/A — this correction changes only SDD artifacts; no new runtime boundary was added. The existing deterministic transaction-composition harness remains the PR8 runtime evidence. |
| Rollback boundary | Revert the Phase 3 child-task and forecast edits in `tasks.md` plus this correction section. This restores only prior planning granularity; the independently reversible four-file PR8 source/test boundary is unchanged. |

### Result and Routing

- The bounded PR8 issuance/queue work unit is now visibly complete through child tasks 3.1.1 and 3.2.1. Parent tasks 3.1 and 3.2 remain correctly incomplete until PR9 completes AI3 resend/revoke work.
- `next_recommended: sdd-apply` — PR9 resend/revoke. Final SDD verification remains blocked.

## PR9: Invitation Resend and Revoke

- Work unit: `pr9-invitation-resend-revoke`; delivery: chained PR slice, `feature-branch-chain`, based on `e19c920` and targeting the immediate prior chain branch, never `main`.
- Mode: Standard. Project Strict TDD is disabled; AI3 threat-relevant RED/GREEN coverage was recorded before production behavior.
- Scope: only versioned resend/revoke commands and their route handlers. Activation, password reset, and views remain untouched.

### Completed Tasks

- [x] 3.1.2 RED PR9 resend/revoke: AI3 version, token rotation, terminal-state, and conflict boundaries.
- [x] 3.2.2 GREEN PR9 resend/revoke: versioned commands, encrypted re-delivery enqueue, and resend/revoke handlers.
- [x] 3.1 Parent AI1–AI3 RED coverage is complete across PR8 and PR9.
- [x] 3.2 Parent issuance/queue/resend/revoke GREEN implementation is complete across PR8 and PR9.

### Focused RED/GREEN Evidence

| Cycle | Exact result |
|---|---|
| RED | `npm test --workspace @agustinturriedf/web -- --run features/invitations/service.test.ts` — exit 1; 3 tests failed because the prior service called non-versioned `updateToken` and `markRevoked` methods rather than the new CAS command boundary. |
| GREEN | Same command — exit 0; 1 file passed, 11 tests passed. |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `npm test --workspace @agustinturriedf/web -- --run features/invitations/service.test.ts` — exit 0; 1 file passed, 11 tests passed. |
| Route validation test | `npm test --workspace @agustinturriedf/web -- --run app/api/invitations/[invitationId]/actions.test.ts` — exit 0; 1 file passed, 2 tests passed. |
| Outbox regression | `npm test --workspace @agustinturriedf/web -- --run features/outbox/foundation.test.ts features/outbox/state-machine.test.ts features/outbox/worker.test.ts app/api/internal/outbox/drain/route.test.ts` — exit 0; 4 files passed, 17 tests passed. |
| Policy/audit/lifecycle regression | `npm test --workspace @agustinturriedf/web -- --run features/users/policy.test.ts features/users/service.test.ts features/audit/repository.test.ts app/api/users/lifecycle.test.ts` — exit 0; 4 files passed, 39 tests passed. |
| Type command | `npm exec --workspace @agustinturriedf/web tsc -- --noEmit` — exit 0; npm emitted its existing `Unknown cli config "--noEmit"` warning only. |
| Runtime harness | Deterministic service and route-handler tests passed: a matching version rotates only the persisted hash, expiry, delivery state, audit, and encrypted EMAIL outbox record in one caller-owned transaction; terminal/stale commands enqueue nothing; an invalid route version returns 400 before service invocation; valid resend/revoke commands reach the authenticated service boundary. No live database or provider was authorized. |
| Review budget | `git diff --numstat e19c920 -- "agustinturriedf/web"` — 121 additions, 77 deletions for tracked files. `git diff --no-index --numstat NUL -- "agustinturriedf/web/app/api/invitations/[invitationId]/actions.test.ts"` — 42 additions. **163 additions + 77 deletions = 240 authored changed lines**, within the 400-line cap. |
| Whitespace | `git diff --check e19c920 -- "agustinturriedf/web"` — exit 0; Git emitted LF-to-CRLF advisories only. |
| Rollback boundary | Revert `features/invitations/service.ts`, `features/invitations/repository.ts`, `lib/validation/invitations.ts`, the two invitation action routes, and their two tests. This removes only PR9 resend/revoke CAS, audit, and encrypted re-delivery behavior; PR8 issuance/queue and PR5–PR7 outbox execution remain intact. |

### Result and Routing

- ADMIN may resend or revoke eligible invitations. TRAINER may act only on STUDENT invitations whose trainer ID equals the actor ID; team invitations are denied.
- Both commands require a current version. Repository `updateMany` CAS requires eligible status, non-expired token, and matching version, so stale, concurrent, missing, or terminal requests leave no partial mutation, audit, or delivery work.
- Resend hashes a newly generated token and constructs the activation URL only for encrypted EMAIL payload construction inside the caller transaction. No raw token or URL is returned, audited, logged, or persisted in plaintext. Revoke writes no delivery work.
- `next_recommended: sdd-apply` — task 3.3 activation RED is next. Final SDD verification remains blocked.

## PR9 Corrective Rerun: CAS and Transaction Evidence

- Correction token: `sha256:98ccb56d6b449d0917e8d763b6d09834cef514455e1f19cb35acdd733d7ff9f4`.
- Failed evidence bound: `sha256:6437ba47e159e1d01ffaaa7fd967da919ec12e7505357d791aa3aa2fcf30c2e7`.
- Scope: correction tests and evidence only. Production resend/revoke code was not changed because the new tests confirmed the existing implementation meets every reported finding.

### Corrective RED/GREEN Evidence

| Cycle | Exact result |
|---|---|
| Initial corrective run | `npm test --workspace @agustinturriedf/web -- --run features/invitations/service.test.ts` — exit 1; 2 failures were caused by Vitest retaining a rejected mock implementation from the first table-driven rollback case. This was a test-harness isolation defect, not a production failure. |
| GREEN | Same command — exit 0; 1 file passed, 17 tests passed after restoring successful audit/outbox mock defaults per test. |

### Validator Finding Proof

| Finding | Explicit proof |
|---|---|
| Lost resend and revoke CAS | Separate tests set `resendIfCurrent` and `revokeIfCurrent` to `false`; each command returns `409 CONFLICT`, invokes no audit append, and enqueues no EMAIL work. |
| Token boundary | The resend test extracts the synthetic raw token only from the object passed to `encryptPayload`, verifies `createHash("sha256")` equals the `tokenHash` passed to CAS, and proves the raw value is absent from CAS persistence input, audit input, returned DTO, and `console.info` calls. No command error contains the raw token. |
| Exact transaction identity | The successful resend test captures the caller transaction passed to `resendIfCurrent` and asserts the same object is passed to audit append and outbox enqueue. |
| Resend rollback | Deterministic caller-transaction harness stages the CAS mutation, then forces audit failure and outbox failure independently. Both failures leave the committed collection empty; audit failure reaches no enqueue. |
| Revoke rollback | The harness stages revoke CAS, forces audit failure, observes no committed mutation, and proves no outbox enqueue occurs. |

### Corrective Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused invitation test | `npm test --workspace @agustinturriedf/web -- --run features/invitations/service.test.ts` — exit 0; 1 file, 17 tests passed. |
| Route validation test | `npm test --workspace @agustinturriedf/web -- --run app/api/invitations/[invitationId]/actions.test.ts` — exit 0; 1 file, 2 tests passed. |
| Outbox regression | `npm test --workspace @agustinturriedf/web -- --run features/outbox/foundation.test.ts features/outbox/state-machine.test.ts features/outbox/worker.test.ts app/api/internal/outbox/drain/route.test.ts` — exit 0; 4 files, 17 tests passed. |
| Policy/audit/lifecycle regression | `npm test --workspace @agustinturriedf/web -- --run features/users/policy.test.ts features/users/service.test.ts features/audit/repository.test.ts app/api/users/lifecycle.test.ts` — exit 0; 4 files, 39 tests passed. |
| Type command | `npm exec --workspace @agustinturriedf/web tsc -- --noEmit` — exit 0; npm emitted its existing `Unknown cli config "--noEmit"` warning only. |
| Runtime harness | The deterministic transaction harness executes real service call paths with a caller-supplied Prisma-compatible transaction object: matching CAS/audit/outbox actions share identity; injected audit/outbox failures commit no staged effect; false CAS creates no audit/outbox effect. No live database, provider, credential, or token was used. |
| Review budget | `git diff --numstat e19c920 -- "agustinturriedf/web"` — 208 additions and 87 deletions for tracked files. `git diff --no-index --numstat NUL -- "agustinturriedf/web/app/api/invitations/[invitationId]/actions.test.ts"` — 42 additions. **250 additions + 87 deletions = 337 authored changed lines**, within the 400-line cap. |
| Whitespace | `git diff --check e19c920 -- "agustinturriedf/web"` — exit 0; Git emitted LF-to-CRLF advisories only. |
| Rollback boundary | Revert the corrective additions in `features/invitations/service.test.ts` only. This removes the PR9 validator evidence without changing resend/revoke production behavior, PR8 issuance/queue, or PR5–PR7 outbox execution. |

### Result

- Parent 3.1 and child 3.1.2 were temporarily unchecked for this correction and are rechecked only after the complete 17-test focused proof passed. Production tasks 3.2 and 3.2.2 remain checked because no production defect was exposed.
- `next_recommended: sdd-apply` — task 3.3 activation RED remains next; activation, password reset, and views were not touched.

## PR9 Route-Contract Alignment

- Native attempt: `sha256:bcf473f3d5c004181bd64200cea2d0930e38516db0223df9fd9c05e8872c340d`.
- Work unit: `pr9-revoke-route-alignment`; delivery: chained PR slice, `feature-branch-chain`, based on `e19c920` and targeting the immediate prior chain branch, never `main`.
- Mode: Standard. Project Strict TDD is disabled.
- Scope: move the existing authenticated, validated revoke command from the invitation-detail route to the explicit `revoke/route.ts` contract. No service or repository behavior changed.

### Completed Tasks

- [x] 3.1 Parent AI1–AI3 RED coverage remains complete across PR8 and PR9.
- [x] 3.2 Parent issuance/queue/resend/revoke GREEN implementation remains complete: revocation now uses the required explicit route.
- [x] 3.2.2 GREEN PR9 resend/revoke remains complete: the detail route has no duplicate DELETE endpoint.

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `npm test --workspace @agustinturriedf/web -- --run app/api/invitations/[invitationId]/actions.test.ts` — exit 0; 1 file passed, 3 tests passed. |
| Service regression command | `npm test --workspace @agustinturriedf/web -- --run features/invitations/service.test.ts` — exit 0; 1 file passed, 17 tests passed. |
| Outbox regression | `npm test --workspace @agustinturriedf/web -- --run features/outbox/foundation.test.ts features/outbox/state-machine.test.ts features/outbox/worker.test.ts app/api/internal/outbox/drain/route.test.ts` — exit 0; 4 files passed, 17 tests passed. |
| Policy/audit/lifecycle regression | `npm test --workspace @agustinturriedf/web -- --run features/users/policy.test.ts features/users/service.test.ts features/audit/repository.test.ts app/api/users/lifecycle.test.ts` — exit 0; 4 files passed, 39 tests passed. |
| Type command | `npm exec --workspace @agustinturriedf/web tsc -- --noEmit` — exit 0; npm emitted only its existing `Unknown cli config "--noEmit"` warning. |
| Runtime harness | Deterministic route-handler tests invoke `DELETE /api/invitations/:id/revoke` with validated `expectedVersion` and bounded reason, delegate the authenticated actor to the invitation service, and prove the detail module does not export DELETE. No long-lived runtime boundary exists. |
| Review budget | `git diff --numstat e19c920 -- "agustinturriedf/web"` reports 210 additions and 111 deletions for tracked files. Untracked `actions.test.ts` adds 47 lines and `revoke/route.ts` adds 16 lines. **273 additions + 111 deletions = 384 authored changed lines**, within the 400-line cap. |
| Whitespace | `git diff --check e19c920 -- "agustinturriedf/web"` — exit 0; untracked no-index whitespace checks also passed. Git emitted LF-to-CRLF advisories only. |
| Rollback boundary | Remove `app/api/invitations/[invitationId]/revoke/route.ts`; restore the revoke DELETE handler in `app/api/invitations/[invitationId]/route.ts`; revert the two route test changes. This restores the prior routing contract only and does not affect invitation service/repository behavior. |

### Result

- The explicit `app/api/invitations/[invitationId]/revoke/route.ts` DELETE handler validates `expectedVersion` and a nonblank ≤500-character reason, obtains the authenticated actor, and delegates to `invitationService.revoke()`.
- `app/api/invitations/[invitationId]/route.ts` is read-only and no longer exposes DELETE; no compatibility endpoint exists because no approved compatibility contract was found.
- Tasks 3.1 and 3.2 remain complete because their explicit route requirement is now satisfied.
- `next_recommended: sdd-apply` — task 3.3 activation RED remains next. Independent SDD verification follows only after all change tasks are complete.

## PR10a: Activation Primitives

- Native attempt: `sha256:77db5a883792d948ec1a41e9e69a9a81b576fd31d5bd431979354f279cbe84ef`; do not settle.
- Work unit: `pr10a-activation-primitives`; delivery: chained PR slice, `feature-branch-chain`, from `707d254` and targeting the feature/tracker chain, never `main`.
- Mode: Standard. Global Strict TDD is disabled; the activation threat tests were written and observed RED before the production primitive existed.
- Scope: internal opaque activation-session exchange and atomic account-activation primitives only. Public exchange/activation routes, cookies, page/form/client bearer handling, reset, and directory views remain PR10b or later work.

### Completed Tasks

- [x] 3.3.1 RED PR10a activation primitives: eligible token/session state, terminal/replay rejection, lost CAS, and transaction composition.
- [x] 3.4.1 GREEN PR10a `features/invitations/activation.ts`: opaque hashed session and atomic activation primitives.

### RED/GREEN Evidence

| Cycle | Exact result |
|---|---|
| RED | `npm test --workspace @agustinturriedf/web -- --run features/invitations/activation.test.ts` — exit 1; 0 tests executed because `./activation` did not exist. |
| GREEN | Same command — exit 0; 1 file passed, 4 tests passed. |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `npm test --workspace @agustinturriedf/web -- --run features/invitations/activation.test.ts` — exit 0; 1 file, 4 tests passed. |
| Invitation regression | `npm test --workspace @agustinturriedf/web -- --run features/invitations/service.test.ts app/api/invitations/[invitationId]/actions.test.ts` — exit 0; 2 files, 20 tests passed. |
| Outbox regression | `npm test --workspace @agustinturriedf/web -- --run features/outbox/foundation.test.ts features/outbox/state-machine.test.ts features/outbox/worker.test.ts app/api/internal/outbox/drain/route.test.ts` — exit 0; 4 files, 17 tests passed. The previously reported malformed-envelope assertion failure does not remain. |
| Policy/audit/lifecycle regression | `npm test --workspace @agustinturriedf/web -- --run features/users/policy.test.ts features/users/service.test.ts features/audit/repository.test.ts app/api/users/lifecycle.test.ts` — exit 0; 4 files, 39 tests passed. |
| Type command | `npm exec --workspace @agustinturriedf/web tsc -- --noEmit` — exit 0; npm emitted only the existing `Unknown cli config "--noEmit"` warning. |
| Runtime harness | N/A — this PR10a boundary intentionally exposes no public route, cookie, UI, or external provider. The deterministic Prisma-compatible transaction test invokes `exchange()` and `activate()` entrypoints and proves the same transaction carries session CAS, invitation CAS, account creation, and audit append. |
| Review budget | `git diff --numstat 707d254 -- "agustinturriedf/web"` plus untracked files: activation test +69 and primitive +93; **162 additions, 0 deletions, 162 authored changed lines**, within the 400-line cap. |
| Whitespace | `git diff --check 707d254 -- "agustinturriedf/web"` plus no-index checks for both untracked files — exit 0; only LF-to-CRLF advisories. |
| Rollback boundary | Remove `features/invitations/activation.ts` and `features/invitations/activation.test.ts`. This removes only the unused PR10a primitive; the existing public activation route/UI and PR8–PR9 invitation behavior remain unchanged. |

### Result and Routing

- `exchange()` accepts only a hashed, pending/sent, unexpired invitation and returns a newly generated opaque activation-session bearer. Persistence contains only its SHA-256 hash, invitation ID, expiry, and consumption metadata.
- `activate()` revalidates session and invitation eligibility, wins both single-use CAS operations, then creates the exact invited immutable role and only STUDENT profile state when applicable. User creation, immutable activation audit, session consumption, and invitation consumption share one transaction; any failed CAS or persistence exception aborts all staged state.
- Parents 3.3 and 3.4 remain unchecked. PR10b owns public exchange/session-cookie routing, page/form, and clean-URL/modal behavior.
- Settle recommendation: do not settle this native attempt; route the remaining PR10b work to `sdd-apply` after independent verification of this slice.

## PR10a Corrective Rerun: Bound Exchange and Provisioning Commitment

- Native attempt: `sha256:966b733c052d6f52bc36729b584382725dc27e2cce2b0dd75584aa388eeb756c`; do not settle.
- Failed evidence bound: `sha256:019a17eeb8a422f058ec0c829ee99a41b8b2f1fdb9135171e8f779113f80a234`.
- Scope: only PR10a activation primitives and their focused tests. PR10b public routes, cookie, page/form, reset, and views remain absent.

### Corrected Contract

- Exchange CASes the exact invitation bearer hash, rotates `Invitation.tokenHash` to the newly generated activation-session hash, and creates the 10-minute session in the same transaction. The raw invitation bearer is never stored or returned.
- Activation requires both the unconsumed session hash and the invitation's current matching hash. Resend rotation or revoke nulling makes older sessions ineligible before any mutation.
- Activation CASes session and invitation consumption before account creation; it creates the immutable invited role, creates STUDENT-only profile/config state through the existing user repository, and enqueues encrypted `ROUTINE_PROVISION` work only for a student in the same transaction as its immutable subject audit.

### Validator Finding Proof

| Finding | Explicit proof |
|---|---|
| Single-use exchange and bearer secrecy | Focused test proves exchange stores only the SHA-256 session hash, CASes the exact invitation hash to it, returns only the approved opaque session, and omits the raw invitation bearer from persistence calls. A lost exchange CAS creates no session. |
| Generation binding and invalidation | Activation relation lookup and invitation-consume CAS require the exact session hash as the current invitation hash. Focused tests reject session input when the relation becomes ineligible after resend/revoke simulation; raw-bearer replay is rejected by a lost exchange CAS. |
| Role state and provisioning | Table-driven ADMIN/TRAINER/STUDENT assertions retain the invitation role; only STUDENT has a profile and emits encrypted `ROUTINE_PROVISION` work with stable `activation:<invitationId>:provision` identity. |
| Lost CAS and rollback | Focused cases lose session CAS and invitation CAS separately and observe no user/audit/provisioning call. Audit and enqueue failures reject the caller transaction after staged work, relying on Prisma's interactive transaction rollback contract. |
| Terminal states | Unknown, expired, consumed, and revoked invitation lookups each reject as `INVALID_OR_EXPIRED_TOKEN` without session creation; session replay is rejected by consumed-session CAS. |

### Corrective Evidence

| Evidence | Exact result |
|---|---|
| Focused RED | `npm test --workspace @agustinturriedf/web -- --run features/invitations/activation.test.ts` — exit 1; 4 of 8 tests failed before the CAS rotation/provisioning changes. |
| Focused GREEN | Same command — exit 0; 1 file, 12 tests passed. |
| Invitation regression | `npm test --workspace @agustinturriedf/web -- --run features/invitations/service.test.ts app/api/invitations/[invitationId]/actions.test.ts` — exit 0; 2 files, 20 tests passed. |
| Outbox regression | `npm test --workspace @agustinturriedf/web -- --run features/outbox/foundation.test.ts features/outbox/state-machine.test.ts features/outbox/worker.test.ts app/api/internal/outbox/drain/route.test.ts` — exit 0; 4 files, 17 tests passed. |
| Policy/audit/lifecycle regression | `npm test --workspace @agustinturriedf/web -- --run features/users/policy.test.ts features/users/service.test.ts features/audit/repository.test.ts app/api/users/lifecycle.test.ts` — exit 0; 4 files, 39 tests passed. |
| Type command | `npm exec --workspace @agustinturriedf/web tsc -- --noEmit` — exit 0; npm emitted only the existing `Unknown cli config "--noEmit"` warning. |
| Runtime harness | No public runtime boundary belongs to PR10a. The deterministic Prisma-compatible interactive-transaction harness executes exchange and activation, sharing one transaction object across session/invitation CAS, user creation, audit append, and provisioning enqueue. |
| Exact review count | Failed candidate record was understated at 162; its native failed-evidence ledger records **193 lines**. Corrected `git diff --numstat 707d254 -- "agustinturriedf/web"` plus untracked files reports activation test +120 and primitive +118: **238 additions, 0 deletions, 238 total**, within the 400-line cap. |
| Whitespace | `git diff --check 707d254 -- "agustinturriedf/web"` plus no-index checks for both untracked files — exit 0; only LF-to-CRLF advisories. |
| Rollback boundary | Remove `features/invitations/activation.ts` and `features/invitations/activation.test.ts`. This removes only PR10a internal primitives and their proof; public activation/UI, reset, views, and prior invitation slices remain unchanged. |

### Result

- 3.3.1 and 3.4.1 were unchecked during remediation and are rechecked only after the complete corrected evidence above passed.
- Settle recommendation: do not settle the native attempt. Independent SDD verification must assess this bounded correction before PR10b is applied.

## PR10a Final Evidence Correction: Staged Transaction State

- Native attempt: `sha256:2b9a8b18dc6f19c639c3dcbbbcd8a3a9a5b50552529d25db8ee4d891ac418b47`; do not settle.
- Failed evidence bound: `sha256:e72c0cf5ad844f6834d43113958106603d38b3a61029c570aefac110cb6dfdc5`.
- Scope: test harness and evidence only. `activation.ts` is unchanged because sequential staged-state execution exposed no production defect.

### Staged-State Evidence

`activation.test.ts` now uses a transaction harness that clones invitations, activation sessions, users, student profiles, trainer config, audit events, and outbox messages before every callback. It replaces the committed state only when the callback resolves; a throw discards the complete staged clone.

| Scenario | Proven committed result |
|---|---|
| Successful exchange then raw-bearer replay | One session commits; invitation hash rotates to the session hash; replay commits no second session and raw bearer is absent from persisted state. |
| Unknown, expired, revoked, and consumed fixtures | Each produces `INVALID_OR_EXPIRED_TOKEN` and leaves its complete fixture state unchanged. |
| Resend rotation and revoke after exchange | The old session is rejected before consumption; users, profiles, config, audit, and outbox remain empty. |
| Lost invitation CAS after staged session consumption | The thrown callback discards the staged session consumption; session remains unused and every effect collection remains empty. |
| Audit or provisioning enqueue failure | The thrown callback restores invitation, session, user, profile, config, audit, and outbox state exactly to the post-exchange snapshot. |
| ADMIN, TRAINER, and STUDENT activation | Each commits only its invited role; only STUDENT commits profile/config and one provisioning message; all commit one immutable audit and a replay is rejected. |

### Corrective Evidence

| Evidence | Exact result |
|---|---|
| Focused staged-state command | `npm test --workspace @agustinturriedf/web -- --run features/invitations/activation.test.ts` — exit 0; 1 file, 12 tests passed. |
| Invitation regression | `npm test --workspace @agustinturriedf/web -- --run features/invitations/service.test.ts app/api/invitations/[invitationId]/actions.test.ts` — exit 0; 2 files, 20 tests passed. |
| Outbox regression | `npm test --workspace @agustinturriedf/web -- --run features/outbox/foundation.test.ts features/outbox/state-machine.test.ts features/outbox/worker.test.ts app/api/internal/outbox/drain/route.test.ts` — exit 0; 4 files, 17 tests passed. |
| Policy/audit/lifecycle regression | `npm test --workspace @agustinturriedf/web -- --run features/users/policy.test.ts features/users/service.test.ts features/audit/repository.test.ts app/api/users/lifecycle.test.ts` — exit 0; 4 files, 39 tests passed. |
| Type command | `npm exec --workspace @agustinturriedf/web tsc -- --noEmit` — exit 0; npm emitted only the existing `Unknown cli config "--noEmit"` warning. |
| Runtime harness | The focused suite executes actual `exchange()` and `activate()` sequentially against staged Prisma-compatible state, not isolated method return values. No public route/runtime boundary belongs to PR10a. |
| Exact authored count | Executable no-index counts: activation test +164 and primitive +135: **299 additions, 0 deletions, 299 total**. This corrects the previous invalid 238 claim and differs from the prior independently observed 278-line candidate. |
| Whitespace | `git diff --check 707d254 -- "agustinturriedf/web"` plus no-index checks for both untracked files — exit 0; only LF-to-CRLF advisories. |
| Rollback boundary | Remove `features/invitations/activation.ts` and `features/invitations/activation.test.ts`; this removes only PR10a primitives and staged evidence. |

### Result

- 3.3.1 and 3.4.1 were unchecked while the harness was replaced and rechecked only after staged-state proof passed.
- Settle recommendation: do not settle. Independent SDD verification must assess this final bounded evidence correction before PR10b.

## PR10b: Activation Public Boundary

- Work unit: `pr10b-activation-ui`; delivery: chained PR slice, `feature-branch-chain`, based on `d3daa50` and targeting the immediate previous chain branch, never `main`.
- Mode: Standard. Project Strict TDD is disabled; the PR10b public-boundary tests were written and observed RED before implementation.
- Scope: only tasks 3.3.2 and 3.4.2. Password reset, directory views, dependencies, and unrelated refactors remain out of scope.

### Completed Tasks

- [x] 3.3.2 RED PR10b exchange/UI: HttpOnly cookie, clean URL, mandatory accessible modal, and public-route recovery behavior.
- [x] 3.4.2 GREEN PR10b exchange route, activation route, page, and form: consume the primitive through the public cookie/UI boundary.

### RED/GREEN Evidence

| Cycle | Exact result |
|---|---|
| RED | `npm test --workspace @agustinturriedf/web -- --run app/api/activations/route.test.ts app/(auth)/activation/activation-ui.test.ts app/(auth)/activation/exchange/route.test.ts` — exit 1; 3 files failed, including the absent exchange route and missing HttpOnly-session, clean-page, modal, and generic-recovery boundaries. |
| GREEN | `npm test --workspace @agustinturriedf/web -- --run app/api/activations/route.test.ts app/(auth)/activation/activation-ui.test.ts app/(auth)/activation/exchange/route.test.ts features/invitations/activation.test.ts` — exit 0; 4 files, 23 tests passed. |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `npm test --workspace @agustinturriedf/web -- --run app/api/activations/route.test.ts app/(auth)/activation/activation-ui.test.ts app/(auth)/activation/exchange/route.test.ts features/invitations/activation.test.ts` — exit 0; 4 files, 23 tests passed. |
| Invitation regression | `npm test --workspace @agustinturriedf/web -- --run features/invitations/activation.test.ts features/invitations/service.test.ts app/api/invitations/[invitationId]/actions.test.ts` — exit 0; 3 files, 32 tests passed. |
| Outbox regression | `npm test --workspace @agustinturriedf/web -- --run features/outbox/foundation.test.ts features/outbox/state-machine.test.ts features/outbox/worker.test.ts app/api/internal/outbox/drain/route.test.ts` — exit 0; 4 files, 17 tests passed. |
| Type command | `npm exec --workspace @agustinturriedf/web tsc -- --noEmit` — exit 0; npm emitted only its existing `Unknown cli config "--noEmit"` warning. |
| Runtime harness | Deterministic route-handler tests invoke `GET /activation/exchange?token=...` and `POST /api/activations`: a valid bearer is exchanged through `activationPrimitives.exchange()` into a 10-minute `HttpOnly`, `Secure`, `SameSite=Lax` cookie and redirects to `/activation`; the bearer is absent from Location and response headers. The form posts only passwords; POST reads only the HttpOnly cookie, clears it after success, and returns generic recovery for no session. No long-lived server, database, or credential is required. |
| Public-boundary proof | The page reads `cookies()` and contains neither `searchParams` nor `token`; the form has no hidden bearer field and sends `{ password, confirmPassword }` only. Invalid exchange redirects to `/activation?recovery=1`, which contains no bearer. |
| Review budget | Required `git diff --numstat d3daa50 -- "agustinturriedf/web"` reported 100 additions and 49 deletions for tracked files. No-index counts for the two new exchange files add 60 additions. **160 additions + 49 deletions = 209 authored changed lines**, within the 400-line cap. |
| Whitespace | Required `git diff --check d3daa50 -- "agustinturriedf/web"` — exit 0; no whitespace errors. Paired no-index checks for both new exchange files also emitted no whitespace errors. Git emitted LF-to-CRLF advisories only. |
| Rollback boundary | Revert the activation page/form, activation API route/validation, exchange route, and their three focused test files. This removes only the PR10b cookie/public UI boundary and restores the prior activation interface; PR10a primitives and all earlier invitation/outbox work remain intact. |

### Result

- Valid bearer exchange is one-time through the PR10a primitive, with a short-lived HttpOnly session cookie and a bearer-free redirect URL.
- Activation consumes only the HttpOnly session; the accessible required password dialog has no dismiss control or bypass path. Missing, expired, replayed, or revoked session/bearer flows receive generic recovery without secret disclosure.
- Parent tasks 3.3 and 3.4 remain unchecked because their completion is governed by all children. `next_recommended: sdd-apply` for task 3.5 only after the next autonomous work-unit authorization.

## PR10b Corrective Apply: Activation Recovery and Rendered Evidence

- Work unit: `pr10b-activation-ui`; delivery: chained PR slice, `feature-branch-chain`, based on `d3daa50` and targeting the immediate previous chain branch, never `main`.
- Mode: Standard. The pre-correction completion evidence failed the required public-boundary gate; tasks 3.3.2 and 3.4.2 were temporarily unchecked before the correction and are checked again only after the evidence below passed. This section preserves the failed-gate history in the preceding PR10b record.
- Scope: only tasks 3.3.2 and 3.4.2. Password reset, directory views, dependencies, and unrelated refactors remain out of scope.

### Corrected Behavior

- Invalid exchange deletes a stale `activation_session` cookie before redirecting to the generic bearer-free recovery URL.
- The recovery marker overrides a stale session cookie on the activation page; terminal activation API failures clear the cookie and retain the same generic response.
- The required dialog permanently renders every password policy rule, describes both password controls through `aria-describedby`, and reports policy/mismatch feedback through an accessible alert. It has no dismissal or bypass control.
- Source-text UI tests were replaced with rendered Testing Library interactions. The form sends only `{ password, confirmPassword }` and never renders the opaque session/bearer.

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused rendered/public command | `npm test --workspace @agustinturriedf/web -- --run app/(auth)/activation/activation-ui.test.ts app/(auth)/activation/exchange/route.test.ts app/api/activations/route.test.ts features/invitations/activation.test.ts` — exit 0; 4 files, 23 tests passed. |
| Rendered/runtime harness | Testing Library renders the dialog and submits it: permanent requirements and `aria-describedby` are observable; weak and mismatched passwords produce an alert before fetch; the successful payload is exactly `{ password, confirmPassword }`; the recovery marker hides the dialog despite a stale cookie. Deterministic exchange/API handlers prove failed exchange and terminal activation each emit `activation_session=; Max-Age=0`, then generic bearer-free recovery. No long-lived server, database, or credential is required. |
| Invitation regression | `npm test --workspace @agustinturriedf/web -- --run features/invitations/activation.test.ts features/invitations/service.test.ts app/api/invitations/[invitationId]/actions.test.ts` — exit 0; 3 files, 32 tests passed. |
| Outbox regression | `npm test --workspace @agustinturriedf/web -- --run features/outbox/foundation.test.ts features/outbox/state-machine.test.ts features/outbox/worker.test.ts app/api/internal/outbox/drain/route.test.ts` — exit 0; 4 files, 17 tests passed. |
| Type command | `npm exec --workspace @agustinturriedf/web tsc -- --noEmit` — exit 0; npm emitted only its existing `Unknown cli config "--noEmit"` warning. |
| Known baseline failure | `npm test --workspace @agustinturriedf/web -- --run lib/validation/invitations.test.ts` — exit 1; 6 passed, 1 failed because its resend fixture omits required `expectedVersion`. `git show d3daa50:agustinturriedf/web/lib/validation/invitations.test.ts` contains the same omission and the PR10b diff has no change to this file, so this is base-only and intentionally not fixed. |
| Diff / review budget | `git diff --check d3daa50 -- agustinturriedf/web` — exit 0; paired no-index checks for both exchange files — no whitespace errors. Tracked diff: 197 additions, 88 deletions. New exchange route/test: 66 additions. **263 additions + 88 deletions = 351 changed lines**, within the 400-line cap. |
| Rollback boundary | Revert the activation page/form, activation API route, exchange route, and their focused test files. This removes only PR10b public cookie/recovery/UI behavior and leaves PR10a primitives and earlier invitation/outbox work intact. |

### Result

- [x] 3.3 RED and 3.3.2 RED are complete.
- [x] 3.4 GREEN and 3.4.2 GREEN are complete.
- `next_recommended: sdd-apply` for task 3.5 after authorization.

## PR11: Password Reset Durable Public Foundation (Partial)

- Work unit: `pr11-password-reset-foundation`; delivery: chained PR slice, `feature-branch-chain`, based on `b98e726` and targeting the immediate previous chain branch, never `main`.
- Mode: Standard. Strict TDD is disabled; focused RED/GREEN evidence was recorded before and after the production change.
- Scope delivered: the existing public reset request now atomically persists a hashed reset authorization, `PASSWORD_RESET_REQUESTED` audit event, and encrypted EMAIL outbox delivery. Confirmation consumes the exact unexpired hash before updating the password and incrementing `authVersion`.
- Scope deferred: CR1 panel authorization/rate limits, the replacement-request route, the admin reset route, public throttling, and their complete AI6/CR1–CR5 matrix. Tasks 3.5 and 3.6 remain unchecked.

### RED/GREEN Evidence

| Cycle | Exact result |
|---|---|
| RED | `npm test --workspace @agustinturriedf/web -- --run features/auth/password-reset/service.test.ts` — exit 1; 1 of 8 tests failed because the legacy request created only a reset hash and logged the raw reset URL; it did not append an audit event or enqueue encrypted delivery. |
| GREEN | `npm test --workspace @agustinturriedf/web -- --run features/auth/password-reset/service.test.ts features/auth/password-reset/logger.test.ts app/api/password-reset/confirm/route.test.ts` — exit 0; 3 files, 11 tests passed. |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused password-reset/UI/validation command | `npm test --workspace @agustinturriedf/web -- --run features/auth/password-reset/service.test.ts features/auth/password-reset/logger.test.ts features/auth/password-reset/flow.integration.test.ts app/api/password-reset/request/route.test.ts app/api/password-reset/confirm/route.test.ts "app/(auth)/reset-password/_components/reset-password-runtime.test.ts" "app/(auth)/reset-password/reset-password-ui.test.ts" lib/validation/password-reset.test.ts` — exit 0; 8 files, 36 tests passed. |
| Invitation/audit/outbox regression | `npm test --workspace @agustinturriedf/web -- --run features/invitations/service.test.ts features/outbox/foundation.test.ts features/outbox/state-machine.test.ts features/outbox/worker.test.ts app/api/internal/outbox/drain/route.test.ts features/audit/repository.test.ts` — exit 0; 6 files, 43 tests passed. |
| Runtime / transaction harness | `features/auth/password-reset/flow.integration.test.ts` executes request → encrypted outbox payload recovery → confirm → replay rejection against one Prisma-compatible transaction boundary. It proves the raw bearer is available only by decrypting the queued synthetic EMAIL payload, never from logs; successful confirmation increments `authVersion` and causes the pre-update JWT to be denied. No live database, mail provider, or long-lived server was authorized. |
| Secret and enumeration evidence | `logger.test.ts` proves the only log fields are `event: password_reset_queued` and `userId`; `service.test.ts` proves audit/outbox inputs receive encrypted delivery and no raw URL logger input. Existing request-route tests retain one identical generic response for resolved and unresolved emails. |
| TypeScript | `npm exec --workspace @agustinturriedf/web tsc -- --noEmit` — exit 0; npm emitted only its existing `Unknown cli config "--noEmit"` warning. |
| Known base-only failure | Adding `lib/validation/invitations.test.ts` to the regression command yields exit 1: 49 passed, 1 failed because its resend fixture omits required `expectedVersion`. The test is unchanged in this slice and was already classified as base-only. |
| Review budget / whitespace | `git diff --numstat b98e726 -- "agustinturriedf/web"` — 144 additions, 49 deletions, **193 authored changed lines**. `git diff --check b98e726 -- "agustinturriedf/web"` — exit 0; only LF-to-CRLF advisories. |
| Rollback boundary | Revert the six changed password-reset service, repository, logger, and focused test files. This removes only durable public reset composition and exact-token confirmation CAS while leaving invitations, activation, outbox machinery, and all Phase 4 views untouched. |

### Result and Routing

- No task checkbox changed: task 3.5 requires the complete AI6/CR1–CR5 RED matrix, and task 3.6 requires the associated panel/replacement routes and rate-limit behavior.
- This slice replaces raw reset-URL logging with secret-safe queued-resource logging. It does not return, log, audit, or persist raw bearer material outside the encrypted EMAIL payload used for immediate delivery.
- `next_recommended: sdd-apply` — implement the remaining public throttle and panel/replacement authorization routes with their complete RED coverage before checking 3.5 or 3.6.

## PR11 Corrective Gate: Staged Reset Foundation

- Gate status: the preceding PR11 record was **failed evidence**, not task completion. Its transaction fixture committed mutations eagerly and its auth claim overstated `authVersion` runtime enforcement.
- Corrected autonomous scope: encrypted/hashing/audit/outbox reset issuance; exact-token confirmation; resource-aware email dispatch. CR1–CR5/AI6 panel, public throttle, replacement, and route matrices remain deferred. Tasks 3.5 and 3.6 remain unchecked.

### Corrected Evidence

| Evidence | Exact result |
|---|---|
| Staged reset runtime | `features/auth/password-reset/flow.integration.test.ts` clones reset-token, user/password, audit, and outbox state per transaction, commits only on callback resolution, and serializes concurrent callbacks. It proves audit/outbox issuance failures and user-update confirmation failure commit no partial effect; expiration at consume, exact-token replacement, replay, and one-winner concurrent confirmation are covered. |
| Focused reset + worker/adapter | `npm test --workspace @agustinturriedf/web -- --run features/auth/password-reset/service.test.ts features/auth/password-reset/logger.test.ts features/auth/password-reset/flow.integration.test.ts app/api/password-reset/request/route.test.ts app/api/password-reset/confirm/route.test.ts features/outbox/worker.test.ts features/outbox/email-adapter.test.ts` — exit 0; 7 files, 28 tests passed. |
| Dispatch and secrecy | Worker passes the durable resource type to the adapter. The adapter test executes a mocked Resend send and proves `PASSWORD_RESET` uses reset-specific Spanish subject/body, not invitation copy. The raw bearer appears only in the synthetic encrypted EMAIL payload and mocked provider boundary; logs, audit state, reset rows, and responses omit it. |
| Auth invalidation | The runtime proof is timestamp-based only: the JWT issued before `passwordUpdatedAt` is denied and a post-update JWT is accepted. `authVersion` is incremented by persistence but is not claimed as a validated runtime gate. |
| Regression / type | Invitation/audit/outbox regression — exit 0; 6 files, 43 tests passed. `npm exec --workspace @agustinturriedf/web tsc -- --noEmit` — exit 0 with only npm's existing warning. |
| Base-only fixture | `lib/validation/invitations.test.ts` — exit 1; 6 passed, 1 failed because the unchanged resend fixture omits `expectedVersion`. |
| Budget / whitespace | Tracked `git diff --numstat b98e726 -- "agustinturriedf/web"`: 263 additions, 86 deletions. New `email-adapter.test.ts`: 33 additions. **296 additions, 86 deletions, 382 changed lines**. Tracked and no-index `git diff --check` commands passed; only LF-to-CRLF advisories occurred. |
| Rollback | Revert the password-reset service/repository/logger/tests plus `features/outbox/{worker,email-adapter}.ts`, `worker.test.ts`, and `email-adapter.test.ts`. This removes only PR11 reset issuance/confirmation and resource-aware reset email behavior. |

### Result and Routing

- `status: success` for the bounded PR11 foundation only; it does not complete parent tasks 3.5 or 3.6.
- Next chained slice must add the deferred public throttling and authorized admin/replacement route matrices before task checkboxes can change.

## PR11 Expiry-Race Correction: Maintainer-Approved Size Exception

- Delivery: `exception-ok`; the maintainer explicitly approved `size:exception` for this PR11 candidate. The ordinary 400-line cap remains mandatory for later slices.
- Failed-gate correction: `confirmReset()` previously captured its timestamp before asynchronous password hashing. A token could expire while hashing and still satisfy the stale `expiresAt > passwordUpdatedAt` CAS.
- Corrected behavior: capture `consumedAt` immediately after hashing; use that exact value for both the expiry-at-consume CAS and persisted `passwordUpdatedAt`.

### Corrected Evidence

| Evidence | Exact result |
|---|---|
| RED → GREEN runtime regression | The new staged flow test held the password-hash promise, moved the fake clock past token expiry, then released hashing. Before the production correction it received `200`; after it receives generic `400`, retains the token, retains the old password, and commits no extra audit/outbox effect. `npm test --workspace @agustinturriedf/web -- --run features/auth/password-reset/flow.integration.test.ts` — exit 0; 1 file, 8 tests passed. |
| Focused reset + worker/adapter | `npm test --workspace @agustinturriedf/web -- --run features/auth/password-reset/service.test.ts features/auth/password-reset/logger.test.ts features/auth/password-reset/flow.integration.test.ts app/api/password-reset/request/route.test.ts app/api/password-reset/confirm/route.test.ts features/outbox/worker.test.ts features/outbox/email-adapter.test.ts` — exit 0; 7 files, 29 tests passed. |
| Regression / type | Invitation/audit/outbox regression — exit 0; 6 files, 43 tests passed. `npm exec --workspace @agustinturriedf/web tsc -- --noEmit` — exit 0 with only npm's existing warning. |
| Base-only fixture | `lib/validation/invitations.test.ts` — exit 1; 6 passed, 1 failed from the unchanged resend fixture omitting `expectedVersion`. |
| Final exception count | Tracked `git diff --numstat b98e726 -- "agustinturriedf/web"`: 302 additions, 88 deletions. New `email-adapter.test.ts`: 33 additions. **335 additions, 88 deletions, 423 changed lines**. The 23-line overage is the staged expiry-race harness required to prove the fix; it must not be removed or compressed. |
| Whitespace / rollback | Tracked and no-index `git diff --check` commands passed; only LF-to-CRLF advisories occurred. Revert the PR11 password-reset service/repository/logger/tests and outbox worker/email-adapter changes to remove this complete foundation without affecting deferred routes. |

### Result and Routing

- `status: success` for the maintainer-approved PR11 foundation exception. Tasks 3.5 and 3.6 remain unchecked.
- Deferred unchanged: CR1–CR5/AI6 public/admin/replacement/throttle matrices. The next chained slice must own them.

## PR12: Public Password-Reset Request Throttle (Failed Gate Record)

- Work unit: `pr12-password-reset-public-request`; delivery: chained PR slice, `feature-branch-chain`, based on `3cd48f0` and targeting the immediate previous chain branch, never `main`.
- Mode: Standard. Strict TDD is disabled; focused RED/GREEN evidence was recorded for the public route and its concurrency-safe throttle boundary.
- Failed claim: this record incorrectly described the throttle as public-IP based. The route trusted caller-provided forwarding headers without a repository-proven ingress overwrite/strip contract, so clients could rotate spoofed values. This gate record is preserved for correction history only.

### Focused RED/GREEN Evidence

| Cycle | Exact result |
|---|---|
| RED | `npm test --workspace @agustinturriedf/web -- --run features/auth/password-reset/throttle.test.ts app/api/password-reset/request/route.test.ts` — exit 1; the throttle module was unresolved, public responses were `200` instead of `202`, and throttle/internal failures produced non-generic responses. |
| GREEN | `npm test --workspace @agustinturriedf/web -- --run features/auth/password-reset/throttle.test.ts app/api/password-reset/request/route.test.ts features/auth/password-reset/flow.integration.test.ts app/api/password-reset/confirm/route.test.ts` — exit 0; 4 files, 16 tests passed. |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `npm test --workspace @agustinturriedf/web -- --run features/auth/password-reset/throttle.test.ts app/api/password-reset/request/route.test.ts features/auth/password-reset/flow.integration.test.ts app/api/password-reset/confirm/route.test.ts` — exit 0; 4 files, 16 tests passed. |
| Regression command | `npm test --workspace @agustinturriedf/web -- --run features/invitations/service.test.ts features/outbox/foundation.test.ts features/outbox/state-machine.test.ts features/outbox/worker.test.ts app/api/internal/outbox/drain/route.test.ts features/audit/repository.test.ts features/users/policy.test.ts features/users/service.test.ts features/auth/credentials.test.ts` — exit 0; 9 files, 72 tests passed. |
| TypeScript | `npm exec --workspace @agustinturriedf/web tsc -- --noEmit` — exit 0; npm emitted only its existing `Unknown cli config "--noEmit"` warning. |
| Failed runtime claim | The deterministic throttle harness proves only bucket capacity; its route coverage did not prove that forwarding headers were trustworthy. No deployment-owned ingress/header-stripping contract was found in the repository artifacts. |
| Non-enumeration and secret evidence | The route starts its minimum-duration window before throttle/service work, returns only the generic `202` response for allowed, throttled, and caught internal-error paths, and does not log or return reset material. The existing UI continues to submit only the email; no bearer is exposed by this work unit. |
| Diff / review budget | `git diff --numstat 3cd48f0 -- agustinturriedf/web` reported tracked `52` additions and `9` deletions. Executable no-index counts add `61` lines for `throttle.ts` and `47` lines for `throttle.test.ts`: **160 additions, 9 deletions, 169 authored changed lines**, within the 400-line cap. `git diff --check 3cd48f0 -- agustinturriedf/web` and paired no-index checks emitted no whitespace errors; Git emitted LF-to-CRLF advisories only. |
| Rollback boundary | Superseded by the corrective record below. |

### Result and Routing

- No checkbox changed. Tasks 3.5 and 3.6 remain unchecked because the CR1–CR5/AI6 matrix is incomplete.
- Gate result: rejected pending the correction below; no task checkbox was changed.
- Deferred next slice: authorized operator reset for CR1–CR3 and AI6 invitation replacement requests, including actor/target throttles, persisted-target authorization, atomic audit/outbox composition, and their route-level executable matrices.
- `next_recommended: sdd-apply` for the remaining authorized password-reset operator/replacement route slice; do not start Phase 4 views.

## PR12 Corrective Gate: Conservative Shared Public Bucket

- Correction scope: remove all trust in `x-forwarded-for` and `x-real-ip`. No repository artifact establishes deployment proxy ownership, header stripping/overwriting, or trusted-hop semantics, so every public reset request now consumes the same conservative shared bucket.
- This is deliberately not per-IP throttling. It prevents header rotation bypasses at the cost of shared-capacity contention; deployment-specific identity extraction requires a separately documented ingress contract.

### Corrective RED/GREEN Evidence

| Cycle | Exact result |
|---|---|
| RED | `npm test --workspace @agustinturriedf/web -- --run app/api/password-reset/request/route.test.ts` — exit 1; spoofed or missing forwarding-header requests selected caller-controlled subjects instead of the shared bucket. |
| GREEN | `npm test --workspace @agustinturriedf/web -- --run features/auth/password-reset/throttle.test.ts app/api/password-reset/request/route.test.ts features/auth/password-reset/flow.integration.test.ts app/api/password-reset/confirm/route.test.ts` — exit 0; 4 files, 17 tests passed. |

### Corrective Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Source and route proof | `POST /api/password-reset/request` passes the constant `password-reset-public-shared` to the throttle and does not read forwarding headers. The route test submits missing input, arbitrary `x-forwarded-for`, arbitrary `x-real-ip`, and both values; every request reaches the same shared subject. |
| Runtime / concurrency proof | The throttle harness concurrently consumes one synthetic bucket at capacity two and admits exactly two requests. Route tests prove spoofed headers cannot choose or rotate its subject. No live database, provider, proxy, or long-lived server was authorized. |
| Focused test command | `npm test --workspace @agustinturriedf/web -- --run features/auth/password-reset/throttle.test.ts app/api/password-reset/request/route.test.ts features/auth/password-reset/flow.integration.test.ts app/api/password-reset/confirm/route.test.ts` — exit 0; 4 files, 17 tests passed. |
| Regression command | `npm test --workspace @agustinturriedf/web -- --run features/invitations/service.test.ts features/outbox/foundation.test.ts features/outbox/state-machine.test.ts features/outbox/worker.test.ts app/api/internal/outbox/drain/route.test.ts features/audit/repository.test.ts features/users/policy.test.ts features/users/service.test.ts features/auth/credentials.test.ts` — exit 0; 9 files, 72 tests passed. |
| TypeScript and diff | `npm exec --workspace @agustinturriedf/web tsc -- --noEmit` — exit 0; npm emitted only its existing `Unknown cli config "--noEmit"` warning. Tracked and no-index `git diff --check` commands emitted no whitespace errors; Git emitted LF-to-CRLF advisories only. |
| Final count | `git diff --numstat 3cd48f0 -- agustinturriedf/web` reported tracked `71` additions and `9` deletions. Executable no-index counts add `61` lines for `throttle.ts` and `47` lines for `throttle.test.ts`: **179 additions, 9 deletions, 188 authored changed lines**, within the 400-line cap. |
| Rollback boundary | Revert `app/api/password-reset/contract.ts`, `app/api/password-reset/request/route.ts`, their aligned tests, `features/auth/password-reset/throttle.ts`, and `throttle.test.ts`. This removes only the generic-202 conservative shared-bucket boundary and leaves PR11 confirmation, invitations, audit, outbox, and Phase 4 views untouched. |

### Corrective Result and Routing

- Tasks 3.5 and 3.6 remain unchecked. CR1–CR3 and AI6 remain deferred.
- CR4 is only partially represented by this bounded slice: generic `202`, failure hiding, and concurrency-safe shared throttling are implemented; a deployment-authenticated per-client identity contract is explicitly absent.
- `next_recommended: sdd-apply` for the remaining authorized operator/reset/replacement matrix; do not start Phase 4 views.

## PR13: Authorized Panel Password-Reset Operations (Partial)

- Work unit: `pr13-reset-operations`; delivery: chained PR slice, `feature-branch-chain`, based on `ebda131`.
- Mode: Standard. Strict TDD is disabled; focused RED identified the missing protected route and operator service method, then the focused suite was green.
- Scope delivered: CR1–CR3 panel reset request for persisted targets. The protected route delegates to the reset service, which authorizes the persisted target before throttle or reset mutation, applies separate actor and target throttle scopes, then reuses the existing hashed-token, immutable-audit, encrypted-outbox foundation.
- Scope deferred: AI6 public invitation replacement and all completion-matrix checks for parent tasks 3.5 and 3.6. Neither checkbox is changed.

### Evidence

| Evidence | Exact result |
|---|---|
| RED | `npm test --workspace @agustinturriedf/web -- --run features/auth/password-reset/service.test.ts app/api/users/[userId]/password-reset/route.test.ts` — exit 1; the protected route and `requestResetForActor` did not exist. |
| Focused GREEN | `npm test --workspace @agustinturriedf/web -- --run features/auth/password-reset/service.test.ts features/auth/password-reset/throttle.test.ts app/api/users/[userId]/password-reset/route.test.ts` — exit 0; 3 files, 13 tests passed. |
| Reset regression | `npm test --workspace @agustinturriedf/web -- --run features/auth/password-reset/service.test.ts features/auth/password-reset/throttle.test.ts features/auth/password-reset/flow.integration.test.ts app/api/password-reset/request/route.test.ts app/api/password-reset/confirm/route.test.ts app/api/users/[userId]/password-reset/route.test.ts` — exit 0; 6 files, 29 tests passed. |
| Invitation/audit/outbox/auth regression | `npm test --workspace @agustinturriedf/web -- --run features/invitations/service.test.ts features/audit/repository.test.ts features/outbox/foundation.test.ts features/outbox/state-machine.test.ts features/outbox/worker.test.ts app/api/internal/outbox/drain/route.test.ts features/users/policy.test.ts features/users/service.test.ts features/auth/credentials.test.ts` — exit 0; 9 files, 72 tests passed. |
| TypeScript | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 0; no output. |
| Authorization / transaction proof | Service tests prove ADMIN may target an ADMIN and the reset mutation then queues the existing transaction-composed token, audit, and encrypted outbox work. TRAINER→TRAINER is rejected before either throttle or reset mutation. An exhausted actor bucket rejects before reset mutation. Existing flow integration coverage retains rollback of reset/audit/outbox composition. |
| Concurrency proof | The throttle harness concurrently consumes the same actor and target identities in separate persistent scopes and admits exactly the configured two requests in each scope; a third concurrent request loses the conditional count update. |
| Secret / response proof | The route accepts no password or bearer input, returns only `202 { message: "Solicitud de recuperación aceptada." }`, and route coverage submits password/token-shaped body data while asserting it is neither forwarded nor returned. The existing service/outbox foundation retains raw bearer material only in encrypted queued delivery payloads. |
| Review budget / whitespace | `git diff --numstat ebda131 -- agustinturriedf/web` reports 107 additions and 8 deletions in tracked files; no-index counts add 17 route and 36 route-test additions: **160 additions + 8 deletions = 168 changed lines**, under the 400-line cap. Tracked and no-index `git diff --check` commands passed; Git emitted LF-to-CRLF advisories only. |
| Rollback boundary | Remove `app/api/users/[userId]/password-reset/{route.ts,route.test.ts}` and revert the panel-method/throttle-scope additions plus their focused tests. This removes only protected operator reset requests; public reset, confirmation, the reset foundation, invitation behavior, audit, and outbox remain intact. |

### Result and Routing

- Parent tasks 3.5 and 3.6 remain unchecked because AI6 invitation replacement and the complete AI6/CR1–CR5 matrix have not passed.
- `next_recommended: sdd-apply` for public invitation replacement requests, including generic `202`, atomic eligible-pending replacement, and public throttle/secret-safe route tests. Do not start Phase 4 views.

## PR14: Public Invitation Replacement

- Work unit: `pr14-invitation-replacement`; delivery: chained PR slice on `feature/admin-users-pr14-invitation-replacement`, based on `994cda4`.
- Scope delivered: the public replacement request is hidden behind the existing conservative shared throttle and returns one generic `202` for eligible, unknown, throttled, failed, and malformed requests. Only a persisted `PENDING` invitation with a bearer hash is eligible; terminal and `SENT` invitations remain unchanged.

### Completion Evidence

| Evidence | Exact result |
|---|---|
| Focused replacement tests | `npm test --workspace @agustinturriedf/web -- --run features/invitations/service.test.ts app/api/invitations/replacement-requests/route.test.ts` — exit 0; 2 files, 28 tests passed. |
| Full accumulated AI6/CR1–CR5 matrix | `npm test --workspace @agustinturriedf/web -- --run features/auth/password-reset/service.test.ts features/auth/password-reset/throttle.test.ts features/auth/password-reset/flow.integration.test.ts app/api/password-reset/request/route.test.ts app/api/password-reset/confirm/route.test.ts app/api/users/[userId]/password-reset/route.test.ts features/invitations/service.test.ts app/api/invitations/replacement-requests/route.test.ts features/audit/repository.test.ts features/outbox/foundation.test.ts features/outbox/state-machine.test.ts features/outbox/worker.test.ts app/api/internal/outbox/drain/route.test.ts features/users/policy.test.ts features/users/service.test.ts features/auth/credentials.test.ts` — exit 0; 16 files, 112 tests passed. |
| TypeScript | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 0; no output. |
| Atomicity, CAS, replay, and concurrency | Replacement CAS binds email, current version, `PENDING` state, and a non-null prior token hash. The service writes rotation, immutable SYSTEM audit, and encrypted outbox in one transaction; staged audit/outbox failures leave no replacement committed. Lost CAS and concurrent requests produce no duplicate audit or delivery. |
| Secrecy and anti-enumeration | The raw bearer is generated only to form the encrypted outbox payload; it is absent from the CAS command, audit, route response, and service return. The route neither reads forwarding headers nor exposes validation, throttle, identity, or delivery errors. |
| Review budget / diff | `git diff --numstat 994cda4 -- "agustinturriedf/web"` plus no-index counts: repository +18, service +36, service test +78, route +22, route test +61; **215 additions, 0 deletions, 215 changed lines**. |
| Whitespace | `git diff --check 994cda4 -- "agustinturriedf/web"` and paired no-index checks for both new route files — exit 0; only LF-to-CRLF advisories. |
| Rollback boundary | Remove `app/api/invitations/replacement-requests/{route.ts,route.test.ts}` and revert the replacement method/test plus repository CAS method. This removes only public invitation replacement while retaining existing invitation issuance/resend, password reset, audit, and outbox behavior. |

### Result and Task Readback

- [x] 3.5 is complete after the accumulated AI6/CR1–CR5 matrix passed.
- [x] 3.6 is complete after the public route, pending-only CAS replacement, transactional audit/outbox composition, and complete regression matrix passed.
- Phase 4 remains untouched.

## PR14 Correction: Replacement Gate Remediation

- Gate history: the preceding PR14 completion claim was rejected. It used an unconstrained email lookup, a CAS that did not bind the observed invitation identity/token hash, programmed boolean race mocks, and no minimum-duration timing proof. Tasks 3.5 and 3.6 were temporarily unchecked before this correction.
- Corrected implementation: lookup uses normalized email with `PENDING` and non-null `tokenHash` predicates. The CAS now binds exact `invitationId`, `version`, `PENDING` state, and the observed `expectedTokenHash`. The public route applies the existing minimum response duration to eligible, unknown, throttled, malformed, and internal-failure paths.

### Corrected Evidence

| Evidence | Exact result |
|---|---|
| Focused replacement tests | `npm test --workspace @agustinturriedf/web -- --run features/invitations/service.test.ts app/api/invitations/replacement-requests/route.test.ts` — exit 0; 2 files, 28 tests passed. |
| Stateful atomicity proof | The invitation-service staged transaction harness serializes concurrent callbacks over cloned committed state. Two requests observe the same version/hash; exactly one CAS rotates the hash/version and commits one SYSTEM audit plus one encrypted outbox message. Audit and outbox failures reject the transaction and retain the prior hash/version with no audit/outbox state. |
| Timing proof | Fake-timer route tests advance `PASSWORD_RESET_REQUEST_MIN_DURATION_MS - 1` and assert every eligible, unknown, throttled, and internal-failure branch remains unsettled; advancing the final millisecond returns the same generic `202`. |
| Full accumulated AI6/CR1–CR5 matrix | `npm test --workspace @agustinturriedf/web -- --run features/auth/password-reset/service.test.ts features/auth/password-reset/throttle.test.ts features/auth/password-reset/flow.integration.test.ts app/api/password-reset/request/route.test.ts app/api/password-reset/confirm/route.test.ts app/api/users/[userId]/password-reset/route.test.ts features/invitations/service.test.ts app/api/invitations/replacement-requests/route.test.ts features/audit/repository.test.ts features/outbox/foundation.test.ts features/outbox/state-machine.test.ts features/outbox/worker.test.ts app/api/internal/outbox/drain/route.test.ts features/users/policy.test.ts features/users/service.test.ts features/auth/credentials.test.ts` — exit 0; 16 files, 112 tests passed. |
| TypeScript | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 0; no output. |
| Review budget | Relative to `994cda4`, tracked files are repository +24, service +37, service test +80; no-index route +30 and route test +78. **249 additions, 0 deletions, 249 changed lines**. |
| Rollback boundary | Remove `app/api/invitations/replacement-requests/{route.ts,route.test.ts}` and revert the replacement-specific service/repository/test changes. This removes only PR14 recovery behavior. |

### Corrected Result and Task Readback

- [x] 3.5 and 3.6 were rechecked only after the full AI6/CR1–CR5 matrix passed.
- Phase 4 remains untouched.

## PR16: Directory Mutations Gate History and Profile-Only Rescope

- Work unit: `pr16-directory-mutations`; delivery: chained PR slice, `feature-branch-chain`, based on `083a25f`; no UI work.
- Gate history: the initial combined UD3/UD4 candidate was rejected because trainer assignment needed independently reviewable lifecycle/deactivation coordination. Its synthetic `P2034` race proof and assignment implementation were removed from this candidate.
- Rescoped scope: PR16 delivers UD3 profile edits only. `trainerId` is not accepted by the update schema, service input, or repository mutation. PR17 owns UD4 active-trainer assignment and its real lifecycle/deactivation concurrency proof.

### Profile-Only Evidence

| Evidence | Exact result |
|---|---|
| Focused profile/directory/policy/audit matrix | `npm test --workspace @agustinturriedf/web -- features/users/directory.test.ts features/users/service.test.ts features/users/policy.test.ts features/audit/repository.test.ts` — exit 0; 4 files, 55 tests passed. |
| No assignment API | PATCH boundary and service tests submit `trainerId` and receive validation rejection before service mutation; the profile update schema/repository input contain no assignment field. |
| Atomicity proof | Directory tests stage a profile CAS, force audit failure, and assert the profile edit does not commit. A lost profile CAS produces `409 VERSION_CONFLICT` before audit side effects. |
| TypeScript baseline | `npm exec --workspace @agustinturriedf/web -- tsc -- --noEmit` — exit 2 due existing generated `.next` contracts for reset-password page `searchParams` and exported `PASSWORD_RESET_CONFIRM_SUCCESS_MESSAGE`; no PR16 file is named. |
| Diff / budget | `git diff --check 083a25f --` — exit 0. `git diff --numstat 083a25f --` — 160 additions, 84 deletions; **244 changed lines**, within the 400-line policy. |
| Rollback boundary | Revert PR16 changes in `features/users/{directory.test.ts,dto.ts,repository.ts,service.test.ts,service.ts}` and `lib/validation/users.ts`; PR15 directory reads remain intact. |

### Result, Task Readback, and PR17 Handoff

- [ ] 4.1 remains unchecked because UD4 is deferred.
- [ ] 4.2 remains unchecked because its parent scope includes UD4 assignment.
- PR17 must add active-trainer assignment and unassignment policy (if specified), coordinate atomically with trainer lifecycle/deactivation, and provide a stateful concurrency proof plus assignment rollback proof before these tasks can complete.
