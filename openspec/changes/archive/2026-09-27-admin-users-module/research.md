# Admin Users Module Research Evidence

## Research identity

| Field | Value |
|---|---|
| Request ID | `admin-users-module-research-01` |
| Revision | `c585280fcf65d9ab1d2e979ee86bae09ff2a611453c3f825c725913763110506` |
| Status | `done` |
| Source classes | Official documentation; open web |
| Access date | 2026-09-13 |

This artifact persists parent-validated evidence. It does not introduce new research or convert implementation parameters into product decisions.

## Scope and questions

- **Q1 — Reliable side effects:** How should database mutations, invitation delivery, filesystem provisioning, retries, and terminal failures be coordinated safely?
- **Q2 — Administrative invariants:** How should PostgreSQL and Prisma enforce active-admin uniqueness and protect the last-active-admin invariant under concurrency?
- **Q3 — Invitation and password-setup tokens:** What lifecycle, response, and browser-transport controls are required for secure one-time tokens?
- **Q4 — Authorization freshness:** How should NextAuth/Auth.js JWT sessions react to role, status, or revocation changes?

## Executive conclusions

1. Use a transactional outbox for side effects. Workers must claim bounded batches without holding database locks during external I/O, deliver idempotently, retry only transient failures, and expose sanitized terminal-failure state.
2. Use PostgreSQL constraints where they express the invariant, but protect the last-active-admin rule with a serializable or explicitly guarded multi-row transaction. Prisma 6 requires implementation-time API verification and customized SQL migrations for partial indexes.
3. Treat invitation and password-setup values as bearer secrets. Prefer immediate exchange of the one-time token for a short-lived HttpOnly activation session, then redirect to a clean URL before displaying the mandatory password modal.
4. JWT cookie deletion is not revocation. Protected requests and sensitive actions must load authoritative role/status and enforce an application-defined `authVersion` at common authorization boundaries.

## Validated claims

| Claim | Question | Evidence | Validated conclusion and local implication |
|---|---|---|---|
| C1 | Q1 | S1, S13 | Persist the domain mutation and outbox row atomically. Delivery is at least once, so each operation needs a stable unique idempotency key. |
| C2 | Q1 | S2, S3 | Claim bounded job batches with `SELECT ... FOR UPDATE SKIP LOCKED` and `UPDATE ... RETURNING`. Keep the claim transaction short, perform external I/O after commit, complete conditionally, and recover expired leases. |
| C3 | Q1 | S4 | Retry only transient failures, using bounded exponential backoff with jitter; fail permanent errors without retry loops. |
| C4 | Q1 | S5, S6 | Terminal failures require inspectable dead-letter state, sanitized metadata, metrics and alerts, and controlled redrive. |
| C5 | Q1 | S1, S4, S7 | Filesystem provisioning must be repeatable and verify the resulting object type, ownership, and permissions. Merely finding an existing path is not proof of successful provisioning. |
| C6 | Q1 | S6, S14 | Bearer values are secrets. Store one-way verifiers. If a raw token must exist in an encrypted outbox payload, restrict access, never log it, purge it after delivery or expiry, and never retain it in dead-letter storage. |
| C7 | Q2 | S8 | A partial unique index enforces uniqueness only for rows matching its predicate; it cannot guarantee that at least one active administrator remains. |
| C8 | Q2 | S8, S11, S12 | PostgreSQL SQL migrations support partial indexes, while Prisma support is version-sensitive. Because this project uses Prisma 6, use customized SQL migrations rather than newer preview Prisma Schema Language syntax. |
| C9 | Q2 | S9 | Serializable transactions may abort with SQLSTATE `40001`. Retry the entire transaction from the beginning, and publish no side effect before commit. |
| C10 | Q2 | S13 | Prisma transaction and retry APIs are version-sensitive. During implementation, inspect the installed Prisma 6 APIs, detect documented serialization and deadlock errors, and apply bounded retries around the whole transaction callback. |
| C11 | Q2 | S3, S13 | Expected-version compare-and-swap prevents lost updates to one row, but not multi-row write skew. Protect the last-active-admin rule with a serializable predicate read, shared guard, or suitable locking. |
| C12 | Q3 | S14 | Tokens require cryptographic randomness, sufficient length, purpose and user binding, one-way storage, single use, expiry, and atomic conditional consumption. |
| C13 | Q3 | S14 | Recovery and replacement responses must resist enumeration through generic messages, approximately uniform timing, and rate limits. |
| C14 | Q3 | S14, S16, S17 | Token-bearing pages require a no-referrer policy, no third-party resources before cleanup, cache controls, and URL replacement or redirection. |
| C15 | Q3 | S15, S18 | URL fragments are not sent in the initial HTTP request. Client-side JavaScript can capture a fragment and replace browser history before submitting the token. |
| C16 | Q3 | S14, S16 | Fragment-to-POST is not explicitly endorsed by OWASP and remains exposed to same-origin scripts, XSS, history, redirects, and extensions; it must not be described as categorically preventing leakage. Prefer immediate one-time-token exchange into a short-lived HttpOnly activation session, followed by redirect to a clean URL while preserving the mandatory password modal. |
| C17 | Q4 | S19 | JWT sessions cannot be revoked before expiry unless server-side state is checked whenever they are presented. Deleting a cookie does not invalidate copied JWTs. |
| C18 | Q4 | S20, S21 | Auth.js callbacks can integrate database checks; role values otherwise remain stale until sign-in. Protected decisions must use authoritatively loaded role and status. |
| C19 | Q4 | S19, S20 | `authVersion` is application-defined and compatible with Auth.js, but it is not built-in global revocation. Enforce it at common protected-request boundaries and in sensitive routes and actions. |

## Source registry

All sources were accessed on 2026-09-13.

| ID | Publisher | Title | URL |
|---|---|---|---|
| S1 | AWS | Transactional outbox pattern | https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html |
| S2 | PostgreSQL | PostgreSQL 18 SELECT | https://www.postgresql.org/docs/current/sql-select.html |
| S3 | PostgreSQL | PostgreSQL 18 UPDATE | https://www.postgresql.org/docs/current/sql-update.html |
| S4 | AWS | Retry with backoff pattern | https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html |
| S5 | AWS | Using dead-letter queues in Amazon SQS | https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html |
| S6 | OWASP | Logging Cheat Sheet | https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html |
| S7 | Node.js | File system `mkdir` | https://nodejs.org/docs/latest-v24.x/api/fs.html#fspromisesmkdirpath-options |
| S8 | PostgreSQL | Partial Indexes | https://www.postgresql.org/docs/current/indexes-partial.html |
| S9 | PostgreSQL | Transaction Isolation | https://www.postgresql.org/docs/current/transaction-iso.html |
| S10 | PostgreSQL | Explicit Locking | https://www.postgresql.org/docs/current/explicit-locking.html |
| S11 | Prisma | Unsupported database features | https://www.prisma.io/docs/orm/prisma-migrate/workflows/unsupported-database-features |
| S12 | Prisma | Configuring partial indexes with `where` | https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes#configuring-partial-indexes-with-where |
| S13 | Prisma | Transactions | https://www.prisma.io/docs/orm/prisma-client/queries/transactions |
| S14 | OWASP | Forgot Password Cheat Sheet | https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html |
| S15 | IETF | RFC 3986: URI Generic Syntax | https://www.rfc-editor.org/rfc/rfc3986.html |
| S16 | IETF | RFC 9700: OAuth 2.0 Security Best Current Practice | https://www.rfc-editor.org/rfc/rfc9700.html |
| S17 | MDN | Referrer-Policy | https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy |
| S18 | MDN | `History.replaceState()` | https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState |
| S19 | Auth.js | Session strategies | https://authjs.dev/concepts/session-strategies |
| S20 | Auth.js | Next.js API reference | https://authjs.dev/reference/nextjs |
| S21 | Auth.js | Role-based access control | https://authjs.dev/guides/role-based-access-control |

## Local applicability

| Local fact | Application of the evidence |
|---|---|
| Prisma 6 | Use customized SQL migrations for PostgreSQL partial indexes. Verify the installed transaction API and concrete retryable error representation during implementation. |
| NextAuth 5 beta / Auth.js | Centralize authoritative role/status and `authVersion` checks instead of assuming JWT claims remain current. |
| Node.js `>=22.12.0` | Recursive `mkdir` is available, but provisioning still requires postcondition checks for object type, ownership, and permissions. |
| PostgreSQL through Prisma | Use database transactions for mutation-plus-outbox atomicity and database-native concurrency controls where invariants span rows. |

## Gaps and uncertainty

- Exact outbox lease duration, retry count, backoff schedule, dead-letter retention, and token-payload encryption mechanism remain bounded implementation parameters.
- The deployed PostgreSQL version was not established. The required SQL features are longstanding, but implementation must verify environment compatibility.
- Fragment-to-POST security is a standards-based synthesis, not an OWASP-endorsed invitation pattern.
- Filesystem guarantees vary by platform; recursive `mkdir` alone is not proof of complete provisioning.

## Constraints for proposal and design

- Keep domain mutation and outbox insertion in one transaction; do not perform delivery or filesystem I/O before commit.
- Specify stable idempotency keys, bounded worker claims, lease recovery, conditional completion, transient-only retries, sanitized dead-letter handling, observability, and controlled redrive.
- Never log bearer tokens or preserve raw tokens in dead-letter state. If an encrypted outbox payload temporarily contains one, define strict access and deletion behavior.
- Express partial indexes through customized SQL migrations for the local Prisma 6 stack, and define a concurrency-safe last-active-admin transaction with bounded whole-transaction retries.
- Define token creation, one-way verification, expiry, atomic single-use consumption, enumeration resistance, rate limits, and token-page browser controls.
- Prefer immediate token exchange for a short-lived HttpOnly activation session and redirect to a clean URL; retain the mandatory password modal without overstating fragment security.
- Define common authorization boundaries that reload authoritative role/status and compare `authVersion`; do not treat cookie deletion or cached JWT role claims as revocation.
- Leave the identified bounded parameters open for proposal/design selection and environment verification rather than presenting them as research conclusions.
