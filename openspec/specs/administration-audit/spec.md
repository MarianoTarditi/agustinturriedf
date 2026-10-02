# Administration Audit Specification

## Purpose

Define authorized, append-only, secret-safe history for invitation, account, delivery, and recovery actions.

## Requirements

### Requirement: Complete append-only history

The system MUST record invitation creation, delivery outcomes, resend, revoke, observed expiry, activation, profile edits, trainer assignment, lifecycle transitions, password-reset requests, archive, and restore. Each event MUST identify its type, subject, actor type and identity when available, server timestamp, required reason, and an allowlisted change summary. Events MUST be immutable; corrections MUST be new events.

#### Scenario: Sensitive action succeeds

- GIVEN an authorized action that requires audit
- WHEN the action commits
- THEN the system MUST append exactly one corresponding event with actor and server time

#### Scenario: Audit persistence fails

- GIVEN a mutation and its required audit event
- WHEN the event cannot be committed
- THEN the system MUST roll back the mutation

### Requirement: Authorized history access

History MUST use the same actor-to-target scope as the subject resource and MUST be independently paginated. Administrators MAY view student and team history; trainers MAY view student history only, including events from the consumed invitation linked to that student.

#### Scenario: Authorized history is read

- GIVEN an actor authorized for the subject and a valid page request
- WHEN history is requested
- THEN the system MUST return a scoped chronological page of safe events

#### Scenario: Trainer requests team history

- GIVEN an authenticated trainer and a team subject
- WHEN history is requested
- THEN the system MUST return `403 FORBIDDEN` without event disclosure

### Requirement: Secret-safe event content

Audit metadata MUST use bounded allowlists and MUST NOT contain passwords, password hashes, raw tokens, token hashes, token-bearing URLs, private storage paths, ORM records, or unbounded request payloads. Reasons MUST be length-bounded and treated as plain text.

#### Scenario: Safe change summary is recorded

- GIVEN a profile or assignment change
- WHEN its event is appended
- THEN the system MUST record only approved changed fields and safe before/after values

#### Scenario: Input contains secret-bearing fields

- GIVEN a request includes credentials, tokens, or unapproved metadata
- WHEN an audit event is formed
- THEN the system MUST omit the prohibited values from persisted and returned history

### Requirement: Actor attribution

Activation MUST be attributed to the subject and linked invitation, worker outcomes MUST use a system actor, and resolved public recovery requests MUST be attributed internally without weakening anti-enumeration responses.

#### Scenario: Worker event is appended

- GIVEN a delivery worker reaches a reportable outcome
- WHEN the outcome is recorded
- THEN the system MUST identify a system actor and the affected resource

#### Scenario: Public request has no resolved subject

- GIVEN a public recovery or replacement request cannot resolve an identity
- WHEN the request completes
- THEN the system MUST preserve the generic public response without creating misleading subject history
