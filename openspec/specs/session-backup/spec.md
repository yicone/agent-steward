## Purpose

Define the accepted behavior for local session backup and import. Session
backup preserves canonical product-readable session records by default, keeps
raw source preservation explicit, and produces package metadata that can be
validated and reused by project bundle workflows.

## Requirements

### Requirement: Session backup SHALL default to canonical session records
The system SHALL define `Session Backup` as a preserved copy of canonical `Session Record` data instead of a rendered transcript or a raw source store.

#### Scenario: Default backup excludes transcript-only semantics
- **WHEN** a user backs up a session without enabling advanced source-preservation options
- **THEN** the backup package contains canonical session record data as the primary preserved object
- **AND** transcript or markdown output is not treated as the canonical backup artifact

#### Scenario: Backup remains useful without upstream runtime access
- **WHEN** the original runtime interface, port, or private store is no longer available
- **THEN** the session backup still contains enough canonical data for the product to restore readable, searchable, and analyzable state

### Requirement: Source backup SHALL be an explicit advanced option
The system SHALL treat raw source preservation as an opt-in `Source Backup` behavior instead of including it by default in every session backup.

#### Scenario: Default backup omits raw source copy
- **WHEN** a user creates a standard session backup
- **THEN** the backup package does not include an embedded raw source copy unless the user explicitly enables source preservation

#### Scenario: Opt-in source preservation is copy-only
- **WHEN** a user enables source preservation for a session backup
- **THEN** the system stores a separate copy of the original source material in the backup package
- **AND** the system does not move, rewrite, or delete the upstream session source

### Requirement: Session backup import SHALL restore product-readable state
The system SHALL support importing session backups into this product so backed-up sessions can be read, searched, and analyzed without depending on the original source.

#### Scenario: Import restores product-readable session state
- **WHEN** a user imports a valid session backup
- **THEN** the product restores the session into a product-readable state that supports inspection, search, and analysis

#### Scenario: Import does not imply vendor-runtime restoration
- **WHEN** a user imports a valid session backup
- **THEN** the product does not claim that the session will reopen inside a third-party agent runtime or private source store

### Requirement: Session backup packages SHALL expose integrity and provenance metadata
The system SHALL include enough package metadata to validate what was backed up and how it was produced.

#### Scenario: Backup package carries validation metadata
- **WHEN** the system writes a session backup package
- **THEN** the package includes schema-version and provenance metadata needed for later validation and troubleshooting

#### Scenario: Import detects invalid or unsupported packages
- **WHEN** the user imports a malformed, incomplete, or unsupported session backup package
- **THEN** the product rejects the import or marks it invalid with actionable diagnostics instead of silently accepting partial state

### Requirement: Session backup format SHALL remain reusable by future project bundles
The system SHALL define session backup packaging so it can be reused as the session sub-format inside a future `Project Bundle`.

#### Scenario: Session package can be embedded in a future project container
- **WHEN** a future `Project Bundle` includes backed-up sessions
- **THEN** the bundle can include session backup artifacts without redefining the canonical session payload format
