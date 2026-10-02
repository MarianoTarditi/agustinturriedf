# User Directory Specification

## Purpose

Define role-scoped Students and Team administration with bounded queries, explicit public data contracts, safe profile editing, and student assignment.

## Requirements

### Requirement: Scoped directory access

The system MUST provide separate Students and Team views and MUST enforce actor-to-target authorization for every list, detail, and mutation request. Administrators MAY manage both views; trainers MUST be limited to all student accounts, including unassigned students, and MUST NOT access team accounts.

#### Scenario: Trainer manages an unassigned student

- GIVEN an authenticated trainer and an unassigned student
- WHEN the trainer requests the student detail or an allowed student action
- THEN the system MUST authorize the request

#### Scenario: Trainer targets a team account

- GIVEN an authenticated trainer and an administrator or trainer target
- WHEN the trainer requests its list entry, detail, or mutation
- THEN the system MUST return `403 FORBIDDEN` without disclosing target data

### Requirement: Bounded directory queries

The system MUST paginate and filter authorized records before returning them. Students MUST support normalized name/email search, lifecycle and trainer filters; Team MUST support normalized search, lifecycle and role filters. The default limit MUST be 25, the maximum 100, sorting MUST be stable, cursors MUST be opaque, and archived accounts MUST be excluded unless explicitly requested.

#### Scenario: Filtered page is requested

- GIVEN an authorized actor and valid filters, sort, cursor, and limit
- WHEN the actor requests a directory page
- THEN the system MUST return only scoped matching items and a next cursor when more exist

#### Scenario: Query exceeds its bounds

- GIVEN an authorized actor
- WHEN the actor supplies an invalid view, filter, cursor, sort, or limit above 100
- THEN the system MUST reject the query without returning an unrestricted result

### Requirement: Explicit profile contracts

The system MUST return explicit summary and detail DTOs and MUST NOT expose passwords, hashes, tokens, internal storage paths, or persistence records. Profile edits MUST accept only fields mutable for the target type, MUST reject role, password, lifecycle, audit, archival, and server-version fields, and MUST require `expectedVersion`.

#### Scenario: Authorized profile edit

- GIVEN an authorized actor, allowed fields, and the current version
- WHEN the actor submits a profile edit
- THEN the system MUST update the profile, increment its version, and return the safe detail DTO

#### Scenario: Stale or immutable edit

- GIVEN a profile edit contains a stale version or immutable field
- WHEN the edit is submitted
- THEN the system MUST reject it with a stable conflict or validation error and preserve current data

### Requirement: Student assignment

An administrator or trainer MUST be able to assign any student to any currently active trainer. The system MUST reject missing, non-trainer, inactive, blocked, or archived destinations and MUST apply optimistic concurrency.

#### Scenario: Student is reassigned

- GIVEN an authorized actor, a student, an active trainer, and the current version
- WHEN assignment is submitted
- THEN the system MUST update the assignment and return the incremented student version

#### Scenario: Destination is ineligible

- GIVEN a destination that is absent, not a trainer, or not active
- WHEN assignment is submitted
- THEN the system MUST reject the assignment without changing the student
