# Project Shell Spec Delta

## MODIFIED Requirements

### Requirement: Current session viewer containment

The system SHALL preserve the existing session viewer behavior inside the
`Sessions` surface during the shell foundation, including recoverability-aware
handling for Windsurf sessions whose local discovery does not guarantee readable
content from the live language server.

#### Scenario: Sessions surface contains existing viewer capability

- **WHEN** the user navigates to `Sessions`
- **THEN** the user can browse sources, select sessions, and view session
  content using the existing compact, transcript, or trajectory views supported
  by the selected source

#### Scenario: Session inspector remains available

- **WHEN** the user selects an inspectable session row or opens error
  inspection from the `Sessions` surface
- **THEN** the existing inspector behavior remains available

#### Scenario: Windsurf viewer shows recoverability state for unreadable legacy session

- **WHEN** the user selects a Windsurf session that is locally discovered but the
  live language server returns `trajectory not found`
- **THEN** the `Sessions` surface keeps the session selected instead of silently
  clearing it
- **AND** the viewer presents explicit recoverability messaging explaining that
  the local `.pb` was found but the running Windsurf LS no longer has that
  trajectory
- **AND** the viewer may offer diagnostic or workflow routes for bounded
  recovery evidence without claiming that normal viewer content is available

### Requirement: Source status and diagnostics preservation

The system SHALL preserve source status and diagnostics access during the shell
foundation, including version-aware Windsurf attach/token diagnostics and
recoverability evidence for locally discovered but unreadable Windsurf sessions.

#### Scenario: Source presence remains visible

- **WHEN** source status has loaded
- **THEN** the app exposes Antigravity, Windsurf, Codex, and Cursor source presence or
  attachment state from either the shell or the `Sessions` source area

#### Scenario: Diagnostics remain accessible

- **WHEN** source diagnostics are available
- **THEN** the user can still access diagnostic details and copyable evidence
  without leaving the current local app workflow

#### Scenario: Windsurf diagnostics distinguish token source from trajectory absence

- **WHEN** the product evaluates Windsurf source status or a Windsurf session
  read fails
- **THEN** diagnostics distinguish attach or token issues from successful
  attachment where the selected trajectory is absent from the running LS
- **AND** diagnostics may report that the live token came from running process
  evidence rather than assuming historical command-line args only
