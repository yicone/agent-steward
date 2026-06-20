## Purpose

Define the accepted behavior for the project-first application shell that frames
Agent Storage Manager around project-scoped agent context while preserving the
existing session viewer capabilities.
## Requirements
### Requirement: Project-first app shell
The system SHALL keep `Project` as the default top-level subject of the app
shell unless a future accepted change explicitly replaces that model with a
different primary governance scope.

#### Scenario: Missing project selection does not implicitly redefine the product subject
- **WHEN** the current shell lacks a complete project switch or project identity
  workflow
- **THEN** that gap is treated as incomplete project-shell behavior
- **AND** the product does not implicitly reinterpret `Provider`, `Session`, or
  `Backup package` as the default top-level subject based on that gap alone

#### Scenario: Provider-level preservation need does not automatically create dual top-level governance
- **WHEN** a new preservation or sync request is broader than a single session
  or repo-local project asset set
- **THEN** the shell still treats `Project Overview` as the default landing
  subject unless a future accepted change explicitly adds a broader scope model
- **AND** the product does not silently introduce provider-first navigation,
  dual overview surfaces, or global provider governance as implied behavior

#### Scenario: Shell shows active project identity
- **WHEN** the user is inside the app shell
- **THEN** the shell exposes an explicit cue describing the currently active
  project context
- **AND** the cue is visible without requiring the user to infer project
  identity from page-local inventory or workflow content

#### Scenario: Shell uses canonical project identity
- **WHEN** the shell represents an active or switchable project
- **THEN** that project has a canonical identity key derived from the shell's
  normalized project root identity
- **AND** the shell uses that canonical key rather than display name or
  page-local evidence to determine project equality

#### Scenario: Shell offers bounded project switching
- **WHEN** more than one project context is available to the app
- **THEN** the shell provides a bounded project-switch action
- **AND** project switching is treated as shell-level context change rather than
  as a local page filter

#### Scenario: Project switch list comes from shell-known local project roots
- **WHEN** the shell offers project switching
- **THEN** the switch list is derived from shell-known local project roots
- **AND** it does not require a separate derived project registry, repository
  dedupe model, or generic workspace manager contract

#### Scenario: Project switch returns to project-level landing context
- **WHEN** the user switches to a different active project
- **THEN** the shell lands the user in a valid project-level context for that
  project
- **AND** it does not preserve stale page-local object focus when that focus no
  longer belongs to the new project

### Requirement: Routed context safety on project change
The system SHALL degrade or clear shell-owned routed context explicitly when the
active project changes.

#### Scenario: Stale routed context is cleared on project switch
- **WHEN** a routed session, asset, finding, or workflow context belongs to the
  previous project and the user switches projects
- **THEN** the shell clears or degrades that routed context explicitly
- **AND** it does not silently replay the previous project's object selection or
  workflow state inside the new project

#### Scenario: Routed context ownership is evaluated by canonical project identity
- **WHEN** the shell evaluates whether routed session, asset, finding, or
  workflow context still belongs to the active project
- **THEN** it compares the routed context against the active project's canonical
  identity key
- **AND** if the shell cannot cheaply prove a match, it clears rather than
  guessing

#### Scenario: Project switch does not redefine the top-level subject
- **WHEN** the shell adds explicit project identity and project switching
- **THEN** the product still treats `Project` as the default top-level subject
- **AND** it does not imply provider-first governance or a dual overview model

### Requirement: Current session viewer containment
The system SHALL preserve the existing session viewer behavior inside the
`Sessions` surface during the shell foundation, including recoverability-aware
handling for Windsurf sessions whose local discovery does not guarantee readable
content from the live language server.

#### Scenario: Sessions surface contains existing viewer capability
- **WHEN** the user navigates to `Sessions`
- **THEN** the user can browse sources, select sessions, and view session
  content using the existing compact, transcript, or trajectory views supported
  by the selected source

#### Scenario: Session inspector remains available
- **WHEN** the user selects an inspectable session row or opens error
  inspection from the `Sessions` surface
- **THEN** the existing inspector behavior remains available

#### Scenario: Windsurf viewer shows recoverability state for unreadable legacy session
- **WHEN** the user selects a Windsurf session that is locally discovered but the
  live language server returns `trajectory not found`
- **THEN** the `Sessions` surface keeps the session selected instead of silently
  clearing it
- **AND** the viewer presents explicit recoverability messaging explaining that
  the local `.pb` was found but the running Windsurf LS no longer has that
  trajectory
- **AND** the viewer may offer diagnostic or workflow routes for bounded
  recovery evidence without claiming that normal viewer content is available

### Requirement: Source status and diagnostics preservation
The system SHALL preserve source status and diagnostics access during the shell
foundation, including version-aware Windsurf attach/token diagnostics and
recoverability evidence for locally discovered but unreadable Windsurf sessions.

#### Scenario: Source presence remains visible
- **WHEN** source status has loaded
- **THEN** the app exposes Antigravity, Windsurf, Codex, and Cursor source presence or
  attachment state from either the shell or the `Sessions` source area

#### Scenario: Diagnostics remain accessible
- **WHEN** source diagnostics are available
- **THEN** the user can still access diagnostic details and copyable evidence
  without leaving the current local app workflow

#### Scenario: Windsurf diagnostics distinguish token source from trajectory absence
- **WHEN** the product evaluates Windsurf source status or a Windsurf session
  read fails
- **THEN** diagnostics distinguish attach or token issues from successful
  attachment where the selected trajectory is absent from the running LS
- **AND** diagnostics may report that the live token came from running process
  evidence rather than assuming historical command-line args only

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
