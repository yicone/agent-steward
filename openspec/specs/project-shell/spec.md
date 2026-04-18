## Purpose

Define the accepted behavior for the project-first application shell that frames
Agent Storage Manager around project-scoped agent context while preserving the
existing session viewer capabilities.

## Requirements

### Requirement: Project-first app shell
The system SHALL provide a project-first app shell that frames the product around
project-scoped agent context rather than around the session viewer.

#### Scenario: Shell shows project-first navigation
- **WHEN** the user opens the app
- **THEN** the app shows top-level navigation for `Project Overview`,
  `Sessions`, `Assets`, `Analysis`, and `Backup / Migration`

#### Scenario: Root page is not the raw session viewer
- **WHEN** the user opens the app without a session deep link
- **THEN** the app presents `Project Overview` as the landing subject instead of
  immediately presenting the session list and viewer as the whole product

### Requirement: Current session viewer containment
The system SHALL preserve the existing session viewer behavior inside the
`Sessions` surface during the shell foundation.

#### Scenario: Sessions surface contains existing viewer capability
- **WHEN** the user navigates to `Sessions`
- **THEN** the user can browse sources, select sessions, and view session
  content using the existing compact, transcript, or trajectory views supported
  by the selected source

#### Scenario: Session inspector remains available
- **WHEN** the user selects an inspectable session row or opens error
  inspection from the `Sessions` surface
- **THEN** the existing inspector behavior remains available

### Requirement: Source status and diagnostics preservation
The system SHALL preserve source status and diagnostics access during the shell
foundation.

#### Scenario: Source presence remains visible
- **WHEN** source status has loaded
- **THEN** the app exposes Antigravity, Windsurf, and Codex source presence or
  attachment state from either the shell or the `Sessions` source area

#### Scenario: Diagnostics remain accessible
- **WHEN** source diagnostics are available
- **THEN** the user can still access diagnostic details and copyable evidence
  without leaving the current local app workflow

### Requirement: Search selection preservation
The system SHALL preserve the existing global search session-selection behavior.

#### Scenario: Search result opens session
- **WHEN** the user selects a session result from global search
- **THEN** the app navigates to or reveals the `Sessions` surface and selects
  the matching session

#### Scenario: Cross-source search result opens session
- **WHEN** the selected search result belongs to a different source than the
  currently active source
- **THEN** the app switches to the target source and loads the selected session
  without clearing the pending selection

### Requirement: Session URL compatibility
The system SHALL preserve existing session deep-link behavior during the shell
foundation.

#### Scenario: Existing session URL restores viewer state
- **WHEN** the app loads with existing query parameters for source, session id,
  root id, view, filters, expanded groups, selected row, or inspector state
- **THEN** the `Sessions` surface restores the matching viewer state as it did
  before the shell foundation

#### Scenario: Session interactions keep URL state valid
- **WHEN** the user changes selected session, view, trajectory filters, expanded
  groups, selected row, inspector mode, or WindSurf cleared-step visibility
- **THEN** the URL state remains valid for restoring the same session viewer
  state

### Requirement: Session backup compatibility
The system SHALL preserve direct session backup behavior during the shell
foundation.

#### Scenario: User creates session backup from Sessions
- **WHEN** the user has selected a session in the `Sessions` surface and invokes
  the session backup action
- **THEN** the system creates a session backup through the existing session
  backup API behavior

#### Scenario: Source copy option remains bounded
- **WHEN** the selected source supports source-copy backup
- **THEN** the user can still opt into source copy for that session backup

### Requirement: Placeholder surfaces do not claim full behavior
The system SHALL expose foundation or placeholder surfaces for top-level pages without
claiming unimplemented full behavior.

#### Scenario: Assets foundation is bounded
- **WHEN** the user navigates to `Assets`
- **THEN** the app presents a bounded reusable context assets foundation for
  rules, memory, skills, and commands
- **AND** it does not present full editing, complete cross-agent normalization,
  cloud sync, or runtime restore as implemented behavior

#### Scenario: Analysis foundation is bounded
- **WHEN** the user navigates to `Analysis`
- **THEN** the app presents a bounded interpretation and routing foundation for
  context health, findings, selected finding detail, and recommended outbound
  actions
- **AND** it does not present complete automated analysis, fake findings,
  automatic remediation, or workflow execution as implemented behavior

#### Scenario: Backup / Migration foundation is bounded
- **WHEN** the user navigates to `Backup / Migration`
- **THEN** the app presents a bounded workflow-first foundation surface for
  session backup, import, and validation workflows
- **AND** it does not present bulk backup, migration preview, project bundle
  packaging, full migration execution, vendor-runtime restoration, or cloud
  sync as implemented behavior
- **AND** working session backup from `Sessions` remains available without
  change

### Requirement: Additive styling boundary
The system SHALL introduce shell-foundation styling additively without broadly
replacing current viewer styling.

#### Scenario: Viewer styling remains functional
- **WHEN** the user uses the `Sessions` surface after the shell foundation
- **THEN** transcript, trajectory, inspector, and diagnostic content remain
  readable and usable

#### Scenario: Shell styling follows baseline roles
- **WHEN** shell-specific UI is rendered
- **THEN** it uses design roles aligned with the design-system baseline such as
  page shell, route cue, metadata label, compact strip, or primary surface
  without requiring a complete production token system

### Requirement: Shell SHALL route compact asset governance context
The project shell SHALL route compact asset governance context from Overview
and Analysis into Assets without transferring full source page state or
executing asset operations.

#### Scenario: Overview routes an asset governance issue
- **WHEN** Project Overview opens Assets for an in-effect asset or asset class
  attention item
- **THEN** the shell handoff includes only compact routing context such as
  origin, issue label, subtype, scope, status, asset id, and continue label
- **AND** it does not include full overview summary state, workflow state, or
  executable asset operations

#### Scenario: Analysis routes an affected asset issue
- **WHEN** Analysis opens Assets for an affected reusable context asset or
  asset class
- **THEN** the shell handoff includes only compact routing context such as
  origin, issue label, affected asset id, subtype, status, and continue label
- **AND** it does not include the full findings table, full evidence chain, or
  mutation instructions

#### Scenario: Assets remains the destination owner after routing
- **WHEN** the shell routes compact asset governance context into Assets
- **THEN** Assets owns the rendered filters, selected object, stale-context
  message, and route cue
- **AND** the source page remains responsible only for initiating the handoff
