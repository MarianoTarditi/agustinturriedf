# Make Student Debt Global, Immediate, and Exact

**Status:** Approved design  
**Date:** 2026-09-28  
**Scope:** Student payment configuration, current-cycle debt, activation, payment commands, and the **Pagos** dashboard

## Decision

Create one application-wide `PaymentConfig` with an initial monthly amount of **ARS 30,000 (`3_000_000` cents)**. A successful `STUDENT` account activation creates immediate outstanding debt equal to that value; issuing the invitation does not. `ADMIN` and `TRAINER` accounts never receive debt, and the existing requirement that every activated student has a trainer remains unchanged. The trainer assignment does not choose the amount.

Extend `CurrentPayment` rather than introducing a charge ledger. It stores the monthly amount snapshot, the persisted outstanding balance, and the next 30-calendar-day charge boundary. A read may derive charges that have become effective without writing. Every payment or cycle-edit command first materializes those charges atomically, then performs its mutation. Missed cycles accumulate one monthly snapshot per crossed boundary.

A payment succeeds only when its amount equals the effective outstanding debt exactly. A successful payment preserves `PaymentHistory`, sets outstanding debt to zero, and starts a new 30-day cycle from the payment date. No existing user or `CurrentPayment` receives retroactive debt during rollout.

## Goals and non-goals

### Goals

- Make the default monthly amount genuinely global and present it honestly in **Pagos**.
- Create debt at student activation, not invitation issuance.
- Make accrued debt deterministic across reads, payments, edits, retries, and concurrent requests.
- Distinguish pending debt from due-soon and overdue states.
- Preserve payment history and existing renewal semantics.
- Treat payment dates as Buenos Aires calendar dates without a one-day shift.

### Non-goals

- A charge or adjustment ledger, partial payments, credits, refunds, waivers, or dedicated debt adjustments.
- Retroactive debt for existing students or rows.
- Rewriting historical payments or changing existing `CurrentPayment` dates except for the explicitly defined zero-debt rollout boundary advance.
- Changing unrelated trainer settings or trainer-to-student ownership rules.

## Current-system constraints

The current activation transaction calls `activationPrimitives.activate`, then `userRepository.create`. Student creation reads or creates a trainer-owned `TrainerConfig`, creates `CurrentPayment` with `amountInCents`, `startDate`, and `dueDate = startDate + 30`, and commits with activation. Payment registration creates `PaymentHistory` and resets the current cycle from the payment date. Editing mutates current state without history.

The dashboard currently labels configuration as global while the API resolves it from the actor/trainer. Its cards report collected, due soon, overdue, and estimated values from the current-cycle row. There is no persisted debt balance or charge ledger.

## Data model

### Global singleton

Add a dedicated singleton rather than selecting an arbitrary trainer row:

```text
PaymentConfig
  id                           "GLOBAL" (primary key and enforced singleton key)
  defaultMonthlyAmountInCents  positive integer, initially 3_000_000
  version                      integer, initially 1
  createdAt
  updatedAt
```

All reads address `id = "GLOBAL"`; no list or create endpoint is exposed. Updates use `version` for compare-and-swap protection. `GET /api/payments/config` remains available to `ADMIN` and `TRAINER`; `PATCH` is restricted to `ADMIN` because a write changes future debt application-wide. In **Pagos**, trainers see the value read-only and admins see the edit control.

### Current cycle

Extend `CurrentPayment` as follows:

```text
amountInCents               positive integer; snapshot used by future boundaries
outstandingAmountInCents    non-negative integer; materialized base balance, default 0
startDate                   Buenos Aires calendar-date anchor for the current cycle
dueDate                     next charge boundary, exactly 30 calendar days after the anchor
overdueSinceDate            nullable Buenos Aires date; first unpaid boundary crossed
version                     integer, initially 1, used by compare-and-swap
```

`amountInCents` is not the debt balance. It is the monthly snapshot applied at each future boundary until explicitly edited. A successful payment resets the cycle dates but keeps this snapshot. `outstandingAmountInCents` is the base balance already materialized before the persisted `dueDate`; `dueDate` is always the next unmaterialized boundary. `overdueSinceDate` keeps overdue meaning stable after that boundary advances; without it, materializing a cycle would incorrectly make an unpaid row look current.

`PaymentHistory` remains append-only for successful payments. No history row is created by activation, boundary accrual, configuration updates, or cycle edits.

`TrainerConfig.defaultMonthlyAmountInCents` is deprecated for payments but retained in the first release so unrelated trainer configuration and old deployments are not broken. New payment code neither reads nor writes it. Its relation and column can be removed only in a later, separately verified migration after confirming no non-payment consumer remains.

## Calendar-date rules

All payment-cycle dates are business dates in `America/Argentina/Buenos_Aires`, represented at API/UI boundaries as `YYYY-MM-DD`. A date key is parsed directly to Buenos Aires local midnight (currently `03:00:00Z`) and is never first converted to UTC midnight and then normalized back to Buenos Aires.

This fixes the confirmed `initialPaymentStartDate` defect: a submitted date such as `2026-05-01` must remain May 1 in Buenos Aires throughout invitation storage, activation, `CurrentPayment.startDate`, and rendering. Thirty-day arithmetic increments the canonical date key by calendar days; it does not add a browser-local duration or use calendar months. `calendarDaysBetween` is the difference between proleptic-Gregorian date ordinals derived from the two date keys, not elapsed milliseconds between JavaScript `Date` values.

Pending or sent legacy invitations whose date was stored as UTC midnight are normalized during rollout by preserving their stored UTC `YYYY-MM-DD` key and re-encoding that key as Buenos Aires midnight. Consumed invitations and existing current-payment/history dates are not rewritten automatically.

## Activation flow

Within the existing activation database transaction:

1. Validate and consume the activation session and invitation as today.
2. Create the user and student profile.
3. For `STUDENT`, require the existing trainer assignment invariant.
4. Read the locked/global `PaymentConfig` singleton.
5. Parse `initialPaymentStartDate` as a Buenos Aires date key. If it is absent, use the activation date in Buenos Aires.
6. Create one `CurrentPayment` with:
   - `amountInCents = PaymentConfig.defaultMonthlyAmountInCents`;
   - `outstandingAmountInCents = amountInCents`;
   - `startDate = initialPaymentStartDate`;
   - `dueDate = startDate + 30 calendar days`;
   - `overdueSinceDate = null`;
   - `version = 1`.
7. Append the activation and debt-created audit events and commit together.

Failure to read configuration or create the debt rolls back the entire activation. Invitation creation has no payment side effect. The generic user repository must not hide a trainer-config lookup; activation invokes debt initialization explicitly. Non-activation account creation does not gain new debt implicitly.

Activation persists exactly one initial charge. If an operator intentionally selected a historical `initialPaymentStartDate`, boundaries already crossed between that date and activation are then effective under the standard algorithm; the date is not silently clamped to activation day. The UI should make the selected start date visible before invitation issuance.

## Effective outstanding algorithm

For a persisted row and an evaluation date `D`, all at Buenos Aires day precision:

```text
if D < dueDate:
  elapsedCycles = 0
else:
  elapsedCycles = 1 + floor(calendarDaysBetween(dueDate, D) / 30)

effectiveOutstanding = outstandingAmountInCents
                     + elapsedCycles * amountInCents
effectiveDueDate = dueDate + elapsedCycles * 30 calendar days
if overdueSinceDate is present:
  effectiveOverdueSince = overdueSinceDate
else if elapsedCycles > 0 and outstandingAmountInCents > 0:
  effectiveOverdueSince = dueDate
else if elapsedCycles > 1:
  effectiveOverdueSince = dueDate + 30 calendar days
else:
  effectiveOverdueSince = null
```

Use checked integer arithmetic and reject overflow rather than truncating. Examples:

| Persisted state | Evaluation date | Effective result |
| --- | --- | --- |
| Outstanding 30,000; boundary May 31 | May 30 | 30,000; boundary May 31 |
| Outstanding 30,000; boundary May 31 | May 31 | 60,000; boundary June 30 |
| Outstanding 30,000; boundary May 31 | July 1 | 90,000; boundary July 30 |
| Outstanding 0; boundary May 31 | May 31 | 30,000; boundary June 30; not overdue |
| Outstanding 0; boundary May 31 | June 30 | 60,000; boundary July 30; overdue since June 30 |

The dashboard applies this function in memory and performs no write. A payment or edit command applies the same function under transaction protection and persists `effectiveOutstanding`, `effectiveDueDate`, and `effectiveOverdueSince` before its command-specific mutation. This keeps ordinary reads side-effect free while ensuring commands never act on stale debt.

## Transaction and concurrency semantics

Payment and edit commands execute in one PostgreSQL transaction. They lock the target `CurrentPayment` row with `SELECT ... FOR UPDATE` (or an equivalent atomic compare-and-swap using `version`), re-read it, materialize elapsed cycles once, apply the command, increment `version`, append related history/audit records, and commit.

The server never trusts a dashboard amount as the debt authority. Dashboard rows expose `currentPaymentVersion`; payment and edit commands must echo it as `expectedCurrentPaymentVersion`. The version is only a stale-write precondition: after locking the row, the server still recomputes debt from persisted state and the command evaluation date.

If the locked row version differs from the expected version, the command does not retry the mutation and returns HTTP `409`, code `PAYMENT_CONFLICT`, and message `El estado del pago cambió. Actualice la vista e inténtelo nuevamente.` No history or audit-success event is written. Two concurrent payments opened from the same row version therefore have one winner: the first commits zero and one history row; the loser observes a stale version and returns `PAYMENT_CONFLICT`. Internal transaction failures that are safe to retry may be retried as a whole, but retries never bypass the expected-version check.

## Payment command

The normalized `paymentDate` is the command evaluation date and remains the renewal anchor, preserving current behavior. The UI defaults it to today. A backdated payment can therefore be followed immediately by newly effective cycles when viewed on a later date; it must not erase cycles that are effective as of the supplied payment date.

After locked materialization:

- If effective outstanding is zero and the request version is current, reject with HTTP `409`, code `NO_OUTSTANDING_DEBT`, and message `No hay deuda pendiente para pagar.`
- If the submitted amount differs in either direction, reject with HTTP `409`, code `PAYMENT_AMOUNT_MISMATCH`, and message `El monto debe ser exactamente igual a la deuda pendiente.` Safe error details may include `expectedAmountInCents` and `receivedAmountInCents` for UI recovery.
- Invalid, non-integer, or non-positive cents remain HTTP `400 VALIDATION_ERROR`.
- A missing or unauthorized student cycle remains the existing `404 NOT_FOUND` behavior so trainer ownership is not disclosed.

On exact equality, append `PaymentHistory` with the paid effective amount and normalized payment date, then persist:

```text
outstandingAmountInCents = 0
startDate = paymentDate
dueDate = paymentDate + 30 calendar days
overdueSinceDate = null
```

Keep `amountInCents` unchanged: it remains the next-cycle snapshot. The next charge appears only when the new `dueDate` begins. The registration modal displays the server-provided effective debt and submits it as a read-only amount; on a mismatch response it refreshes the row instead of offering a lower or higher payment.

## Cycle edit command

An edit first materializes elapsed cycles using the old snapshot. It may then change `amountInCents` for future boundaries only; it never changes `outstandingAmountInCents`. This prevents an ordinary edit from silently forgiving or creating debt. Debt corrections require a dedicated adjustment capability, which is out of scope.

The existing date edit remains an explicit schedule change: after materialization, a submitted `startDate` sets `dueDate = startDate + 30 calendar days`. The resulting `dueDate` must be strictly later than the command's Buenos Aires evaluation date; otherwise reject HTTP `400`, code `INVALID_NEXT_CHARGE_DATE`, with message `La próxima fecha de cobro debe ser futura.` Changing the schedule does not clear `overdueSinceDate` or outstanding debt. The request includes `expectedCurrentPaymentVersion` and uses the same stale-conflict behavior as payment registration.

The edit UI is renamed from editing the current payment to **Editar próximo ciclo**. It labels the amount **Monto mensual desde el próximo ciclo**, shows **Deuda pendiente** as read-only, and warns that amount/date changes do not alter existing debt. Successful edits create no `PaymentHistory` row but do append an audit event.

## Dashboard and API contract

Each row exposes distinct concepts:

- `monthlyAmountInCents`: the persisted snapshot for future charges;
- `outstandingAmountInCents`: effective outstanding as of the dashboard evaluation date;
- `nextChargeDate`: the derived effective boundary;
- `overdueSinceDate`: effective overdue origin, if any;
- `paymentStatus`: `CURRENT`, `DUE_SOON`, or `OVERDUE` from schedule/overdue state, never inferred from debt amount alone.
- `currentPaymentVersion`: persisted command precondition; it does not replace server-side debt calculation.

The table shows **Deuda pendiente** and **Próximo cobro** separately. A newly activated student has pending debt but is not overdue. A zero-debt student remains visible and shows ARS 0 until the next boundary creates a charge.

Use these exact card formulas over the filtered student set, all evaluated at one server-supplied Buenos Aires date:

| Card | Formula |
| --- | --- |
| **Pagos cobrados** | Existing rolling 30-day `PaymentHistory` count and sum. |
| **Deuda pendiente** | Count rows with effective outstanding `> 0`; sum their effective outstanding. |
| **Vence pronto** | Count rows whose derived next charge date is from today through today + 3 days inclusive. Debt amount does not affect this count. |
| **Vencidos** | Count rows with effective outstanding `> 0` and non-null `overdueSinceDate`; sum only those rows' effective outstanding. |
| **Total estimado** | Sum `monthlyAmountInCents` once for each row whose derived next charge date is from today through today + 29 days inclusive; show the matching student count. It excludes current outstanding debt and historical collections. |

`paymentStatus` is `OVERDUE` when effective outstanding is positive and `overdueSinceDate` is non-null; otherwise it is `DUE_SOON` when `nextChargeDate` is today through today + 3 days inclusive, and `CURRENT` otherwise. Filters are applied after effective values are derived: `DUE_TODAY` means `nextChargeDate = today`, `DUE_THIS_WEEK` means today through today + 7 days inclusive, and `OVERDUE` uses the exact overdue predicate above. Search and role scoping are applied before card aggregation, so every card describes the rows the actor is allowed to see and the active text search; the status-view filter limits rows but does not change the card totals.

The collected formula uses `PaymentHistory.paymentDate` from today - 29 days through the end of today, inclusive, for the same authorized/search-matched student set. The response returns the global config without a `trainerId`, eliminating the misleading trainer-scoped contract.

### Row lifecycle examples

| Moment | Debt shown | Next charge | Status and amount meaning |
| --- | ---: | --- | --- |
| Student activates | ARS 30,000 | Start + 30 days | `CURRENT`, unless the next charge is within 3 days; the amount is immediate debt, not an overdue charge. |
| Exact payment succeeds | ARS 0 | Payment date + 30 days | `CURRENT`; history shows the settled amount and the row monthly snapshot remains unchanged. |
| First boundary after a zero balance | One monthly snapshot | Boundary + 30 days | `CURRENT`; the newly effective charge is not overdue on the day it appears. |
| Boundary passes while earlier debt remains | Prior debt plus one monthly snapshot | Boundary + 30 days | `OVERDUE`; `overdueSinceDate` is the boundary on which the earlier unpaid debt first became overdue. |
| Multiple boundaries are missed | Base debt plus one snapshot per crossed boundary | First un-crossed 30-day boundary | `OVERDUE`; the row and **Deuda pendiente** show the full effective amount, while **Vencidos** includes it once rather than counting cycles as students. |

### API and authorization contract

| Operation | Roles | Scope and concurrency |
| --- | --- | --- |
| Dashboard `GET /api/payments` | `ADMIN`, `TRAINER` | Trainers see assigned students only. Admins may see all students. Student rows outside a trainer's ownership are never returned. |
| Config `GET /api/payments/config` | `ADMIN`, `TRAINER` | Returns `{ defaultMonthlyAmountInCents, version }` for `GLOBAL`; trainers receive a read-only value. |
| Config `PATCH /api/payments/config` | `ADMIN` | Requires positive integer cents and `expectedVersion`; stale writes return `409 PAYMENT_CONFIG_CONFLICT` with `La configuración de pagos cambió. Actualice la vista e inténtelo nuevamente.` |
| Register exact payment | `ADMIN`, `TRAINER` | Admins may operate on any student; trainers only on assigned students. Requires `expectedCurrentPaymentVersion`. |
| Edit next cycle | `ADMIN`, `TRAINER` | Uses the same student scope and version precondition as registration. |

Unauthenticated requests remain `401`; authenticated but disallowed roles receive `403`. Missing students and students outside a trainer's scope both return `404 NOT_FOUND` to avoid disclosing ownership. Validation failures are `400 VALIDATION_ERROR`. The config update never changes existing `CurrentPayment.amountInCents` or outstanding balances: it becomes the activation snapshot only for students activated after the update. `STUDENT` activation is the only role that creates payment state; `ADMIN` and `TRAINER` activation never create `CurrentPayment`.

## Audit events

Use the existing audit repository/factory and commit events in the same transaction as their mutations:

| Event | Actor | Safe summary |
| --- | --- | --- |
| `STUDENT_DEBT_INITIALIZED` | activated subject/system transaction | `changedFields`, `resourceType`, opaque `resourceRef` |
| `PAYMENT_CONFIG_UPDATED` | admin user | `changedFields`, `resourceType`, opaque `resourceRef` |
| `PAYMENT_RECORDED` | admin/trainer user | `changedFields`, `resourceType`, opaque `resourceRef` |
| `PAYMENT_CYCLES_MATERIALIZED` | user performing payment/edit | number of cycles encoded as a bounded non-sensitive string plus resource reference |
| `PAYMENT_CYCLE_UPDATED` | admin/trainer user | `changedFields`, `resourceType`, opaque `resourceRef` |

Extend the audit summary allowlist only for the bounded cycle-count field if needed. Do not log names, email, phone, credentials, tokens, payment instruments, request bodies, or other personal/financial secrets. The amount and payment date remain available from authorized domain records rather than being duplicated into general audit summaries.

## Migration and rollout

Roll out in compatibility order:

1. Add `PaymentConfig`, seed/upsert only `id = "GLOBAL"` with `3_000_000`, and add nullable/default-compatible current-payment fields. Backfill every existing `CurrentPayment.outstandingAmountInCents` to `0`, `version` to `1`, and `overdueSinceDate` to `null`. For each existing row whose `dueDate` is not strictly after the rollout's Buenos Aires date, advance `dueDate` by the minimum whole number of 30-day periods needed to make it future, without adding debt; leave a future `dueDate` unchanged. This preserves cycle phase while explicitly discarding pre-rollout missed cycles. Do not derive debt from existing dates.
2. Normalize only pending/sent legacy invitation start dates as described above. Record affected-row counts, not row contents.
3. Deploy code that reads the singleton, initializes activation debt, derives effective values, and uses locked commands. During this release, retain the trainer column and old response compatibility only where required for a rolling deployment.
4. Switch **Pagos** to the global contract and distinct debt/schedule fields.
5. After compatibility is confirmed, make required fields non-null and stop exposing trainer-scoped payment configuration. Retain the deprecated `TrainerConfig` column until a separate removal proves it has no remaining consumers.

The data migration is idempotent: singleton creation is an upsert, and the balance/boundary backfill updates only rows whose newly added outstanding field is still null, so a rerun does not advance them again. Database constraints enforce non-negative outstanding cents, positive monthly/config cents, valid versions, and the singleton key `id = "GLOBAL"`; foreign keys and all existing payment history remain intact.

A rollback restores the previous application while leaving additive tables/columns in place. Pause config writes during rollback because the old application reads retained trainer defaults rather than the global value. Do not copy the global value into trainer rows, delete the singleton, drop new columns, delete activation-created debt, or delete payment history. If activations using the new debt semantics have occurred, reverting schema is unsafe until those rows are reconciled; prefer application rollback with additive schema retained. Forward recovery redeploys the new application against the retained data.

## Planned change surface

This document implements none of these changes.

| Area | Planned responsibility |
| --- | --- |
| Prisma schema/migrations | Add singleton, balance/concurrency/overdue fields, safe backfills, and pending-invitation date repair. |
| Payment repository/service | Global config, shared effective-debt calculation, locked materialization, exact payment validation, future-only edit semantics, and audit writes. |
| Invitation activation/user creation | Explicitly initialize student debt inside activation and remove trainer-config coupling. |
| Date parsing | Preserve `YYYY-MM-DD` as a Buenos Aires calendar date end to end. |
| Payment API/validation | Global config authorization, stable error codes, and distinct monthly/debt/schedule fields. |
| **Pagos** UI/runtime | Five card formulas, clear row fields, exact read-only payment amount, admin-only config editing, and next-cycle edit copy. |
| Focused tests | Activation, calculation, commands, concurrency, migration, dashboard, authorization, and timezone coverage. |

## Verification plan

Focused automated coverage must prove:

- invitation issuance creates no debt; successful `STUDENT` activation creates one immediate debt row atomically, while a forced debt/configuration failure rolls back invitation consumption, user/profile creation, audit, and outbox work;
- `ADMIN` and `TRAINER` activation creates no payment row, and a student without a trainer cannot activate;
- changing global configuration affects activation snapshots created after the change only, not existing balances, monthly snapshots, or history;
- changing global configuration does not mutate any existing `CurrentPayment.amountInCents`; a separate next-cycle edit is required for an existing student;
- zero, one, and multiple crossed boundaries produce the stated effective balance and next boundary, including exact-boundary evaluation;
- dashboard reads perform no writes and repeated reads return the same result for the same evaluation date;
- lower and higher payment amounts fail with `PAYMENT_AMOUNT_MISMATCH`; exact payment succeeds, creates one history row, clears debt, and schedules the next charge in 30 days;
- paying zero debt fails with `NO_OUTSTANDING_DEBT` and creates no history;
- two concurrent exact-payment attempts from the same version yield one success, one `PAYMENT_CONFLICT`, one history row, and a zero balance;
- edit materializes old-snapshot cycles before changing the future snapshot, preserves outstanding debt/history, and rejects a non-future boundary;
- a submitted `2026-05-01` remains May 1 in Buenos Aires through invitation, activation, persistence, API, and UI, including process environments with a different local timezone;
- migration seeds one singleton, backfills existing balances to zero, advances stale boundaries without charging skipped cycles, preserves all payment history, and is safe to rerun;
- dashboard row states, five card formulas, filters, and global-config permissions match this document.
- admin/trainer/student authorization and trainer ownership hiding match the API matrix.

## Acceptance criteria

- [ ] Exactly one global payment configuration exists at `3_000_000` cents after migration.
- [ ] New student debt is created only on successful activation and is independent of trainer configuration.
- [ ] Existing users and current-payment rows receive zero migration debt.
- [ ] Effective outstanding debt accumulates one snapshot per crossed 30-day boundary without read-side writes.
- [ ] Commands materialize debt atomically and concurrent payments cannot both settle it.
- [ ] Only an exact full payment is accepted; success preserves history, clears debt, and starts a new 30-day cycle.
- [ ] Cycle edits affect future charges/scheduling without silently changing debt.
- [ ] Pending debt, due soon, overdue, and estimated totals have distinct, testable formulas.
- [ ] `initialPaymentStartDate` preserves its Buenos Aires calendar day.
- [ ] Global configuration is visible in **Pagos**, editable only by admins, and no longer represented as trainer-scoped.
- [ ] Changing global configuration never mutates an existing student's monthly snapshot or debt.
- [ ] Audit events are transactional and contain no personal data, credentials, tokens, payment instruments, or raw request payloads.
- [ ] Rollout and rollback preserve all schemas and financial records; no migration or rollback path deletes payment data.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Read and write paths calculate different debt | One pure calculation shared by dashboard and locked commands, with boundary examples as contract tests. |
| Double settlement | Row lock/CAS, in-transaction re-evaluation, and one history append in the winning transaction. |
| Integer overflow after many missed cycles | Checked cents arithmetic and explicit failure before persistence. |
| Overdue state disappears when the boundary advances | Persist the first unpaid boundary in `overdueSinceDate`. |
| Global changes have broader impact than current trainer settings | Dedicated singleton, admin-only writes, optimistic versioning, and audit. |
| Date correction rewrites financial history | Repair only unconsumed invitations; leave existing payment rows/history untouched. |
| Rollback loses newly recorded state | Use additive schema and application rollback; never delete singleton, balance, or history data during rollback. |

## Design self-review

- No unresolved placeholders or implementation claims remain.
- `amountInCents`, outstanding debt, next boundary, and overdue state have one meaning each.
- Exact-boundary, multiple-cycle, zero-debt, edit, concurrency, migration, and timezone behavior are testable.
- Configuration authorization and legacy `TrainerConfig` handling are explicit.
- Version preconditions make the concurrent-payment loser and stale config/edit behavior deterministic.
- Adjustments, partial payments, ledger accounting, and historical rewrites are explicitly out of scope.
