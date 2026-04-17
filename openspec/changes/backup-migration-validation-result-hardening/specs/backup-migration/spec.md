## ADDED Requirements

### Requirement: Validation semantics SHALL remain coherent across shipped workflows
The system SHALL keep validation semantics coherent across all shipped `Backup / Migration` workflows: `session-backup`, `bulk-session-backup`, `import-backup`, `validate-package`, `migration-preview`, and `project-bundle`.

#### Scenario: Comparable conditions keep comparable severity
- **WHEN** two workflows encounter comparable non-structural issues such as incomplete provenance, unresolved but non-fatal references, or partial but usable context
- **THEN** they classify those issues with comparable severity unless a workflow-specific rule explicitly justifies a different severity

#### Scenario: Structural impossibility remains blocking
- **WHEN** a workflow cannot form a legal request, cannot form a legal preview/package/result, or lacks required input to proceed safely
- **THEN** the workflow treats the condition as blocking
- **AND** it does not proceed to confirmation, execution, or misleading result states

#### Scenario: Validation status explains continuation rules
- **WHEN** a workflow surfaces validation state
- **THEN** the validation state makes it clear whether the user may continue, must repair input, or may continue with warnings

### Requirement: Routed workflow degradation SHALL land in safe states
The system SHALL degrade stale, partial, or unresolved routed `Backup / Migration` context into safe workflow states instead of preserving misleading continuity.

#### Scenario: Stale routed context degrades to input-adjacent state
- **WHEN** routed workflow context is stale or incomplete
- **THEN** the workflow lands in selection, configuration, or validation-adjacent state
- **AND** it does not pretend that unavailable selections, invalid deep state, or completed work still exists

#### Scenario: Routed context does not fabricate completion
- **WHEN** routed context no longer supports the deeper workflow step it originally implied
- **THEN** the page degrades to the nearest safe state
- **AND** it does not show a result or confirmation state that the current context cannot justify

### Requirement: Terminal results and recent operations SHALL use aligned semantics
The system SHALL keep primary result semantics and `Recent Operations` semantics aligned for all shipped workflows.

#### Scenario: Recent operations summarize the same terminal meaning
- **WHEN** a workflow completes and writes a recent-operation entry
- **THEN** the entry uses status and summary wording that matches the meaning of the primary result state
- **AND** it does not create a conflicting interpretation of success, warning, preview-only, unresolved, or failure outcomes

#### Scenario: Reopened recent operations restore the same result meaning
- **WHEN** the user reopens a workflow from `Recent Operations`
- **THEN** the restored detail preserves the same terminal meaning shown when the workflow originally completed
- **AND** it does not downgrade or exaggerate the original result state
