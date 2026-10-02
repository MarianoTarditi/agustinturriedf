# Route Invitation Links Through Token Exchange

**Status:** Approved design  
**Date:** 2026-09-27  
**Scope:** Invitation activation links and legacy-link compatibility in `agustinturriedf/web`

## Decision

All newly generated invitation links will target `/activation/exchange?token=...`. The `/activation` page will remain compatible with already-delivered links by redirecting requests with a non-empty `token` query parameter to that same exchange endpoint.

The existing exchange route remains the only token-to-session boundary. It consumes the one-time invitation token, sets the 10-minute `activation_session` HttpOnly cookie, and redirects to clean `/activation`. The final activation form continues to accept only that cookie-backed session.

## Problem and outcome

`InvitationService` currently builds creation, resend, and replacement email links as `/activation?token=...`, while token exchange is implemented at `/activation/exchange`. The activation page does not consume the token; it requires an `activation_session` cookie. A recipient who opens the current emailed URL therefore sees `No se pudo continuar con la activación.` instead of the password form.

After this change:

- New creation, resend, and replacement emails enter the exchange route directly.
- An already-delivered `/activation?token=...` link enters the same route through a compatibility redirect, without issuing another invitation.
- A current, unexpired token is exchanged once and removed from the browser URL before the form renders.
- Invalid, expired, revoked, or replayed tokens retain the existing generic recovery behavior.

## Goals

- Make all new invitation email variants use the existing exchange flow.
- Restore already-delivered legacy links while their tokens remain current and unexpired.
- Preserve one-time token exchange, the 10-minute activation session, and the final `/activation` form flow.
- Keep raw tokens out of the final browser URL and preserve `encodeURIComponent` handling.
- Prevent redirect loops and test each link-generation path plus legacy compatibility.

## Non-goals

- Changing invitation or activation persistence, token lifetime, hashing, rotation, or consumption semantics.
- Changing cookie name, duration, flags, or session validation.
- Adding schema changes, migrations, data repair, or replacement invitations.
- Changing activation form fields, API contracts, email templates, or recovery copy.
- Supporting expired, revoked, superseded, or already-exchanged tokens.

## Request flow

### New links

1. Creation, resend, or replacement generates a raw invitation token as today.
2. The shared URL builder produces `${NEXTAUTH_URL}/activation/exchange?token=${encodeURIComponent(token)}`.
3. The recipient opens the exchange route.
4. The route performs the existing one-time compare-and-swap exchange and stores only the resulting opaque session in the `activation_session` cookie for 600 seconds.
5. The route redirects to `/activation`, removing the token from the browser URL.
6. The activation page finds the cookie and renders the existing password form.

### Already-delivered legacy links

1. The recipient opens a previously delivered `/activation?token=legacy-token-value` URL.
2. The activation page detects a non-empty token before evaluating cookie or recovery rendering and redirects to `/activation/exchange?token=${encodeURIComponent(token)}`.
3. The unchanged exchange flow either redirects to clean `/activation` with a valid session cookie or to `/activation?recovery=1` after clearing the cookie.

This compatibility path does not copy, rotate, or reissue the invitation token. It only routes the existing bearer to its established consumer.

## Routing precedence and loop prevention

| `/activation` request state | Result |
| --- | --- |
| Non-empty `token` parameter, regardless of cookie or `recovery` | Redirect once to `/activation/exchange?token=...` |
| No token, `recovery=1` | Render the existing recovery error |
| No token, valid `activation_session` cookie | Render the existing activation form |
| No token, no session | Render the existing recovery error |
| Empty or whitespace-only `token` | Treat as missing; render according to session/recovery state |

The compatibility redirect exists only on `/activation`. The exchange route redirects to `/activation` without a token on success and to `/activation?recovery=1` on failure, so neither destination can re-enter the compatibility redirect.

## Security and failure behavior

- `ActivationPrimitives.exchange` remains unchanged and authoritative for token status, expiry, one-time use, invitation compare-and-swap, session hashing, and session persistence.
- The exchange route retains the 600-second `HttpOnly`, `Secure`, `SameSite=Lax`, path-wide cookie and clears it on recovery.
- Both the email URL builder and legacy compatibility redirect encode the token with `encodeURIComponent`.
- The exchange route continues to catch invalid, expired, revoked, and replayed token failures and redirect to the generic recovery URL without exposing the failure reason.
- The raw bearer appears only in the initial or exchange request URL. The existing successful and recovery redirects remove it before the activation page renders.
- No token is added to form props, client state, API payloads, logs, audits, or responses.

## Planned file changes

Every path below is planned; this design-only task does not modify application or test code.

| Planned path | Planned change |
| --- | --- |
| `agustinturriedf/web/features/invitations/service.ts` | Change the shared activation URL builder from `/activation?token=...` to `/activation/exchange?token=...`; retain the configured base URL and `encodeURIComponent`. This single helper covers creation, resend, and replacement. |
| `agustinturriedf/web/app/(auth)/activation/page.tsx` | Accept `token` in `searchParams`; redirect a non-empty trimmed token to the encoded exchange URL before cookie/recovery rendering. Preserve existing form and recovery branches when no token is present. |
| `agustinturriedf/web/features/invitations/service.test.ts` | Add explicit activation URL assertions for creation, resend, and replacement, including exchange-path selection and encoded-token handling. |
| `agustinturriedf/web/app/(auth)/activation/activation-ui.test.ts` | Add legacy-link routing and no-loop rendering cases while retaining valid-session and recovery behavior checks. |

`agustinturriedf/web/app/(auth)/activation/exchange/route.ts`, `agustinturriedf/web/features/invitations/activation.ts`, the Prisma schema, and migrations require no production changes. Their existing tests remain regression coverage for clean redirects, cookie flags and lifetime, one-time exchange, and invalid/replayed recovery.

## Focused test plan

Run the focused Vitest files from `agustinturriedf/web`.

1. **Creation URL:** capture the payload passed to `encryptPayload`; assert its URL uses `/activation/exchange`, yields the generated token through `searchParams`, and contains no `/activation?token=` path.
2. **Resend URL:** assert the rotated token used by the compare-and-swap hash is the token in an `/activation/exchange` URL and remains absent from DTOs, audits, and logs.
3. **Replacement URL:** assert the replacement token used by the compare-and-swap hash is the token in an `/activation/exchange` URL and concurrent replacement behavior remains unchanged.
4. **Encoding:** stub token generation with a fixture containing reserved query characters; assert the serialized URL contains its `encodeURIComponent` form while URL parsing recovers the original value.
5. **Legacy link:** render/request `/activation` with a current token and assert one redirect to the encoded `/activation/exchange?token=...` destination; the form must not render before exchange.
6. **Loop prevention:** assert tokenless `/activation` with a session renders the form, tokenless `recovery=1` renders the existing error even with a stale cookie, and tokenless/missing-session access renders the same error.
7. **Exchange regressions:** retain assertions that a valid token sets `activation_session` with `Max-Age=600`, `Secure`, `HttpOnly`, and `SameSite=Lax`, then redirects to clean `/activation`; invalid or replayed tokens clear the cookie and redirect to `/activation?recovery=1` without exposing the bearer.

Focused command:

```bash
npm test -- features/invitations/service.test.ts "app/(auth)/activation/activation-ui.test.ts" "app/(auth)/activation/exchange/route.test.ts"
```

## Rollback

Rollback is code-only:

1. Restore the shared email URL builder to `/activation?token=...` only if the legacy page redirect is also retained; otherwise newly sent links would regress immediately.
2. Remove the `/activation` compatibility redirect if support for already-delivered legacy links is intentionally abandoned.
3. Leave exchanged sessions and invitation records unchanged; they remain valid under the existing 10-minute and one-time-use rules.

No schema, data, token, or session rollback is required. Because `/activation/exchange` already exists, emails sent while this change is deployed continue to target a valid route even if only the compatibility page change is rolled back.

## Acceptance criteria

- [ ] Creation, resend, and replacement emails use `/activation/exchange?token=...` with encoded tokens.
- [ ] An already-delivered `/activation?token=...` link exchanges a current, unexpired token without a replacement invitation.
- [ ] Successful exchange redirects to tokenless `/activation` and renders the form from the 10-minute HttpOnly session.
- [ ] Invalid, expired, revoked, and replayed tokens retain generic recovery and cookie-clearing behavior.
- [ ] Tokenless `/activation` never redirects: a valid session renders the form; missing session or `recovery=1` renders the existing error.
- [ ] No redirect loop is possible between the activation page and exchange route.
- [ ] One-time exchange, token/session hashing, activation completion, cookie security flags, and API contracts remain unchanged.
- [ ] No schema migration, data migration, reissuance, or unrelated activation change is introduced.
