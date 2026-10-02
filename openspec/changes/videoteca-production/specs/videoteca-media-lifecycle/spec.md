# Videoteca Media Lifecycle Specification

## Purpose

Define independent direct-upload state transitions and recoverable media processing.

## Requirements

### Requirement: Per-file direct upload lifecycle

The system MUST initialize each authorized upload as PENDING, permit direct storage transfer, verify object existence, exact size, and real allowlisted media type on confirmation, then atomically enter PROCESSING with one processing generation. It MUST NOT trust declared type or extension. Files MUST progress only through PENDING, PROCESSING, READY, FAILED, and DELETING.

#### Scenario: Verified upload enters processing
- GIVEN an authorized valid upload with matching stored bytes
- WHEN confirmation succeeds
- THEN the file becomes PROCESSING and one generation is queued

#### Scenario: Type mismatch fails safely
- GIVEN stored bytes that contradict the declared media type
- WHEN confirmation occurs
- THEN the file is not consumable and receives a safe failure result

### Requirement: READY is the sole consumable state

The system MUST issue no view, thumbnail, or download capability before READY. READY MUST require verified required metadata and a private required thumbnail. Processing failure SHALL retain only bounded safe diagnostics and permit retry only when retryable.

#### Scenario: Failed item is unavailable
- GIVEN a FAILED file
- WHEN a consumer requests media access
- THEN the system refuses access and exposes no storage detail

### Requirement: Idempotent concurrent recovery

The system MUST make initialize, confirm, retry, delete, and job completion idempotent for their actor-scoped operation identity. Concurrent confirmation or retry MUST create at most one compatible generation; stale workers MUST NOT restore a deleting file. Each selected upload MUST be independent, so one failure MUST NOT roll back a successful file.

#### Scenario: Delete wins a worker race
- GIVEN PROCESSING work and a committed delete request
- WHEN the worker completes late
- THEN the file remains DELETING and any produced derivative is cleaned up

#### Scenario: Expired pending work recovers
- GIVEN PENDING work past validated expiry
- WHEN recovery runs
- THEN it is deleted idempotently or retained in a recoverable cleanup state

### Requirement: Complete transition and upload-control rules

The system MUST permit only PENDING to PROCESSING, FAILED, or DELETING; PROCESSING to READY, FAILED, or DELETING; FAILED to PROCESSING or DELETING; READY to FAILED or DELETING; and DELETING to final removal. It MUST permit signed-PUT refresh only for authorized unexpired PENDING work on the same row and key. Cancel MUST abort client transfer and request deletion; expiry MUST make PENDING work non-revivable and require fresh initialization.

#### Scenario: Expired upload starts fresh
- GIVEN a PENDING upload after expiry
- WHEN the user retries transfer
- THEN the system does not refresh it and requires a new initialization

#### Scenario: Invalid transition conflicts
- GIVEN a READY file
- WHEN confirmation is repeated as if it were PENDING
- THEN the system returns a stable compatible or invalid-state result without changing READY

### Requirement: Processing generation and readiness proof

The system MUST create at most one durable job for each file and processing generation, claim work with a finite lease, renew valid work through heartbeats, and condition completion on current file state and generation. READY MUST contain server-verified media metadata required for its media family and a required private thumbnail. A retryable FAILED file MAY be manually retried only by ADMIN or owner TRAINER, with a new generation and one compatible job.

#### Scenario: Concurrent manual retry creates one generation
- GIVEN a retryable FAILED file and concurrent authorized retries
- WHEN both requests are evaluated
- THEN one new generation enters PROCESSING and one compatible result is returned

#### Scenario: Lease-expired work recovers safely
- GIVEN a claimed job whose lease expires before completion
- WHEN recovery claims it again
- THEN stale completion cannot overwrite the current generation

### Requirement: State-safe errors and independent outcomes

The system MUST return stable validation, expiration, unavailable, processing-failure, and state-conflict errors without raw storage responses or secrets. A multi-file queue MUST expose each selected file's result independently across initialize, transfer, confirmation, processing, cancellation, and deletion; it MUST NOT compensate by rolling back another successful file.

#### Scenario: Delete prevents late readiness
- GIVEN delete is committed during processing
- WHEN processing finishes after the request
- THEN the worker cannot transition the file to READY and cleanup remains recoverable
