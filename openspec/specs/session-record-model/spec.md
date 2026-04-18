## Purpose

Define the canonical session record contract used across indexing, analysis,
migration, and backup. The model preserves stable session identity,
provenance, normalized events, and schema-versioned evolution independently
from source-specific payloads or rendered views.

## Requirements

### Requirement: Canonical session records SHALL expose a backup-ready contract
The system SHALL define a canonical `Session Record` representation that is stable enough to support indexing, analysis, migration, and backup across supported session sources.

#### Scenario: Minimal required fields are present
- **WHEN** the system materializes a canonical `Session Record`
- **THEN** the record includes `schemaVersion`, stable session identity, source metadata, provenance, normalized events, summary data, and timestamps

#### Scenario: Source-specific payloads do not replace the canonical contract
- **WHEN** source adapters provide raw payloads or source-specific fields
- **THEN** the canonical `Session Record` still exposes the required backup-ready fields independent of any single source format

### Requirement: Canonical session records SHALL preserve source provenance without requiring raw-source embedding
The system SHALL preserve where a session came from and how the canonical record was derived, while allowing the record to exist without an embedded raw source copy.

#### Scenario: Record keeps source reference by default
- **WHEN** the system creates a canonical `Session Record`
- **THEN** the record includes source identity and source-reference metadata sufficient to explain the original source location or retrieval path
- **AND** the record remains valid even if no raw source copy is embedded

#### Scenario: Record keeps derivation evidence
- **WHEN** the system normalizes source-specific session data into a canonical record
- **THEN** the record preserves provenance describing the source type, normalization path, and backup/import lineage when applicable

### Requirement: Canonical session records SHALL remain independent from rendered session views
The system SHALL treat rendered views such as `Transcript`, `Trajectory`, `Compact`, and `Markdown` as derived projections rather than the canonical record itself.

#### Scenario: Transcript is treated as a derived view
- **WHEN** a transcript or markdown representation is available for a session
- **THEN** the canonical `Session Record` is still the product's backup and migration object
- **AND** derived views are optional projections rather than required canonical fields

#### Scenario: Record remains analyzable without cached views
- **WHEN** a canonical `Session Record` is imported without embedded derived views
- **THEN** the product can still search, inspect, and analyze the session using the canonical event data

### Requirement: Canonical session records SHALL support schema-versioned evolution
The system SHALL version canonical session records so future changes can evolve the contract without making previous backups unreadable by default.

#### Scenario: Import checks schema compatibility
- **WHEN** the product imports a canonical session record from backup
- **THEN** it evaluates the record's schema version before accepting the record
- **AND** unsupported versions are rejected or flagged with actionable compatibility messaging

#### Scenario: Forward evolution preserves compatibility intent
- **WHEN** the canonical session record contract changes in a future release
- **THEN** the new version is represented through an explicit schema-version change rather than silent structural drift
