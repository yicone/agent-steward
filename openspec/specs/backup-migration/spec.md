## Purpose

Define the accepted behavior for the bounded `Backup / Migration` foundation
surface. The surface frames preservation, import, and validation work as
explicit local-first workflows with selection, validation, confirmation,
execution, result, and recent-operation semantics.

## Requirements

### Requirement: Backup / Migration SHALL provide a workflow-first foundation surface
The system SHALL replace the Backup / Migration placeholder with a bounded workflow-first foundation surface that frames all operations as explicit workflows with selection, validation, and result semantics.

#### Scenario: Page shows workflow selector in idle state
- **WHEN** the user navigates to `Backup / Migration` without routed workflow context
- **THEN** the page shows a workflow selector listing available workflows
- **AND** no workflow steps, object selection, or validation panel appears until a workflow is chosen

#### Scenario: Page opens routed workflow directly
- **WHEN** the user navigates to `Backup / Migration` with valid routed workflow context
- **THEN** the page opens the specified workflow directly and prefills available object context
- **AND** an origin cue shows where the user came from

#### Scenario: Invalid routed context degrades to idle
- **WHEN** the user navigates to `Backup / Migration` with invalid or stale workflow context
- **THEN** the page lands in workflow selector idle state instead of a broken workflow

### Requirement: Session backup workflow SHALL be available from the workflow surface
The system SHALL support single session backup through the Backup / Migration workflow surface, using the existing session-backup API.

#### Scenario: Single session backup through workflow surface
- **WHEN** the user selects the session backup workflow and chooses one session
- **THEN** the workflow proceeds through selection, configuration, validation, confirmation, execution, and result states
- **AND** the backup is created through the existing session-backup API

#### Scenario: Source backup option remains explicit
- **WHEN** the session backup workflow reaches the configuration step
- **THEN** source backup is presented as an opt-in advanced option, not the default

### Requirement: Import backup workflow SHALL validate before accepting
The system SHALL support importing session-backup packages through a validation-first workflow.

#### Scenario: Import validates schema and integrity before acceptance
- **WHEN** the user selects the import workflow and provides a package
- **THEN** the system validates schema version, integrity, and provenance before offering confirmation
- **AND** unsupported or malformed packages are rejected with actionable diagnostics

#### Scenario: Import does not imply vendor-runtime restoration
- **WHEN** the user successfully imports a session backup
- **THEN** the product restores product-readable state only
- **AND** no copy claims the session will reopen inside a third-party agent runtime

### Requirement: Validate package workflow SHALL run trust checks without importing
The system SHALL support a standalone validate-package workflow that checks trust and compatibility without executing import.

#### Scenario: Validation without import
- **WHEN** the user selects the validate-package workflow
- **THEN** the system runs schema, integrity, provenance, and compatibility checks
- **AND** the result shows valid, valid-with-warnings, or invalid status with explanations
- **AND** the user can proceed to import or stop

### Requirement: Recent operations SHALL show completed workflow results
The system SHALL display a recent-operations module showing completed workflow results from the current page session.

#### Scenario: Recent operations list completed workflows
- **WHEN** at least one workflow has completed during the current page session
- **THEN** the recent operations module shows result identity, workflow type, timestamp, and completion status

#### Scenario: Recent operations route to result detail
- **WHEN** the user selects a recent operation entry
- **THEN** the page shows the result detail for that operation

### Requirement: Routed handoff SHALL preserve workflow and object context
The system SHALL consume routed handoff context from `Project Overview`, `Sessions`, `Assets`, and `Analysis` to open the correct workflow and prefill selections.

#### Scenario: Sessions routes to session backup workflow
- **WHEN** `Sessions` hands off workflow context for session backup with a selected session
- **THEN** `Backup / Migration` opens the session backup workflow with the session prefilled

#### Scenario: Analysis routes to preservation workflow
- **WHEN** `Analysis` hands off workflow context with a finding that recommends preservation
- **THEN** `Backup / Migration` opens the appropriate workflow and shows the issue context

#### Scenario: Project Overview routes to backup-oriented workflow
- **WHEN** `Project Overview` hands off workflow context for backup, import, or validation
- **THEN** `Backup / Migration` opens the requested workflow with any available context summary

#### Scenario: Assets preserves handoff context when workflow cannot be inferred
- **WHEN** `Assets` hands off workflow context with preservation intent
- **THEN** `Backup / Migration` opens the relevant workflow when the handoff resolves one
- **AND** otherwise degrades to the workflow selector idle state instead of opening a broken workflow
- **AND** the page still shows the asset context and origin cue from `Assets`

### Requirement: Validation and warnings SHALL be explicit about preservation risk
The system SHALL include explicit warnings at validation gates for preservation risk, destructive potential, and trust boundaries.

#### Scenario: Preservation warning before destructive-adjacent operations
- **WHEN** a workflow involves overwriting, replacing, or importing state that may conflict with existing data
- **THEN** the validation panel shows an explicit preservation warning before confirmation

#### Scenario: No silent partial success
- **WHEN** a workflow execution partially fails
- **THEN** the result shows explicit success, warning, or failure semantics rather than a generic success message

### Requirement: Bulk session backup workflow SHALL preserve multiple selected sessions
The system SHALL provide a bounded `bulk-session-backup` workflow inside `Backup / Migration` for preserving an explicit set of selected sessions.

#### Scenario: Workflow selector includes bulk session backup
- **WHEN** the user opens `Backup / Migration` without active workflow context
- **THEN** the workflow selector includes `Bulk Session Backup` as an available workflow
- **AND** the workflow description frames it as preserving selected sessions
- **AND** the description does not claim project bundle, migration, cloud sync, or vendor-runtime restore behavior

#### Scenario: Bulk backup requires explicit session selection
- **WHEN** the user starts the bulk session backup workflow without selected sessions
- **THEN** the workflow remains in selection state
- **AND** it explains that one or more sessions must be selected before validation
- **AND** it does not invent a session set from project summary, analysis findings, or asset context

#### Scenario: Routed Sessions handoff preselects available sessions
- **WHEN** `Sessions` routes to `Backup / Migration` with a concrete multi-session selection
- **THEN** the bulk session backup workflow opens with those sessions preselected
- **AND** an origin cue identifies the source as `Sessions`
- **AND** stale or missing sessions are shown as unresolved selection items instead of being silently dropped

#### Scenario: Routed Overview handoff opens selection without invented objects
- **WHEN** `Project Overview` routes to `Backup / Migration` for bulk preservation without concrete session IDs
- **THEN** the bulk session backup workflow opens in selection state
- **AND** the origin cue references the overview preservation context
- **AND** no sessions are preselected unless object references are present in the handoff

### Requirement: Bulk session backup SHALL validate each selected session before confirmation
The system SHALL validate each selected session independently before allowing the bulk session backup workflow to proceed to confirmation.

#### Scenario: All selected sessions validate
- **WHEN** every selected session can produce a canonical session record
- **THEN** the validation result is valid unless warnings are present
- **AND** the validation panel shows per-session eligibility or a count summary with access to per-session detail

#### Scenario: Mixed health produces warnings or blocks per session
- **WHEN** selected sessions have mixed health, missing provenance, unreadable source-copy candidates, or unavailable canonical records
- **THEN** the validation panel identifies the affected sessions
- **AND** warning-level items remain visible through confirmation
- **AND** block-level items prevent proceeding to confirmation

#### Scenario: Blocked items require removal or repair
- **WHEN** one or more selected sessions have blocking validation failures
- **THEN** the workflow does not offer execution
- **AND** the user can remove blocked sessions from the batch or leave the workflow to repair source issues
- **AND** the workflow does not silently skip blocked sessions during validation

#### Scenario: Source-copy eligibility remains explicit
- **WHEN** source preservation is enabled for the batch or selected items
- **THEN** validation checks source-copy readiness per selected session
- **AND** sessions that cannot preserve source copies are identified before confirmation
- **AND** source-copy behavior remains opt-in rather than the default

### Requirement: Bulk session backup confirmation SHALL summarize batch risk
The system SHALL present a batch confirmation gate before executing bulk session backup.

#### Scenario: Confirmation summarizes selected batch
- **WHEN** bulk session backup validation has no blocking items
- **THEN** the confirmation state shows selected session count, source-copy configuration, warning count, and expected execution behavior
- **AND** it states that the workflow will back up selected sessions through session-backup behavior

#### Scenario: Confirmation preserves warnings
- **WHEN** validation produced warning-level items
- **THEN** those warnings remain visible or summarized in confirmation
- **AND** the user must confirm the batch with those warnings before execution

### Requirement: Bulk session backup execution SHALL report aggregate and per-session results
The system SHALL execute eligible selected sessions as one batch workflow and report both aggregate and per-session outcomes.

#### Scenario: Successful bulk execution
- **WHEN** all selected sessions are backed up successfully
- **THEN** the result status is `success`
- **AND** the result shows the number of sessions backed up
- **AND** each backed-up session has inspectable result detail, including backup identity when available

#### Scenario: Execution partially fails
- **WHEN** at least one selected session succeeds and at least one selected session fails during execution
- **THEN** the aggregate result status is `success-with-warnings`
- **AND** failed sessions are identified with actionable error detail
- **AND** successful sessions remain visible rather than being hidden behind a generic failure message

#### Scenario: Execution fully fails
- **WHEN** no selected session is backed up successfully
- **THEN** the aggregate result status is `failed`
- **AND** per-session failure detail remains visible
- **AND** the result does not claim that a usable backup was created

### Requirement: Recent operations SHALL summarize bulk session backup runs
The system SHALL record completed bulk session backup workflows as compact recent-operation entries with route to batch result detail.

#### Scenario: Bulk backup appears as one recent operation
- **WHEN** a bulk session backup workflow completes
- **THEN** recent operations shows one entry for the batch workflow
- **AND** the entry includes workflow type, timestamp, aggregate status, and session count
- **AND** it does not create one recent-operation entry per selected session

#### Scenario: Recent operation opens bulk result detail
- **WHEN** the user selects a bulk session backup recent-operation entry
- **THEN** the page shows the batch result detail with aggregate status and per-session results

### Requirement: Migration preview workflow SHALL be preview-only
The system SHALL provide a bounded `migration-preview` workflow inside `Backup / Migration` that previews portability and compatibility without applying migration.

#### Scenario: Workflow selector includes migration preview
- **WHEN** the user opens `Backup / Migration` without active workflow context
- **THEN** the workflow selector includes `Migration Preview` as an available workflow
- **AND** the workflow description frames it as compatibility preview before action
- **AND** the description does not claim migration apply, project bundle packaging, vendor-runtime restore, cloud sync, or cross-machine transfer

#### Scenario: Preview workflow stops at result
- **WHEN** the user completes the migration preview workflow
- **THEN** the workflow ends in a preview result state
- **AND** it does not show confirmation or execution steps for migration apply
- **AND** it does not write migrated objects, generate a project bundle, or restore any third-party runtime state

### Requirement: Migration preview SHALL require explicit source, target, and scope
The system SHALL require explicit source context, target context, and preview scope before generating a migration preview.

#### Scenario: Missing source context blocks preview
- **WHEN** the user starts migration preview without explicit source context
- **THEN** the workflow remains in selection or configuration state
- **AND** it explains that source context is required before preview

#### Scenario: Missing target context blocks preview
- **WHEN** the user starts migration preview without explicit target context
- **THEN** the workflow remains in configuration state
- **AND** it explains that target context is required before preview

#### Scenario: Missing scope blocks preview
- **WHEN** the user starts migration preview with explicit source and target context but no preview scope
- **THEN** the workflow remains in configuration state
- **AND** it explains that a bounded preview scope is required before preview

#### Scenario: Scope remains bounded
- **WHEN** the user configures migration preview scope
- **THEN** the workflow allows only bounded preview scopes such as sessions, reusable context assets, or project-context subset
- **AND** it does not imply whole-machine, cloud, team, or third-party runtime migration

#### Scenario: Routed context can prefill only explicit fields
- **WHEN** `Assets`, `Analysis`, or `Project Overview` routes to migration preview with explicit source, target, or scope context
- **THEN** the preview workflow pre-fills only the fields provided by the handoff
- **AND** missing fields remain visible and user-editable rather than being silently inferred

### Requirement: Migration preview SHALL classify portability outcomes
The system SHALL classify previewed items as `portable`, `degraded`, `unsupported`, or `blocked`.

The preview classification SHALL use exactly these values: `portable`, `degraded`, `unsupported`, `blocked`. No other classification values are valid for migration preview results. When multiple classifications could apply, precedence SHALL be `blocked` before `unsupported` before `degraded` before `portable`.

#### Scenario: Portable item
- **WHEN** a selected item has recognized source metadata, target mapping, and required canonical data
- **THEN** the preview classifies the item as `portable`
- **AND** it explains the target shape expected by the preview

#### Scenario: Degraded item
- **WHEN** a selected item is readable but loses fidelity, provenance, source-copy detail, or target-specific semantics
- **THEN** the preview classifies the item as `degraded`
- **AND** it explains what will be lost or weakened

#### Scenario: Unsupported item
- **WHEN** a selected item belongs to a known object class that has no target mapping in this preview
- **THEN** the preview classifies the item as `unsupported`
- **AND** it explains that preview cannot claim portability for that item

#### Scenario: Blocked item
- **WHEN** a selected item is missing required canonical data, source context, target context, or provenance
- **THEN** the preview classifies the item as `blocked`
- **AND** it gives an actionable reason such as which data is missing or which source needs repair

### Requirement: Migration preview result SHALL summarize aggregate risk and item detail
The system SHALL show a migration preview result with aggregate counts and item-level compatibility detail.

#### Scenario: Preview result summarizes counts
- **WHEN** migration preview completes
- **THEN** the result shows counts for portable, degraded, unsupported, and blocked items
- **AND** it states that the result is a preview only

#### Scenario: Empty preview scope produces no-result state
- **WHEN** the configured preview scope resolves to zero previewable items
- **THEN** the workflow shows an explicit empty-scope message instead of an empty result table
- **AND** it routes the user back to scope configuration

#### Scenario: Preview result preserves item detail
- **WHEN** migration preview includes more than one item
- **THEN** the result shows item-level classifications and explanations
- **AND** it does not collapse degraded, unsupported, or blocked items into a generic success message

#### Scenario: Preview result uses preview-specific aggregate status
- **WHEN** migration preview completes
- **THEN** the aggregate preview status is `preview-clear` when all previewed items are portable
- **AND** the aggregate preview status is `preview-with-concerns` when any item is degraded and no item is unsupported or blocked
- **AND** the aggregate preview status is `preview-with-blockers` when any item is unsupported or blocked

#### Scenario: Preview result offers repair routes
- **WHEN** preview result contains degraded, unsupported, or blocked items
- **THEN** the result offers routes to inspect source sessions, assets, or analysis findings when relevant
- **AND** it does not offer a migration apply action

### Requirement: Recent operations SHALL summarize migration preview runs
The system SHALL record completed migration preview workflows as compact recent-operation entries with route to preview result detail.

#### Scenario: Migration preview appears as recent operation
- **WHEN** a migration preview workflow completes
- **THEN** recent operations shows one entry for the preview run
- **AND** the entry includes workflow type, timestamp, aggregate preview status, and selected scope
- **AND** it does not claim that migration was applied

#### Scenario: Recent operation opens migration preview detail
- **WHEN** the user selects a migration preview recent-operation entry
- **THEN** the page shows the preview result detail with aggregate counts and item-level classifications

### Requirement: Project bundle workflow SHALL be available from the workflow surface
The system SHALL provide a bounded `project-bundle` workflow inside `Backup / Migration` for composing and generating a validated, project-scoped portable bundle package file.

#### Scenario: Workflow selector includes project bundle
- **WHEN** the user opens `Backup / Migration` without active workflow context
- **THEN** the workflow selector includes `Project Bundle` as an available workflow
- **AND** the workflow description frames it as packaging the current project's context set into a portable local bundle
- **AND** the description does not claim restore, apply, vendor-runtime reopen, cloud sync, app snapshot, or team collaboration handoff

#### Scenario: Project bundle workflow follows full workflow spine
- **WHEN** the user starts the project bundle workflow
- **THEN** the workflow proceeds through selection, configuration, validation, confirmation, execution, and result states
- **AND** no step is skipped or auto-advanced without explicit user action

### Requirement: Project bundle SHALL define default member categories
The system SHALL treat the following as default bundle member categories: sessions, rules, memory, skills, commands, package-level metadata, and project-level metadata.

#### Scenario: Selectable member categories are presented at selection
- **WHEN** the user enters the project bundle selection step
- **THEN** the workflow presents sessions, rules, memory, skills, and commands as the selectable member categories
- **AND** the user can deselect or adjust those member categories before proceeding

#### Scenario: Foundation metadata is always included
- **WHEN** the user enters the project bundle selection step
- **THEN** the workflow shows package-level metadata and project-level metadata as always included foundation metadata
- **AND** foundation v1 does not expose deselection toggles for those metadata sections

#### Scenario: Non-core objects are out of scope for v1
- **WHEN** the user enters the project bundle selection step
- **THEN** the workflow does not include raw source copies, derived view caches, search indexes, internal cache, UI state, machine-local tokens, ports, secrets, repository full copy, or app preferences
- **AND** foundation v1 does not expose inclusion toggles for those objects

### Requirement: Project bundle SHALL require explicit composition before generation
The system SHALL require explicit composition — selection and configuration — and validation before generating any bundle package file.

#### Scenario: Missing selection blocks generation
- **WHEN** the user starts the project bundle workflow without selecting any members
- **THEN** the workflow remains in selection state
- **AND** it explains that member selection is required before validation

#### Scenario: Validation must occur before confirmation
- **WHEN** the user completes selection and configuration
- **THEN** the workflow runs validation before offering confirmation
- **AND** the user can inspect intended bundle scope, included members, excluded members, warning state, blocker state, and validation summary before proceeding

#### Scenario: Direct generation is not allowed
- **WHEN** any page or routed entry attempts to bypass composition and validation
- **THEN** the workflow does not proceed to execution
- **AND** it returns to the appropriate composition or validation step

### Requirement: Project bundle sessions SHALL reuse session backup package semantics
The system SHALL reference existing `session backup package` objects for sessions included in a project bundle instead of redefining canonical session payload or creating a second session archive format.

#### Scenario: Session members reference session backup packages
- **WHEN** selected sessions are included in a project bundle
- **THEN** the bundle references existing session backup package artifacts for those sessions
- **AND** the bundle does not redefine or duplicate the canonical session payload format

#### Scenario: Sessions without existing backup produce validation warning
- **WHEN** a selected session does not have an existing session backup package
- **THEN** the validation step produces a warning identifying the session
- **AND** the warning does not block the bundle workflow unless the session reference makes the bundle structurally invalid

#### Scenario: Sessions without existing backup remain unresolved references
- **WHEN** bundle generation proceeds after validation warned that a selected session lacks an existing session backup package
- **THEN** the generated bundle preserves that session as an unresolved or missing-package member reference with a lightweight metadata snapshot
- **AND** the bundle does not silently omit the session
- **AND** the workflow does not generate an ad hoc session backup payload during project bundle execution

### Requirement: Project bundle validation SHALL use permissive severity
The system SHALL classify validation issues as warnings or blockers using a permissive severity strategy.

#### Scenario: Warning-level issues do not block generation
- **WHEN** validation finds missing or incomplete provenance summary, uncertain subtype classification, stale member state, or missing member references that leave the bundle structurally valid
- **THEN** these issues are classified as warnings
- **AND** warnings remain visible through confirmation but do not prevent proceeding

#### Scenario: Blocker-level issues prevent generation
- **WHEN** validation finds that the bundle manifest cannot be formed legally, required package identity or metadata is missing to the point that no valid bundle can be generated, no valid bundle output can be written, or workflow input is invalid to the point that no legal bundle can be created
- **THEN** these issues are classified as blockers
- **AND** the workflow does not offer execution until all blockers are resolved

### Requirement: Project bundle generation SHALL produce a real local bundle file
The system SHALL generate a real bundle package file on the local filesystem when execution completes successfully.

#### Scenario: Bundle file includes minimum structure
- **WHEN** project bundle generation completes successfully
- **THEN** the generated bundle file includes bundle manifest, package metadata, project metadata, member inventory, member references, validation summary, and lightweight metadata snapshots for each member

#### Scenario: Metadata snapshots preserve interpretability
- **WHEN** the bundle file includes member metadata snapshots
- **THEN** each snapshot includes enough information for the bundle to remain interpretable outside the original machine or workspace
- **AND** the snapshot does not embed full member content or full member payloads

#### Scenario: Bundle file includes schema version
- **WHEN** the system writes a bundle file
- **THEN** the bundle manifest includes a schema version field that future import or validate workflows can use for compatibility checks

### Requirement: Routed handoff SHALL be assistive, not compositional authority
The system SHALL consume routed handoff context from `Project Overview`, `Assets`, `Analysis`, and `Backup / Migration` to open the project bundle workflow and prefill selections, but routed context must not replace explicit composition decisions.

#### Scenario: Routed entry prefills only allowed context
- **WHEN** `Project Overview`, `Assets`, `Analysis`, or `Backup / Migration` routes to the project bundle workflow
- **THEN** the workflow opens with prefilled workflow identity, origin cue, compact scope or filter hints, and explicit object references as provided by the handoff

#### Scenario: Routed entry does not invent member sets
- **WHEN** any routed entry provides partial context such as a single asset reference, a finding, or a scope hint
- **THEN** the workflow does not invent a complete bundle member set from that partial context
- **AND** the workflow does not auto-decide final composition without user selection

#### Scenario: Routed entry does not skip composition
- **WHEN** any routed entry provides prefill context
- **THEN** the workflow does not skip selection, configuration, or validation steps
- **AND** the workflow does not proceed directly to generation

#### Scenario: Stale routed context degrades to selection
- **WHEN** routed handoff context is stale, invalid, or partially missing
- **THEN** the workflow preserves the workflow type and any valid context
- **AND** it degrades to the selection step instead of showing a broken workflow state

### Requirement: Project bundle result SHALL expose package identity and outcome
The system SHALL present a result state after bundle generation with package identity, generation outcome, and inspection routes.

#### Scenario: Successful generation shows result
- **WHEN** project bundle generation completes successfully
- **THEN** the result state shows bundle package identity, file location, generation timestamp, member count, warning count, and validation summary
- **AND** the user can inspect bundle contents

#### Scenario: Failed generation shows actionable diagnostics
- **WHEN** project bundle generation fails
- **THEN** the result state shows the failure reason with actionable diagnostics
- **AND** it offers routes to inspect or repair the blocking issue

### Requirement: Recent operations SHALL summarize project bundle runs
The system SHALL record completed project bundle workflows as compact recent-operation entries with route to bundle result detail.

#### Scenario: Project bundle appears as recent operation
- **WHEN** a project bundle workflow completes
- **THEN** recent operations shows one entry for the bundle run
- **AND** the entry includes workflow type, timestamp, aggregate status, and bundle identity
- **AND** it does not claim that the bundle was restored, applied, or synced

#### Scenario: Recent operation opens bundle result detail
- **WHEN** the user selects a project bundle recent-operation entry
- **THEN** the page shows the bundle result detail with package identity, member inventory, validation summary, and generation outcome

### Requirement: Validation semantics SHALL remain coherent across shipped workflows
The system SHALL keep validation semantics coherent across all shipped `Backup / Migration` workflows: `session-backup`, `bulk-session-backup`, `import-backup`, `validate-package`, `migration-preview`, and `project-bundle`.

This coherence requirement does not replace workflow-specific terminal status vocabulary that is already defined elsewhere in this specification.

#### Scenario: Comparable conditions keep comparable severity
- **WHEN** two workflows encounter comparable non-structural issues such as incomplete provenance, unresolved but non-fatal references, or partial but usable context
- **THEN** they classify those issues with comparable severity unless a workflow-specific rule explicitly justifies a different severity

#### Scenario: Existing workflow-specific result vocab remains valid
- **WHEN** a workflow already has accepted workflow-specific terminal status vocabulary
- **THEN** this hardening preserves that vocabulary
- **AND** semantic alignment is achieved through clearer interpretation and continuation rules instead of forced enum normalization

#### Scenario: Workflow-specific severity exceptions remain explicit
- **WHEN** a superficially similar condition has intentionally different severity across workflow families
- **THEN** the workflow-specific rule remains authoritative
- **AND** the hardened semantics make that exception explicit rather than silently flattening it

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

#### Scenario: Hardening does not broaden existing degrade destinations
- **WHEN** a workflow already has an accepted degrade destination in this specification
- **THEN** hardening may tighten or clarify the degrade behavior
- **AND** it does not broaden that workflow to a looser or deeper landing state than the existing spec already allows

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

#### Scenario: Non-completed states do not create recent operations
- **WHEN** a workflow degrades back to selection, configuration, or validation/input-adjacent state without completing a terminal result
- **THEN** it does not create a recent-operation entry

#### Scenario: Validation-only and preview-only completions still count as terminal results
- **WHEN** a bounded workflow legitimately ends in `result` without confirmation or execution because its accepted contract is validation-only or preview-only
- **THEN** it may still create a recent-operation entry
- **AND** that entry uses workflow-appropriate terminal semantics rather than pretending an execution step occurred
