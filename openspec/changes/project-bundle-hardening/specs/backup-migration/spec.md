## ADDED Requirements

### Requirement: Project bundle API SHALL enforce explicit generation boundaries
The system SHALL reject project bundle API requests that would bypass explicit composition, configuration, or known operation modes.

#### Scenario: Unknown project bundle mode is rejected
- **WHEN** a caller posts to `/api/project-bundles` with a `mode` other than `validate` or `generate`
- **THEN** the API returns a structured `400` response
- **AND** the response includes a stable error code and remediation hint
- **AND** no validation or generation side effect is performed

#### Scenario: Generate requires explicit selection and configuration
- **WHEN** a caller posts to `/api/project-bundles` with `mode` set to `generate` but omits explicit `selection` or `configuration`
- **THEN** the API returns a structured `400` response
- **AND** the response explains that generation requires prior explicit composition
- **AND** the system does not create a project bundle file from default selection values

#### Scenario: Validate can explain starting composition
- **WHEN** the workflow asks the API to validate the current project bundle composition before generation
- **THEN** the API may derive the bounded default composition used by the UI
- **AND** the response remains a validation result only
- **AND** no project bundle file is written

### Requirement: Project bundle validation SHALL distinguish global blockers from member warnings
The system SHALL classify project bundle validation issues at the level where the user can remediate them.

#### Scenario: Output root failure is a global blocker
- **WHEN** the project bundle output root is unavailable, unwritable, or resolves to an invalid filesystem target
- **THEN** validation returns an invalid result with a global blocking item
- **AND** the item identifies the output destination as the failing precondition
- **AND** it is not attached to a specific member category or shown as member inventory status

#### Scenario: Missing session backup package is warning-level
- **WHEN** a selected session does not have an existing matching session backup package
- **THEN** validation returns a warning-level item for that session
- **AND** confirmation remains available if no blocking items exist
- **AND** the warning explains that the bundle will preserve an unresolved member reference rather than generate a session backup payload

#### Scenario: Empty or structurally impossible composition blocks generation
- **WHEN** project bundle composition has no selected member categories, an empty bundle name, unreadable package metadata, or another structural precondition failure
- **THEN** validation returns an invalid result
- **AND** generation is blocked until the user repairs the composition or environment

### Requirement: Project bundle generation SHALL preserve unresolved member intent without leaking local details
The system SHALL generate project bundle summaries that preserve selected member intent while keeping client-facing output safe.

#### Scenario: Missing session package becomes unresolved reference
- **WHEN** the user confirms generation with a selected session that lacks an existing backup package warning
- **THEN** the generated bundle metadata includes an explicit unresolved or `missing-package` member reference for that session
- **AND** the system does not silently omit that selected session
- **AND** the system does not create an ad-hoc session backup package as a side effect

#### Scenario: Generation response is summary-shaped
- **WHEN** project bundle generation succeeds
- **THEN** the API response includes package identity, display-safe file location, timestamp, validation summary, member inventory, member references, and relevant counts
- **AND** it does not echo the full bundle document when summary data is sufficient for the result UI

#### Scenario: Client-facing paths are display-safe
- **WHEN** validation or generation returns output location or diagnostic information to the UI
- **THEN** local filesystem paths are redacted or converted to display-safe paths
- **AND** raw exception messages, usernames, temporary paths, or host-specific diagnostic details are not exposed to the client

### Requirement: Project bundle session backup reuse SHALL be deterministic
The system SHALL reuse existing session backup packages deterministically for explicit project bundle session members.

#### Scenario: Newest matching backup package is selected
- **WHEN** multiple existing session backup packages match the same selected session identity
- **THEN** the project bundle references the newest matching backup package by creation timestamp
- **AND** the result remains stable regardless of filesystem traversal order

#### Scenario: Lookup avoids unnecessary payload reads
- **WHEN** the session backup store contains packages unrelated to the selected sessions
- **THEN** lookup filters candidates by manifest metadata before reading session payload records when possible
- **AND** missing or malformed unrelated packages do not fail the project bundle validation

### Requirement: Project bundle hardening SHALL be covered by focused tests
The system SHALL include tests that lock the project bundle hardening boundaries.

#### Scenario: API boundary tests cover invalid requests
- **WHEN** tests exercise unknown mode and generate-without-explicit-input requests
- **THEN** they assert structured `400` responses and no file creation behavior

#### Scenario: Service tests cover validation and output behavior
- **WHEN** tests exercise output-root failures, missing package warnings, newest backup package selection, and malformed unrelated packages
- **THEN** they assert global blockers, warning-level unresolved references, deterministic reuse, and safe failure behavior

#### Scenario: UI tests cover safe result display
- **WHEN** tests render project bundle validation and generation results
- **THEN** they assert warning/blocker visibility, unresolved references, and display-safe output paths without raw local path leakage
