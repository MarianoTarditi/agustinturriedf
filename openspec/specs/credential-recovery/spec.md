# Credential Recovery Specification

## Purpose

Define authorized and enumeration-resistant password-reset requests that deliver recovery without exposing or assigning credentials.

## Requirements

### Requirement: Panel recovery authorization

Administrators MAY request recovery for any account. Trainers MAY request recovery only for student accounts. The system MUST authorize against the persisted target and MUST apply per-actor and per-target rate limits.

#### Scenario: Authorized recovery is requested

- GIVEN an administrator targets any account, or a trainer targets a student
- WHEN the actor requests password recovery within rate limits
- THEN the system MUST accept the request and report only queued or requested delivery status

#### Scenario: Trainer targets team or exceeds limits

- GIVEN a trainer targets a team account or a caller exceeds a rate limit
- WHEN recovery is requested
- THEN the system MUST reject it without exposing credentials or recovery tokens

### Requirement: Credential secrecy

Recovery requests MUST NOT accept an operator-selected password and MUST NOT return passwords, reset tokens, reset links, hashes, or token-bearing URLs. Reset email delivery and operational status MUST use secret-safe DTOs, audit metadata, and logs.

#### Scenario: Recovery delivery is accepted

- GIVEN an authorized recovery request
- WHEN the request succeeds
- THEN the system MUST send or queue email to the stored account address without revealing recovery material to the actor

#### Scenario: Caller submits or requests credentials

- GIVEN a caller includes a password or asks for reset material
- WHEN the recovery request is validated
- THEN the system MUST reject or omit that material and MUST NOT persist it in audit or logs

### Requirement: Durable recovery request

An accepted panel recovery request MUST atomically append a `PASSWORD_RESET_REQUESTED` event and queue idempotent email delivery. A delivery-provider outage MUST NOT reveal account data or require logging a reset URL.

#### Scenario: Recovery request commits

- GIVEN an authorized target and available request capacity
- WHEN panel recovery is accepted
- THEN the system MUST record the event, queue one delivery, and return `202`

#### Scenario: Delivery is temporarily unavailable

- GIVEN the recovery request has committed and delivery fails transiently
- WHEN the actor receives the response
- THEN the system MUST retain retryable work and disclose only safe pending or failed status

### Requirement: Public anti-enumeration

Public recovery MUST return the same generic `202` response for existing and absent identities, SHOULD have approximately uniform observable behavior, and MUST be rate-limited. A resolved request MAY create internal audit and delivery work without changing the public response.

#### Scenario: Existing identity requests recovery

- GIVEN a syntactically valid email for an existing account
- WHEN public recovery is requested within limits
- THEN the system MUST return the generic `202` response and privately queue eligible recovery

#### Scenario: Unknown identity requests recovery

- GIVEN a syntactically valid email with no matching account
- WHEN public recovery is requested within limits
- THEN the system MUST return the same generic `202` response without confirming absence

### Requirement: Session security after reset

Successful credential replacement MUST invalidate prior authenticated sessions before the account can continue protected access.

#### Scenario: New credential is established

- GIVEN a valid single-use recovery flow and compliant new password
- WHEN password replacement succeeds
- THEN the system MUST accept the new credential and revoke sessions issued under the prior authorization version

#### Scenario: Old session or replay is presented

- GIVEN password replacement completed or the recovery authorization was already consumed
- WHEN an old session or repeated recovery attempt is presented
- THEN the system MUST deny it without disclosing secret state
