## ADDED Requirements

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

#### Scenario: Assets routes to preservation-oriented workflow
- **WHEN** `Assets` hands off workflow context with preservation intent
- **THEN** `Backup / Migration` opens the relevant workflow and shows the asset context

### Requirement: Validation and warnings SHALL be explicit about preservation risk
The system SHALL include explicit warnings at validation gates for preservation risk, destructive potential, and trust boundaries.

#### Scenario: Preservation warning before destructive-adjacent operations
- **WHEN** a workflow involves overwriting, replacing, or importing state that may conflict with existing data
- **THEN** the validation panel shows an explicit preservation warning before confirmation

#### Scenario: No silent partial success
- **WHEN** a workflow execution partially fails
- **THEN** the result shows explicit success, warning, or failure semantics rather than a generic success message
