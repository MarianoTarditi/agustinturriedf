# Videoteca Authorization Specification

## Purpose

Define authenticated, inherited folder authorization for private Videoteca media.

## Requirements

### Requirement: Authenticated policy evaluation

The system MUST require an active authenticated session for every Videoteca operation. It MUST resolve the nearest explicit folder policy for a target folder or file and deny an absent effective policy as an integrity error. Files MUST inherit folder policy and MUST NOT have file-level ACLs.

#### Scenario: Inherited policy permits access
- GIVEN an authenticated actor and a descendant with an inherited policy
- WHEN the actor requests an authorized operation
- THEN the system evaluates the nearest ancestor policy

#### Scenario: Missing policy denies access
- GIVEN a target without an effective folder policy
- WHEN any access is requested
- THEN the system denies access without disclosing protected data

### Requirement: Exact read precedence

The system MUST evaluate reads in this exact order: ADMIN, owner TRAINER, active-student DENY, active-student ALLOW, currently authorized group, GLOBAL, then deny. GLOBAL MUST still require authentication; DENY MUST override GLOBAL, group, and ALLOW; owner and ADMIN MUST override student exceptions.

#### Scenario: Student denial overrides global access
- GIVEN an active student with DENY on a GLOBAL effective policy
- WHEN the student browses or requests access
- THEN the system denies the request

#### Scenario: Group grants restricted access
- GIVEN an active student in a granted group under RESTRICTED policy
- WHEN the student requests a READY file
- THEN the system authorizes consumption

### Requirement: Managed group and policy authority

The system SHALL support reusable trainer-owned groups with duplicate-free many-to-many active-student membership. ADMIN MUST manage all groups and policies; a TRAINER MUST manage only owned groups and policies; ownership and membership MUST come from persisted state, not client claims.

#### Scenario: Inactive membership grants nothing
- GIVEN a student whose membership is no longer active
- WHEN authorization is evaluated
- THEN the system denies access unless a higher-precedence rule applies

#### Scenario: Unauthorized mutation is opaque
- GIVEN a non-owner requests a restricted policy mutation
- WHEN the resource is hidden from that actor
- THEN the system returns a safe indistinguishable denial or not-found response

### Requirement: Mutation authority matrix

The system MUST allow ADMIN to create, manage, and transfer every policy; an owner TRAINER MUST create roots owned by that trainer and manage only owned policy scopes; STUDENT and non-owner TRAINER mutations MUST be denied. An owner TRAINER MUST NOT transfer policy ownership. A root MUST have an explicit policy; a child MAY define an overriding policy or resume inheritance. A child override MUST govern its subtree until a nearer override exists.

#### Scenario: Trainer creates an owned restricted root
- GIVEN an authenticated TRAINER
- WHEN the trainer creates a RESTRICTED root policy
- THEN the policy owner is the trainer and cannot be client-supplied otherwise

#### Scenario: Child override changes its subtree
- GIVEN an owner-managed child and inherited descendants
- WHEN the owner defines a child policy
- THEN that policy becomes the effective policy for the child subtree

#### Scenario: Audience change requires authority
- GIVEN a policy replacement that broadens or narrows an audience
- WHEN a stale or unauthorized actor submits it
- THEN the system rejects it without changing effective access

### Requirement: Source and destination mutation checks

The system MUST authorize a file move independently against the persisted source and destination effective policies. After a successful move, the destination policy MUST apply immediately. Bulk mutation MUST authorize every target before any target changes and MUST use a safe indistinguishable result when a hidden target prevents the command.

#### Scenario: Destination denies an otherwise owned move
- GIVEN a trainer owns the source but not the destination policy
- WHEN the trainer requests a move
- THEN the system rejects the move and leaves the source placement unchanged

#### Scenario: Resume inheritance changes audience predictably
- GIVEN an overridden child policy
- WHEN an authorized actor resumes inheritance
- THEN the nearest ancestor policy governs the subtree and the changed audience is reported before confirmation
