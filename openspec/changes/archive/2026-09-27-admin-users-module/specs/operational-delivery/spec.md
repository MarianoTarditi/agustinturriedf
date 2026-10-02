# Operational Delivery Specification

## Purpose

Define durable, idempotent, observable delivery of invitation email, recovery email, and student routine-directory provisioning.

## Requirements

### Requirement: Durable side-effect commitment

Any domain action requiring external delivery MUST durably queue that work in the same atomic outcome as the domain change and required audit event. External delivery MUST occur only after commitment. Provider or filesystem unavailability MUST NOT undo a committed invitation, recovery request, or activation.

#### Scenario: Domain action commits

- GIVEN a valid action requires an external side effect
- WHEN the domain action commits
- THEN the system MUST persist corresponding pending delivery work before reporting success

#### Scenario: Atomic preparation fails

- GIVEN the domain change, audit event, and delivery work cannot all commit
- WHEN the action is attempted
- THEN the system MUST commit none of them

### Requirement: Idempotent processing

Delivery work MUST have a stable idempotency identity and MUST be safe under duplicate claims, retries, worker interruption, and replay. Concurrent or repeated processing MUST produce at most one effective email delivery per issuance and one valid physical directory outcome per student activation.

#### Scenario: Work completes normally

- GIVEN pending work that has not completed
- WHEN an eligible worker processes it
- THEN the system MUST record completion and its safe delivery status

#### Scenario: Completed work is replayed

- GIVEN work with an already completed idempotency identity
- WHEN it is claimed or replayed again
- THEN the system MUST avoid duplicating the external effect

### Requirement: Bounded retries and recovery

The system MUST retry transient failures with bounded delay and attempts, MUST NOT retry permanent failures indefinitely, and MUST expose sanitized terminal-failure state for controlled redrive. Interrupted claims MUST become recoverable without holding external I/O inside a domain transaction.

#### Scenario: Transient delivery failure occurs

- GIVEN an eligible operation fails transiently within its retry budget
- WHEN failure is recorded
- THEN the system MUST schedule a later attempt without changing the committed domain state

#### Scenario: Failure is permanent or exhausted

- GIVEN an operation is permanent-failure or has exhausted attempts
- WHEN it is classified
- THEN the system MUST expose a sanitized failed state and require controlled recovery

### Requirement: Secret-safe delivery data

Operational status and logs MUST expose resource and correlation identifiers, attempts, timing, and safe error categories only. They MUST NOT expose passwords, hashes, raw tokens, token-bearing URLs, private paths, or payload bodies. Any recoverable raw bearer value MUST remain access-restricted and encrypted at rest and MUST be purged after successful delivery or expiry, including terminal-failure storage.

#### Scenario: Delivery status is inspected

- GIVEN an authorized operator inspects pending or failed work
- WHEN status is returned
- THEN the system MUST provide actionable sanitized metadata without secret payloads

#### Scenario: Secret-bearing delivery expires

- GIVEN undelivered work contains a recoverable bearer value and its invitation expires
- WHEN expiry is observed
- THEN the system MUST purge the bearer value while retaining safe operational history

### Requirement: Observable student provisioning

Student activation MUST expose routine-directory provisioning as `PENDING`, `READY`, or `FAILED`. Processing MUST verify the resulting directory is valid rather than treating path existence alone as success.

#### Scenario: Provisioning succeeds

- GIVEN an activated student with pending provisioning
- WHEN provisioning establishes and verifies the required directory
- THEN the system MUST mark provisioning `READY`

#### Scenario: Existing path is invalid

- GIVEN the expected path exists but does not satisfy provisioning requirements
- WHEN provisioning runs
- THEN the system MUST mark or retain a retryable `FAILED` state rather than report `READY`
