## Purpose

Define the accepted behavior for reusable context assets that can be inspected
inside a local project, including rules, memory, skills, commands, and unknown
asset fragments.

## Requirements

### Requirement: Reusable context asset model
The system SHALL represent reusable context assets as first-class local objects
with explicit subtype, scope, source, status, provenance, and optional in-effect
metadata.

#### Scenario: Asset exposes canonical classification
- **WHEN** the system renders a reusable context asset
- **THEN** it identifies the asset as a rule, memory item, skill, or command
- **AND** it exposes the asset scope as `global`, `user`, `project`, or
  `unknown`
- **AND** it exposes the asset source separately from scope

#### Scenario: Missing metadata remains explicit
- **WHEN** a reusable context asset lacks known source, provenance, status, or
  in-effect metadata
- **THEN** the system displays the missing field as unknown, unavailable, or
  unsupported rather than inferring a value silently
- **AND** if the asset subtype cannot be determined, the system classifies it as
  unknown rather than silently assigning a default subtype

### Requirement: Assets page backbone
The system SHALL provide an Assets surface that orients users around reusable
context asset subtype, scope, inventory, status, provenance, and project
applicability.

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
The system SHALL support bounded empty, loading, normal, selected, issue, and
routed-in states for the Assets surface.

#### Scenario: Empty state preserves active context
- **WHEN** the active subtype and scope contain no reusable assets
- **THEN** the page keeps subtype and scope visible
- **AND** it shows a zero-state inventory rather than fake asset rows
- **AND** it offers bounded next actions such as switching filters, importing
  assets, or inspecting sessions for promotable material

#### Scenario: Routed handoff lands on empty inventory
- **WHEN** routed handoff context applies filters that result in an empty asset
  inventory
- **THEN** the Assets page keeps the routed subtype and scope filters visible
- **AND** it shows the zero-state inventory with an explanation that no assets
  match the routed context
- **AND** it preserves the origin cue until the user changes focus
  intentionally

#### Scenario: Loading state keeps page structure stable
- **WHEN** the Assets surface is loading asset inventory for the active filters
- **THEN** the asset scope header remains visible
- **AND** the summary and inventory render loading placeholders without changing
  the page role

#### Scenario: Issue state highlights affected classes
- **WHEN** the active inventory or selected asset contains stale, conflicted,
  orphaned, or invalid items
- **THEN** the asset summary highlights the affected classes
- **AND** the page offers a route to `Analysis` for grouped interpretation when
  needed

### Requirement: Asset selection detail
The system SHALL explain a selected reusable context asset through a detail panel
that preserves object identity, scope, source, status, and provenance.

#### Scenario: Selected asset shows object understanding
- **WHEN** the user selects an asset from the inventory
- **THEN** the page shows the selected asset identity
- **AND** it shows the selected asset subtype, scope, source, status, and
  provenance summary
- **AND** it optionally shows a concise body summary when the asset source
  provides one
- **AND** it keeps the selected asset tied to the current inventory context

#### Scenario: Selected asset can link to evidence
- **WHEN** the selected asset has a related source session or source reference
- **THEN** the detail panel offers a route to inspect that evidence without
  embedding the full session transcript or trajectory inside `Assets`

### Requirement: In-effect and usage explanation
The system SHALL show whether and how a selected reusable context asset matters
in the current project when applicability data exists.

#### Scenario: In-effect metadata is available
- **WHEN** the selected asset has project applicability or usage metadata
- **THEN** the page shows an in-effect or usage module
- **AND** the module states whether the asset is in effect for the current
  project
- **AND** it provides a route to related sessions or analysis when that evidence
  exists

#### Scenario: In-effect metadata is unavailable
- **WHEN** the selected asset has no known applicability or usage metadata
- **THEN** the page states that in-effect data is unavailable rather than
  claiming the asset is unused

### Requirement: Routed handoff into Assets
The system SHALL consume routed handoff context into the Assets surface through
filters, object selection when available, and bounded continuity cues.

#### Scenario: Session handoff preselects subtype
- **WHEN** the user enters `Assets` from `Sessions` with an intended asset
  subtype
- **THEN** the Assets page applies the subtype filter
- **AND** it shows a compact origin cue referencing the source session or event
- **AND** it does not carry the full transcript, trajectory state, or
  session-local reading mode

#### Scenario: Overview handoff preselects subtype or scope
- **WHEN** the user enters `Assets` from `Project Overview` with an in-effect
  asset or asset class attention item
- **THEN** the Assets page applies the relevant subtype or scope filter
- **AND** it preselects the asset when an object reference is available
- **AND** it shows a compact origin cue referencing the overview context
- **AND** it does not carry full project-summary state

#### Scenario: Analysis handoff preserves issue context
- **WHEN** the user enters `Assets` from `Analysis` for an affected reusable
  asset or asset class
- **THEN** the Assets page applies the relevant filter or object selection when
  available
- **AND** it keeps an issue cue visible until the user changes subtype, scope,
  and object focus intentionally

#### Scenario: Stale handoff degrades safely
- **WHEN** routed handoff context references a missing asset or stale source
- **THEN** the Assets page keeps any still-valid subtype or scope filter
- **AND** it explains that the original object could not be selected

### Requirement: Bounded asset actions
The system SHALL expose only bounded asset actions from the Assets surface and
route workflow execution to the owning page.

#### Scenario: Asset action routes to workflow owner
- **WHEN** the selected asset supports backup, migration, archive, or import
  preparation
- **THEN** the Assets page presents the action as a contextual route
- **AND** workflow execution occurs in `Backup / Migration` rather than inside
  the asset detail panel

#### Scenario: Assets does not become generic editor
- **WHEN** the user inspects a reusable context asset
- **THEN** the Assets page does not present full asset editing, cross-agent sync,
  or runtime restore controls as part of the foundation behavior

### Requirement: Assets SHALL derive explicit governance health
The system SHALL derive a governance health interpretation for each reusable
context asset from its status, provenance, and in-effect metadata without
silently inventing missing source facts.

#### Scenario: Active in-effect asset is explained as healthy
- **WHEN** an asset has `active` status and in-effect usage metadata
- **THEN** the Assets surface explains that the asset is currently in effect
- **AND** it shows the provenance or usage reason that supports that claim

#### Scenario: Active asset without usage metadata stays informational
- **WHEN** an asset has `active` status but lacks in-effect usage metadata
- **THEN** the Assets surface may show it as active inventory
- **AND** it does not claim that the asset is currently in effect by inference
  alone

#### Scenario: Stale asset explains freshness risk
- **WHEN** an asset has `stale` status
- **THEN** the Assets surface marks it as needing freshness review
- **AND** it explains which provenance or usage signal is stale when known
- **AND** it offers a bounded route to inspect source evidence or grouped
  analysis when available

#### Scenario: Conflicted asset explains disagreement
- **WHEN** an asset has `conflicted` status
- **THEN** the Assets surface marks it as a governance issue
- **AND** it explains that multiple local copies or interpretations disagree
- **AND** it routes interpretation to `Analysis` rather than offering an inline
  conflict-resolution editor

#### Scenario: Orphaned asset explains missing owner
- **WHEN** an asset has `orphaned` status
- **THEN** the Assets surface explains that evidence exists without a durable
  canonical owner
- **AND** it offers source inspection when source evidence exists
- **AND** it does not imply that the asset can be restored into a third-party
  runtime from the Assets page

#### Scenario: Unknown health remains explicit
- **WHEN** an asset lacks enough metadata to classify health beyond `unknown`
- **THEN** the Assets surface shows an explicit unknown or unavailable
  explanation
- **AND** it does not treat the asset as active, unused, stale, or conflicted
  by inference alone
- **AND** it offers source inspection only when source evidence exists

### Requirement: Assets SHALL summarize governance issues by class
The system SHALL summarize affected reusable context assets by governance issue
class while keeping the inventory and filters visible.

#### Scenario: Issue summary names affected classes
- **WHEN** the filtered inventory contains stale, conflicted, orphaned, or
  unknown assets
- **THEN** the summary shows compact issue counts by class
- **AND** the summary keeps subtype, scope, source, and status filters visible

#### Scenario: No issue summary does not imply complete scan
- **WHEN** the filtered inventory contains no known issue assets
- **THEN** the summary may show no known issues
- **AND** it does not claim that every local source runtime has been completely
  scanned unless provider evidence exists

#### Scenario: Foundation provider data is labeled
- **WHEN** the Assets surface is backed by foundation seed or partial provider
  data rather than a complete live project inventory
- **THEN** the page shows a visible foundation or provider data cue
- **AND** it keeps unknown, unavailable, or unsupported evidence visible

### Requirement: Asset detail SHALL show bounded governance inspection
The system SHALL make selected asset detail sufficient for bounded governance
inspection without adding editing or sync controls.

#### Scenario: Detail includes health, provenance, and route owner
- **WHEN** the user selects an asset
- **THEN** the detail panel shows the asset identity, subtype, scope, source,
  status, provenance, in-effect state, and governance health explanation
- **AND** each recommended next action is labeled as a route to its owning
  surface

#### Scenario: Detail keeps workflow execution out of Assets
- **WHEN** an asset offers backup, migration preview, or project bundle
  preparation
- **THEN** the detail panel routes to `Backup / Migration`
- **AND** it does not render validation, confirmation, execution, or result
  workflow state inside Assets

#### Scenario: Detail avoids mutation promises
- **WHEN** an asset is stale, conflicted, orphaned, or unknown
- **THEN** the detail panel uses inspection or review language
- **AND** it does not offer inline repair, sync, deploy, restore, or edit
  controls as part of this hardening slice

### Requirement: Routed asset issue context SHALL remain compact and bounded
The system SHALL preserve compact routed issue context when entering Assets
from Overview or Analysis without carrying full source-page state.

#### Scenario: Overview issue handoff preserves compact cue
- **WHEN** the user opens Assets from a Project Overview attention item
- **THEN** Assets applies any valid subtype, scope, status, or asset selection
  supplied by the handoff
- **AND** it shows a compact cue describing the overview issue context
- **AND** it does not carry full overview summary state

#### Scenario: Analysis issue handoff preserves compact cue
- **WHEN** the user opens Assets from an Analysis finding
- **THEN** Assets applies any valid affected asset, subtype, status, or issue
  context supplied by the handoff
- **AND** it shows a compact cue describing the analysis issue context
- **AND** it does not carry the full findings table or evidence chain

#### Scenario: Routed issue cue clears on intentional focus change
- **WHEN** the user changes asset filters or selects a different asset outside
  the routed issue context
- **THEN** the routed cue is cleared
- **AND** the Assets page continues using the user's new local focus

#### Scenario: Stale routed object degrades safely
- **WHEN** routed context references an asset that is no longer available
- **THEN** Assets keeps still-valid filters and issue labels visible
- **AND** it explains that the original asset could not be selected
- **AND** it does not fabricate a replacement asset

### Requirement: Assets SHALL consume provider-backed project evidence
The system SHALL use project evidence provider output as the primary
source for reusable context assets when provider evidence is available.

#### Scenario: Provider-backed assets replace seed inventory
- **WHEN** the project evidence provider returns reusable context assets
- **THEN** the Assets inventory renders those provider-backed assets
- **AND** it labels the inventory as derived from local project evidence rather
  than foundation seed data

#### Scenario: Empty provider result shows zero state
- **WHEN** the project evidence provider completes with no reusable context
  assets
- **THEN** the Assets surface shows a zero-state inventory
- **AND** it does not populate seed rows as if they were current project assets

#### Scenario: Provider unavailable stays explicit
- **WHEN** the project evidence provider is unavailable
- **THEN** the Assets surface shows an unavailable or fallback cue
- **AND** any seed/test fixture data remains visibly labeled as non-live data

#### Scenario: Provider diagnostics remain inspectable
- **WHEN** provider diagnostics include skipped, unreadable, unsupported, or
  ambiguous evidence
- **THEN** the Assets surface keeps the diagnostic class visible
- **AND** it avoids leaking sensitive absolute paths in normal UI copy
