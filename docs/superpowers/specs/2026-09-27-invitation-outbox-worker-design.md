# Deliver Invitation Email Automatically in Local Development

**Status:** Approved design  
**Date:** 2026-09-27  
**Scope:** Local outbox runtime, invitation delivery validation, and delivery-state projection in `agustinturriedf/web`

## Decision and outcome

Add a separate, long-running development process that drains the existing transactional outbox on a short polling interval. Root `npm run dev` will start this process beside `landing` and `web`. Production will continue to use the protected one-shot drain endpoint under an external scheduler.

Invitation requests will still commit the `Invitation`, `AuditEvent`, and encrypted `OutboxMessage` atomically and return without waiting for Resend. Before an invitation email is sent, the worker will revalidate the current invitation. After Resend accepts it, the worker will mark the outbox message `COMPLETED` and project `Invitation.deliveryStatus = SENT` in one database transaction.

This preserves the transactional-outbox boundary while removing the local runtime gap. It does not add a lifecycle state, feature flag, queue, or second source of truth.

> **Current operational state:** the current newly created invitation remains queued. It will not drain automatically until this design is implemented; until then, delivery requires an authorized manual call to the drain endpoint.

## Problem and evidence

Invitation creation is behaving as designed at the request boundary: it stores the invitation, audit event, and encrypted email job in one transaction and does not call Resend synchronously. The delivery runtime is incomplete locally.

| Evidence | Consequence |
| --- | --- |
| Root `npm run dev` starts only `landing` and `web`. | No local process claims outbox work. |
| Each new invitation leaves a `PENDING` outbox message with `attempts = 0`. | Delivery remains queued indefinitely without operator action. |
| The protected drain endpoint successfully moved a job to `COMPLETED` and Resend delivered the email. | Provider configuration, encryption configuration, migrations, and the core worker path are operational. |
| Three stale `PENDING` jobs referenced a revoked invitation. | Blindly enabling polling could send links that are no longer valid. |
| The worker checks encrypted payload expiry but not current invitation state. | Revocation, consumption, token rotation, or deletion after enqueue is not enforced at send time. |
| A completed email job left `Invitation.deliveryStatus = PENDING`. | Outbox truth and the invitation projection diverge. |

The configured local environment already provides `RESEND_API_KEY`, `EMAIL_FROM`, `OUTBOX_DRAIN_SECRET`, `OUTBOX_ENCRYPTION_KEY`, and `OUTBOX_ENCRYPTION_KEY_ID`. Local migrations are current, and Prisma Client includes the outbox state-machine fields. Secret values are not part of this design or its diagnostics.

## Goals

- Drain eligible outbox jobs automatically while root local development is running.
- Keep invitation creation independent of email-provider latency and failure.
- Prevent revoked, consumed, expired, missing, tokenless, or superseded invitations from being sent.
- Keep invitation delivery status consistent with applied outbox settlement.
- Preserve existing retry, exponential backoff, leasing, fencing, idempotency, encrypted payload, audit, and payload-purge behavior.
- Stop the development worker without abandoning an in-flight drain or starting another cycle.
- Keep the protected production drain endpoint as the scheduler integration boundary.

## Non-goals

- Sending email inside the invitation HTTP request.
- Replacing the transactional outbox, Resend adapter, or production scheduler contract.
- Adding an invitation lifecycle state, delivery flag, queue table, or duplicate delivery authority.
- Changing invitation creation, resend, activation, or revoke API contracts.
- Building queue administration UI, metrics infrastructure, or a general-purpose daemon framework.
- Changing unrelated outbox work such as routine provisioning except where shared settlement behavior must remain compatible.

## Chosen approach and rejected alternatives

| Approach | Decision | Reason |
| --- | --- | --- |
| Separate local polling worker plus the existing production drain endpoint | **Chosen** | It gives development a durable runtime companion without coupling request latency to external delivery. The same claim and settlement logic serves both entry points. |
| Fire-and-forget drain after the invitation response | Rejected | Request and serverless runtimes may freeze or terminate after responding. Work would be nondeterministic and shutdown would be unmanageable. |
| Direct synchronous Resend call during `POST` | Rejected | It breaks transactional-outbox isolation, makes user requests depend on provider latency and availability, and creates ambiguous database/provider partial failures. |

## Architecture and process topology

```text
root npm run dev
├── landing development server
├── web development server
└── local outbox worker
    └── immediate drain → wait → drain → ... → graceful stop

production scheduler
└── POST /api/internal/outbox/drain
    └── one bounded drain using the same OutboxWorker
```

The local process invokes `OutboxWorker` directly; it does not call the HTTP endpoint or require a loopback request. The protected endpoint remains the production/manual boundary and continues to require `OUTBOX_DRAIN_SECRET`.

The root script will use the existing process supervisor to add a named `outbox` companion. The web workspace script will explicitly load the web `.env.local` before constructing the worker, using the repository's required Node version and existing `tsx` tooling. No new runtime dependency is required.

The local loop has one drain in flight at a time:

1. Validate required worker configuration before entering the loop.
2. Drain immediately so jobs created before startup do not wait for the first interval.
3. After the drain resolves, wait for the fixed two-second development polling interval.
4. Repeat without overlapping drain calls.
5. On `SIGINT` or `SIGTERM`, cancel the wait, prevent another cycle, await the active drain, disconnect Prisma, and exit.

A loop-level infrastructure error is logged with a safe category and retried on the next interval. It must not terminate `landing` or `web`, emit decrypted payload data, or create a parallel drain.

## Data flow and state transitions

### Happy path

1. Invitation creation commits `Invitation`, `AuditEvent`, and encrypted `OutboxMessage` together.
2. The HTTP response reports delivery as pending without waiting for Resend.
3. The local process or production endpoint asks `OutboxWorker` to drain.
4. The repository claims one available message, increments `attempts`, assigns a lease and fencing token, and changes it to `PROCESSING`.
5. The worker decrypts only the claimed payload.
6. For invitation email work, the worker loads and revalidates the referenced invitation.
7. The worker calls Resend with the existing stable idempotency key.
8. After provider acceptance, one database transaction applies fenced outbox completion, purges the encrypted payload, sets `Invitation.deliveryStatus = SENT`, and appends the safe system audit event.
9. The drain continues until no currently available job can be claimed.

### State transition table

| Condition after claim | Outbox transition | Invitation projection | Provider call |
| --- | --- | --- | --- |
| Active invitation; Resend accepts | `PROCESSING → COMPLETED` | `deliveryStatus → SENT` in the completion transaction | Yes |
| Active invitation; transient provider failure | `PROCESSING → PENDING` with existing backoff | Remains `PENDING` | Attempted |
| Active invitation; permanent provider/configuration failure or attempts exhausted | `PROCESSING → FAILED` | `deliveryStatus → FAILED` in the terminal settlement transaction | Attempted when configuration permits |
| Invitation is ineligible or missing | `PROCESSING → FAILED`, encrypted payload purged | Unchanged | No |
| Fencing token is stale | No settlement, projection, or audit write | Unchanged | A prior call may have occurred; stable provider idempotency contains duplication |

`Invitation.status` and `Invitation.deliveryStatus` remain separate. This fix updates delivery projection only; it does not introduce or reinterpret lifecycle states.

## Lifecycle revalidation and stale-job policy

Revalidation applies only when `messageType = EMAIL` and `resourceType = INVITATION`. Other email resource types retain their existing policies.

An invitation email is eligible only when all of the following are true immediately before the provider call:

- The invitation identified by `OutboxMessage.resourceId` exists.
- Its persisted lifecycle status is `PENDING` or `SENT`.
- Its persisted `tokenHash` is non-null.
- Its persisted `expiresAt` is later than the worker's current time.
- The encrypted payload expiry is valid and later than the same current time.
- The invitation token carried transiently in the decrypted activation URL hashes to the persisted `tokenHash`.

The token-hash comparison suppresses an older queued issuance after resend or replacement rotates the token. It uses the existing `Invitation.tokenHash` as the authority and adds no persisted token copy. Raw tokens and activation URLs remain confined to the encrypted payload and worker memory.

Missing, revoked, consumed, expired, tokenless, and token-mismatched invitations are permanent stale-work outcomes. The worker must not call Resend. It settles the outbox message terminally under the current fencing token, purges `payloadEncrypted`, and records only an allowlisted failure category and generic summary. It does not change invitation lifecycle or delivery status because suppression is not a transport failure.

This policy also handles the three observed jobs for the revoked invitation safely if equivalent stale work exists when automatic polling first starts.

## Delivery-status projection

The outbox record is the durable work state; `Invitation.deliveryStatus` is the domain-facing projection of the current issuance.

- Provider acceptance projects `SENT`.
- A retryable failure leaves the projection `PENDING` because delivery may still succeed.
- A permanent or exhausted transport failure projects `FAILED` only when the job still corresponds to the current, active invitation token.
- Lifecycle suppression leaves the projection unchanged.

Projection and outbox settlement occur inside the existing worker settlement transaction. The outbox fencing compare-and-set runs first. A stale fence returns without changing the invitation or writing an audit event. An invitation projection failure rolls back the outbox settlement so the lease can be recovered and the stable provider idempotency key can make a later attempt safe.

No database transaction remains open while waiting for Resend. If the provider accepts a message but database settlement fails, the job is recoverable after lease expiry. Reusing the same provider idempotency key avoids creating a second provider delivery while database state converges.

## Failure handling, retries, idempotency, and security

### Reliability

- Keep the existing bounded attempts and exponential backoff for transient failures.
- Keep lease recovery for a process that exits while a job is `PROCESSING`.
- Keep fencing on every settlement and projection transaction.
- Run drains serially within one local process; multiple processes remain safe because claims and settlements are fenced.
- Treat lifecycle ineligibility as terminal rather than retryable.
- Keep the current idempotency key unchanged across retries and lease recovery.

### Sensitive data

- Decrypt only after a successful claim.
- Never log recipients, raw tokens, activation URLs, encrypted payloads, encryption keys, or authorization secrets.
- Purge invitation email payloads after completion, lifecycle suppression, or terminal failure.
- Limit audit and failure records to resource identifiers, delivery outcomes, and allowlisted safe categories.
- Continue constant-time validation of `OUTBOX_DRAIN_SECRET` at the HTTP boundary.

### Shutdown

The development process handles `SIGINT` and `SIGTERM` once, stops scheduling, and waits for the active drain. It does not force a second settlement or release a lease early. If the process is killed without cleanup, the existing lease-expiry path recovers the job.

## Development and production operation

### Development

- Root `npm run dev` starts `landing`, `web`, and the local outbox worker.
- The worker loads the same web `.env.local` used by the application and validates Resend and outbox encryption configuration before polling.
- The first drain runs immediately; subsequent drains use a fixed two-second interval for local feedback.
- Developers may still call the protected endpoint for explicit diagnostics, but normal invitation delivery no longer depends on that action.

### Production

- Production does not start the development polling process.
- An external scheduler invokes `POST /api/internal/outbox/drain` with `OUTBOX_DRAIN_SECRET`.
- The endpoint remains a one-shot operation and uses the same worker validation and settlement path.
- Invitation routes never invoke Resend or trigger a drain in request scope.

## File-level change map

Every item below is a planned implementation change, not a file created or modified by this design-only task.

| Planned file | Planned change |
| --- | --- |
| `package.json` | **Planned modification:** add the named outbox process to root `npm run dev` while preserving the existing landing and web commands. |
| `agustinturriedf/web/package.json` | **Planned modification:** add a development-worker script that explicitly loads web `.env.local` and runs through existing Node/`tsx` tooling. |
| `agustinturriedf/web/scripts/run-outbox-worker.ts` | **Planned new file:** own immediate polling, non-overlap, safe loop-level error handling, signal handling, and Prisma shutdown. |
| `agustinturriedf/web/features/outbox/worker.ts` | **Planned modification:** revalidate invitation jobs before send and coordinate delivery projection with fenced settlement. |
| `agustinturriedf/web/features/outbox/repository.ts` | **Planned modification:** preserve claim/backoff/fencing behavior and expose the transactional settlement support needed for projection and terminal suppression. |
| `agustinturriedf/web/features/invitations/repository.ts` | **Planned modification:** add transaction-aware eligibility lookup and conditional delivery-status projection using existing invitation fields. |
| `agustinturriedf/web/features/outbox/worker.test.ts` | **Planned modification:** cover active delivery, stale invitation suppression, retry behavior, fencing, payload purge, and projection atomicity. |
| `agustinturriedf/web/scripts/run-outbox-worker.test.ts` | **Planned new file:** cover immediate/periodic drain behavior, non-overlap, loop recovery, and graceful stop. |

No Prisma schema, migration, invitation route, or production drain-route change is planned. Existing fields and endpoint contracts are sufficient.

## Test strategy

Tests use injected clocks, repositories, provider adapters, and shutdown signals. They must not call Resend, use real secrets, or rely on wall-clock sleeps.

### Worker scenarios

1. **`delivers an active invitation and settles both records`** — a current `PENDING` or `SENT` invitation with matching token and future expiry calls the adapter once, completes the fenced outbox job, purges its payload, and projects `deliveryStatus = SENT` in one transaction.
2. **`suppresses a revoked invitation`** — no provider call occurs; the job reaches terminal failure with a safe category, its payload is purged, and invitation delivery status is unchanged.
3. **`suppresses a missing invitation`** — no provider call occurs and terminal settlement contains no decrypted data.
4. **`suppresses an expired or tokenless invitation`** — persisted expiry and null token are authoritative even when the encrypted payload appears usable.
5. **`suppresses a superseded token`** — a payload token that does not hash to the current invitation token is not sent.
6. **`retries a transient provider failure`** — the job returns to `PENDING` with existing backoff, retains the payload for retry, and leaves invitation delivery status pending.
7. **`projects terminal delivery failure`** — exhausted attempts settle `FAILED`, purge the payload, and project `Invitation.deliveryStatus = FAILED` only for the current active issuance.
8. **`ignores a stale fencing token`** — settlement, projection, and audit writes are all absent when the fenced update loses.
9. **`reuses the idempotency key after settlement failure`** — retry invokes the adapter with the same key and eventually converges without a second logical delivery.
10. **`leaves routine provisioning behavior unchanged`** — shared worker changes do not alter its existing retry or projection rules.

### Development-runner scenarios

1. **`drains immediately and then on each interval`** — startup processes already queued and newly queued work without manual HTTP calls.
2. **`never overlaps drain cycles`** — a slow drain delays the next interval rather than starting concurrently.
3. **`continues after a safe loop-level error`** — a temporary database/runtime error does not terminate polling or expose error payloads.
4. **`stops gracefully during sleep`** — shutdown cancels the wait, disconnects Prisma, and starts no new drain.
5. **`stops gracefully during a drain`** — shutdown waits for the active drain and then disconnects exactly once.

The existing drain-route authorization tests remain the production-boundary regression suite. No semantic-review agent or end-to-end provider call is required for this design document.

## Rollback boundary

Rollback is code-only because this design requires no schema or data migration:

1. Remove the local worker from root `npm run dev` and stop that process.
2. Revert the runner and invitation-aware worker/repository changes.
3. Keep the existing protected drain endpoint available for scheduled or manual operation.

Already completed outbox messages and truthful invitation delivery projections remain valid and must not be reversed or requeued. Pending and retryable jobs remain durable for the existing endpoint. Rollback must not restore synchronous email sending.

## Acceptance criteria

- [ ] Root `npm run dev` starts named `landing`, `web`, and `outbox` processes.
- [ ] The local worker drains once at startup and periodically thereafter without overlapping itself.
- [ ] Invitation creation still commits invitation, audit, and encrypted outbox work atomically and returns without waiting for Resend.
- [ ] Active invitation email is sent with its stable idempotency key and settles the outbox message as `COMPLETED`.
- [ ] Resend acceptance and `Invitation.deliveryStatus = SENT` are committed consistently with fenced outbox completion.
- [ ] Retryable failures preserve existing bounded backoff and leave invitation delivery pending.
- [ ] Terminal transport failure projects `FAILED`; stale lifecycle suppression does not masquerade as transport failure.
- [ ] Revoked, consumed, expired, missing, tokenless, and superseded invitation jobs never call the provider and purge sensitive payloads on terminal settlement.
- [ ] Stale fencing tokens cannot update outbox state, invitation delivery status, or audit history.
- [ ] `SIGINT` and `SIGTERM` stop future polling, await active work, and disconnect Prisma.
- [ ] Production remains scheduler-owned through the protected one-shot drain endpoint.
- [ ] No invitation lifecycle state, feature flag, schema migration, duplicate queue, or duplicate source of truth is added.
- [ ] Until implementation exists, the current queued invitation is delivered only by an authorized manual drain.
