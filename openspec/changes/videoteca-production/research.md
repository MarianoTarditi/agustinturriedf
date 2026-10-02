# Videoteca Production Research Evidence

## Contract

| Field | Value |
|---|---|
| Schema | `gentle-ai.sdd-research/v1` |
| Request ID | `videoteca-production-research-20260913-01` |
| Request revision | `1` |
| Outcome | `done` |
| Requested source classes | `documentation`, `open-web` |

This artifact persists previously collected and validated, read-only external evidence. It does not claim that application code has been implemented, select a provider, or create new product consent.

## Questions and selected lanes

| Lane | Evidence question |
|---|---|
| S3 signed upload/access semantics | Which provider-neutral signing, upload confirmation, byte-range access, deletion, CORS, and caching constraints must the storage boundary preserve? |
| Next.js 15 runtime/deployment | Which Route Handler runtime and deployment constraints determine where control-plane endpoints and media-byte handling belong? |
| Media worker strategy | Which probe, thumbnail, isolation, resource-bound, idempotency, and compatibility constraints must a media worker preserve? |
| Prisma/PostgreSQL concurrency | Which database primitives support safe concurrent job claims, leases, retries, conditional completion, and actionable indexes with Prisma 6? |

## Admission and observed grants

| Field | Value |
|---|---|
| Capability schema | `gentle-ai.sdd-research-capability/v1` |
| Admission | `accepted` |
| Documentation grant | Exact grant via `context7` |
| Open-web grant | Exact grant via `webfetch` |
| Access boundary | Read-only external evidence only |

The observed grants exactly match the requested source classes. No write-capable external access was admitted or used.

## Executive conclusions

1. Keep Next.js Route Handlers in the Node.js control plane and keep object bytes plus FFmpeg/ffprobe work outside request-bound functions.
2. Use short-lived, operation-specific signed capabilities, direct browser-to-storage transfer, `HEAD` confirmation, narrowly scoped CORS, byte-range-compatible signed reads, and private bounded caching.
3. Use a separately deployable, resource-constrained media worker for probe plus thumbnail only, with deterministic derivative keys and an explicit allowlist based on probed container and codecs.
4. Use short PostgreSQL claim transactions with `FOR UPDATE SKIP LOCKED`, leases, processing outside the transaction, conditional finalization, bounded recovery, and partial indexes. Use bounded parameterized raw SQL if pinned Prisma 6 cannot safely express the claim operation.

## Source registry

All bounded source excerpts were accessed on `2026-09-13`.

| ID | Class | Title | Publisher | URL | Accessed at | Bounded excerpt |
|---|---|---|---|---|---|---|
| AWS-PRESIGN | `documentation` | Download and upload objects with presigned URLs | Amazon Web Services | https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html | 2026-09-13 | Presigned URLs provide time-limited access to private S3 objects and use the permissions of the principal that generated them. |
| AWS-GET | `documentation` | GetObject | Amazon Web Services | https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html | 2026-09-13 | GetObject supports a Range request header and returns the requested byte range. |
| AWS-HEAD | `documentation` | HeadObject | Amazon Web Services | https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadObject.html | 2026-09-13 | HEAD retrieves object metadata without returning the object body. |
| AWS-DELETE | `documentation` | DeleteObject | Amazon Web Services | https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html | 2026-09-13 | Deletion behavior differs according to whether bucket versioning is disabled, enabled, or suspended. |
| AWS-CORS | `documentation` | Elements of a CORS configuration | Amazon Web Services | https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManageCorsUsing.html | 2026-09-13 | CORS rules identify allowed origins, methods, headers, and response headers exposed to browser code. |
| R2-COMPAT | `documentation` | S3 API compatibility | Cloudflare | https://developers.cloudflare.com/r2/api/s3/api/ | 2026-09-13 | R2 implements a documented subset of the S3 API; unsupported operations and headers are listed explicitly. |
| R2-PRESIGN | `documentation` | Presigned URLs | Cloudflare | https://developers.cloudflare.com/r2/api/s3/presigned-urls/ | 2026-09-13 | R2 presigned URLs support GET, HEAD, PUT, and DELETE operations with configurable expiration. |
| HTTP-SEMANTICS | `open-web` | RFC 9110 — HTTP Semantics | IETF | https://www.rfc-editor.org/rfc/rfc9110.html | 2026-09-13 | A satisfiable range request can produce a 206 Partial Content response; PUT and DELETE are idempotent methods. |
| HTTP-CACHE | `open-web` | RFC 9111 — HTTP Caching | IETF | https://www.rfc-editor.org/rfc/rfc9111.html | 2026-09-13 | Private response directives prevent shared caches from storing a response while permitting private-cache storage. |
| NEXT-ROUTES | `documentation` | Route Handlers | Vercel | https://nextjs.org/docs/15/app/api-reference/file-conventions/route | 2026-09-13 | Route Handlers use standard Web Request/Response APIs and support common HTTP methods. |
| NEXT-RUNTIME | `documentation` | Route Segment Configuration | Vercel | https://nextjs.org/docs/15/app/api-reference/file-conventions/route-segment-config | 2026-09-13 | A route segment can select Node.js or Edge runtime; Node.js is default. |
| VERCEL-LIMITS | `documentation` | Vercel Functions limits | Vercel | https://vercel.com/docs/functions/limitations | 2026-09-13 | Function duration, memory, payload, and filesystem behavior are constrained by deployment environment and plan. |
| FFPROBE | `documentation` | ffprobe Documentation | FFmpeg Project | https://ffmpeg.org/ffprobe.html | 2026-09-13 | ffprobe gathers information from multimedia streams and can emit machine-readable output. |
| FFMPEG | `documentation` | ffmpeg Documentation | FFmpeg Project | https://ffmpeg.org/ffmpeg.html | 2026-09-13 | ffmpeg reads multimedia inputs, filters streams, and writes selected or converted output frames. |
| DOCKER-LIMITS | `documentation` | Resource constraints | Docker | https://docs.docker.com/engine/containers/resource_constraints/ | 2026-09-13 | Containers have unrestricted resource access by default unless memory and CPU constraints are configured. |
| MDN-CONTAINERS | `open-web` | Media container formats | Mozilla Developer Network | https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Containers | 2026-09-13 | Container support does not imply support for every codec; MP4 and WebM are broadly supported web containers. |
| PG-SELECT | `documentation` | SELECT | PostgreSQL Global Development Group | https://www.postgresql.org/docs/current/sql-select.html | 2026-09-13 | SKIP LOCKED omits rows that cannot immediately be locked and can be used for queue-like tables. |
| PG-LOCKING | `documentation` | Explicit Locking | PostgreSQL Global Development Group | https://www.postgresql.org/docs/current/explicit-locking.html | 2026-09-13 | Row-level locks block writers and lockers on the same row until the transaction ends. |
| PG-PARTIAL | `documentation` | Partial Indexes | PostgreSQL Global Development Group | https://www.postgresql.org/docs/current/indexes-partial.html | 2026-09-13 | A partial index contains entries only for rows satisfying its predicate. |
| PRISMA-TX | `documentation` | Transactions and batch queries | Prisma | https://www.prisma.io/docs/orm/prisma-client/queries/transactions | 2026-09-13 | Prisma supports transactions and optimistic concurrency patterns using conditional updates. |
| PRISMA-RAW | `documentation` | Raw queries | Prisma | https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries | 2026-09-13 | Prisma permits parameterized raw SQL for operations not directly expressible through Client API. |

## Validated claims

| ID | Lane | Classification | Source mapping | Validated claim |
|---|---|---|---|---|
| S3-1 | S3 signed upload/access semantics | `fact` | AWS-PRESIGN, R2-PRESIGN | Presigned URLs grant operation-specific time-limited access using signer permissions. |
| S3-2 | S3 signed upload/access semantics | `fact` | AWS-GET, HTTP-SEMANTICS | Signed GET can support byte ranges and `206 Partial Content`. |
| S3-3 | S3 signed upload/access semantics | `recommendation` | AWS-PRESIGN, R2-PRESIGN | Signed PUT should be short-lived, scoped to one generated key, and bind the expected signed headers. |
| S3-4 | S3 signed upload/access semantics | `recommendation` | AWS-HEAD, AWS-PRESIGN | Confirm with HEAD and validate length plus provider-supported integrity semantics before readiness. ETag is not treated as a universal checksum. |
| S3-5 | S3 signed upload/access semantics | `recommendation` | AWS-CORS | Narrowly configure CORS origins, methods, headers, and exposed headers. |
| S3-6 | S3 signed upload/access semantics | `compatibility assumption` | R2-COMPAT, AWS-DELETE | Providers differ in signed headers, response overrides, checksum behavior, and deletion/versioning semantics. |
| S3-7 | S3 signed upload/access semantics | `recommendation` | HTTP-CACHE | Access responses should use `no-store`; object responses should use private, bounded caching. |
| NEXT-1 | Next.js 15 runtime/deployment | `fact` | NEXT-ROUTES | Next.js 15 Route Handlers implement control endpoints through standard Request and Response APIs. |
| NEXT-2 | Next.js 15 runtime/deployment | `fact` | NEXT-RUNTIME | Route segments can select the Node.js or Edge runtime. |
| NEXT-3 | Next.js 15 runtime/deployment | `recommendation` | NEXT-ROUTES, NEXT-RUNTIME, VERCEL-LIMITS | Use Node.js Route Handlers for the control plane and let media bytes bypass Next.js. |
| NEXT-4 | Next.js 15 runtime/deployment | `recommendation` | VERCEL-LIMITS, FFPROBE, FFMPEG | Do not run FFmpeg or ffprobe in request-bound functions. |
| WORKER-1 | Media worker strategy | `fact` | FFPROBE | ffprobe extracts structured stream and container metadata without transcoding. |
| WORKER-2 | Media worker strategy | `fact` | FFMPEG | FFmpeg can select a video frame and write thumbnail output. |
| WORKER-3 | Media worker strategy | `recommendation` | DOCKER-LIMITS, VERCEL-LIMITS | Use a separately deployable worker with explicit CPU, memory, execution-time, temporary-storage, and concurrency limits. |
| WORKER-4 | Media worker strategy | `recommendation` | FFPROBE, FFMPEG, HTTP-SEMANTICS | Limit processing to metadata plus thumbnail generation and use deterministic derivative keys for idempotency. |
| WORKER-5 | Media worker strategy | `compatibility assumption` | MDN-CONTAINERS, FFPROBE | Playback depends on both container and codecs, not MIME type or extension alone. |
| WORKER-6 | Media worker strategy | `recommendation` | FFPROBE, MDN-CONTAINERS | Allowlist the probed container, video codec, audio codec, dimensions, duration, and stream counts. |
| PG-1 | Prisma/PostgreSQL concurrency | `fact` | PG-SELECT, PG-LOCKING | `FOR UPDATE SKIP LOCKED` supports concurrent queue consumers. |
| PG-2 | Prisma/PostgreSQL concurrency | `recommendation` | PG-SELECT, PG-LOCKING, PRISMA-TX | Use a short claim transaction that atomically sets lease owner, lease expiry, status, and attempt count. |
| PG-3 | Prisma/PostgreSQL concurrency | `recommendation` | PG-LOCKING | Process work outside the claim transaction. |
| PG-4 | Prisma/PostgreSQL concurrency | `recommendation` | PRISMA-TX | Finalize through a conditional update on the lease owner and current state. |
| PG-5 | Prisma/PostgreSQL concurrency | `recommendation` | PG-SELECT, PRISMA-TX | Reclaim expired leases with bounded retries, backoff, and terminal failure. |
| PG-6 | Prisma/PostgreSQL concurrency | `recommendation` | PG-PARTIAL | Use partial indexes for actionable states and their scheduling or lease columns. |
| PG-7 | Prisma/PostgreSQL concurrency | `compatibility assumption` | PRISMA-RAW, PG-SELECT | If pinned Prisma 6 cannot safely express `SKIP LOCKED`, use bounded parameterized raw SQL. |

## Contradictions, uncertainty, and freshness

### Contradictions

No direct contradiction was identified among the bounded excerpts. Provider differences are an explicit compatibility boundary rather than evidence of universal S3-compatible behavior.

### Gaps and uncertainty

- The provider and versioning mode are not chosen. There is no universal guarantee across all S3-compatible implementations; conformance tests are required.
- The exact browser container and codec matrix remains a product and deployment choice.
- The worker resource envelope, signed URL lifetimes, upload and media limits, retention periods, and retry counts remain deployment choices.
- Next.js evidence resolves to 15.x documentation, while the project is pinned to 15.2. Patch-sensitive behavior must be verified before implementation.
- Current Prisma documentation may describe newer versions. Every raw SQL and transaction pattern must be tested against pinned Prisma 6.

### Freshness

All sources were accessed on `2026-09-13`. Version-sensitive Next.js, Prisma, storage-provider, and deployment-plan behavior requires implementation-time verification against the pinned stack and selected environment.

## Risks

- Signed URLs are bearer capabilities until expiry and must not be persisted or logged.
- Untrusted media processing requires isolation and explicit resource limits.
- Provider-specific signing, checksum, CORS, Range, and deletion semantics can invalidate an untested adapter assumption.
- Long database transactions can serialize workers or amplify contention; claims must remain short and processing must occur after commit.

## Product-choice boundary

The approved decisions in `docs/superpowers/specs/2026-09-13-videoteca-production-design.md` remain authoritative. This evidence constrains implementation and requires provider conformance testing; it does not select a storage provider, browser compatibility matrix, deployment resource envelope, URL lifetime, retention period, or retry count.
