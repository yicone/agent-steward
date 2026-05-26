# Windsurf Session Recoverability Spec Delta

## ADDED Requirements

### Requirement: Windsurf sessions SHALL expose bounded recoverability state

The system SHALL classify Windsurf sessions by recoverability so locally discovered sessions can be distinguished from sessions whose readable content is unavailable from the live Windsurf language server.

#### Scenario: LS-readable session remains readable

- **WHEN** a Windsurf session is discoverable locally and the live Windsurf language server can return its trajectory content
- **THEN** the system classifies the session as LS-readable
- **AND** the user can open the session through the existing viewer modes without recoverability warnings

#### Scenario: Legacy session has partial recovery evidence

- **WHEN** a Windsurf session is discoverable locally but the live Windsurf language server returns `trajectory not found`
- **AND** the product finds bounded sidecar evidence such as a readable brain artifact for that same session identity
- **THEN** the system classifies the session as partially recoverable
- **AND** the recoverability state does not claim that a full transcript or canonical event stream is available

#### Scenario: Legacy session has no additional evidence

- **WHEN** a Windsurf session is discoverable locally but the live Windsurf language server returns `trajectory not found`
- **AND** no bounded recovery sidecar or readable evidence is found for that session identity
- **THEN** the system classifies the session as unavailable
- **AND** the recoverability state explains that local discovery alone does not imply readable content

### Requirement: Windsurf diagnostics SHALL separate attachment failures from data absence

The system SHALL distinguish Windsurf attach or token failures from successful attachment where the target trajectory no longer exists in the live language server.

#### Scenario: Token failure remains an attach diagnostic

- **WHEN** Windsurf status or read attempts fail because the live LS token is missing, invalid, or unreadable
- **THEN** the product reports an attach or token diagnostic
- **AND** it does not label the session itself as partially recoverable or unavailable based only on the token failure

#### Scenario: Trajectory absence is reported as data absence

- **WHEN** Windsurf attachment succeeds but `GetCascadeTrajectory`, `GetCascadeTrajectorySteps`, or an equivalent readable-content call returns `trajectory not found`
- **THEN** the product reports that the session is no longer present in the running Windsurf LS database
- **AND** the message does not describe the failure as a generic transport error

### Requirement: Windsurf recoverability evidence SHALL remain bounded and local-first

The system SHALL preserve recoverability evidence as bounded local evidence and SHALL not imply vendor-runtime restoration or offline transcript reconstruction.

#### Scenario: Brain sidecar evidence is bounded

- **WHEN** the product finds a readable Windsurf sidecar artifact such as `plan.md` or sidecar metadata for an unavailable session
- **THEN** diagnostics may expose the artifact path, title, current goal, or other bounded evidence extracted from that artifact
- **AND** the product does not claim that the sidecar replaces canonical session content

#### Scenario: Opaque local source does not become canonical content

- **WHEN** the only remaining Windsurf source artifact is an opaque local `.pb` file
- **THEN** the product may preserve metadata such as file presence, size, or timestamps as evidence
- **AND** it does not claim to reconstruct or normalize transcript content from that file by default
