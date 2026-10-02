# Videoteca User Experience Specification

## Purpose

Define capability-driven, accessible Videoteca workflows.

## Requirements

### Requirement: Reproducible authorized navigation

The system MUST provide authorized hierarchy and breadcrumb navigation, real grid and list presentations, and URL-backed query, sort, pagination, media type, visibility, group, and permitted state filters. It MUST distinguish empty, filtered-empty, loading, forbidden, not-found, and error states. Localized display values MUST NOT become API data.

#### Scenario: Refresh preserves the query
- GIVEN a user-selected query and filters
- WHEN the user refreshes or navigates back
- THEN the same authorized server query is restored

### Requirement: Capability and lifecycle-aware actions

The UI MUST render actions from server capabilities and lifecycle state, while commands remain server-authorized. It MUST provide independent per-file upload progress, bounded transfer concurrency, cancel, retry, expired-upload restart, processing status, and retryable-failure recovery. It MUST retain successes when another selected file fails.

#### Scenario: Student sees consumption only
- GIVEN a student viewing authorized READY media
- WHEN the page renders
- THEN management and non-READY items are absent

#### Scenario: Upload failure remains independent
- GIVEN multiple selected files and one transfer failure
- WHEN queue updates arrive
- THEN successful items remain visible with their current state

### Requirement: Accessible management and viewers

The system MUST support keyboard-operable folder, policy, group, selection, bulk, image, and video workflows using semantic controls, names, labels, visible focus, programmatic state, and non-color cues. Dialogs MUST manage focus predictably; progress and concise outcomes MUST be announced. Viewers SHALL support keyboard image controls and native video controls including seeking.

#### Scenario: Destructive confirmation is accessible
- GIVEN a bulk delete confirmation
- WHEN it opens and closes safely
- THEN it identifies consequences, contains focus, supports keyboard operation, and returns focus deterministically

### Requirement: Functional-scope integrity

The UI MUST remove featured-video, daily-tip, root floating upload, and any action without a backed product contract. Signed URLs MUST NOT be stored in durable browser state, analytics, or logs.

#### Scenario: Expired URL is refreshed safely
- GIVEN an access URL expires in an open viewer
- WHEN playback or viewing needs replacement access
- THEN the UI requests a new authorized URL without persisting the old one

### Requirement: Complete navigation and management workflows

The UI MUST provide separate functional grid and list views, URL-backed filters, pagination, and sort controls. It MUST provide authorized root/nested folder creation, rename, empty deletion, policy definition/replacement/resume-inheritance, group management, membership management, and an effective-policy panel that identifies source, owner, grants, exceptions, inheritance, and audience impact. It MUST refetch and preserve user input after a version conflict.

#### Scenario: Grid and list are both functional
- GIVEN authorized folder results
- WHEN the user selects grid or list view
- THEN the chosen presentation exposes the same navigable and actionable resources with announced selected state

#### Scenario: Policy dialog handles a conflict
- GIVEN an owner changes visibility from a stale view
- WHEN the server returns a conflict
- THEN the UI preserves input, refetches current policy, and requires review before resubmission

### Requirement: Complete upload and file workflows

The UI MUST show per-file and overall progress, bounded concurrent direct transfers, cancel, transport retry, expired initialization restart, PROCESSING polling, retryable processing retry, file rename, selection, bulk move, bulk delete, and deletion-in-progress status. It MUST provide image fit/zoom, video play/pause, volume, full-screen, duration, timeline, keyboard seeking, and explicit signed download.

#### Scenario: Cancelled transfer enters cleanup
- GIVEN an in-progress upload
- WHEN the user cancels it
- THEN transfer stops, deletion is requested, and the UI reports recoverable cleanup state

#### Scenario: Bulk action preserves query context
- GIVEN selected authorized files in a filtered list
- WHEN bulk move or delete completes
- THEN the UI preserves surrounding filters and announces the outcome

### Requirement: Accessible state coverage

The UI MUST expose accessible names, descriptions, focus order, focus containment, Escape behavior when safe, and deterministic focus return for dialogs. It MUST use concise live regions for completion/failure and correct progress semantics without announcing every percentage. It MUST distinguish and announce initial error, loading, empty, filtered-empty, PENDING, PROCESSING, FAILED, DELETING, expired upload, forbidden, not-found, storage unavailable, and stale-version states.

#### Scenario: Keyboard-only state recovery
- GIVEN a keyboard user encounters FAILED processing
- WHEN retry is authorized and available
- THEN the retry control is reachable, named, and its resulting state is announced
