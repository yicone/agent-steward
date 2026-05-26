# Backup Migration Spec Delta

## ADDED Requirements

### Requirement: Backup / Migration SHALL validate unreadable Windsurf legacy sessions explicitly

The system SHALL treat Windsurf sessions that are locally discovered but unreadable from the live language server as explicit validation subjects instead of silently treating them as normal session-backup candidates.

#### Scenario: Unreadable Windsurf legacy session blocks canonical backup generation

- **WHEN** a routed or selected Windsurf session is classified as unavailable because the running Windsurf LS returns `trajectory not found`
- **THEN** the workflow validation marks canonical session backup as blocked for that session
- **AND** the validation explains that local `.pb` discovery alone is not enough to produce a readable canonical session record

#### Scenario: Partial evidence remains inspectable without implying restore

- **WHEN** a routed or selected Windsurf session is classified as partially recoverable because bounded sidecar evidence exists
- **THEN** the workflow may surface that evidence in validation or result context
- **AND** it does not claim that the workflow can restore the session into Windsurf or recreate a canonical transcript automatically

## MODIFIED Requirements

### Requirement: Routed handoff SHALL preserve workflow and object context

The system SHALL consume routed handoff context from `Project Overview`, `Sessions`, `Assets`, and `Analysis` to open the correct workflow and prefill selections.

#### Scenario: Sessions routes to session backup workflow

- **WHEN** `Sessions` hands off workflow context for session backup with a selected session
- **THEN** `Backup / Migration` opens the session backup workflow with the session prefilled

#### Scenario: Analysis routes to preservation workflow

- **WHEN** `Analysis` hands off workflow context with a finding that recommends preservation
- **THEN** `Backup / Migration` opens the appropriate workflow and shows the issue context

#### Scenario: Project Overview routes to backup-oriented workflow

- **WHEN** `Project Overview` hands off workflow context for backup, import, or validation
- **THEN** `Backup / Migration` opens the requested workflow with any available context summary

#### Scenario: Assets preserves handoff context when workflow cannot be inferred

- **WHEN** `Assets` hands off workflow context with preservation intent
- **THEN** `Backup / Migration` opens the relevant workflow when the handoff resolves one
- **AND** otherwise degrades to the workflow selector idle state instead of opening a broken workflow
- **AND** the page still shows the asset context and origin cue from `Assets`

#### Scenario: Sessions handoff preserves recoverability context for unreadable Windsurf session

- **WHEN** `Sessions` routes a Windsurf session whose recoverability state is partial or unavailable into `Backup / Migration`
- **THEN** the workflow preserves compact context such as recoverability class, bounded evidence summary, and the fact that canonical readable content is unavailable
- **AND** the workflow does not invent transcript availability, vendor-runtime restoration, or implicit backup success from that handoff alone
