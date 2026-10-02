# Account Invitations Specification

## Purpose

Define invitation issuance, activation, and replacement.

## Requirements

### Requirement: Role-aware invitation issuance

Accounts MUST begin as invitations; issuance MUST NOT create users. Administrators MAY invite any role; trainers MAY invite students only. Student invitations MUST reference an active trainer; team invitations MUST reject student data. Role MUST be immutable and expiry MUST be 48 hours.

#### Scenario: Authorized invitation is issued

- GIVEN authorized, role-appropriate invitation data
- WHEN the actor issues an invitation
- THEN the system MUST create a pending 48-hour invitation and queue delivery

#### Scenario: Role boundary or identity rule fails

- GIVEN an unauthorized role, ineligible trainer, invalid fields, or reserved email
- WHEN issuance is submitted
- THEN the system MUST create neither invitation nor user

### Requirement: Scoped invitation queue

The system MUST paginate and filter by status, role, email, and trainer. Administrators MUST see all; trainers MUST see students only. Lifecycle and delivery status MUST remain distinct. DTOs MUST exclude tokens and hashes.

#### Scenario: Authorized queue page is requested

- GIVEN authorized queue filters
- WHEN the actor requests a page
- THEN the system MUST return scoped safe DTOs with stable pagination

#### Scenario: Trainer requests team invitations

- GIVEN a trainer
- WHEN team invitation data is requested
- THEN the system MUST reject it without recipient disclosure

### Requirement: Resend and revocation

Resend MUST require current version, invalidate the prior token, reset expiry to 48 hours, and queue delivery. Revocation MUST require reason and current version. Consumed invitations MUST NOT be changed; revoked or expired invitations require replacement.

#### Scenario: Pending invitation is resent or revoked

- GIVEN a pending invitation and current version
- WHEN a valid resend or revoke command is submitted
- THEN the system MUST apply it and increment version

#### Scenario: Stale or terminal invitation is changed

- GIVEN a stale version or a consumed, revoked, or expired invitation
- WHEN resend or revoke is submitted
- THEN the system MUST return a stable conflict without changing it

### Requirement: Secure activation exchange

The system MUST exchange a valid token for a short-lived HttpOnly activation session and clean URL. An accessible, mandatory password-policy modal MUST NOT be dismissed or bypassed.

#### Scenario: Valid invitation reaches password setup

- GIVEN a valid pending invitation token
- WHEN the invitee opens the activation link
- THEN the system MUST establish the session and show the mandatory modal on a clean URL

#### Scenario: Password submission is invalid

- GIVEN a valid activation session
- WHEN passwords mismatch or fail policy
- THEN the system MUST preserve activation and show accessible feedback

### Requirement: Atomic single-use activation

Activation MUST revalidate state, expiry, role, email, and password. It MUST atomically create role-appropriate data, consume once, audit, and queue provisioning. The account MUST start `ACTIVE` with the invitation role and redirect to login without sign-in.

#### Scenario: Activation succeeds

- GIVEN valid activation and compliant password
- WHEN activation is submitted
- THEN the system MUST create one account and redirect to login with opaque confirmation

#### Scenario: Concurrent activation or resend races

- GIVEN concurrent attempts use one or replaced tokens
- WHEN the attempts are processed
- THEN the system MUST allow at most one activation and reject invalidated or replayed attempts

### Requirement: Safe invalid-link recovery

Expired, revoked, consumed, and unknown invitations MUST produce safe states. Public replacement MUST be rate-limited and return identical `202` responses regardless of identity existence.

#### Scenario: Terminal token is presented

- GIVEN an expired, revoked, or consumed token
- WHEN activation is attempted
- THEN the system MUST show its safe recovery path without secret data

#### Scenario: Replacement request targets any email

- GIVEN any valid email
- WHEN a public replacement request is submitted
- THEN the system MUST return the generic `202` response without identity disclosure
