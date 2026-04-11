## MODIFIED Requirements

### Requirement: Placeholder surfaces do not claim full behavior
The system SHALL expose foundation surfaces for top-level pages without claiming unimplemented full behavior.

#### Scenario: Assets foundation is bounded
- **WHEN** the user navigates to `Assets`
- **THEN** the app presents a bounded reusable context assets foundation for rules, memory, skills, and commands
- **AND** it does not present full editing, complete cross-agent normalization, cloud sync, or runtime restore as implemented behavior

#### Scenario: Analysis placeholder is bounded
- **WHEN** the user navigates to `Analysis` before full findings behavior is implemented
- **THEN** the app communicates the intended interpretation and routing role
  without presenting fake findings or corrective workflow behavior

#### Scenario: Backup Migration placeholder is bounded
- **WHEN** the user navigates to `Backup / Migration` before full workflow
  behavior is implemented
- **THEN** the app communicates the intended workflow role without replacing the
  existing working session backup action
