## MODIFIED Requirements

### Requirement: Placeholder surfaces do not claim full behavior (MODIFIED)
The system SHALL expose foundation or placeholder surfaces for top-level pages without
claiming unimplemented full behavior.

#### Scenario: Assets foundation is bounded
- **WHEN** the user navigates to `Assets`
- **THEN** the app presents a bounded reusable context assets foundation for
  rules, memory, skills, and commands
- **AND** it does not present full editing, complete cross-agent normalization,
  cloud sync, or runtime restore as implemented behavior

#### Scenario: Analysis foundation is bounded
- **WHEN** the user navigates to `Analysis`
- **THEN** the app presents a bounded interpretation-and-routing foundation for
  local context findings
- **AND** it does not present complete automated project analysis, inline
  remediation, or AI-generated findings as implemented behavior

#### Scenario: Backup / Migration foundation is bounded
- **WHEN** the user navigates to `Backup / Migration`
- **THEN** the app presents a bounded workflow-first foundation surface for
  session backup, import, and validation workflows
- **AND** it does not present bulk backup, migration preview, project bundle
  packaging, full migration execution, vendor-runtime restoration, or cloud
  sync as implemented behavior
- **AND** working session backup from `Sessions` remains available without
  change
