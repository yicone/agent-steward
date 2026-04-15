## ADDED Requirements

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
