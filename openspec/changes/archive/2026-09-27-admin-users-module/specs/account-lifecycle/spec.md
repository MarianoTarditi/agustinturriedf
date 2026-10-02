# Account Lifecycle Specification

## Purpose

Define canonical account states, reversible archival, immutable activated roles, guarded transitions, concurrency, and access revocation.

## Requirements

### Requirement: Canonical lifecycle and access

Every account MUST have exactly one status: `ACTIVE`, `INACTIVE`, `BLOCKED`, or `ARCHIVED`. Only `ACTIVE` accounts MAY authenticate or use protected features; all other states MUST be denied at sign-in and on protected requests.

#### Scenario: Active account accesses the application

- GIVEN an account is `ACTIVE` and otherwise authorized
- WHEN it authenticates or makes a protected request
- THEN the system MUST allow the operation

#### Scenario: Non-active session is presented

- GIVEN an account is `INACTIVE`, `BLOCKED`, or `ARCHIVED`
- WHEN its credentials or existing session are presented
- THEN the system MUST deny access

### Requirement: Guarded state transitions

The system MUST allow only `ACTIVE→INACTIVE` (pause), `INACTIVE→ACTIVE` (reactivate), `ACTIVE|INACTIVE→BLOCKED` (block), `BLOCKED→ACTIVE` (unblock), `ACTIVE|INACTIVE|BLOCKED→ARCHIVED` (archive), and `ARCHIVED→INACTIVE` (restore). Every command MUST require a nonblank reason and current `expectedVersion`, increment both resource and authorization versions, and invalidate existing sessions.

#### Scenario: Valid transition succeeds

- GIVEN an authorized actor, valid source state, reason, and current version
- WHEN the actor submits the corresponding transition
- THEN the system MUST atomically change status, increment versions, and revoke stale sessions

#### Scenario: Invalid or stale transition fails

- GIVEN the target state is already current, the transition is disallowed, the reason is blank, or the version is stale
- WHEN the transition is submitted
- THEN the system MUST reject it without changing status

### Requirement: Reversible archival

Archival MUST preserve the account, reserve its email, record archival context, and exclude it from default lists. Restore MUST clear current archival markers and return the account to `INACTIVE`; reactivation MUST be a separate command. Supported administration paths MUST NOT physically delete accounts.

#### Scenario: Archived account is restored

- GIVEN an authorized actor and an archived account
- WHEN restore is submitted with a reason and current version
- THEN the system MUST retain its history and restore it as `INACTIVE`

#### Scenario: Duplicate identity or physical deletion is attempted

- GIVEN an archived email remains reserved
- WHEN an actor invites that identity or invokes panel-facing deletion
- THEN the system MUST reject the operation and direct lifecycle use instead

### Requirement: Administrator continuity safeguards

An administrator MUST NOT archive their own account. Any pause, block, or archive affecting an administrator MUST leave at least one `ACTIVE` administrator, including under concurrent requests.

#### Scenario: Safe administrator transition

- GIVEN another active administrator will remain
- WHEN an authorized actor transitions an administrator with valid inputs
- THEN the system MUST apply the transition

#### Scenario: Concurrent last-administrator risk

- GIVEN concurrent commands would leave no active administrator
- WHEN those commands are evaluated
- THEN the system MUST reject enough commands with `LAST_ACTIVE_ADMIN` to preserve one active administrator

### Requirement: Activated role immutability

The system MUST NOT change an account role after activation, whether through profile, lifecycle, or legacy administration operations.

#### Scenario: Role is retained

- GIVEN an activated account
- WHEN any allowed profile or lifecycle command succeeds
- THEN the system MUST preserve its role

#### Scenario: Role conversion is attempted

- GIVEN an activated account
- WHEN a client submits a different role
- THEN the system MUST reject the request rather than ignore the field
