## Purpose

Define the accepted bounded behavior for the Analysis surface as a local-first
interpretation-and-routing page inside the project shell.

## Requirements

### Requirement: Analysis finding model
The system SHALL represent bounded local analysis findings with explicit issue
class, severity, affected object references, evidence references, status, and
route targets.

#### Scenario: Finding exposes issue classification
- **WHEN** the system renders an analysis finding
- **THEN** it identifies the finding issue class
- **AND** it identifies the finding severity
- **AND** it identifies the affected object type when known
- **AND** it shows unknown or unavailable fields explicitly rather than
  inferring complete analysis coverage

#### Scenario: Finding keeps evidence separate from action
- **WHEN** a finding references session or asset evidence
- **THEN** the system exposes the evidence reference as provenance for the
  finding
- **AND** it exposes corrective routes separately from evidence references

### Requirement: Analysis page backbone
The system SHALL provide an Analysis surface that orients users around context
health, findings, selected finding detail, and recommended outbound actions.

#### Scenario: Analysis page renders fixed backbone
- **WHEN** the user opens `Analysis`
- **THEN** the page shows an Analysis header
- **AND** the page shows a context health summary
- **AND** the page shows a findings inventory

#### Scenario: Selected finding explains the problem
- **WHEN** the user selects a finding
- **THEN** the page shows the selected finding title
- **AND** it explains why the finding matters
- **AND** it shows affected object and evidence context when available
- **AND** it keeps the finding tied to the current findings inventory context

### Requirement: Analysis surface states
The system SHALL support bounded empty, loading, normal, selected, issue-heavy,
and routed-in states for the Analysis surface.

#### Scenario: Empty state avoids fake findings
- **WHEN** no findings match the active issue class or filter context
- **THEN** the page keeps the active context visible
- **AND** it shows a zero-state explanation rather than fake finding rows
- **AND** it offers bounded next actions such as changing filters or inspecting
  sessions and assets

#### Scenario: Issue-heavy state prioritizes explanation
- **WHEN** the active findings include high-severity or preservation-sensitive
  issues
- **THEN** the page emphasizes the affected issue class
- **AND** it prioritizes selected finding detail and recommended outbound routes
- **AND** it does not become a backup or migration workflow surface

### Requirement: Routed handoff into Analysis
The system SHALL consume routed handoff context into the Analysis surface through
issue class filters, selected findings when available, and bounded continuity
cues.

#### Scenario: Assets handoff preserves affected object context
- **WHEN** the user enters `Analysis` from `Assets` for an affected asset or
  asset class
- **THEN** the Analysis page applies the relevant issue class or object filter
- **AND** it selects a matching finding when available
- **AND** it shows a compact origin cue referencing the asset context
- **AND** it does not embed the full asset inventory or detail panel

#### Scenario: Overview handoff preserves issue framing
- **WHEN** the user enters `Analysis` from `Project Overview` with an issue
  class or attention item
- **THEN** the Analysis page applies the relevant issue filter
- **AND** it shows a compact origin cue referencing the overview context
- **AND** it does not carry full project-summary state

#### Scenario: Session handoff preserves evidence context
- **WHEN** the user enters `Analysis` from `Sessions` with a failure or
  evidence reference
- **THEN** the Analysis page applies the relevant issue or evidence filter
- **AND** it shows a compact origin cue referencing the source session
- **AND** it does not carry the full transcript, trajectory state, or
  session-local reading mode

#### Scenario: Stale handoff degrades safely
- **WHEN** routed handoff context references a missing finding or stale source
- **THEN** the Analysis page keeps any still-valid issue class or object filter
- **AND** it explains that the original finding could not be selected

### Requirement: Bounded analysis actions
The system SHALL expose only bounded outbound actions from Analysis and route
corrective work to the owning page.

#### Scenario: Finding action routes to owning surface
- **WHEN** a selected finding has a recommended route to sessions, assets,
  backup, or migration
- **THEN** the Analysis page presents the action as a contextual route
- **AND** the destination page owns the evidence review, object review, or
  workflow execution

#### Scenario: Preservation warning stays explicit
- **WHEN** a recommended action could affect backup, migration, archive, or
  destructive cleanup semantics
- **THEN** the Analysis page shows a preservation warning
- **AND** it routes the user to `Backup / Migration` rather than executing the
  workflow inside Analysis

#### Scenario: Analysis does not become remediation engine
- **WHEN** the user inspects a finding
- **THEN** the Analysis page does not present automatic fixes, full asset
  editing, session mutation, or backup execution as implemented foundation
  behavior

### Requirement: Analysis SHALL distinguish provider-derived findings from seed interpretations
The system SHALL consume provider diagnostics as bounded local
findings while clearly distinguishing them from seed/test interpretations.

#### Scenario: Provider diagnostics become bounded findings
- **WHEN** the project evidence provider reports unreadable, ambiguous,
  duplicate, or conflicting evidence diagnostics
- **THEN** Analysis renders those diagnostics as bounded local findings when
  provider-backed analysis is available
- **AND** each finding preserves evidence references and route targets separately

#### Scenario: Provider-backed no-finding state stays explicit
- **WHEN** provider evidence is available and no provider diagnostics produce
  findings
- **THEN** Analysis shows a no-current-findings state
- **AND** it does not populate seed findings as if they were current project
  issues

#### Scenario: Seed interpretations remain labeled fallback
- **WHEN** provider-backed findings are unavailable and seed/test findings are
  rendered for demonstration or tests
- **THEN** Analysis labels them as seed or fallback interpretations
- **AND** it does not claim complete automated analysis coverage

#### Scenario: Provider findings do not imply deep semantic analysis
- **WHEN** Analysis renders provider-derived findings
- **THEN** it limits claims to concrete provider diagnostics
- **AND** it does not infer migration risk, destructive cleanup risk, or semantic
  source-code conflicts without explicit evidence
