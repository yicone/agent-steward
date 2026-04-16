## ADDED Requirements

### Requirement: Project bundle workflow SHALL be available from the workflow surface
The system SHALL provide a bounded `project-bundle` workflow inside `Backup / Migration` for composing and generating a validated, project-scoped portable bundle package file.

#### Scenario: Workflow selector includes project bundle
- **WHEN** the user opens `Backup / Migration` without active workflow context
- **THEN** the workflow selector includes `Project Bundle` as an available workflow
- **AND** the workflow description frames it as packaging the current project's context set into a portable local bundle
- **AND** the description does not claim restore, apply, vendor-runtime reopen, cloud sync, app snapshot, or team collaboration handoff

#### Scenario: Project bundle workflow follows full workflow spine
- **WHEN** the user starts the project bundle workflow
- **THEN** the workflow proceeds through selection, configuration, validation, confirmation, execution, and result states
- **AND** no step is skipped or auto-advanced without explicit user action

### Requirement: Project bundle SHALL define default member categories
The system SHALL treat the following as default bundle member categories: sessions, rules, memory, skills, commands, package-level metadata, and project-level metadata.

#### Scenario: Default member categories are presented at selection
- **WHEN** the user enters the project bundle selection step
- **THEN** the workflow presents sessions, rules, memory, skills, commands, package-level metadata, and project-level metadata as the default member categories
- **AND** the user can deselect or adjust member inclusion before proceeding

#### Scenario: Non-core objects are out of scope for v1
- **WHEN** the user enters the project bundle selection step
- **THEN** the workflow does not include raw source copies, derived view caches, search indexes, internal cache, UI state, machine-local tokens, ports, secrets, repository full copy, or app preferences
- **AND** foundation v1 does not expose inclusion toggles for those objects

### Requirement: Project bundle SHALL require explicit composition before generation
The system SHALL require explicit composition — selection and configuration — and validation before generating any bundle package file.

#### Scenario: Missing selection blocks generation
- **WHEN** the user starts the project bundle workflow without selecting any members
- **THEN** the workflow remains in selection state
- **AND** it explains that member selection is required before validation

#### Scenario: Validation must occur before confirmation
- **WHEN** the user completes selection and configuration
- **THEN** the workflow runs validation before offering confirmation
- **AND** the user can inspect intended bundle scope, included members, excluded members, warning state, blocker state, and validation summary before proceeding

#### Scenario: Direct generation is not allowed
- **WHEN** any page or routed entry attempts to bypass composition and validation
- **THEN** the workflow does not proceed to execution
- **AND** it returns to the appropriate composition or validation step

### Requirement: Project bundle sessions SHALL reuse session backup package semantics
The system SHALL reference existing `session backup package` objects for sessions included in a project bundle instead of redefining canonical session payload or creating a second session archive format.

#### Scenario: Session members reference session backup packages
- **WHEN** selected sessions are included in a project bundle
- **THEN** the bundle references existing session backup package artifacts for those sessions
- **AND** the bundle does not redefine or duplicate the canonical session payload format

#### Scenario: Sessions without existing backup produce validation warning
- **WHEN** a selected session does not have an existing session backup package
- **THEN** the validation step produces a warning identifying the session
- **AND** the warning does not block the bundle workflow unless the session reference makes the bundle structurally invalid

#### Scenario: Sessions without existing backup remain unresolved references
- **WHEN** bundle generation proceeds after validation warned that a selected session lacks an existing session backup package
- **THEN** the generated bundle preserves that session as an unresolved or missing-package member reference with a lightweight metadata snapshot
- **AND** the bundle does not silently omit the session
- **AND** the workflow does not generate an ad hoc session backup payload during project bundle execution

### Requirement: Project bundle validation SHALL use permissive severity
The system SHALL classify validation issues as warnings or blockers using a permissive severity strategy.

#### Scenario: Warning-level issues do not block generation
- **WHEN** validation finds missing or incomplete provenance summary, uncertain subtype classification, stale member state, or missing member references that leave the bundle structurally valid
- **THEN** these issues are classified as warnings
- **AND** warnings remain visible through confirmation but do not prevent proceeding

#### Scenario: Blocker-level issues prevent generation
- **WHEN** validation finds that the bundle manifest cannot be formed legally, required package identity or metadata is missing to the point that no valid bundle can be generated, no valid bundle output can be written, or workflow input is invalid to the point that no legal bundle can be created
- **THEN** these issues are classified as blockers
- **AND** the workflow does not offer execution until all blockers are resolved

### Requirement: Project bundle generation SHALL produce a real local bundle file
The system SHALL generate a real bundle package file on the local filesystem when execution completes successfully.

#### Scenario: Bundle file includes minimum structure
- **WHEN** project bundle generation completes successfully
- **THEN** the generated bundle file includes bundle manifest, package metadata, project metadata, member inventory, member references, validation summary, and lightweight metadata snapshots for each member

#### Scenario: Metadata snapshots preserve interpretability
- **WHEN** the bundle file includes member metadata snapshots
- **THEN** each snapshot includes enough information for the bundle to remain interpretable outside the original machine or workspace
- **AND** the snapshot does not embed full member content or full member payloads

#### Scenario: Bundle file includes schema version
- **WHEN** the system writes a bundle file
- **THEN** the bundle manifest includes a schema version field that future import or validate workflows can use for compatibility checks

### Requirement: Routed handoff SHALL be assistive, not compositional authority
The system SHALL consume routed handoff context from `Project Overview`, `Assets`, `Analysis`, and `Backup / Migration` to open the project bundle workflow and prefill selections, but routed context must not replace explicit composition decisions.

#### Scenario: Routed entry prefills only allowed context
- **WHEN** `Project Overview`, `Assets`, `Analysis`, or `Backup / Migration` routes to the project bundle workflow
- **THEN** the workflow opens with prefilled workflow identity, origin cue, compact scope or filter hints, and explicit object references as provided by the handoff

#### Scenario: Routed entry does not invent member sets
- **WHEN** any routed entry provides partial context such as a single asset reference, a finding, or a scope hint
- **THEN** the workflow does not invent a complete bundle member set from that partial context
- **AND** the workflow does not auto-decide final composition without user selection

#### Scenario: Routed entry does not skip composition
- **WHEN** any routed entry provides prefill context
- **THEN** the workflow does not skip selection, configuration, or validation steps
- **AND** the workflow does not proceed directly to generation

#### Scenario: Stale routed context degrades to selection
- **WHEN** routed handoff context is stale, invalid, or partially missing
- **THEN** the workflow preserves the workflow type and any valid context
- **AND** it degrades to the selection step instead of showing a broken workflow state

### Requirement: Project bundle result SHALL expose package identity and outcome
The system SHALL present a result state after bundle generation with package identity, generation outcome, and inspection routes.

#### Scenario: Successful generation shows result
- **WHEN** project bundle generation completes successfully
- **THEN** the result state shows bundle package identity, file location, generation timestamp, member count, warning count, and validation summary
- **AND** the user can inspect bundle contents

#### Scenario: Failed generation shows actionable diagnostics
- **WHEN** project bundle generation fails
- **THEN** the result state shows the failure reason with actionable diagnostics
- **AND** it offers routes to inspect or repair the blocking issue

### Requirement: Recent operations SHALL summarize project bundle runs
The system SHALL record completed project bundle workflows as compact recent-operation entries with route to bundle result detail.

#### Scenario: Project bundle appears as recent operation
- **WHEN** a project bundle workflow completes
- **THEN** recent operations shows one entry for the bundle run
- **AND** the entry includes workflow type, timestamp, aggregate status, and bundle identity
- **AND** it does not claim that the bundle was restored, applied, or synced

#### Scenario: Recent operation opens bundle result detail
- **WHEN** the user selects a project bundle recent-operation entry
- **THEN** the page shows the bundle result detail with package identity, member inventory, validation summary, and generation outcome
