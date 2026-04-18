## ADDED Requirements

### Requirement: Project Overview SHALL summarize provider-backed local evidence
Project Overview SHALL derive asset and analysis summary cues from project
evidence provider output when local evidence is available.

#### Scenario: Overview labels provider-backed evidence
- **WHEN** Project Overview receives provider-backed reusable context assets
- **THEN** it labels the context snapshot as derived from explicit local project
  evidence
- **AND** it does not show a sample-data badge for those provider-backed counts

#### Scenario: Overview keeps empty provider state explicit
- **WHEN** the provider completes with no reusable context assets
- **THEN** Project Overview shows an explicit no-assets or no-project-context cue
- **AND** it does not replace the empty provider result with seed counts

#### Scenario: Overview keeps provider unavailable state explicit
- **WHEN** the provider is unavailable
- **THEN** Project Overview shows an unknown or unavailable evidence cue
- **AND** it does not invent counts, findings, or workflow results

#### Scenario: Overview attention items use provider diagnostics conservatively
- **WHEN** provider diagnostics identify unreadable, ambiguous, duplicate, or
  conflicting local evidence
- **THEN** Project Overview may surface compact attention items for those
  diagnostics
- **AND** each item routes to Assets or Analysis for inspection rather than
  claiming automatic remediation
