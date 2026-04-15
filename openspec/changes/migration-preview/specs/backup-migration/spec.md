## ADDED Requirements

### Requirement: Migration preview workflow SHALL be preview-only
The system SHALL provide a bounded `migration-preview` workflow inside `Backup / Migration` that previews portability and compatibility without applying migration.

#### Scenario: Workflow selector includes migration preview
- **WHEN** the user opens `Backup / Migration` without active workflow context
- **THEN** the workflow selector includes `Migration Preview` as an available workflow
- **AND** the workflow description frames it as compatibility preview before action
- **AND** the description does not claim migration apply, project bundle packaging, vendor-runtime restore, cloud sync, or cross-machine transfer

#### Scenario: Preview workflow stops at result
- **WHEN** the user completes the migration preview workflow
- **THEN** the workflow ends in a preview result state
- **AND** it does not show confirmation or execution steps for migration apply
- **AND** it does not write migrated objects, generate a project bundle, or restore any third-party runtime state

### Requirement: Migration preview SHALL require explicit source target and scope
The system SHALL require explicit source context, target context, and preview scope before generating a migration preview.

#### Scenario: Missing source context blocks preview
- **WHEN** the user starts migration preview without explicit source context
- **THEN** the workflow remains in selection or configuration state
- **AND** it explains that source context is required before preview

#### Scenario: Missing target context blocks preview
- **WHEN** the user starts migration preview without explicit target context
- **THEN** the workflow remains in configuration state
- **AND** it explains that target context is required before preview

#### Scenario: Scope remains bounded
- **WHEN** the user configures migration preview scope
- **THEN** the workflow allows only bounded preview scopes such as sessions, reusable context assets, or project-context subset
- **AND** it does not imply whole-machine, cloud, team, or third-party runtime migration

#### Scenario: Routed context can prefill only explicit fields
- **WHEN** `Assets`, `Analysis`, or `Project Overview` routes to migration preview with explicit source, target, or scope context
- **THEN** the preview workflow pre-fills only the fields provided by the handoff
- **AND** missing fields remain visible and user-editable rather than being silently inferred

### Requirement: Migration preview SHALL classify portability outcomes
The system SHALL classify previewed items as `portable`, `degraded`, `unsupported`, or `blocked`.

#### Scenario: Portable item
- **WHEN** a selected item has recognized source metadata, target mapping, and required canonical data
- **THEN** the preview classifies the item as `portable`
- **AND** it explains the target shape expected by the preview

#### Scenario: Degraded item
- **WHEN** a selected item is readable but loses fidelity, provenance, source-copy detail, or target-specific semantics
- **THEN** the preview classifies the item as `degraded`
- **AND** it explains what will be lost or weakened

#### Scenario: Unsupported item
- **WHEN** a selected item belongs to a known object class that has no target mapping in this preview
- **THEN** the preview classifies the item as `unsupported`
- **AND** it explains that preview cannot claim portability for that item

#### Scenario: Blocked item
- **WHEN** a selected item is missing required canonical data, source context, target context, or provenance
- **THEN** the preview classifies the item as `blocked`
- **AND** it gives an actionable reason before any migration apply is implied

### Requirement: Migration preview result SHALL summarize aggregate risk and item detail
The system SHALL show a migration preview result with aggregate counts and item-level compatibility detail.

#### Scenario: Preview result summarizes counts
- **WHEN** migration preview completes
- **THEN** the result shows counts for portable, degraded, unsupported, and blocked items
- **AND** it states that the result is a preview only

#### Scenario: Preview result preserves item detail
- **WHEN** migration preview includes more than one item
- **THEN** the result shows item-level classifications and explanations
- **AND** it does not collapse degraded, unsupported, or blocked items into a generic success message

#### Scenario: Preview result offers repair routes
- **WHEN** preview result contains degraded, unsupported, or blocked items
- **THEN** the result offers routes to inspect source sessions, assets, or analysis findings when relevant
- **AND** it does not offer a migration apply action

### Requirement: Recent operations SHALL summarize migration preview runs
The system SHALL record completed migration preview workflows as compact recent-operation entries with route to preview result detail.

#### Scenario: Migration preview appears as recent operation
- **WHEN** a migration preview workflow completes
- **THEN** recent operations shows one entry for the preview run
- **AND** the entry includes workflow type, timestamp, aggregate preview status, and selected scope
- **AND** it does not claim that migration was applied

#### Scenario: Recent operation opens migration preview detail
- **WHEN** the user selects a migration preview recent-operation entry
- **THEN** the page shows the preview result detail with aggregate counts and item-level classifications
