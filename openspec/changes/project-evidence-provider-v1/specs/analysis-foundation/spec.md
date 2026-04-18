## ADDED Requirements

### Requirement: Analysis SHALL distinguish provider-derived findings from seed interpretations
The Analysis surface SHALL consume provider diagnostics as bounded local
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
