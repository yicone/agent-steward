## ADDED Requirements

### Requirement: Backup / Migration remains workflow-bounded
The system SHALL keep `Backup / Migration` bounded to explicit preservation,
portability, import, validation, and bundle-oriented workflow families rather
than letting broader preservation requests turn it into a generic tools drawer.

#### Scenario: Provider-level preservation requires an explicit bounded workflow decision
- **WHEN** the product considers adding provider-level preservation or sync of
  context broader than current project-scoped bundles or session backups
- **THEN** that scope is treated as a separate explicit workflow-family decision
  rather than as an automatic extension of existing session backup semantics
- **AND** the product does not assume that a broader provider-level backup is
  already covered by `session backup`, `bulk session backup`, or current
  `project bundle`

#### Scenario: Broader preservation requests do not imply generic utility behavior
- **WHEN** a preservation request includes provider-owned files, manually saved
  provider directories, or context outside the current project-scoped package
  contract
- **THEN** `Backup / Migration` preserves its workflow-bounded semantics until a
  future accepted change defines a coherent workflow family for that boundary
- **AND** it does not become a generic filesystem backup, runtime snapshot, or
  catch-all maintenance surface by implication
