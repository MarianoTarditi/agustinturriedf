# Proposal: Production Videoteca

## Intent

Replace the globally readable, local-filesystem Videoteca with a private production system. PostgreSQL governs metadata, authorization, lifecycle, and jobs; private S3-compatible storage holds bytes. Users gain reliable uploads, authorized browsing, seekable viewing, recovery, and role-aware management.

## Scope

### In Scope
- Inherited `GLOBAL`/`RESTRICTED` policy with exact role, owner, group, and student-exception precedence.
- Private signed transfer/access, explicit lifecycle, durable media jobs, deletion, and reconciliation.
- Bounded authorized queries, management commands, viewers, upload recovery, bulk operations, and accessible capability-driven UI.
- Machine-safe contracts, observability, configuration validation, verification, and clean cutover.

### Out of Scope
- HLS, renditions, transcoding, captions, virus scanning, or resumable uploads.
- Public/anonymous access, permanent links, per-file ACLs, or authentication replacement.
- Local-media migration, provider selection, or unrelated product redesign.

## Capabilities

### New Capabilities
- `videoteca-authorization`: Inheritance, groups, exceptions, ownership, and precedence.
- `videoteca-object-storage`: Private storage, signing, and provider conformance.
- `videoteca-media-lifecycle`: Upload, verification, processing, retry, deletion, and reconciliation.
- `videoteca-authorized-browse`: Authorized queries and private media consumption.
- `videoteca-management`: Conflict-safe folder, policy, group, file, and bulk commands.
- `videoteca-user-experience`: Hierarchy, queue, viewers, state UX, and accessibility.
- `videoteca-operations`: Worker configuration, observability, retention, cutover, and recovery.

### Modified Capabilities
None; no existing capability specs are present.

## Approach

Deliver foundation-first slices: policy, storage, uploads, processing, consumption, management, UI, then reconciliation/cutover. Thin Node.js Route Handlers remain the control plane; media transfers bypass Next.js. A bounded worker performs probe and thumbnail work. Adapter tests enforce provider conformance without selecting a provider.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `agustinturriedf/web/prisma/` | Modified | Policies, groups, lifecycle, jobs, indexes |
| `agustinturriedf/web/features/videoteca/` | Modified | Domain services, storage, worker, reconciliation |
| `agustinturriedf/web/app/api/videoteca/` | Modified | Control and signed-access contracts |
| `agustinturriedf/web/app/(private)/videoteca/` | Modified | Upload, management, viewers, accessibility |

## Compatibility and Rollout

Prepare private infrastructure, pause mutations, discard approved test data, deploy the new boundaries together, seed through production APIs, and smoke-test authorization and lifecycle before reopening. Implementation will exceed 400 changed lines; `sdd-tasks` must define reviewable slices and `ask-on-risk` approval must precede any oversized apply.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Authorization leakage | High | Deny-by-default policy; matrix tests |
| Database/object divergence | High | States, idempotency, leases, reconciliation |
| Provider incompatibility | Medium | Adapter contract tests |
| Media resource exhaustion | Medium | Worker limits, allowlists, backpressure |

## Rollback Plan

Keep mutations closed, stop workers, and restore the prior application/schema deployment. Reconcile or remove new private objects; never reverse them into disposable local storage.

## Dependencies

- PostgreSQL, conformant private S3-compatible storage, restricted identities/CORS, and FFmpeg/ffprobe worker capacity.

## Success Criteria

- [ ] Every operation is authorized; only `READY` private media receives short-lived signed access.
- [ ] Lifecycle and reconciliation are idempotent without cross-file rollback or tested orphans.
- [ ] Bounded queries and role-aware accessible workflows pass required tests, lint, and build.
