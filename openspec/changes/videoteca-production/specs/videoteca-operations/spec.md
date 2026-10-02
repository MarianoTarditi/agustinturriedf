# Videoteca Operations Specification

## Purpose

Define safe operation, recovery, observability, and cutover of private Videoteca media.

## Requirements

### Requirement: Validated fail-closed operation

The system MUST validate required private-storage, media-policy, URL/cache, CORS, worker-limit, retention, and reconciliation configuration at startup. It MUST fail closed for missing required configuration or public bucket exposure and MUST NOT fall back to durable local media storage. Configuration values SHALL be validated rather than invented by the application.

#### Scenario: Unsafe storage configuration blocks readiness
- GIVEN missing or publicly exposed required storage configuration
- WHEN the service starts
- THEN Videoteca readiness fails without enabling upload or access

### Requirement: Recoverable worker and reconciliation

The system MUST process only inspection and thumbnail work with bounded resources, leases, heartbeats, and retry limits from validated configuration. Reconciliation MUST be repeatable and reconcile expired PENDING work, stale processing, incomplete jobs, missing READY bytes, DELETING cleanup, expired failed retention, and aged prefix-scoped orphans without treating objects as authorization state.

#### Scenario: Missing READY derivative is repaired safely
- GIVEN a READY record with missing required bytes
- WHEN reconciliation detects it
- THEN the file becomes non-consumable FAILED and operations are alerted

#### Scenario: Lease expiry permits recovery
- GIVEN abandoned processing work with an expired lease
- WHEN reconciliation runs
- THEN it is safely rescheduled or terminally failed under configured bounds

### Requirement: Safe observability and rollback

The system MUST emit correlation-linked events and metrics for state transitions, job outcomes, signed-access decisions, policy mutations, cleanup, and reconciliation counts. Logs, traces, analytics, and support exports MUST redact signed URLs, credentials, authorization headers, and raw keys. Operational rollback MUST stop mutations and workers, restore the prior deployment where required, and MUST NOT reverse new media into local test storage.

#### Scenario: Storage outage remains recoverable
- GIVEN storage cleanup is unavailable
- WHEN a deletion is requested
- THEN the file remains DELETING, access stays blocked, and recovery is observable

### Requirement: Approved clean cutover acceptance

The system MUST discard approved local Videoteca test rows and media without migration, after an explicit maintenance approval and mutation pause. Before reopening mutations, operations MUST verify private access, role-matrix behavior, direct image/video lifecycle, private seek/download, reconciliation, no aged transient states, and no smoke-flow orphan objects.

#### Scenario: Cutover does not migrate test media
- GIVEN the approved maintenance window
- WHEN production cutover executes
- THEN prior local paths, bytes, names, and thumbnails are not copied into the new system

### Requirement: Worker safety, health, and configuration invariants

The system MUST claim eligible media jobs atomically with a finite lease, record attempt state, renew live work through heartbeats, and process outside the claim transaction. It MUST apply configured limits for worker concurrency and untrusted-media resources. Health reporting MUST distinguish API readiness, database readiness, storage reachability, and worker liveness. Missing required configuration, unsafe bucket exposure, or unavailable required dependency MUST prevent the relevant ready state without an authorization or local-storage fallback.

#### Scenario: Worker crash is recoverable
- GIVEN a worker stops after claiming a job
- WHEN its lease expires
- THEN another eligible worker can recover the job within configured retry bounds

### Requirement: Complete reconciliation and retention matrix

Reconciliation MUST be scheduled, repeatable, and prefix-bounded. It MUST expire PENDING uploads; repair stale PROCESSING leases and incomplete current-generation jobs; fail READY records missing source or thumbnail; retry DELETING cleanup; delete FAILED source/derivative bytes after validated retention; remove only aged orphan objects after configured grace; and terminally discard stale jobs without mutating a mismatched file. It MUST not classify in-flight uploads as orphans before their confirmation window closes.

#### Scenario: Failed retention cleans bytes
- GIVEN a FAILED file beyond configured retention
- WHEN reconciliation runs
- THEN it enters cleanup and its known bytes are removed idempotently

#### Scenario: Orphan grace prevents premature deletion
- GIVEN a recent object under the configured prefix without a committed owner
- WHEN reconciliation scans it before grace elapses
- THEN the object is deferred and recorded as such

### Requirement: Observable secure operations and acceptance gate

The system MUST emit structured correlation-linked events for uploads, transitions, claims, heartbeats, retries, signed access, policy/group changes, deletes, and reconciliation corrections. It MUST expose metrics and alerts for state age, queue depth, lease expiry, processing outcomes, access decisions, cleanup age, storage health, missing bytes, and orphan repairs. It MUST redact keys, signed URLs, credentials, authorization headers, and raw storage responses. Before mutation reopening after approved maintenance cutover, operations MUST pass role-matrix, direct image/video lifecycle, private Range seek/download, reconciliation, state-age, private-bucket, ownership, and orphan smoke gates.

#### Scenario: Acceptance gate blocks reopening
- GIVEN a smoke gate detects a public-access condition or orphan from the smoke flow
- WHEN operations evaluate cutover readiness
- THEN mutations remain closed until the condition is corrected and reverified

### Requirement: Explicit scope exclusion

The system MUST NOT add HLS, renditions, transcoding, captions, antivirus scanning, resumable upload, public or anonymous links, permanent share URLs, per-file ACLs, storage-provider selection, local-media migration, or unrelated module changes as part of this capability. A production recovery MUST use private object storage and persisted lifecycle state, not local durable media.

#### Scenario: Excluded delivery feature is not implied
- GIVEN a READY video is consumed through private signed byte-range access
- WHEN the user seeks within the video
- THEN the system provides no HLS, rendition, or transcoding behavior
