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

### Requirement: Project bundle generation API SHALL return summary-shaped safe output
The system SHALL return project bundle generation responses that are sufficient for result display without exposing unnecessary bundle document content or raw local diagnostics.

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

## MODIFIED Requirements

### Requirement: Project bundle SHALL require explicit composition before generation
The system SHALL require explicit composition — selection and configuration — and validation before generating any bundle package file.

#### Scenario: Missing selection blocks generation
- **WHEN** the user starts the project bundle workflow without selecting any members
- **THEN** the workflow remains in selection state
- **AND** it explains that member selection is required before validation

#### Scenario: Validation must occur before confirmation
- **WHEN** the user completes selection and configuration
- **THEN** the workflow runs validation before offering confirmation
- **AND** the user can inspect intended bundle scope, included members, excluded members, warning state, blocker state, and validation summary before proceeding

#### Scenario: Direct generation is not allowed
- **WHEN** any page, routed entry, or API caller attempts to bypass explicit composition and validation
- **THEN** the workflow or API does not proceed to execution or file generation
- **AND** it returns to the appropriate composition or validation step, or returns a structured invalid-request response

### Requirement: Project bundle sessions SHALL reuse session backup package semantics
The system SHALL reference existing `session backup package` objects for sessions included in a project bundle instead of redefining canonical session payload or creating a second session archive format.

#### Scenario: Session members reference session backup packages
- **WHEN** selected sessions are included in a project bundle
- **THEN** the bundle references existing session backup package artifacts for those sessions
- **AND** the bundle does not redefine or duplicate the canonical session payload format

#### Scenario: Sessions without existing backup produce validation warning
- **WHEN** a selected session does not have an existing session backup package
- **THEN** the validation step produces a warning identifying the session
- **AND** the warning does not block the bundle workflow unless the session reference makes the bundle structurally invalid
- **AND** the warning explains that generation will preserve an unresolved member reference rather than generate a session backup payload

#### Scenario: Sessions without existing backup remain unresolved references
- **WHEN** bundle generation proceeds after validation warned that a selected session lacks an existing session backup package
- **THEN** the generated bundle preserves that session as an unresolved or missing-package member reference with a lightweight metadata snapshot
- **AND** the bundle does not silently omit the session
- **AND** the workflow does not generate an ad hoc session backup payload during project bundle execution

### Requirement: Project bundle validation SHALL use permissive severity
The system SHALL classify validation issues as warnings or blockers using a permissive severity strategy.

#### Scenario: Warning-level issues do not block generation
- **WHEN** validation finds missing or incomplete provenance summary, uncertain subtype classification, stale member state, or missing member references that leave the bundle structurally valid
- **THEN** these issues are classified as warnings
- **AND** warnings remain visible through confirmation but do not prevent proceeding

#### Scenario: Blocker-level issues prevent generation
- **WHEN** validation finds that the bundle manifest cannot be formed legally, required package identity or metadata is missing to the point that no valid bundle can be generated, no valid bundle output can be written, or workflow input is invalid to the point that no legal bundle can be created
- **THEN** these issues are classified as blockers
- **AND** the workflow does not offer execution until all blockers are resolved

#### Scenario: Output root failure is a global blocker
- **WHEN** the project bundle output root is unavailable, unwritable, or resolves to an invalid filesystem target
- **THEN** validation returns an invalid result with a global blocking item
- **AND** the item identifies the output destination as the failing precondition
- **AND** it is not attached to a specific member category or shown as member inventory status

#### Scenario: Empty or structurally impossible composition blocks generation
- **WHEN** project bundle composition has no selected member categories, an empty bundle name, unreadable package metadata, or another structural precondition failure
- **THEN** validation returns an invalid result
- **AND** generation is blocked until the user repairs the composition or environment

### Requirement: Project bundle result SHALL expose package identity and outcome
The system SHALL present a result state after bundle generation with package identity, generation outcome, and inspection routes.

#### Scenario: Successful generation shows result
- **WHEN** project bundle generation completes successfully
- **THEN** the result state shows bundle package identity, display-safe file location, generation timestamp, member count, warning count, and validation summary
- **AND** the user can inspect bundle contents

#### Scenario: Failed generation shows actionable diagnostics
- **WHEN** project bundle generation fails
- **THEN** the result state shows the failure reason with actionable diagnostics
- **AND** it offers routes to inspect or repair the blocking issue
- **AND** the result does not expose raw exception messages, usernames, temporary paths, or host-specific filesystem diagnostics
