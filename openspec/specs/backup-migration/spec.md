## Purpose

Define the accepted behavior for the bounded `Backup / Migration` foundation
surface. The surface frames preservation, import, and validation work as
explicit local-first workflows with selection, validation, confirmation,
execution, result, and recent-operation semantics.

## Requirements

### Requirement: Backup / Migration SHALL provide a workflow-first foundation surface
The system SHALL replace the Backup / Migration placeholder with a bounded workflow-first foundation surface that frames all operations as explicit workflows with selection, validation, and result semantics.

#### Scenario: Page shows workflow selector in idle state
- **WHEN** the user navigates to `Backup / Migration` without routed workflow context
- **THEN** the page shows a workflow selector listing available workflows
- **AND** no workflow steps, object selection, or validation panel appears until a workflow is chosen

#### Scenario: Page opens routed workflow directly
- **WHEN** the user navigates to `Backup / Migration` with valid routed workflow context
- **THEN** the page opens the specified workflow directly and prefills available object context
- **AND** an origin cue shows where the user came from

#### Scenario: Invalid routed context degrades to idle
- **WHEN** the user navigates to `Backup / Migration` with invalid or stale workflow context
- **THEN** the page lands in workflow selector idle state instead of a broken workflow

### Requirement: Session backup workflow SHALL be available from the workflow surface
The system SHALL support single session backup through the Backup / Migration workflow surface, using the existing session-backup API.

#### Scenario: Single session backup through workflow surface
- **WHEN** the user selects the session backup workflow and chooses one session
- **THEN** the workflow proceeds through selection, configuration, validation, confirmation, execution, and result states
- **AND** the backup is created through the existing session-backup API

#### Scenario: Source backup option remains explicit
- **WHEN** the session backup workflow reaches the configuration step
- **THEN** source backup is presented as an opt-in advanced option, not the default

### Requirement: Import backup workflow SHALL validate before accepting
The system SHALL support importing session-backup packages through a validation-first workflow.

#### Scenario: Import validates schema and integrity before acceptance
- **WHEN** the user selects the import workflow and provides a package
- **THEN** the system validates schema version, integrity, and provenance before offering confirmation
- **AND** unsupported or malformed packages are rejected with actionable diagnostics

#### Scenario: Import does not imply vendor-runtime restoration
- **WHEN** the user successfully imports a session backup
- **THEN** the product restores product-readable state only
- **AND** no copy claims the session will reopen inside a third-party agent runtime

### Requirement: Validate package workflow SHALL run trust checks without importing
The system SHALL support a standalone validate-package workflow that checks trust and compatibility without executing import.

#### Scenario: Validation without import
- **WHEN** the user selects the validate-package workflow
- **THEN** the system runs schema, integrity, provenance, and compatibility checks
- **AND** the result shows valid, valid-with-warnings, or invalid status with explanations
- **AND** the user can proceed to import or stop

### Requirement: Recent operations SHALL show completed workflow results
The system SHALL display a recent-operations module showing completed workflow results from the current page session.

#### Scenario: Recent operations list completed workflows
- **WHEN** at least one workflow has completed during the current page session
- **THEN** the recent operations module shows result identity, workflow type, timestamp, and completion status

#### Scenario: Recent operations route to result detail
- **WHEN** the user selects a recent operation entry
- **THEN** the page shows the result detail for that operation

### Requirement: Routed handoff SHALL preserve workflow and object context
The system SHALL consume routed handoff context from `Project Overview`, `Sessions`, `Assets`, and `Analysis` to open the correct workflow and prefill selections.

#### Scenario: Sessions routes to session backup workflow
- **WHEN** `Sessions` hands off workflow context for session backup with a selected session
- **THEN** `Backup / Migration` opens the session backup workflow with the session prefilled

#### Scenario: Analysis routes to preservation workflow
- **WHEN** `Analysis` hands off workflow context with a finding that recommends preservation
- **THEN** `Backup / Migration` opens the appropriate workflow and shows the issue context

#### Scenario: Project Overview routes to backup-oriented workflow
- **WHEN** `Project Overview` hands off workflow context for backup, import, or validation
- **THEN** `Backup / Migration` opens the requested workflow with any available context summary

#### Scenario: Assets preserves handoff context when workflow cannot be inferred
- **WHEN** `Assets` hands off workflow context with preservation intent
- **THEN** `Backup / Migration` opens the relevant workflow when the handoff resolves one
- **AND** otherwise degrades to the workflow selector idle state instead of opening a broken workflow
- **AND** the page still shows the asset context and origin cue from `Assets`

### Requirement: Validation and warnings SHALL be explicit about preservation risk
The system SHALL include explicit warnings at validation gates for preservation risk, destructive potential, and trust boundaries.

#### Scenario: Preservation warning before destructive-adjacent operations
- **WHEN** a workflow involves overwriting, replacing, or importing state that may conflict with existing data
- **THEN** the validation panel shows an explicit preservation warning before confirmation

#### Scenario: No silent partial success
- **WHEN** a workflow execution partially fails
- **THEN** the result shows explicit success, warning, or failure semantics rather than a generic success message

### Requirement: Bulk session backup workflow SHALL preserve multiple selected sessions
The system SHALL provide a bounded `bulk-session-backup` workflow inside `Backup / Migration` for preserving an explicit set of selected sessions.

#### Scenario: Workflow selector includes bulk session backup
- **WHEN** the user opens `Backup / Migration` without active workflow context
- **THEN** the workflow selector includes `Bulk Session Backup` as an available workflow
- **AND** the workflow description frames it as preserving selected sessions
- **AND** the description does not claim project bundle, migration, cloud sync, or vendor-runtime restore behavior

#### Scenario: Bulk backup requires explicit session selection
- **WHEN** the user starts the bulk session backup workflow without selected sessions
- **THEN** the workflow remains in selection state
- **AND** it explains that one or more sessions must be selected before validation
- **AND** it does not invent a session set from project summary, analysis findings, or asset context

#### Scenario: Routed Sessions handoff preselects available sessions
- **WHEN** `Sessions` routes to `Backup / Migration` with a concrete multi-session selection
- **THEN** the bulk session backup workflow opens with those sessions preselected
- **AND** an origin cue identifies the source as `Sessions`
- **AND** stale or missing sessions are shown as unresolved selection items instead of being silently dropped

#### Scenario: Routed Overview handoff opens selection without invented objects
- **WHEN** `Project Overview` routes to `Backup / Migration` for bulk preservation without concrete session IDs
- **THEN** the bulk session backup workflow opens in selection state
- **AND** the origin cue references the overview preservation context
- **AND** no sessions are preselected unless object references are present in the handoff

### Requirement: Bulk session backup SHALL validate each selected session before confirmation
The system SHALL validate each selected session independently before allowing the bulk session backup workflow to proceed to confirmation.

#### Scenario: All selected sessions validate
- **WHEN** every selected session can produce a canonical session record
- **THEN** the validation result is valid unless warnings are present
- **AND** the validation panel shows per-session eligibility or a count summary with access to per-session detail

#### Scenario: Mixed health produces warnings or blocks per session
- **WHEN** selected sessions have mixed health, missing provenance, unreadable source-copy candidates, or unavailable canonical records
- **THEN** the validation panel identifies the affected sessions
- **AND** warning-level items remain visible through confirmation
- **AND** block-level items prevent proceeding to confirmation

#### Scenario: Blocked items require removal or repair
- **WHEN** one or more selected sessions have blocking validation failures
- **THEN** the workflow does not offer execution
- **AND** the user can remove blocked sessions from the batch or leave the workflow to repair source issues
- **AND** the workflow does not silently skip blocked sessions during validation

#### Scenario: Source-copy eligibility remains explicit
- **WHEN** source preservation is enabled for the batch or selected items
- **THEN** validation checks source-copy readiness per selected session
- **AND** sessions that cannot preserve source copies are identified before confirmation
- **AND** source-copy behavior remains opt-in rather than the default

### Requirement: Bulk session backup confirmation SHALL summarize batch risk
The system SHALL present a batch confirmation gate before executing bulk session backup.

#### Scenario: Confirmation summarizes selected batch
- **WHEN** bulk session backup validation has no blocking items
- **THEN** the confirmation state shows selected session count, source-copy configuration, warning count, and expected execution behavior
- **AND** it states that the workflow will back up selected sessions through session-backup behavior

#### Scenario: Confirmation preserves warnings
- **WHEN** validation produced warning-level items
- **THEN** those warnings remain visible or summarized in confirmation
- **AND** the user must confirm the batch with those warnings before execution

### Requirement: Bulk session backup execution SHALL report aggregate and per-session results
The system SHALL execute eligible selected sessions as one batch workflow and report both aggregate and per-session outcomes.

#### Scenario: Successful bulk execution
- **WHEN** all selected sessions are backed up successfully
- **THEN** the result status is `success`
- **AND** the result shows the number of sessions backed up
- **AND** each backed-up session has inspectable result detail, including backup identity when available

#### Scenario: Execution partially fails
- **WHEN** at least one selected session succeeds and at least one selected session fails during execution
- **THEN** the aggregate result status is `success-with-warnings`
- **AND** failed sessions are identified with actionable error detail
- **AND** successful sessions remain visible rather than being hidden behind a generic failure message

#### Scenario: Execution fully fails
- **WHEN** no selected session is backed up successfully
- **THEN** the aggregate result status is `failed`
- **AND** per-session failure detail remains visible
- **AND** the result does not claim that a usable backup was created

### Requirement: Recent operations SHALL summarize bulk session backup runs
The system SHALL record completed bulk session backup workflows as compact recent-operation entries with route to batch result detail.

#### Scenario: Bulk backup appears as one recent operation
- **WHEN** a bulk session backup workflow completes
- **THEN** recent operations shows one entry for the batch workflow
- **AND** the entry includes workflow type, timestamp, aggregate status, and session count
- **AND** it does not create one recent-operation entry per selected session

#### Scenario: Recent operation opens bulk result detail
- **WHEN** the user selects a bulk session backup recent-operation entry
- **THEN** the page shows the batch result detail with aggregate status and per-session results
