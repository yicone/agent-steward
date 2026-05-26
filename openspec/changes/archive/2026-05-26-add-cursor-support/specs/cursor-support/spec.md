## ADDED Requirements

### Requirement: Cursor SHALL be a first-class supported source
The system SHALL treat Cursor as a first-class source in configuration, source selection, and shared session-routing behavior instead of treating Cursor data as an unnamed external folder.

#### Scenario: Cursor can be configured as a source root
- **WHEN** the user manages source roots in Settings
- **THEN** the user can add, enable, disable, and remove a root whose source is `cursor`
- **AND** the product preserves that root in the same local configuration model used for other supported sources

#### Scenario: Cursor participates in source selection
- **WHEN** the app shows supported session sources
- **THEN** Cursor appears as a selectable source peer to Antigravity, Windsurf, and Codex
- **AND** selecting Cursor scopes session listing, selection, and deep-link restoration to Cursor sessions

### Requirement: Cursor sessions SHALL support bounded local discovery and loading
The system SHALL support bounded local discovery, selection, and loading of Cursor sessions using validated Cursor-specific storage or runtime rules documented for the supported version scope.

#### Scenario: Cursor sessions are listed from configured roots
- **WHEN** at least one enabled Cursor root contains valid Cursor session material for the supported implementation scope
- **THEN** the Sessions surface lists matching Cursor sessions from those roots
- **AND** each listed session retains its Cursor source identity and root ownership

#### Scenario: Selected Cursor session loads into the existing viewer model
- **WHEN** the user selects a listed Cursor session
- **THEN** the system loads the session through the Cursor adapter and normalizes it into the product's existing readable viewer model
- **AND** the user can inspect the session using whichever viewer modes the Cursor adapter explicitly supports
- **AND** unsupported viewer affordances remain explicit rather than silently fabricated

#### Scenario: Unsupported or invalid Cursor session material is diagnosed explicitly
- **WHEN** a configured Cursor root is present but does not contain supported or readable Cursor session material
- **THEN** the product reports explicit Cursor-specific unavailable, unreadable, or unsupported diagnostics
- **AND** it does not misclassify the root as another source type or fabricate session content

### Requirement: Cursor source status SHALL remain evidence-based
The system SHALL expose Cursor source availability and diagnostics using validated local evidence and SHALL avoid implying runtime attachment or healthy availability when those facts are unknown.

#### Scenario: Validated Cursor availability is shown
- **WHEN** the system has enough validated local evidence to determine current Cursor source availability for the supported implementation scope
- **THEN** the source-status UI shows Cursor availability using source-specific status details
- **AND** any attach, discovery, or file-backed limitations remain visible to the user

#### Scenario: Unknown Cursor availability stays explicit
- **WHEN** the system cannot validate the expected Cursor local evidence for the supported implementation scope
- **THEN** the source-status UI reports Cursor as unavailable, unsupported, or unknown with actionable diagnostics
- **AND** it does not claim successful attachment or session-read coverage by inference alone

### Requirement: Cursor repo-local assets SHALL be discoverable through the bounded provider model
The system SHALL recognize allowlisted Cursor repo-local files as project evidence so Cursor-facing rules or commands can appear in `Assets` and `Analysis` without turning the provider into an unbounded repository scanner.

#### Scenario: Recognized Cursor project evidence becomes asset inventory
- **WHEN** the repository contains allowlisted Cursor repo-local project files recognized by the provider
- **THEN** the provider emits project-scoped assets whose source is `cursor`
- **AND** each recognized item preserves bounded subtype, provenance, and source-reference data

#### Scenario: Unsupported Cursor files stay bounded diagnostics
- **WHEN** the repository contains Cursor-related files outside the provider allowlist or outside recognized mappings
- **THEN** the provider records them as unsupported or ambiguous diagnostics when applicable
- **AND** it does not silently ingest arbitrary repository files as Cursor assets

#### Scenario: Cursor-backed asset findings route without inline mutation
- **WHEN** a recognized Cursor asset has provider diagnostics or governance issues
- **THEN** the resulting Assets and Analysis routes stay read-only and bounded
- **AND** the product does not offer inline editing, sync, or runtime restore of Cursor-owned files from those surfaces
