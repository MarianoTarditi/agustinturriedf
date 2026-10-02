## Exploration: videoteca-production

### Current State
Videoteca is a Next.js 15 App Router feature in `agustinturriedf/web`. Browser pages call same-origin API routes; routes require a session and delegate to a service/repository pair backed by PostgreSQL metadata and server-local media files. Uploads send multipart bytes through a Node.js route, then the service streams files to disk and attempts local thumbnail generation. View and download routes stream complete local files, and the thumbnail route serves a locally read buffer.

`requireSession` reloads the current user and `StudentProfile` on every request and blocks inactive or payment-blocked students. It exposes `studentProfileId` and `trainerId`; authorization helpers currently express only roles and generic ownership. Videoteca itself permits `ADMIN` and `TRAINER` mutations, but its folder/file reads are not audience-scoped.

### Affected Areas
- `agustinturriedf/web/prisma/schema.prisma` — Current Videoteca models contain hierarchy, local paths, and basic file metadata only; `TrainingGroup` and its membership model do not exist. `StudentProfile.trainerId` is a required relation to a trainer `User`, so it remains the assignment source and group membership must reference `StudentProfile` rather than replace that relation.
- `agustinturriedf/web/features/videoteca/repository.ts` — Current Prisma queries are global/root-oriented and return unbounded folder details; it needs the future authorized query, policy, lifecycle, job, and concurrency primitives.
- `agustinturriedf/web/features/videoteca/service.ts` — Current service writes local files during a sequential batch and rolls back earlier successful records after a later failure; it is the replacement boundary for policy, upload lifecycle, media jobs, and independent per-file outcomes.
- `agustinturriedf/web/features/videoteca/storage.ts` — Current adapter is durable-local-filesystem dependent and uses `sharp` for images and a best-effort video thumbnail attempt; it must become a provider-neutral object-storage boundary plus a video-aware worker path.
- `agustinturriedf/web/app/api/videoteca/**/route.ts` — Routes already use session, validation, and the shared response envelope. Upload, view, download, and thumbnail routes are Node.js/local-file paths that must become command and signed-access routes.
- `agustinturriedf/web/app/(private)/videoteca/page.tsx`, `[folderId]/page.tsx`, and `videoteca.service.ts` — Current UI transport uses `fetch` for metadata, `XMLHttpRequest` multipart uploads, browser Blob downloads, client pagination, and localized date strings as data; it must consume bounded ISO/capability contracts and direct-transfer states.
- `agustinturriedf/web/features/auth/session.ts` and `authorization.ts` — Existing session freshness and active-student checks are reusable inputs to the proposed policy; policy precedence and resource-scoped mutation checks are absent.
- `agustinturriedf/web/features/videoteca/*.test.ts` and `agustinturriedf/web/app/api/videoteca/**/*.test.ts` — Existing unit/route coverage establishes service and route mocking conventions, but no tests cover the required policy matrix, storage contract, worker/reconciliation, direct-upload lifecycle, or role-aware UI.

### Gap Map

| Approved design need | Verified current state | Planning implication |
| --- | --- | --- |
| Private S3-compatible media with signed capabilities | Files and thumbnails are stored and served from the application filesystem | Introduce an object-storage port/adapter, direct-upload commands, signed access, and deployment configuration; do not proxy media bytes through Next.js. |
| Folder-inherited `GLOBAL`/`RESTRICTED` policy | No owner, policy, grant, exception, or effective-policy persistence exists | Add policy relations and a single `VideotecaPolicy` boundary before changing browse or access routes. |
| Reusable training groups | No `TrainingGroup` symbol or Prisma model exists; `StudentProfile.trainerId` only assigns each student to one trainer | Add trainer-owned groups and membership keyed by `studentProfileId`; retain `trainerId` for trainer assignment and owner validation. |
| Explicit file lifecycle and durable media work | A file is created, written, and thumbnailed in one request; thumbnail failure is non-fatal | Add state/version/generation fields, job records, worker lease semantics, and reconciliation before exposing consumption URLs. |
| Server-bounded authorized browse | Root listing and detail queries load global collections; client pagination is local | Replace DTO/query contracts and repository queries with policy-filtered pagination, sorting, and filters. |
| Private, seekable media delivery | View/download routes stream full local files; thumbnail is publicly cacheable after session check | Replace these routes with reauthorized short-lived signed GET issuance and `no-store` responses; rely on compatible storage Range handling. |
| Complete role-aware UX | UI has existing hierarchy and upload progress plumbing but no lifecycle/capability contract | Sequence UI after stable folder/file/policy/upload contracts and retain server authority for every action. |

### Workspace and Verification Constraints
- The repository is an npm workspace requiring Node.js `>=22.12.0`; only `agustinturriedf/web` is in scope. It uses Next.js 15.2, React 19, Prisma 6, NextAuth 5 beta, Zod 4, and Vitest 4.
- Relevant local commands are `npm test --workspace @agustinturriedf/web`, `npm run lint --workspace @agustinturriedf/web`, and `npm run build --workspace @agustinturriedf/web`. OpenSpec records a known failing/timeout-prone web-test baseline, so verification must distinguish baseline failures from regressions.
- Current direct file routes and multipart parsing declare `runtime = "nodejs"`; the target must preserve Node-compatible boundaries for server SDK, worker, and media tooling while browser-to-storage transfer avoids Next.js byte handling.
- This change spans schema/migrations, services, routes, UI, tests, operations, and likely exceeds the 400 changed-line review budget. Future task planning must forecast slices and, under `ask-on-risk`, ask before an oversized apply unless work is chained.

### Approaches
1. **Foundation-first vertical slices** — Establish the persistence/policy/object-storage contracts, then direct-upload/lifecycle/worker operations, then browse and UI migration in independently deployable slices.
   - Pros: Preserves the approved invariants at each exposed boundary; limits compatibility gaps; supports focused tests and chained reviews.
   - Cons: Requires temporary internal adapters or feature-gated endpoints while contracts mature.
   - Effort: High.

2. **UI-first replacement** — Redesign pages and client helpers before policy, lifecycle, and storage contracts exist.
   - Pros: Produces visible progress early.
   - Cons: Duplicates contracts, risks client-side authorization assumptions, and cannot safely deliver the approved direct-upload or private-access behavior.
   - Effort: High.

### Recommendation
Use foundation-first vertical slices. Start with the Prisma/domain and policy boundary, including `TrainingGroup` membership tied to `StudentProfile`, then define provider-neutral storage and per-file lifecycle commands, then add worker/reconciliation and migrate API/UI consumers. This respects the approved design without reopening provider choice or product decisions and creates natural review units below the 400-line target where feasible.

### Risks
- Authorization is currently global for Videoteca reads; exposing intermediate endpoints before the policy boundary is complete can leak restricted metadata or media.
- PostgreSQL and object storage cannot be transactionally committed together; lifecycle transitions, idempotency, reconciliation, and deletion races require explicit tests.
- Direct signed transfer depends on S3-compatible CORS, signing semantics, Range support, private-cache behavior, and deployment configuration that are not present in this repository.
- A worker and video-aware inspection pipeline introduce runtime, resource-limit, observability, and operational ownership requirements not covered by the current Next.js request lifecycle.
- Existing UI date formatting, unbounded query behavior, and local-file route contracts are breaking contract changes that require staged migration and broad test updates.

### Research Offer
No external research was performed. Before `sdd-propose`, the orchestrator may offer any subset of these evidence lanes without selecting a provider or changing approved design decisions:

| Optional lane | Benefit | Cost/impact | Allowed answer domain |
| --- | --- | --- | --- |
| S3-compatible signed-upload and signed-GET semantics | Validates required headers, expiry, CORS, Range, `HEAD`, and private-cache constraints against provider-neutral evidence | Medium; informs adapter contract and deployment checklist | Whether to collect evidence and which compatibility assumptions need documenting; not provider selection. |
| Next.js 15 runtime and deployment constraints | Confirms Node runtime, request-size/direct-transfer boundaries, and worker deployment separation | Low/Medium; informs route and worker placement | Whether to collect runtime evidence; not a change to the approved architecture. |
| Media worker strategy | Compares video-aware probe/thumbnail tooling, resource limits, retries, and ephemeral workspace patterns | Medium; informs worker interface and operational constraints | Whether to collect evidence for tooling constraints; not selection of a managed media platform or HLS/transcoding scope. |
| Prisma/PostgreSQL concurrency patterns | Validates `SKIP LOCKED`, leases, compare-and-set transitions, and migration/index implications | Medium; informs repository/job design and integration tests | Whether to collect evidence for database implementation patterns; not schema scope changes. |

### Ready for Proposal
Yes — the approved design, verified codebase gaps, and workspace constraints are sufficient for a proposal. The orchestrator should immediately offer the optional research lanes above, record the user's selected subset or explicit decline, and only then launch `sdd-propose`.
