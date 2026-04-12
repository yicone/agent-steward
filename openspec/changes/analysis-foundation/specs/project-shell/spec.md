## MODIFIED Requirements

### Requirement: Placeholder surfaces do not claim full behavior
The system SHALL expose foundation or placeholder surfaces for top-level pages
without claiming unimplemented full behavior.

#### Scenario: Assets foundation is bounded
- **WHEN** the user navigates to `Assets`
- **THEN** the app presents a bounded reusable context assets foundation for
  rules, memory, skills, and commands
- **AND** it does not present full editing, complete cross-agent normalization,
  cloud sync, or runtime restore as implemented behavior

#### Scenario: Analysis foundation is bounded
- **WHEN** the user navigates to `Analysis`
- **THEN** the app presents a bounded interpretation and routing foundation for
  context health, findings, selected finding detail, and recommended outbound
  actions
- **AND** it does not present complete automated analysis, fake findings,
  automatic remediation, or workflow execution as implemented behavior

#### Scenario: Backup Migration placeholder is bounded
- **WHEN** the user navigates to `Backup / Migration` before full workflow
  behavior is implemented
- **THEN** the app communicates the intended workflow role without replacing the
  existing working session backup action
