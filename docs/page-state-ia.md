# Page State IA

Updated: 2026-04-11

This document defines the page-state IA and workflow-state IA for `Project Agent Context Steward`.

It is the next layer below:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [page-block-ia.md](./page-block-ia.md)

It focuses on:

- page states
- state-triggered block changes
- workflow-state transitions
- validation gates

It does not define:

- visual styling
- interaction microcopy
- implementation details
- API or data-model contracts

Primary references:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [page-block-ia.md](./page-block-ia.md)
- [glossary.md](./glossary.md)
- [research-session-backup.md](./research-session-backup.md)

## 1. Scope

This document covers two kinds of state:

- page states
  - empty
  - loading
  - normal
  - selected
  - issue
  - completed
- workflow states
  - selection
  - configuration
  - validation
  - confirmation
  - execution
  - result

The goal is to make sure each top-level page has a stable skeleton and does not collapse into another page's responsibility when data or workflow state changes.

## 2. Shared State Model

### 2.1 Cross-Page State Categories

The following state categories can appear across multiple pages:

- `No Project Context`
  - the page has no relevant data yet for the current project
- `Loading`
  - the page is waiting on data or a view transition
- `Normal`
  - the main page skeleton is populated and browsable
- `Selected`
  - a specific row, item, finding, or workflow target is selected
- `Issue`
  - the page is showing a problem that requires attention
- `Completed`
  - a bounded workflow has produced an outcome

### 2.2 Shared State Behaviors

When possible:

- empty states should route toward useful next steps, not explain the whole product
- loading states should preserve page identity and skeleton
- issue states should route to corrective action
- selected states should add detail, not replace the inventory or overview backbone
- completed states should expose outcome plus next-step navigation

## 3. Project Overview State IA

### 3.1 Fixed Backbone

The fixed page backbone is:

- Project Header
- Context Snapshot
- In-Effect Assets
- Recent Sessions
- Attention Needed
- Quick Actions

### 3.2 States

#### No Project Context

- Trigger: the project has no sessions and no reusable assets yet.
- Visible blocks:
  - Project Header
  - Context Snapshot in zero state
  - Quick Actions
- Suppressed blocks:
  - In-Effect Assets
  - Recent Sessions
  - Attention Needed
- Primary actions:
  - open `Sessions`
  - open `Assets`
  - open `Backup / Migration` import or restore entry
- Purpose:
  - establish that the page is a project-level starting point, not an error

#### Loading

- Trigger: initial project load or project switch.
- Visible blocks:
  - Project Header
  - placeholder versions of Context Snapshot, In-Effect Assets, Recent Sessions, Attention Needed
- Primary actions:
  - none beyond global navigation
- Purpose:
  - preserve the overview identity while data resolves

#### Normal

- Trigger: project summary data is available.
- Visible blocks:
  - full fixed backbone
- Primary actions:
  - route into `Sessions`, `Assets`, `Analysis`, or `Backup / Migration`

#### Issue

- Trigger: high-priority conflicts, stale assets, failed validation, or backup risk exists.
- Visible blocks:
  - full fixed backbone
  - Attention Needed prioritized above Recent Sessions
- Primary actions:
  - route to `Analysis`
  - route to object-level correction in `Assets`
  - route to preservation flows in `Backup / Migration`

## 4. Sessions State IA

### 4.1 Fixed Backbone

The fixed page backbone is:

- Session Source Bar
- Session List
- Session View

### 4.2 States

#### No Sessions

- Trigger: current filters or current project return no sessions.
- Visible blocks:
  - Session Source Bar
  - Session List in zero state
- Suppressed blocks:
  - Session View
  - Error Center
  - Session Inspector
- Primary actions:
  - clear filters
  - switch source or time range
  - route back to `Project Overview`
  - open `Backup / Migration` import when the project is expected to contain sessions

#### Loading

- Trigger: page load, filter change, or session switch.
- Visible blocks:
  - Session Source Bar
  - Session List with placeholder rows
  - Session View with loading shell if a session is already selected
- Purpose:
  - keep the workbench stable during data changes

#### Normal Unselected

- Trigger: sessions exist but no session is currently selected.
- Visible blocks:
  - Session Source Bar
  - Session List
  - Session View in prompt state
- Suppressed blocks:
  - Error Center
  - Session Inspector
- Primary actions:
  - select a session
  - refine filters

#### Selected

- Trigger: a session is selected.
- Visible blocks:
  - Session Source Bar
  - Session List
  - Session View
  - Session Actions
- Conditional blocks:
  - Chain / Continuation Strip if relationships exist
  - Error Center if error-like events exist
  - Session Inspector if an event or message is selected
- Primary actions:
  - inspect session evidence
  - route to `Assets`
  - route to `Backup / Migration`

#### Issue

- Trigger: selected session contains important failures or data-access issues.
- Visible blocks:
  - selected state backbone
  - Error Center prioritized
- Primary actions:
  - inspect event
  - route to `Analysis` if issue spans sessions
  - preserve session in `Backup / Migration` if needed

## 5. Assets State IA

### 5.1 Fixed Backbone

The fixed page backbone is:

- Asset Scope Header
- Asset Summary
- Asset Inventory Table

### 5.2 States

#### No Assets in Scope

- Trigger: current subtype and scope return no assets.
- Visible blocks:
  - Asset Scope Header
  - Asset Summary in zero state
  - Asset Inventory Table in zero state
- Suppressed blocks:
  - Asset Detail Panel
  - In-Effect / Usage Module
- Primary actions:
  - switch subtype
  - switch scope
  - import assets
  - inspect sessions for promotable material

#### Loading

- Trigger: subtype or scope change, or initial load.
- Visible blocks:
  - Asset Scope Header
  - Asset Summary placeholder
  - Asset Inventory Table placeholder

#### Normal Unselected

- Trigger: assets exist but no asset is selected.
- Visible blocks:
  - fixed backbone
- Primary actions:
  - scan the inventory
  - sort and filter
  - select an asset

#### Selected

- Trigger: an asset is selected.
- Visible blocks:
  - fixed backbone
  - Asset Detail Panel
- Conditional blocks:
  - In-Effect / Usage Module when applicability data exists
  - Asset Actions when the asset supports import, archive, or migration work
- Primary actions:
  - inspect provenance
  - inspect scope and in-effect status
  - route to related `Sessions`
  - route to `Backup / Migration`

#### Issue

- Trigger: the current inventory or selected asset includes stale, conflicted, orphaned, or invalid items.
- Visible blocks:
  - fixed backbone
  - Asset Summary with issue emphasis
  - selected detail if relevant
- Primary actions:
  - route to `Analysis` for grouped interpretation
  - take bounded asset action

## 6. Analysis State IA

### 6.1 Fixed Backbone

The fixed page backbone is:

- Analysis Header
- Context Health Summary
- Findings Table

### 6.2 States

#### No Findings

- Trigger: current filters return no findings.
- Visible blocks:
  - Analysis Header
  - Context Health Summary in clear state
  - Findings Table in zero state
- Suppressed blocks:
  - Finding Detail
  - Recommended Actions
- Primary actions:
  - adjust filters
  - route to `Project Overview`

#### Loading

- Trigger: initial analysis load or filter changes.
- Visible blocks:
  - fixed backbone placeholders

#### Normal Unselected

- Trigger: findings exist but none is selected.
- Visible blocks:
  - fixed backbone
- Primary actions:
  - scan issue classes
  - select a finding
  - refine filters

#### Selected

- Trigger: a finding is selected.
- Visible blocks:
  - fixed backbone
  - Finding Detail
- Conditional blocks:
  - Recommended Actions when actionable routes exist
- Primary actions:
  - inspect evidence
  - route to `Sessions`
  - route to `Assets`
  - route to `Backup / Migration`

If the user returns from a correction or review route and the finding is still valid under the current filters, the page should restore the previously selected finding and allow triage to continue.

#### Severe Issue

- Trigger: high-priority validation or health risk exists.
- Visible blocks:
  - fixed backbone
  - selected detail if one finding is selected
  - Recommended Actions emphasized
- Primary actions:
  - immediate corrective routing
  - preserve before risky change

## 7. Backup / Migration Page State IA

### 7.1 Fixed Backbone

The fixed page backbone is:

- Workflow Selector
- Workflow Context Summary
- Workflow Steps

### 7.2 Page States

#### Idle

- Trigger: the page is open but no workflow has been chosen yet.
- Visible blocks:
  - Workflow Selector
- Suppressed blocks:
  - Workflow Context Summary
  - Selection Table
  - Workflow Steps
  - Validation Panel
  - Operation Result / History
- Primary actions:
  - choose workflow

#### Selection

- Trigger: a workflow requiring object selection is active.
- Visible blocks:
  - Workflow Selector
  - Workflow Context Summary
  - Selection Table
  - Workflow Steps
- Conditional blocks:
  - Validation State summary if known risks already exist
- Primary actions:
  - select sessions or assets
  - move to configuration

#### Configuration

- Trigger: selection is complete and the workflow needs options.
- Visible blocks:
  - Workflow Selector
  - Workflow Context Summary
  - Workflow Steps
- Conditional blocks:
  - Selection Table if the user reopens selection
- Primary actions:
  - configure options
  - move to validation

#### Validation

- Trigger: the system is checking compatibility, completeness, or portability.
- Visible blocks:
  - Workflow Selector
  - Workflow Context Summary
  - Workflow Steps
  - Validation Panel
- Primary actions:
  - inspect warnings
  - fix source issues
  - continue to confirmation if checks pass

#### Confirmation

- Trigger: validation is complete enough to proceed.
- Visible blocks:
  - Workflow Selector
  - Workflow Context Summary
  - Workflow Steps
  - Validation Panel if warnings remain
- Primary actions:
  - confirm operation
  - go back to selection or configuration

#### Execution

- Trigger: the workflow is actively running.
- Visible blocks:
  - Workflow Selector
  - Workflow Context Summary
  - Workflow Steps in progress state
- Suppressed blocks:
  - Selection Table unless progress details require it
- Primary actions:
  - monitor progress
  - avoid parallel editing assumptions

#### Result

- Trigger: the workflow completes successfully or with actionable warnings.
- Visible blocks:
  - Workflow Selector
  - Workflow Context Summary
  - Workflow Steps in completed state
  - Operation Result / History
- Conditional blocks:
  - Validation Panel if post-run warnings remain
- Primary actions:
  - inspect package or import result
  - open source or result objects
  - rerun validation
  - return to `Project Overview`

#### Failed / Blocked

- Trigger: validation fails or execution cannot safely continue.
- Visible blocks:
  - Workflow Selector
  - Workflow Context Summary
  - Workflow Steps
  - Validation Panel
- Conditional blocks:
  - Operation Result / History if partial results exist
- Primary actions:
  - inspect blocking issue
  - route to `Sessions`, `Assets`, or `Analysis`
  - retry after correction

## 8. Workflow State IA by Workflow Type

### 8.1 Session Backup

Recommended state path:

- Idle
- Selection
- Configuration
- Validation
- Confirmation
- Execution
- Result

Validation gates:

- selected session exists
- canonical `Session Record` can be created
- provenance is preserved
- `Source Backup` stays optional and explicit

Blocked examples:

- unreadable source
- missing normalization path
- package validation failure

### 8.2 Project Bundle

Recommended state path:

- Idle
- Selection
- Configuration
- Validation
- Confirmation
- Execution
- Result

Validation gates:

- bundle scope is explicit
- included sessions and assets are known
- portability warnings are visible
- package contents can be inspected after completion

Blocked examples:

- incompatible asset scope assumptions
- unresolved missing provenance
- partial inclusion that breaks user intent

### 8.3 Import

Recommended state path:

- Idle
- Selection
- Validation
- Confirmation
- Execution
- Result

Validation gates:

- import package is readable
- schema version is compatible
- object classes are understood
- conflicts are visible before apply

Blocked examples:

- unsupported schema family
- malformed package
- unresolvable conflicts

### 8.4 Migration Preview

Recommended state path:

- Idle
- Selection
- Configuration
- Validation
- Result

This workflow can end at preview without requiring execution in v1.

Validation gates:

- source and target context are explicit
- canonical source is known when required
- unsupported mappings are surfaced as warnings or blocks

Blocked examples:

- no compatible target mapping
- missing canonical source
- incomplete object metadata

### 8.5 Restore / Validate

Recommended state path:

- Idle
- Selection
- Validation
- Result

This workflow should remain validation-first in v1.

Validation gates:

- package is readable
- package contents match expectations
- selected restore targets are explicit
- trust state is understandable before any future restore action

Blocked examples:

- unreadable backup package
- failed integrity checks
- mismatched project assumptions

## 9. Fixed vs Conditional vs Deferred State Blocks

### 9.1 Fixed State Blocks

These define page identity and should remain stable across most states:

- `Project Overview`
  - Project Header
  - Context Snapshot
- `Sessions`
  - Session Source Bar
  - Session List
- `Assets`
  - Asset Scope Header
  - Asset Inventory Table
- `Analysis`
  - Analysis Header
  - Findings Table
- `Backup / Migration`
  - Workflow Selector

### 9.2 Conditional State Blocks

These appear based on selection, issue, or workflow state:

- In-Effect Assets
- Recent Sessions
- Attention Needed
- Chain / Continuation Strip
- Error Center
- Session Inspector
- Asset Detail Panel
- In-Effect / Usage Module
- Finding Detail
- Recommended Actions
- Selection Table
- Validation Panel
- Operation Result / History

### 9.3 Deferred Extensions

These are valid future additions after the state IA baseline is stable:

- dedicated compare state for sessions
- saved issue-review queues in `Analysis`
- bulk migration state for reusable assets
- richer post-import reconciliation flows
- restore simulation with project-level diffing
- user-defined overview layouts
