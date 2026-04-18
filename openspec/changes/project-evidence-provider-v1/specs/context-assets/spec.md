## ADDED Requirements

### Requirement: Assets SHALL consume provider-backed project evidence
The Assets surface SHALL use project evidence provider output as the primary
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
