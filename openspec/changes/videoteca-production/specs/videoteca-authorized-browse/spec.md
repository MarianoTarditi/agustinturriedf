# Videoteca Authorized Browse Specification

## Purpose

Define private, bounded discovery and consumption of authorized media.

## Requirements

### Requirement: Server-authorized bounded discovery

The system MUST execute folder and file search, sorting, pagination, and filters on the server over authorized records before pagination. Sorting MUST be stable. Consumer results MUST contain READY files only; management state filters MUST NOT bypass ownership or authorization.

#### Scenario: Consumer list excludes processing files
- GIVEN an authorized consumer folder query
- WHEN the folder contains READY and PROCESSING files
- THEN the result includes only READY files

#### Scenario: Hidden resource does not leak
- GIVEN an actor without restricted access
- WHEN the actor queries or addresses that resource
- THEN the response does not distinguish protected existence

### Requirement: Authorized private consumption

The system MUST reauthorize every access issuance against current session and effective policy. Video consumption SHALL use private signed byte-range-compatible object delivery, and the application MUST NOT proxy complete media bytes. URL refresh MUST repeat authorization.

#### Scenario: Video seeking remains private
- GIVEN an authorized READY video
- WHEN the viewer seeks using a valid signed URL
- THEN the object service handles the byte-range request

#### Scenario: Revoked actor cannot refresh
- GIVEN policy or membership has revoked access
- WHEN the actor requests a replacement URL
- THEN the system denies it despite a prior capability

### Requirement: Machine-safe browse contracts

The system MUST return ISO 8601 UTC timestamps and numeric media values as machine data. It MUST return actor capabilities with resources, while treating those capabilities as presentation hints rather than authorization authority.

#### Scenario: Stale capability is rejected
- GIVEN a displayed action capability that became stale
- WHEN the actor invokes its command
- THEN the system authorizes anew and returns a stable safe error if denied

### Requirement: Exact bounded-query contract

The system MUST accept only validated `query`, `sort`, `page`, `pageSize`, `mediaType`, `visibility`, and `group` filters for authorized browse; management MAY additionally request validated `state`. It MUST apply authorization and every filter before pagination and use resource ID as the final stable sort tie-breaker. It MUST return authorized breadcrumbs, bounded items, pagination metadata, effective-policy summary where applicable, and per-resource capabilities.

#### Scenario: Management state remains scoped
- GIVEN an owner TRAINER requests a FAILED-state filter
- WHEN the query executes
- THEN it returns only authorized owned management records

#### Scenario: Breadcrumb omits inaccessible ancestor
- GIVEN a requested folder with an unauthorized ancestor relationship
- WHEN details are requested
- THEN the system denies safely rather than returning a partial protected path

### Requirement: Access-response and expiry contract

The system MUST return signed access only for authorized READY files, with purpose and expiry in a no-store response. It MUST NOT persist, log, or include a prior URL in a later file DTO. The private object response MAY cache only within the remaining capability lifetime; refreshing an expired URL MUST repeat session, policy, and READY checks.

#### Scenario: Expired access rechecks policy
- GIVEN an expired URL and a membership change
- WHEN the actor requests refresh
- THEN the system applies current authorization and returns no URL if access was revoked

### Requirement: Stable safe browse errors

The system MUST represent validation, unauthenticated, forbidden, not-found, conflict, unavailable, and rate-limited outcomes with stable machine-readable codes. Unauthorized and nonexistent protected resources MUST remain indistinguishable where disclosure would reveal restricted content.

#### Scenario: Invalid pagination is actionable
- GIVEN invalid query pagination input
- WHEN the browse request is submitted
- THEN the system returns a validation error without executing an unbounded query
