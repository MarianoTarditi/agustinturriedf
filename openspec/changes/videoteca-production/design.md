# Design: Production Videoteca

## Outcome and Boundaries

PostgreSQL becomes authoritative for Videoteca metadata, authorization, lifecycle, and durable work; a private S3-compatible bucket owns bytes. Browser transfers use short-lived signed capabilities; Route Handlers remain the Node.js control plane and never proxy complete media. This replaces the verified local-filesystem flow in `agustinturriedf/web/features/videoteca/{service,repository,storage}.ts`, while retaining the existing feature/service/repository, `requireSession`, Zod, Prisma, and `apiSuccess`/`handleApiError` conventions.

No provider, credentials, numeric operational value, codec matrix, or deployment topology is selected here. Those are validated configuration with invariants. No runtime behavior is asserted as implemented.

```text
React UI -> Route Handler -> application service -> Policy + Repository + ObjectStorage port
                                      |                     |              |
                                  PostgreSQL <--------------+      S3-compatible adapter
Worker/reconciliation --------------------------------------+
```

## Module and File Map

| Path | Status | Planned responsibility |
|---|---|---|
| `agustinturriedf/web/prisma/schema.prisma` | existing/modify | Production models, relations, enums, indexes. |
| `agustinturriedf/web/prisma/migrations/YYYYMMDDHHMMSS_videoteca_production/migration.sql` | planned/create | Generated timestamp convention; path does not yet exist. |
| `agustinturriedf/web/prisma/seed.ts` | existing/modify | Do not seed disposable Videoteca data during production cutover. |
| `agustinturriedf/web/features/videoteca/service.ts` | existing/replace | Remove local-byte orchestration; retain façade only if it delegates to planned services. |
| `agustinturriedf/web/features/videoteca/repository.ts` | existing/replace | Prisma policy, query, CAS, and job persistence. |
| `agustinturriedf/web/features/videoteca/storage.ts` | existing/replace | Remove local durable/serving behavior. |
| `agustinturriedf/web/features/videoteca/policy.ts` | create | Effective-policy and command authorization. |
| `agustinturriedf/web/features/videoteca/object-storage.ts` | create | Provider-neutral storage port/types. |
| `agustinturriedf/web/features/videoteca/s3-object-storage.ts` | create | Selected-provider adapter only after conformance. |
| `agustinturriedf/web/features/videoteca/upload-service.ts` | create | Direct-upload lifecycle. |
| `agustinturriedf/web/features/videoteca/media-service.ts` | create | Probe, thumbnail, and completion orchestration. |
| `agustinturriedf/web/features/videoteca/reconciliation.ts` | create | Repeatable recovery scan. |
| `agustinturriedf/web/features/videoteca/contracts.ts` | create | DTO and domain contract types. |
| `agustinturriedf/web/features/videoteca/config.ts` | create | Validated configuration. |
| `agustinturriedf/web/features/videoteca/worker.ts` | create | Topology-neutral `runOnce` and graceful `runLoop` worker entry API. |
| `agustinturriedf/web/scripts/run-videoteca-worker.ts` | create | Invokes `runOnce` or `runLoop` by validated mode; drains lease/child process on shutdown. |
| `agustinturriedf/web/scripts/reconcile-videoteca.ts` | create | Invokes one reconciliation run; scheduler owns invocation. |
| `agustinturriedf/web/lib/validation/videoteca.ts` | existing/modify | Zod path/query/body schemas and configuration validation. |
| `agustinturriedf/web/app/api/videoteca/folders/route.ts` | existing/replace | Folder list/create. |
| `agustinturriedf/web/app/api/videoteca/folders/[folderId]/route.ts` | existing/replace | Folder detail/rename/delete. |
| `agustinturriedf/web/app/api/videoteca/folders/[folderId]/files/route.ts` | existing/modify | Bounded file browse. |
| `agustinturriedf/web/app/api/videoteca/folders/[folderId]/access-policy/route.ts` | create | Policy apply. |
| `agustinturriedf/web/app/api/videoteca/folders/[folderId]/access-policy/preview/route.ts` | create | Audience preview. |
| `agustinturriedf/web/app/api/videoteca/files/[fileId]/route.ts` | existing/replace | Rename/single delete. |
| `agustinturriedf/web/app/api/videoteca/files/[fileId]/access/route.ts` | create | Signed access. |
| `agustinturriedf/web/app/api/videoteca/files/[fileId]/retry/route.ts` | create | Processing retry. |
| `agustinturriedf/web/app/api/videoteca/files/bulk-move/route.ts` | create | Atomic move. |
| `agustinturriedf/web/app/api/videoteca/files/bulk-delete/route.ts` | create | Atomic delete marking. |
| `agustinturriedf/web/app/api/videoteca/uploads/route.ts` | create | Initialize. |
| `agustinturriedf/web/app/api/videoteca/uploads/[fileId]/url/route.ts` | create | Refresh PUT. |
| `agustinturriedf/web/app/api/videoteca/uploads/[fileId]/confirm/route.ts` | create | Confirm/seal. |
| `agustinturriedf/web/app/api/training-groups/route.ts` | create | Group list/create route. |
| `agustinturriedf/web/app/api/training-groups/[groupId]/route.ts` | create | Group update/delete route. |
| `agustinturriedf/web/app/api/training-groups/[groupId]/members/route.ts` | create | Transactional membership replacement route. |
| `agustinturriedf/web/app/(private)/videoteca/page.tsx` | existing/replace | Root browse. |
| `agustinturriedf/web/app/(private)/videoteca/[folderId]/page.tsx` | existing/replace | Folder browse. |
| `agustinturriedf/web/app/(private)/videoteca/videoteca.service.ts` | existing/replace | Browser transport/query client. |
| `agustinturriedf/web/features/videoteca/policy.test.ts` | create | Policy matrix. |
| `agustinturriedf/web/features/videoteca/object-storage.contract.test.ts` | create | Provider conformance. |
| `agustinturriedf/web/features/videoteca/lifecycle.integration.test.ts` | create | Lifecycle/jobs/reconciliation. |
| `agustinturriedf/web/app/api/videoteca/videoteca.routes.test.ts` | create | Route contracts. |
| `agustinturriedf/web/app/(private)/videoteca/videoteca.ui.test.tsx` | create | UI/a11y workflows. |

Dependencies point inward: routes and UI depend on contracts/services; services depend on policy, repository and the `ObjectStorage` interface; Prisma and the S3 SDK are adapters only. FFmpeg/ffprobe are executed only by the worker, never a request handler.

## Prisma Domain and Migration

### Enums and models

`VideotecaVisibility { GLOBAL RESTRICTED }`; `VideotecaFileState { PENDING PROCESSING READY FAILED DELETING }`; `VideotecaMediaType { IMAGE VIDEO }`; `VideotecaStudentEffect { ALLOW DENY }`; `VideotecaMediaJobState { PENDING RUNNING RETRY_SCHEDULED SUCCEEDED FAILED }`.

| Model | Fields and nullability | Relations, constraints, deletes |
|---|---|---|
| `TrainingGroup` | `id`, `name`, `normalizedName`, `ownerTrainerId`, timestamps, `version` non-null | owner FK `User` restrict; unique `(ownerTrainerId, normalizedName)`; owner must be persisted TRAINER at command time. |
| `TrainingGroupMember` | `groupId`, `studentProfileId`, `createdAt`, `createdByUserId` non-null | composite PK `(groupId,studentProfileId)`; group/profile/user FKs `onDelete: Restrict`; command admits active students only. |
| `VideotecaFolder` | existing identity/name/`parentId`/timestamps plus non-null `createdByUserId`, `version` | self FK `onDelete: Restrict`; creator FK non-null `onDelete: Restrict`; sibling-name uniqueness follows current repository convention; recursive validation rejects self/cycles. |
| `VideotecaFolderPolicy` | `id`, unique non-null `folderId`, `visibility`, nullable `ownerTrainerId`, `version`, timestamps | folder cascade; owner User restrict. DB/service check: RESTRICTED requires owner; root has one explicit policy; GLOBAL may have null owner. |
| `VideotecaFolderGroupGrant` | non-null `policyId`, `groupId`, `createdAt`, `createdByUserId` | policy cascade; group/user restrict; unique `(policyId,groupId)`. |
| `VideotecaFolderStudentException` | non-null `policyId`, `studentProfileId`, `effect`, timestamps, `createdByUserId` | policy cascade; profile/user restrict; unique `(policyId,studentProfileId)`. |
| `VideotecaFile` | non-null `id`, `folderId`, names, `orderIndex`, `createdByUserId`, `stagingKey`, declared type/expected bytes, `state`, `version`, `processingGeneration`, timestamps; nullable `sealedSourceRef`, thumbnail ref, verified type/bytes/dimensions/duration, expiry/confirmed/ready/failed/deletion times and diagnostics | folder/user FKs `onDelete: Restrict`; ordinary unique `(folderId,normalizedName)` until physical row removal. `PENDING` has staging key and expiry, no sealed ref; confirmed/processing/ready/failed/deleting source has sealed ref. READY IMAGE requires type, bytes, width, height and thumbnail; READY VIDEO additionally requires positive duration. Diagnostics are nullable, sanitized, configured-length, and never contain secrets/URLs/keys/stacks. |
| `VideotecaMediaJob` | non-null `id`, `fileId`, `generation`, `state`, `attemptCount`, `maxAttempts`, `availableAt`, timestamps; nullable lease fields, completion and safe error | file `onDelete: Cascade`; unique `(fileId,generation)`; `generation` equals file `processingGeneration`; job state and lease CAS guard completion. |
| `VideotecaIdempotency` | opaque key, `actorId`, operation, request fingerprint, resource/result reference, created/expiry timestamps | unique `(actorId,operation,key)`; same fingerprint returns compatible result, different one conflicts. |

Exact Prisma scalar contract: `TrainingGroup` uses `id String @id @default(cuid())`, `name String`, `normalizedName String`, `ownerTrainerId String`, timestamps and `version Int @default(0)`; `TrainingGroupMember` has **no id**, exactly `groupId String`, `studentProfileId String`, `createdByUserId String`, `createdAt DateTime @default(now())`, and `@@id([groupId,studentProfileId])`. `VideotecaFolder` uses `id`, `name`, `normalizedName`, `parentId String?`, `createdByUserId String`, timestamps and version; `VideotecaFolderPolicy` uses `id`, `folderId String @unique`, visibility, nullable owner, timestamps/version. Grant/exception models use `id`, non-null FK scalars, timestamps, and exception effect. All `createdByUserId` and idempotency `actorId` fields are non-null `User` FKs with `onDelete: Restrict`.

`VideotecaFile(id String @id @default(cuid()), folderId String, originalName String, normalizedName String, orderIndex Int @default(0), createdByUserId String, declaredContentType String, expectedSizeBytes BigInt, state VideotecaFileState @default(PENDING), version Int @default(0), processingGeneration Int @default(0), stagingObjectKey String?, stagingObjectIdentity String?, sealedObjectKey String?, sealedObjectIdentity String?, thumbnailObjectKey String?, mediaType VideotecaMediaType?, verifiedContentType String?, sizeBytes BigInt?, width Int?, height Int?, durationMs Int?, uploadExpiresAt DateTime?, confirmedAt DateTime?, readyAt DateTime?, failedAt DateTime?, deletionRequestedAt DateTime?, failureCode String?, failureMessage String?, failureRetryable Boolean?)`. `VideotecaMediaJob(id String @id @default(cuid()), fileId String, generation Int, state VideotecaMediaJobState @default(PENDING), attemptCount Int @default(0), maxAttempts Int, availableAt DateTime @default(now()), leaseOwner String?, leaseExpiresAt DateTime?, lastHeartbeatAt DateTime?, completedAt DateTime?, lastErrorCode String?)`. `VideotecaIdempotency(id String @id @default(cuid()), actorId String, operation String, idempotencyKey String, requestFingerprint String, resultRef String?, expiresAt DateTime)` has unique `(actorId,operation,idempotencyKey)`.

FAILED references: pre-seal verification failure retains only staging identity/key until cleanup, then clears both; post-seal processing failure retains sealed key/identity for configured retry retention, clears staging fields, and cleanup deletes sealed source/thumbnail before row deletion. Neither form is consumable.

Literal SQL invariants: `CREATE UNIQUE INDEX videoteca_root_name_uq ON "VideotecaFolder"("normalizedName") WHERE "parentId" IS NULL; CREATE UNIQUE INDEX videoteca_child_name_uq ON "VideotecaFolder"("parentId","normalizedName") WHERE "parentId" IS NOT NULL;` ordinary `UNIQUE("folderId","normalizedName")` remains until physical deletion. `CHECK (("stagingObjectKey" IS NULL) = ("stagingObjectIdentity" IS NULL)); CHECK (("sealedObjectKey" IS NULL) = ("sealedObjectIdentity" IS NULL)); CHECK (state <> 'READY' OR (sealed pair, thumbnail, verifiedContentType, mediaType are non-null AND sizeBytes>0 AND width>0 AND height>0 AND ((mediaType='IMAGE' AND durationMs IS NULL) OR (mediaType='VIDEO' AND durationMs>0)))); CHECK (state <> 'FAILED' OR (failureCode IS NOT NULL AND ((staging pair and sealed pair absent) OR (sealed pair and staging pair absent))));` FAILED pre-seal cleans staging; post-seal cleans sealed source/thumbnail after retention. Current/actionable jobs require `generation = file.processingGeneration`; older jobs are terminal history/stale and cannot mutate files. Jobs use partial `(availableAt,id) WHERE state IN ('PENDING','RETRY_SCHEDULED')` and `(leaseExpiresAt,id) WHERE state='RUNNING'`. Migration order: add enums/tables/nullable fields/indexes; deploy readers/writers closed; enforce checks; dispose approved local rows/bytes; remove local byte path after smoke gates.

## Policy and Authorized Query Algorithms

```ts
resolvePolicy(targetFolderId): PolicySource {
  ancestors = recursiveCTE(targetFolderId, parentId) // nearest first, cycle => integrity deny
  source = first ancestors joined to FolderPolicy
  if (!source) denyOpaque("POLICY_INTEGRITY_ERROR")
  return source
}
canRead(actor, source): boolean {
  requireActiveSession(actor)
  if (actor.role === ADMIN) return true
  if (actor.role === TRAINER && source.ownerTrainerId === actor.id) return true
  if (actor.role === STUDENT && !hasActiveStudentProfile(actor.id)) return false
  student = activeStudentProfile(actor); if (student?.exception === DENY) return false
  if (student?.exception === ALLOW) return true
  if (student && exists(active membership joined to source grants)) return true
  return source.visibility === GLOBAL
}
```

Missing policy, unauthenticated state, hidden resource, or unauthorized mutation returns the safe not-found/forbidden form without protected metadata. A root creation writes its explicit policy atomically; nested creation chooses explicit policy or inheritance. Policy replace/resume-inheritance calculates affected descendant count and broader/narrower audience before confirmation; version CAS prevents stale replacement. A child policy governs until a nearer descendant policy; resume deletes only that policy source.

`previewAudience(folderId, proposal, expectedVersion)` loads the subtree and current effective policies in one repeatable snapshot, resolves current and proposed access predicates against the active-student population without returning identities, then returns `{affectedSubtreeCount, currentAllowedCount, proposedAllowedCount, classification:"broader"|"narrower"|"mixed"|"unchanged", previewVersion}`. `broader`/`narrower` mean a strict set superset/subset; `mixed` means both additions and removals. `previewVersion` is a digest of target/subtree policy versions and proposal. DEFINE or RESUME apply requires matching `expectedVersion` and `previewVersion`; any change conflicts with `VERSION_CONFLICT`/`POLICY_CONFLICT` and requires a new preview.

| Command | ADMIN | owner TRAINER | non-owner TRAINER / STUDENT | Guard |
|---|---|---|---|---|
| browse/view/download READY | allow | own policy; GLOBAL as reader | GLOBAL or student precedence only | current policy each request |
| root/create child, rename/delete empty folder | allow | owned scope; root owner forced actor | deny | root policy, no cycles/self/non-empty delete |
| replace policy/grants/exceptions | allow; may transfer owner | own policy; cannot transfer | deny | expected policy/folder version |
| group/member commands | all | own group | deny | active duplicate-free members; referenced delete conflicts |
| upload/rename/retry/delete | allow | owned source | deny | state/version/idempotency |
| move/bulk move | allow | own source **and** destination | deny | preauthorize every target and destination, validate all names, one transaction |
| reconciliation/report | allow | deny | deny | operational identity |

Browse validates `query`, `sort`, `page`, `pageSize`, `mediaType`, `visibility`, `group`; management additionally validates `state`. Accepted sort keys are `name`, `updatedAt`, `sizeBytes`, `orderIndex`, each direction-defined by schema and always `id` final tie-breaker. The repository applies effective-policy predicate, filters, sort and bounds before count/page; returns `items,page,pageSize,totalCount,totalPages`. Consumer rows are READY only; management state is still ownership-scoped. Folder detail computes every breadcrumb through authorized ancestors; inaccessible/malformed ancestry denies rather than returns a partial path.

## Object Storage Contract

```ts
type StorageFailure = { code: "NOT_FOUND"|"UNAVAILABLE"|"FORBIDDEN"|"INVALID_RESPONSE"|"STAGING_OBJECT_CHANGED"; retryable: boolean }
type StagingObjectIdentity = string & { readonly __brand: "StagingObjectIdentity" }
type SealedObjectRef = { key:string; identity:string }
interface ObjectStorage {
 signPut(input:{key:string; contentType:string; expiresAt:Date; requiredHeaders:Record<string,string>}): Promise<{url:string; expiresAt:Date; requiredHeaders:Record<string,string>}>
 signGet(input:{key:string; purpose:"VIEW"|"THUMBNAIL"|"DOWNLOAD"; expiresAt:Date; disposition?:string}): Promise<{url:string; expiresAt:Date}>
 headStaging(key:string): Promise<{identity:StagingObjectIdentity; sizeBytes:number; contentType?:string}>
 boundedRead(input:{key:string; expectedIdentity:StagingObjectIdentity; maxBytes:number}): Promise<Uint8Array>
 sealUpload(input:{stagingKey:string; expectedIdentity:StagingObjectIdentity; expectedSizeBytes:number; verifiedContentType:string}):Promise<{sealed:SealedObjectRef; sizeBytes:number}>
 stream(key:string): Promise<ReadableStream>; putDerivative(input:{key:string; body:ReadableStream|Uint8Array; contentType:string}):Promise<void>
 delete(key:string):Promise<void>; exists(key:string):Promise<boolean>
 listPrefix(input:{prefix:string; cursor?:string; limit:number}):Promise<{objects:{key:string; lastModified:Date}[]; cursor?:string}>
}
```

The adapter normalizes failures and never returns credentials/raw signed data to domain errors. PUT is one generated opaque **staging** key, finite expiry and mandatory signed headers; it cannot read/list. Confirmation calls `headStaging`, then `boundedRead` with its mandatory `StagingObjectIdentity`; either detects a changed current identity as `STAGING_OBJECT_CHANGED`. `sealUpload` atomically compares that identity before materializing immutable `SealedObjectRef`; it returns `STAGING_OBJECT_CHANGED` on a race and no changed bytes may become sealed. The transaction stores only sealed key/identity before work. Worker and access consume sealed refs only; a valid late PUT overwrites only abandoned staging; cleanup deletes staging remnants. GET is reauthorized and READY-only; view/thumbnail inline and download uses sanitized disposition. Access response is `Cache-Control: no-store`; private cache age cannot outlive capability. Conformance proves private identity, signing, expiry/header, HEAD, bounded read, seal identity/integrity/post-seal immutability, idempotent delete, prefix pagination, CORS, and Range/206. RED test overwrites staging between verification and seal and requires `STAGING_OBJECT_CHANGED` with no sealed changed bytes. A provider may use version identity or conditional materialization internally; unsupported atomic seal fails conformance/readiness without fallback.

## API Contracts

All handlers require session, parse Zod params/query/body, invoke one service, and return existing envelopes. DTO timestamps are ISO-8601 UTC; bytes/duration are numbers. `FolderDTO`/`FileDTO` add `version`, effective-policy summary/source, pagination where applicable, and `capabilities:{canView,canUpload,canRename,canMove,canDelete,canManageVisibility,canRetry}`; no keys, signed URLs after expiry, raw errors, or jobs.

Mutating idempotent routes read the `Idempotency-Key` request header and name it `idempotencyKey` internally; neither it nor any object key appears in DTOs. Query uses exact `group`, not `groupId`. `DELETE /api/videoteca/files/:fileId` accepts `{expectedVersion}` plus header and returns one `FileDTO`; `POST /api/videoteca/files/bulk-delete` accepts `BulkDelete`. `POST /api/videoteca/folders/:folderId/access-policy/preview` accepts a DEFINE/RESUME proposal without `previewVersion` and returns `AudiencePreviewDTO`; `PUT .../access-policy` requires `PolicyCommand` with both versions.

```ts
type FileDTO = { id:string; folderId:string; name:string; state:"PENDING"|"PROCESSING"|"READY"|"FAILED"|"DELETING";
  mediaType:"IMAGE"|"VIDEO"|null; sizeBytes:number|null; width:number|null; height:number|null; durationMs:number|null;
  version:number; failureCode?:string; failureMessage?:string; failureRetryable?:boolean; capabilities:Capabilities; updatedAt:string }
type PageDTO<T> = { items:T[]; page:number; pageSize:number; totalCount:number; totalPages:number; sort:string; filters:ValidatedFilters }
type PolicyCommand = { mode:"DEFINE"; visibility:"GLOBAL"|"RESTRICTED"; ownerTrainerId?:string; groupIds:string[];
  studentExceptions:{studentProfileId:string;effect:"ALLOW"|"DENY"}[]; expectedVersion:number; previewVersion:string }
 | { mode:"RESUME_INHERITANCE"; expectedVersion:number; previewVersion:string }
type BulkMove = { fileIds:string[]; destinationFolderId:string; expectedVersions:Record<string,number>; idempotencyKey:string }
type BulkDelete = { fileIds:string[]; expectedVersions:Record<string,number>; idempotencyKey:string }
```

| Method/path | Input schema | Response / errors |
|---|---|---|
| GET/POST `/api/videoteca/folders` | validated browse; `{name,parentId,policy|inheritance,idempotencyKey}` | page / FolderDTO; `VALIDATION_ERROR`, opaque `NOT_FOUND`, `POLICY_CONFLICT` |
| GET/PATCH/DELETE `/api/videoteca/folders/:id` | id; `{name,expectedVersion}`; version | detail/breadcrumb / FolderDTO; `VERSION_CONFLICT`, `FOLDER_NOT_EMPTY` |
| GET `/api/videoteca/folders/:id/files`; PUT `/api/videoteca/folders/:id/access-policy` | browse; `PolicyCommand` | `PageDTO<FileDTO>`; policy+audience preview/apply result; conflicts and opaque denial |
| group GET/POST/PATCH/DELETE and PUT `/:id/members` | browse; owner/name/version; unique active profile IDs | group/page; `DUPLICATE_NAME`, `GROUP_REFERENCED`, `VERSION_CONFLICT` |
| POST `/api/videoteca/uploads`, `/api/videoteca/uploads/:id/url`, `/api/videoteca/uploads/:id/confirm` | `{folderId,originalName,declaredContentType,sizeBytes,idempotencyKey}`; `{idempotencyKey}`; `{idempotencyKey}` | pending capability; refreshed capability; `FileDTO`; `FILE_TOO_LARGE`, `UPLOAD_EXPIRED`, `SIZE_MISMATCH`, `UNSUPPORTED_MEDIA_TYPE`, `OBJECT_NOT_FOUND` |
| PATCH `/api/videoteca/files/:id`; POST `/api/videoteca/files/bulk-move`, `/bulk-delete`, `/:id/retry`, `/:id/access` | `{name,expectedVersion}`; `BulkMove`; `BulkDelete`; `{expectedVersion,idempotencyKey}`; `{purpose}` | `FileDTO`/state/access URL+expiry; `INVALID_FILE_STATE`, `DUPLICATE_NAME`, `MEDIA_PROCESSING_FAILED`, `STORAGE_UNAVAILABLE` |

`401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409` conflict codes, `410 UPLOAD_EXPIRED`, `413 FILE_TOO_LARGE`, `422 MEDIA_PROCESSING_FAILED`, `429 RATE_LIMITED`, `503` unavailable are stable. Idempotency applies initialize/confirm/retry/delete/bulk; expectedVersion applies rename, policy, move and state-sensitive mutations.

## Lifecycle, Worker, and Reconciliation

| State | Allowed command/transition | Result |
|---|---|---|
| PENDING | refresh while authorized/unexpired; confirm | same row/key; verified object -> PROCESSING + unique generation job |
| PENDING | cancel/expiry/invalid verification | DELETING; non-retryable verification may FAILED; expired never refreshes |
| PROCESSING | job completion | READY only with verified metadata and required private thumbnail; otherwise FAILED |
| FAILED | authorized retryable retry | increment generation, PROCESSING + one job; else delete/retention |
| READY | access; reconciliation missing bytes; delete | signed access only; FAILED; or DELETING |
| DELETING | cleanup/retry | access denied; missing objects succeed; finalize row only when known keys absent |

| Job state | Entry / eligibility | Atomic CAS exit and stale behavior |
|---|---|---|
| PENDING | confirm inserts unique `(fileId,generation)` with `availableAt`; claim eligible when due | claim ordered `availableAt,id` under `FOR UPDATE SKIP LOCKED`; CAS to RUNNING sets owner, expiry, heartbeat, increments attempt. |
| RUNNING | only a worker holding unexpired lease processes | heartbeat CAS requires state/owner/unexpired lease and extends it. Success CAS requires job owner+RUNNING, file PROCESSING+same `processingGeneration`; atomically persist verified metadata/thumbnail ref, file READY, job SUCCEEDED/completedAt. Delete/generation mismatch returns stale and deletes derivative. |
| RETRY_SCHEDULED | retryable processing failure or expired lease, attempts remaining; eligible when `availableAt` due | transaction clears lease and schedules configured backoff. Claim follows PENDING ordering. |
| SUCCEEDED | only successful completion | terminal; repeated/stale completion changes nothing. |
| FAILED | non-retryable error or exhausted attempts | transaction clears lease, sets job FAILED/completedAt and file FAILED only where matching PROCESSING generation; stale mismatch terminalizes job without file mutation. |

Lease reclaim is a separate transaction: lock only expired RUNNING rows ordered `(leaseExpiresAt,id)`; matching current generation moves to RETRY_SCHEDULED with configured backoff/`availableAt`, clears all lease fields, or atomically marks job and current PROCESSING file FAILED on exhaustion. Heartbeat/success/failure CAS always require matching owner, RUNNING state, generation, and unexpired lease. Stale generation/file state terminalizes/discards its job and never mutates the file. Every error is safe/redacted. A manual retry increments `processingGeneration`, creates its unique job, and makes prior completion stale.

```text
initialize: authorize folder -> idempotency lookup -> DB tx create PENDING/version/stagingObjectKey/expiry -> sign PUT(stagingObjectKey)
confirm: authorize -> headStaging + boundedRead(stagingObjectKey, expectedIdentity) -> sealUpload -> DB tx CAS PENDING/version, save sealedObjectKey/Identity, clear stagingObjectKey/Identity, set PROCESSING, processingGeneration++, insert unique job; cleanup staging
cancel/delete: authorize all + idempotency -> DB tx CAS targets DELETING -> delete staging/sealed source/derivative outside tx -> finalize each
retry: authorize FAILED/retryable -> DB tx CAS processingGeneration++, PROCESSING, unique job
claim: DB tx select only due PENDING/RETRY_SCHEDULED job FOR UPDATE SKIP LOCKED order availableAt,id;
       CAS RUNNING, leaseOwner, leaseExpiresAt, heartbeat, attempt++ -> commit
heartbeat: conditional update job where RUNNING/leaseOwner/not expired; complete: verify owned lease + file PROCESSING/generation;
          write metadata/READY or FAILED; stale/delete winner removes produced derivative and changes no file
```

No transaction encloses S3, FFmpeg, ffprobe, transfer, or processing. Worker uses configured finite lease/heartbeat/concurrency/backoff/attempt/resource limits and isolated temporary workspace. Deterministic derivative keys allow overwrite only for the generation. Reconciliation is repeatable and prefix-bounded:

| Observation | Correction |
|---|---|
| PENDING beyond expiry | DELETING, delete known key, finalize when absent. |
| PROCESSING expired lease / missing current job | reschedule within bounds or FAILED. |
| READY source or thumbnail missing | FAILED with safe integrity code and alert. |
| DELETING remaining bytes | retry deletion; retain blocked state. |
| FAILED beyond retention | DELETING and idempotent cleanup. |
| aged prefix object without DB owner | delete only after configured grace excludes in-flight confirmation. |
| job file/generation mismatch | terminally discard; clean stale derivative; never mutate file. |

## UI and Accessibility Architecture

Planned UI modules: `videoteca-query-state` parses/serializes URL filters; `browse-controller` fetches pages/details and refetches after mutation; `folder-tree`/breadcrumb; `grid-view` and `list-view`; `capability-actions`; `policy-panel` and group/member dialogs; `upload-queue`; `selection-bulk-bar`; image/video viewers; `status-announcer`.

URL owns query/sort/page/media/visibility/group/state and view presentation; it is reproducible on refresh/back. Upload queue machine per file is `select -> initializing -> uploading -> confirming -> processing -> ready|failed|deleting|expired`; browser abort precedes cancel request, transport retry refreshes same unexpired capability, expiry reinitializes preserving selected File when available, and one failure never removes another result. URLs stay transient in viewer memory; expiry requests a new authorized access URL.

| Actor/lifecycle | Actions |
|---|---|
| ADMIN | all server-advertised management; READY consume; operational UI only where authorized. |
| owner TRAINER | owned create/policy/group/upload/rename/move/delete/retry; READY consume. |
| non-owner TRAINER | consume GLOBAL only; no management. |
| STUDENT | authorized READY consume only; never management/non-READY. |
| any DELETING | no new access/mutation; disabled in-progress row until refetch removal. |

Grid/list expose identical resources/actions and announced selected state. Dialogs name consequence/affected audience, contain initial focus, support safe Escape and deterministic focus return. Semantic buttons/links/lists/tables, visible focus, keyboard selection/bulk/menu/viewer controls, labelled progress without percentage spam, and concise live outcomes are mandatory. Distinguish loading, initial error, empty, filtered-empty, forbidden, not-found, pending, processing, failed, deleting, expired, unavailable, and stale-version. On `VERSION_CONFLICT`, preserve draft, refetch current policy/resource, require review before resubmit. Remove featured video, daily tip, floating root upload, and any action without a contract.

## Security, Operations, Tests, and Rollout

| Area | Executable requirement |
|---|---|
| Configuration | Validate storage endpoint/region/bucket/prefix/path-style/signing context; runtime credentials; URL/cache/expiry; media allowlist categories (container, video codec, audio codec, stream count, dimensions, duration, input/output bytes); worker CPU, memory, execution-time, temp-storage and concurrency limits; retention/reconciliation scan/grace/delete bounds; CORS origins/methods/headers. Values are deployment inputs; cache age <= access lifetime. |
| Threat controls | Private bucket/no ACL/website/public URL; opaque keys; session+policy before every capability; type/size before sign and confirm; configured rate limits and CSRF/same-origin command protection; sanitize disposition; isolate parsers; redact URLs, headers, keys, credentials, raw responses from logs/traces/analytics/support. |
| Events/metrics/alerts | Correlation-linked upload/transition/claim/heartbeat/retry/access/policy/delete/reconciliation events with IDs, generation, safe code, duration/bytes. Track state age, queue/lease, processing, access, cleanup, storage, missing bytes/orphans; alert sustained queue age, exhausted jobs, aged deletes, storage outage, integrity repairs, abnormal denials. |
| Health | Independently report API, database, storage reachability and worker liveness; missing config/public exposure/unavailable required dependency fails relevant readiness and never opens fallback access. |
| Tests | Unit: precedence, including STUDENT without active profile denied for both GLOBAL and RESTRICTED; mutation matrix, inheritance/cycles, names, state/version/generation/redaction. PostgreSQL: CTE/policy/filter/page/index plans, conflicts and opaque errors. Adapter: signing/header/expiry/HEAD/bounded read/**seal immutability**/Range/CORS/delete/list. Integration: direct image/video lifecycle, concurrency/crash/races/recovery/reconciliation. Route: schemas/envelopes/codes. UI/a11y: roles, query state, queue, conflict, dialogs, viewers, keyboard/focus/live regions, contrast, non-color cues, responsive widths/zoom, bulk/upload/viewer state. Run web Vitest, lint, build; report known baseline separately. |

Approved non-goals: HLS; renditions; transcoding; captions; virus scanning; resumable uploads; public/anonymous/permanent links; per-file ACLs; provider selection; local-media migration; authentication replacement; unrelated user, trainer, payment, routine, or product redesign.

Cutover: explicitly approve maintenance; validate private infrastructure and adapter conformance; pause mutations and drain/pause workers; apply schema; dispose approved local test folders/files/bytes without copying paths/names/thumbnails; deploy API/UI/worker/reconciliation together; create fresh data only through APIs; smoke role matrix, direct image/video, private seek/download, delete, reconciliation, private bucket, ownership, state-age, and no smoke-flow orphan. Reopen only when every gate passes. Rollback keeps mutations closed, stops workers, restores prior deployment/schema as required, reconciles/removes private objects, and never reverses them into local storage.

## Threat Matrix

| Boundary | Applicability | Safe behavior / RED test |
|---|---|---|
| Documentation-like paths | Applicable: FFmpeg/ffprobe process integration | Never derive command/program/argument from original filename; materialize sealed bytes only at generated workspace paths, pass argv without shell, reject traversal/control characters. Failure is safe FAILED diagnostics/no subprocess. RED: `requirements.txt`, `CMakeLists.txt`, executable Markdown/MDX, `README.sh` each cannot alter executable/argv or workspace escape. |
| Git repository selection | N/A: no VCS integration | No repository/cwd selector exists; no RED task. |
| Commit state | N/A: no commit automation | No index/worktree behavior; no RED task. |
| Push state | N/A: no push automation | No destination/ref resolution; no RED task. |
| PR commands | N/A: no PR automation | No PR argument composition; no RED task. |

## Requirement Traceability

The traceability inventory is 43 requirements and 69 scenario families. Requirement names below preserve the specification headings; each scenario family names the linked Given/When/Then coverage, including split operational acceptance and scope-exclusion requirements.

| Spec requirement | Scenario family | Design / contract | Test | Rollout gate |
|---|---|---|---|---|
| authorization: Authenticated policy evaluation | Inherited policy permits access; Missing policy denies access | Policy algorithm | unit/route opaque denial | role matrix |
| authorization: Exact read precedence | Student denial overrides global access; Group grants restricted access | Policy algorithm | precedence matrix | role matrix |
| authorization: Managed group and policy authority | Inactive membership grants nothing; Unauthorized mutation is opaque | Prisma groups + command matrix | repository/route | ownership smoke |
| authorization: Mutation authority matrix | Trainer creates an owned restricted root; Child override changes its subtree; Audience change requires authority | policy command/CAS | unit/integration | policy smoke |
| authorization: Source and destination mutation checks | Destination denies an otherwise owned move; Resume inheritance changes audience predictably | command matrix | bulk/move integration | role matrix |
| object-storage: Private opaque objects | Object key is not exposed | Storage/security | DTO/log tests | private-bucket |
| object-storage: Authorized ephemeral transfers | Authorized READY access; Non-ready access is refused | Storage/API | adapter/route | private access |
| object-storage: Provider conformance boundary | Provider incompatibility fails safely | Storage contract | conformance | readiness |
| object-storage: Signed-operation conformance | Signed headers and expiry are enforced; Verified access supports Range; Bounded verification avoids full serving | Storage contract | adapter | seek smoke |
| object-storage: Cache, disposition, and deletion semantics | Download cannot inject a filename; Repeated deletion is safe | Storage/security | adapter | cleanup smoke |
| lifecycle: Per-file direct upload lifecycle | Verified upload enters processing; Type mismatch fails safely | lifecycle pseudocode | integration | image/video |
| lifecycle: READY is the sole consumable state | Failed item is unavailable | state table/access API | route/integration | access smoke |
| lifecycle: Idempotent concurrent recovery | Delete wins a worker race; Expired pending work recovers | CAS/jobs | concurrency/reconcile | state-age |
| lifecycle: Complete transition and upload-control rules | Expired upload starts fresh; Invalid transition conflicts | state table | unit/route | lifecycle smoke |
| lifecycle: Processing generation and readiness proof | Concurrent manual retry creates one generation; Lease-expired work recovers safely | claim algorithm | worker integration | queue health |
| lifecycle: State-safe errors and independent outcomes | Delete prevents late readiness | queue/state table | UI/integration | lifecycle smoke |
| browse: Server-authorized bounded discovery | Consumer list excludes processing files; Hidden resource does not leak | query algorithm | repository/route | role matrix |
| browse: Authorized private consumption | Video seeking remains private; Revoked actor cannot refresh | access contract | adapter/UI | Range smoke |
| browse: Machine-safe browse contracts | Stale capability is rejected | DTO/API | route/UI | contract smoke |
| browse: Exact bounded-query contract | Management state remains scoped; Breadcrumb omits inaccessible ancestor | query algorithm | repository | browse smoke |
| browse: Access-response and expiry contract | Expired access rechecks policy | access contract | integration | role matrix |
| browse: Stable safe browse errors | Invalid pagination is actionable | API table | route | contract smoke |
| management: Folder policy and hierarchy management | Resuming inheritance changes descendants; Non-empty folder deletion conflicts | domain/CAS | integration | policy smoke |
| management: Atomic conflict-safe commands | Concurrent policy edit conflicts; Bulk failure is atomic | command matrix | integration | mutation smoke |
| management: Group and file command constraints | Repeated deletion is compatible | schema/delete flow | repository | cleanup smoke |
| management: Complete folder and policy commands | Nested creation inherits intentionally; Policy replacement rejects stale version | policy algorithm | route/UI | policy smoke |
| management: Complete group ownership and membership commands | Referenced group cannot be deleted; Another trainer cannot replace members | group commands | integration | ownership smoke |
| management: File command and cleanup completion | Bulk delete retains pending cleanup | delete/reconcile | integration | deletion smoke |
| UX: Reproducible authorized navigation | Refresh preserves the query | UI architecture | UI | browse smoke |
| UX: Capability and lifecycle-aware actions | Student sees consumption only; Upload failure remains independent | UI matrix/queue | UI | role/lifecycle |
| UX: Accessible management and viewers | Destructive confirmation is accessible | accessibility design | a11y keyboard | accessibility smoke |
| UX: Functional-scope integrity | Expired URL is refreshed safely | viewer/security | UI | contract smoke |
| UX: Complete navigation and management workflows | Grid and list are both functional; Policy dialog handles a conflict | UI architecture | UI/a11y | workflow smoke |
| UX: Complete upload and file workflows | Cancelled transfer enters cleanup; Bulk action preserves query context | queue/bulk | UI/integration | lifecycle smoke |
| UX: Accessible state coverage | Keyboard-only state recovery | state/accessibility | a11y | accessibility smoke |
| operations: Validated fail-closed operation | Unsafe storage configuration blocks readiness | config/health | config test | readiness |
| operations: Recoverable worker and reconciliation | Missing READY derivative is repaired safely; Lease expiry permits recovery | worker/reconcile | integration | queue/state-age |
| operations: Safe observability and rollback | Storage outage remains recoverable | security/rollout | integration | delete recovery |
| operations: Approved clean cutover acceptance | Cutover does not migrate test media | rollout | operational rehearsal | maintenance approval |
| operations: Worker safety, health, and configuration invariants | Worker crash is recoverable | claim/health | worker test | liveness |
| operations: Complete reconciliation and retention matrix | Failed retention cleans bytes; Orphan grace prevents premature deletion | reconciliation matrix | integration | orphan smoke |
| operations: Observable secure operations and acceptance gate | Acceptance gate blocks reopening | rollout/observability | smoke | reopen gate |
| operations: Explicit scope exclusion | Excluded delivery feature is not implied | non-goals/Range access | adapter/UI smoke | reopen gate |
