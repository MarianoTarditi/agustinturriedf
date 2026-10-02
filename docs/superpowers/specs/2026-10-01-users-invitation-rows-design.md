# Integrate Invitations into the Users Table

**Status:** Approved design  
**Date:** 2026-10-01  
**Scope:** Replace the standalone invitations page with invitation rows in the users table

## Decision

The users table becomes the single management surface for users and invitations. Unconsumed invitations are represented as table rows even though no `User` record exists until activation.

The existing `Estado` and `Acciones` columns are reused. No invitation-specific column is added.

## Behavior

1. Load users, invitations, and payment configuration in parallel.
2. Keep real users mapped to their existing rows and actions.
3. Convert the most recent invitation for each normalized email into a pending-activation row when its email does not belong to a loaded user.
4. Hide invitations whose delivery is still pending or failed.
5. Display delivered, unexpired invitations as `Enviada` with a `Revocar` action.
6. Display delivered, expired invitations as `Vencida` with an `Enviar` action.
7. Do not show view, edit, or archive actions for invitation rows.

Revoking uses the existing versioned revoke endpoint and requires confirmation. Sending an expired invitation renews its token and expiration before queueing a new email. Successful actions refresh the affected table data and display a toast; failures preserve the row and display an error.

## Domain Changes

The safe invitation DTO must expose first and last name so invitation rows can use the same identity presentation as users.

The resend command must accept an expired invitation that is otherwise active and version-current. It must atomically replace the token, assign a new expiration, reset delivery to pending, increment the version, append the audit event, and enqueue the email. Revoked and consumed invitations remain ineligible.

## Removal

Delete `app/(private)/usuarios/invitaciones/page.tsx` and remove its private-navigation entry. The route is intentionally removed without a redirect because the users table replaces the feature completely.

## Verification

- Runtime tests cover invitation DTO mapping, newest-email selection, visibility, and derived state.
- Page tests cover invitation rows, available actions, confirmation, successful refresh, and errors.
- Invitation service and repository tests cover safe expired resends and preserve optimistic concurrency.
- Navbar tests confirm the standalone destination is absent.
- Type checking, linting, and the focused test suite pass.

## Acceptance Criteria

- [ ] The users table displays real users and eligible invitation rows together.
- [ ] Invitation rows show only `Enviada` or `Vencida` in `Estado`.
- [ ] `Enviada` rows expose only `Revocar` in `Acciones`.
- [ ] `Vencida` rows expose only `Enviar` in `Acciones`.
- [ ] Pending and failed deliveries are hidden.
- [ ] Invitation actions call the real endpoints and refresh the table.
- [ ] Expired invitations can be safely renewed and sent.
- [ ] The standalone invitations page and navigation entry no longer exist.
