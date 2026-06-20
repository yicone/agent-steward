## MODIFIED Requirements

### Requirement: Project-first app shell
The system SHALL expose explicit project identity and a bounded project-switch
action as part of the project-first shell.

#### Scenario: Shell shows active project identity
- **WHEN** the user is inside the app shell
- **THEN** the shell exposes an explicit cue describing the currently active
  project context
- **AND** the cue is visible without requiring the user to infer project
  identity from page-local inventory or workflow content

#### Scenario: Shell uses canonical project identity
- **WHEN** the shell represents an active or switchable project
- **THEN** that project has a canonical identity key derived from the shell's
  normalized project root identity
- **AND** the shell uses that canonical key rather than display name or
  page-local evidence to determine project equality

#### Scenario: Shell offers bounded project switching
- **WHEN** more than one project context is available to the app
- **THEN** the shell provides a bounded project-switch action
- **AND** project switching is treated as shell-level context change rather than
  as a local page filter

#### Scenario: Project switch list comes from shell-known local project roots
- **WHEN** the shell offers project switching
- **THEN** the switch list is derived from shell-known local project roots
- **AND** it does not require a separate derived project registry, repository
  dedupe model, or generic workspace manager contract

#### Scenario: Project switch returns to project-level landing context
- **WHEN** the user switches to a different active project
- **THEN** the shell lands the user in a valid project-level context for that
  project
- **AND** it does not preserve stale page-local object focus when that focus no
  longer belongs to the new project

## ADDED Requirements

### Requirement: Routed context safety on project change
The system SHALL degrade or clear shell-owned routed context explicitly when the
active project changes.

#### Scenario: Stale routed context is cleared on project switch
- **WHEN** a routed session, asset, finding, or workflow context belongs to the
  previous project and the user switches projects
- **THEN** the shell clears or degrades that routed context explicitly
- **AND** it does not silently replay the previous project's object selection or
  workflow state inside the new project

#### Scenario: Routed context ownership is evaluated by canonical project identity
- **WHEN** the shell evaluates whether routed session, asset, finding, or
  workflow context still belongs to the active project
- **THEN** it compares the routed context against the active project's canonical
  identity key
- **AND** if the shell cannot cheaply prove a match, it clears rather than
  guessing

#### Scenario: Project switch does not redefine the top-level subject
- **WHEN** the shell adds explicit project identity and project switching
- **THEN** the product still treats `Project` as the default top-level subject
- **AND** it does not imply provider-first governance or a dual overview model
