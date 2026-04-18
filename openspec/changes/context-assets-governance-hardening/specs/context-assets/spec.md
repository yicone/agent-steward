## ADDED Requirements

### Requirement: Assets SHALL derive explicit governance health
The system SHALL derive a governance health interpretation for each reusable
context asset from its status, provenance, and in-effect metadata without
silently inventing missing source facts.

#### Scenario: Active in-effect asset is explained as healthy
- **WHEN** an asset has `active` status and in-effect usage metadata
- **THEN** the Assets surface explains that the asset is currently in effect
- **AND** it shows the provenance or usage reason that supports that claim

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
