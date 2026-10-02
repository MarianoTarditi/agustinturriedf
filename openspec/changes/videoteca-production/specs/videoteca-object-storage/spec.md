# Videoteca Object Storage Specification

## Purpose

Define provider-neutral private object transfer and access capabilities.

## Requirements

### Requirement: Private opaque objects

The system MUST store source and derivative bytes in a private bucket under opaque keys that contain no personal, folder, or original-name data. Object existence MUST NOT grant authorization. Public ACLs, public bucket access, website hosting, permanent links, and persisted signed URLs MUST NOT be used.

#### Scenario: Object key is not exposed
- GIVEN a file DTO or general operational event
- WHEN it is returned or recorded
- THEN it contains no raw object key, credential, or signed URL

### Requirement: Authorized ephemeral transfers

The system MUST issue short-lived, purpose-scoped signed PUT or GET capabilities only after current authorization. Access responses MUST be no-store, and private object caching MUST NOT outlive the capability. A signed download SHALL use a sanitized attachment name.

#### Scenario: Authorized READY access
- GIVEN an authorized actor and READY file
- WHEN the actor requests VIEW, THUMBNAIL, or DOWNLOAD access
- THEN the system returns an ephemeral purpose-specific URL

#### Scenario: Non-ready access is refused
- GIVEN a file outside READY
- WHEN any signed read is requested
- THEN the system returns no URL

### Requirement: Provider conformance boundary

The storage contract MUST support key-scoped signing, object inspection, bounded type verification input, private derivatives, idempotent deletion, and controlled-prefix reconciliation. It MUST normalize safe storage failures and MUST NOT select a provider. The selected S3-compatible provider MUST pass conformance validation for configured signing context, private bucket controls, restricted runtime identities, CORS origins/methods/headers, and Range-compatible signed GET behavior.

#### Scenario: Provider incompatibility fails safely
- GIVEN configured storage cannot satisfy a required contract behavior
- WHEN readiness or conformance validation runs
- THEN the system fails closed without a public or local-storage fallback

### Requirement: Signed-operation conformance

The selected provider MUST demonstrate that a signed PUT is limited to its generated key, required signed headers, and expiry; it MUST not grant read or list access. The contract MUST support HEAD confirmation and bounded GET input for verification. A signed view or thumbnail GET MUST remain private and expire; a signed video GET MUST support Range and satisfiable partial responses. CORS MUST permit only configured application origins and required methods/headers.

#### Scenario: Signed headers and expiry are enforced
- GIVEN a signed PUT with required headers and a finite expiry
- WHEN headers differ or expiry has passed
- THEN the provider rejects the upload capability

#### Scenario: Verified access supports Range
- GIVEN a valid signed video GET
- WHEN the browser submits a satisfiable Range request
- THEN the provider returns the requested partial content without public access

#### Scenario: Bounded verification avoids full serving
- GIVEN a stored upload awaiting confirmation
- WHEN the system verifies it
- THEN it uses HEAD and bounded verification input rather than a public media response

### Requirement: Cache, disposition, and deletion semantics

The system MUST configure private bounded object caching whose maximum age does not exceed remaining signed-access lifetime. Download signing MUST preserve a sanitized attachment disposition. The selected provider's delete and versioning semantics MUST be validated so repeated deletion of a missing or already-cleaned object is an idempotent compatible outcome.

#### Scenario: Download cannot inject a filename
- GIVEN a download request with an unsafe original name
- WHEN a signed download is issued
- THEN the attachment disposition uses a sanitized filename

#### Scenario: Repeated deletion is safe
- GIVEN an object already absent under configured versioning behavior
- WHEN cleanup repeats deletion
- THEN cleanup records compatible success or a normalized recoverable error
