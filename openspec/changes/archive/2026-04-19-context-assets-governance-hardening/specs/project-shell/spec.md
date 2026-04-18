## ADDED Requirements

### Requirement: Shell SHALL route compact asset governance context
The project shell SHALL route compact asset governance context from Overview
and Analysis into Assets without transferring full source page state or
executing asset operations.

#### Scenario: Overview routes an asset governance issue
- **WHEN** Project Overview opens Assets for an in-effect asset or asset class
  attention item
- **THEN** the shell handoff includes only compact routing context such as
  origin, issue label, subtype, scope, status, asset id, and continue label
- **AND** it does not include full overview summary state, workflow state, or
  executable asset operations

#### Scenario: Analysis routes an affected asset issue
- **WHEN** Analysis opens Assets for an affected reusable context asset or
  asset class
- **THEN** the shell handoff includes only compact routing context such as
  origin, issue label, affected asset id, subtype, status, and continue label
- **AND** it does not include the full findings table, full evidence chain, or
  mutation instructions

#### Scenario: Assets remains the destination owner after routing
- **WHEN** the shell routes compact asset governance context into Assets
- **THEN** Assets owns the rendered filters, selected object, stale-context
  message, and route cue
- **AND** the source page remains responsible only for initiating the handoff
