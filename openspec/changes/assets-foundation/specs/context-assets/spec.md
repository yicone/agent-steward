## ADDED Requirements

### Requirement: Reusable context asset model
The system SHALL represent reusable context assets as first-class local objects with explicit subtype, scope, source, status, provenance, and optional in-effect metadata.

#### Scenario: Asset exposes canonical classification
- **WHEN** the system renders a reusable context asset
- **THEN** it identifies the asset as a rule, memory item, skill, or command
- **AND** it exposes the asset scope as `global`, `user`, or `project`
- **AND** it exposes the asset source separately from scope

#### Scenario: Missing metadata remains explicit
- **WHEN** a reusable context asset lacks known source, provenance, status, or in-effect metadata
- **THEN** the system displays the missing field as unknown, unavailable, or unsupported rather than inferring a value silently

### Requirement: Assets page backbone
The system SHALL provide an Assets surface that orients users around reusable context asset subtype, scope, inventory, status, provenance, and project applicability.

#### Scenario: Assets page renders fixed backbone
- **WHEN** the user opens `Assets`
- **THEN** the page shows an asset scope header
- **AND** the page shows an asset summary
- **AND** the page shows an asset inventory area

#### Scenario: User can filter reusable assets
- **WHEN** the user changes asset subtype, scope, source, or status filters
- **THEN** the asset inventory updates to the selected filter context
- **AND** the active filter context remains visible in the asset scope header

### Requirement: Assets inventory states
The system SHALL support bounded empty, loading, normal, selected, issue, and routed-in states for the Assets surface.

#### Scenario: Empty state preserves active context
- **WHEN** the active subtype and scope contain no reusable assets
- **THEN** the page keeps subtype and scope visible
- **AND** it shows a zero-state inventory rather than fake asset rows
- **AND** it offers bounded next actions such as switching filters, importing assets, or inspecting sessions for promotable material

#### Scenario: Loading state keeps page structure stable
- **WHEN** the Assets surface is loading asset inventory for the active filters
- **THEN** the asset scope header remains visible
- **AND** the summary and inventory render loading placeholders without changing the page role

#### Scenario: Issue state highlights affected classes
- **WHEN** the active inventory or selected asset contains stale, conflicted, orphaned, or invalid items
- **THEN** the asset summary highlights the affected classes
- **AND** the page offers a route to `Analysis` for grouped interpretation when needed

### Requirement: Asset selection detail
The system SHALL explain a selected reusable context asset through a detail panel that preserves object identity, scope, source, status, and provenance.

#### Scenario: Selected asset shows object understanding
- **WHEN** the user selects an asset from the inventory
- **THEN** the page shows the selected asset identity
- **AND** it shows the selected asset subtype, scope, source, status, and provenance summary
- **AND** it keeps the selected asset tied to the current inventory context

#### Scenario: Selected asset can link to evidence
- **WHEN** the selected asset has a related source session or source reference
- **THEN** the detail panel offers a route to inspect that evidence without embedding the full session transcript or trajectory inside `Assets`

### Requirement: In-effect and usage explanation
The system SHALL show whether and how a selected reusable context asset matters in the current project when applicability data exists.

#### Scenario: In-effect metadata is available
- **WHEN** the selected asset has project applicability or usage metadata
- **THEN** the page shows an in-effect or usage module
- **AND** the module states whether the asset is in effect for the current project
- **AND** it provides a route to related sessions or analysis when that evidence exists

#### Scenario: In-effect metadata is unavailable
- **WHEN** the selected asset has no known applicability or usage metadata
- **THEN** the page states that in-effect data is unavailable rather than claiming the asset is unused

### Requirement: Routed handoff into Assets
The system SHALL consume routed handoff context into the Assets surface through filters, object selection when available, and bounded continuity cues.

#### Scenario: Session handoff preselects subtype
- **WHEN** the user enters `Assets` from `Sessions` with an intended asset subtype
- **THEN** the Assets page applies the subtype filter
- **AND** it shows a compact origin cue referencing the source session or event
- **AND** it does not carry the full transcript, trajectory state, or session-local reading mode

#### Scenario: Analysis handoff preserves issue context
- **WHEN** the user enters `Assets` from `Analysis` for an affected reusable asset or asset class
- **THEN** the Assets page applies the relevant filter or object selection when available
- **AND** it keeps an issue cue visible until the user changes subtype, scope, and object focus intentionally

#### Scenario: Stale handoff degrades safely
- **WHEN** routed handoff context references a missing asset or stale source
- **THEN** the Assets page keeps any still-valid subtype or scope filter
- **AND** it explains that the original object could not be selected

### Requirement: Bounded asset actions
The system SHALL expose only bounded asset actions from the Assets surface and route workflow execution to the owning page.

#### Scenario: Asset action routes to workflow owner
- **WHEN** the selected asset supports backup, migration, archive, or import preparation
- **THEN** the Assets page presents the action as a contextual route
- **AND** workflow execution occurs in `Backup / Migration` rather than inside the asset detail panel

#### Scenario: Assets does not become generic editor
- **WHEN** the user inspects a reusable context asset
- **THEN** the Assets page does not present full asset editing, cross-agent sync, or runtime restore controls as part of the foundation behavior
