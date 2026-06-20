## MODIFIED Requirements

### Requirement: Project-first app shell
The system SHALL keep `Project` as the default top-level subject of the app
shell unless a future accepted change explicitly replaces that model with a
different primary governance scope.

#### Scenario: Missing project selection does not implicitly redefine the product subject
- **WHEN** the current shell lacks a complete project switch or project identity
  workflow
- **THEN** that gap is treated as incomplete project-shell behavior
- **AND** the product does not implicitly reinterpret `Provider`, `Session`, or
  `Backup package` as the default top-level subject based on that gap alone

#### Scenario: Provider-level preservation need does not automatically create dual top-level governance
- **WHEN** a new preservation or sync request is broader than a single session
  or repo-local project asset set
- **THEN** the shell still treats `Project Overview` as the default landing
  subject unless a future accepted change explicitly adds a broader scope model
- **AND** the product does not silently introduce provider-first navigation,
  dual overview surfaces, or global provider governance as implied behavior
