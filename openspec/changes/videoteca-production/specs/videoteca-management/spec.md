# Videoteca Management Specification

## Purpose

Define authorized, conflict-safe management of folders, policies, groups, and files.

## Requirements

### Requirement: Folder policy and hierarchy management

The system MUST allow ADMIN and authorized owner TRAINER management according to persisted policy ownership. Root folders MUST define a policy; child folders MAY define one or resume inheritance. Policy changes MUST apply to the affected subtree, never file-by-file, and MUST report when audience becomes broader or narrower. Folder cycles, self-parenting, and non-empty deletion MUST be rejected.

#### Scenario: Resuming inheritance changes descendants
- GIVEN a child with its own policy and descendants
- WHEN an authorized actor resumes inheritance
- THEN the subtree uses the nearest ancestor policy

#### Scenario: Non-empty folder deletion conflicts
- GIVEN a folder containing child folders or files in any state
- WHEN deletion is requested
- THEN the system returns a stable conflict without partial deletion

### Requirement: Atomic conflict-safe commands

The system MUST require validated optimistic versions where a stale mutation could overwrite a rename, broaden an audience, move content, or change lifecycle state. Bulk move MUST authorize every source and destination and validate all duplicate names before one metadata change. Bulk delete MUST authorize every target before marking targets DELETING; unauthorized targets MUST not reveal which resource failed.

#### Scenario: Concurrent policy edit conflicts
- GIVEN a stale expected version
- WHEN an actor replaces policy access
- THEN the system preserves current state and returns a conflict for review

#### Scenario: Bulk failure is atomic
- GIVEN a bulk move containing an unauthorized or duplicate target
- WHEN the command is submitted
- THEN no selected file is moved

### Requirement: Group and file command constraints

The system SHALL reject duplicate group membership and group deletion while referenced by a policy. File rename and move MUST preserve opaque storage keys and apply destination policy after commit. Deletion MUST immediately prevent new access, tolerate missing objects as success, and retain DELETING for retry when cleanup is unavailable.

#### Scenario: Repeated deletion is compatible
- GIVEN a file already DELETING
- WHEN the same authorized delete is retried
- THEN the system returns its compatible current outcome

### Requirement: Complete folder and policy commands

The system MUST support authorized creation, rename, and empty deletion for root and nested folders. Root creation MUST establish explicit policy; nested creation MUST choose explicit policy or inheritance. Policy replacement MUST update visibility, permitted owner, group grants, and student exceptions as one conflict-safe command. Resuming inheritance MUST remove only the child policy source and apply the nearest ancestor policy to its subtree.

#### Scenario: Nested creation inherits intentionally
- GIVEN an owner-managed parent policy
- WHEN the owner creates a child choosing inheritance
- THEN the child has no independent policy and receives the parent effective audience

#### Scenario: Policy replacement rejects stale version
- GIVEN an outdated expected version for a visibility change
- WHEN replacement is submitted
- THEN no grants, exceptions, or audience are changed

### Requirement: Complete group ownership and membership commands

The system MUST allow ADMIN to manage all groups and TRAINER to create, rename, delete, and replace membership only for owned groups. Trainer-created groups MUST be owned by that trainer; an ADMIN MAY select a trainer owner. Membership replacement MUST validate active students and avoid duplicates. Group deletion MUST conflict while referenced by any folder policy and report the reference count only to an authorized manager.

#### Scenario: Referenced group cannot be deleted
- GIVEN an owned group granted by a policy
- WHEN its owner requests deletion
- THEN the system returns a reference conflict and preserves membership

#### Scenario: Another trainer cannot replace members
- GIVEN a group owned by a different trainer
- WHEN a non-owner replaces its members
- THEN the system denies without revealing members

### Requirement: File command and cleanup completion

The system MUST support authorized file rename, source-and-destination-authorized move, bulk move, and bulk delete. Rename and move MUST validate duplicate normalized names transactionally and preserve opaque object keys. Delete MUST mark all authorized targets DELETING atomically, then clean source and thumbnail independently; unavailable cleanup MUST retain DELETING for retry and reconciliation.

#### Scenario: Bulk delete retains pending cleanup
- GIVEN authorized files and unavailable object storage
- WHEN bulk delete commits
- THEN all targets are non-consumable DELETING and later cleanup remains individually recoverable
