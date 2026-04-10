# Low-Fi Wireframes Phase 1 Revised

Updated: 2026-04-11

This document applies the resolved decisions from [phase-1-wireframe-decisions.md](./phase-1-wireframe-decisions.md) back into the phase-1 low-fi page skeletons.

It covers:

- `Project Overview`
- `Assets`
- `Backup / Migration`

It is constrained by:

- [low-fi-wireframes-phase-1.md](./low-fi-wireframes-phase-1.md)
- [phase-1-wireframe-decisions.md](./phase-1-wireframe-decisions.md)
- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [page-block-ia.md](./page-block-ia.md)
- [page-state-ia.md](./page-state-ia.md)
- [task-flow-ia.md](./task-flow-ia.md)
- [routed-context-handoff.md](./routed-context-handoff.md)
- [content-contract-draft.md](./content-contract-draft.md)
- [module-interaction-rules.md](./module-interaction-rules.md)
- [cue-lifecycle-rules.md](./cue-lifecycle-rules.md)
- [session-backup-migration-ux.md](./session-backup-migration-ux.md)
- [research-project-bundle.md](./research-project-bundle.md)
- [glossary.md](./glossary.md)

It does not define:

- high-fidelity UI
- visual style
- design tokens
- implementation details
- API design

## 1. Scope

This document is the decision-applied low-fi skeleton for phase 1.

It does not reopen:

- page-role decisions
- phase-1 structural trade-offs
- routed continuity placement principles

Its purpose is to produce a stable low-fi baseline for the next wireframe step.

## 2. Shared Resolved Principles

The following decisions are now treated as fixed for this phase:

- `Project Overview`
  - `Attention Needed` is the main center-of-gravity block
  - `Recent Sessions` remains secondary
  - `Quick Actions` stays beside `Attention Needed` as a compact routing-only column
- `Assets`
  - use `table + right detail`
  - place `In-Effect / Usage` below the primary detail panel as a second layer
- `Backup / Migration`
  - use a dedicated `sticky workflow bar`
  - keep workflow identity visible through all workflow states
  - use a hybrid result/history model:
    - primary result area in result state
    - compact secondary recent-operations area outside result state
- Routed continuity cues
  - use `page-level banner` only when issue or workflow continuity defines the whole current task
  - use `compact inline strip` when continuity is object-local and does not need to dominate the page

## 3. Project Overview

### 3.1 Page Goal

- summarize project-scoped agent context
- make issue triage the page's center of gravity
- route users outward without becoming a dashboard or mini session home

### 3.2 Page Mode

- overview

### 3.3 Revised Low-Fi Skeleton

```text
GLOBAL TOP BAR
  - project identity
  - top-level nav
  - global search

PAGE HEADER
  - page title: Project Overview
  - compact project scope / source presence
  - optional compact completion cue after finished workflow return

TOP SUMMARY ROW
  - Context Snapshot
  - In-Effect Assets

MAIN FOCUS ROW
  - left / dominant column: Attention Needed
  - right / supporting column: Quick Actions

SECONDARY ROW
  - Recent Sessions
```

### 3.4 Structural Reading Order

The intended reading order is:

1. page identity and project context
2. what exists now
3. what needs attention now
4. what to do next
5. what happened recently

This means:

- `Attention Needed` is the primary interpretive summary block
- `Quick Actions` supports it but does not outrank it
- `Recent Sessions` remains useful but clearly secondary

### 3.5 Top Area

`header`

- contains:
  - page title
  - compact project scope / source presence
  - short-lived completion cue when relevant
- does not contain:
  - workflow controls
  - deep issue filters

### 3.6 Main Content Regions

`top summary row`

- `Context Snapshot`
  - compact counts and route-outs
- `In-Effect Assets`
  - compact currently-relevant assets

`main focus row`

- `Attention Needed`
  - dominant summary block
  - first place to look in issue-heavy states
  - route-out block, not triage workbench

- `Quick Actions`
  - compact supporting column
  - must remain routing-only
  - should not contain workflow setup or long action lists

`secondary row`

- `Recent Sessions`
  - compact recent activity summary
  - must not dominate or visually compete with `Attention Needed`

### 3.7 Right Detail / Inspector

- none in default state

Reason:

- this page should not inspect deeply
- issue and route meaning should stay in main summary blocks

### 3.8 State Behavior

`No Project Context`

- keep:
  - header
  - zero-state `Context Snapshot`
  - `Quick Actions`
- suppress:
  - `Attention Needed`
  - `In-Effect Assets`
  - `Recent Sessions`

`Issue`

- keep all core regions
- emphasize:
  - `Attention Needed`
- de-emphasize:
  - `Recent Sessions`

`Post-Workflow Return`

- keep default page skeleton
- show only a compact completion cue in header
- do not surface workflow result detail here

### 3.9 Cue Rules in This Page

- `Attention Needed`
  - retains issue cue
- `In-Effect Assets`
  - retains compact in-effect cue
- `header`
  - may briefly retain completion cue after workflow return

Banner vs inline rule here:

- no persistent page-level routed banner by default
- use only compact completion cue after workflow return

### 3.10 Key CTA and Routes

- `Context Snapshot` -> `Sessions`, `Assets`, `Analysis`
- `In-Effect Assets` -> `Assets`
- `Attention Needed` -> `Analysis`, `Assets`, `Backup / Migration`
- `Quick Actions` -> top-level pages as compact routing targets
- `Recent Sessions` -> `Sessions`

### 3.11 Validation of the Resolved Decision

This page now explicitly avoids:

- becoming a generic dashboard
- becoming a mini `Analysis`
- becoming a session-led home

It does so by:

- centering `Attention Needed`
- keeping `Quick Actions` narrow
- demoting `Recent Sessions` to a lower, clearly secondary row

## 4. Assets

### 4.1 Page Goal

- let users scan reusable assets
- confirm selected-object meaning quickly
- support routed continuity from `Sessions` and `Analysis`
- avoid flattening into either a plain table or an overburdened detail pane

### 4.2 Page Mode

- overview plus table plus right detail plus second-layer usage

### 4.3 Revised Low-Fi Skeleton

```text
GLOBAL TOP BAR
  - project identity
  - top-level nav
  - global search

PAGE HEADER
  - page title: Assets
  - compact routed cue when relevant

SUBTYPE + SCOPE HEADER
  - subtype switcher
  - scope switcher
  - shared filters

TOP SUMMARY ROW
  - Asset Summary

MAIN CONTENT ROW
  - left / dominant column: Asset Inventory Table
  - right / supporting detail column: Asset Detail Panel

SECOND-LAYER DETAIL ROW
  - In-Effect / Usage Module
  - Asset Actions
```

### 4.4 Structural Reading Order

The intended reading order is:

1. page identity and routed continuity
2. current subtype and scope
3. compact asset summary
4. inventory scan
5. selected object understanding
6. project-specific applicability and outbound actions

This means the stable reading sequence is:

- scope first
- object second
- project effect third

### 4.5 Top Area

`header`

- contains:
  - page title
  - compact origin / continue-task cue when routed in
- does not contain:
  - workflow state
  - long origin history

`subtype + scope header`

- is the first landing owner for routed subtype continuity
- must stay above the inventory/detail split
- drives the whole page state

### 4.6 Main Content Regions

`top summary row`

- `Asset Summary`
  - compact totals and health
  - remains summary-only

`main content row`

- `Asset Inventory Table`
  - dominant driving module
  - row selection drives the right detail panel

- `Asset Detail Panel`
  - selected object explanation
  - primary answers:
    - what this asset is
    - what subtype it belongs to
    - scope / source / status / provenance

`second-layer detail row`

- `In-Effect / Usage Module`
  - answers:
    - how this asset matters here
    - whether it is in effect
    - where it is used or relevant

- `Asset Actions`
  - contextual outbound actions only

### 4.7 Right Detail / Inspector

- yes, a right detail panel exists
- it is a primary detail region, not a hidden inspector

This page should not rely on an inspector to answer:

- scope
- source
- status
- provenance
- in-effect

### 4.8 State Behavior

`Normal Unselected`

- show:
  - subtype/scope header
  - summary row
  - inventory table
- use:
  - right detail panel in prompt/empty-selection state
- suppress:
  - second-layer usage row

`Selected`

- show:
  - full skeleton
  - selected object detail on the right
  - second-layer `In-Effect / Usage`
  - contextual `Asset Actions`

`Issue`

- keep same overall structure
- retain compact routed issue cue if entered from `Analysis`
- emphasize issue summary only in `Asset Summary`, not by converting the page into an issue table

`No Assets in Scope`

- keep:
  - subtype/scope header
  - zero-state summary
  - zero-state inventory
- suppress:
  - right detail panel content
  - second-layer usage row

### 4.9 Cue Rules in This Page

Use `compact inline strip` by default for routed continuity:

- when entered from `Sessions`
  - show origin / continue-task cue near header or top of main content
- when entered from `Analysis`
  - show compact issue-oriented cue unless the issue dominates the entire immediate task

Use `page-level banner` only when:

- issue continuity is strong enough to define the whole immediate correction task

Stable cues that must remain visible in selected state:

- provenance cue
- in-effect cue
- routed subtype continuity until user intentionally re-scopes

### 4.10 Key CTA and Routes

- inventory row -> selected asset detail
- detail panel -> `Sessions`
- detail panel -> `Analysis`
- asset actions -> `Backup / Migration`

### 4.11 Validation of the Resolved Decision

This page now explicitly avoids:

- becoming a pure table/list
- overloading the right detail panel with project-effect explanation
- hiding core object meaning in a secondary inspector

It does so by:

- using `table + right detail`
- separating object explanation from in-effect explanation
- keeping routed continuity near the top of the page

## 5. Backup / Migration

### 5.1 Page Goal

- preserve workflow-first structure through all states
- support bounded preservation and portability tasks
- keep result access available without turning into a history-first tools drawer

### 5.2 Page Mode

- wizard plus workflow spine plus compact secondary recent operations

### 5.3 Revised Low-Fi Skeleton

```text
GLOBAL TOP BAR
  - project identity
  - top-level nav
  - global search

PAGE HEADER
  - page title: Backup / Migration
  - compact origin cue when relevant

STICKY WORKFLOW BAR
  - Workflow Selector
  - active workflow identity
  - current step

MAIN WORKFLOW COLUMN
  - Workflow Context Summary
  - Workflow Steps
  - state-specific workflow body

STATE-SPECIFIC WORKFLOW BODY
  - selection: Selection Table
  - validation: Validation Panel
  - confirmation: confirmation block + warnings
  - execution: progress-focused body
  - result: Operation Result / History

LOW-PRIORITY LOWER SECTION
  - compact Recent Operations
```

### 5.4 Structural Reading Order

The intended reading order is:

1. page identity and route origin
2. workflow identity
3. current operation context
4. current workflow step
5. state-specific working body
6. secondary access to recent operations

The page must always read as:

- workflow-first
- history-second

### 5.5 Top Area

`header`

- contains:
  - page title
  - compact origin cue when routed in
- does not contain:
  - primary workflow controls

`sticky workflow bar`

- contains:
  - workflow selector
  - active workflow identity
  - current step
- remains visible through active workflow states
- is the page's primary continuity anchor

### 5.6 Main Content Regions

`main workflow column`

- `Workflow Context Summary`
  - explains:
    - what operation is being performed
    - what object set is involved
    - why the user is here

- `Workflow Steps`
  - remains the main control spine

`state-specific workflow body`

- `selection`
  - `Selection Table`
- `validation`
  - `Validation Panel`
- `confirmation`
  - compact summary + warnings + confirm action
- `execution`
  - progress-focused body
- `result`
  - `Operation Result / History`

`low-priority lower section`

- `Recent Operations`
  - compact
  - clearly secondary
  - must not compete with the active workflow body

### 5.7 Right Detail / Inspector

- no persistent right-side inspector in the core skeleton

Reason:

- workflow identity, validation, warnings, result, and completion all belong in the main workflow column
- a side inspector would dilute workflow-first structure

### 5.8 State Behavior

`Idle`

- show:
  - header
  - sticky workflow bar
- keep workflow body minimal until a workflow is chosen
- recent operations may remain visible as low-priority secondary content

`Selection`

- show:
  - sticky workflow bar
  - workflow context summary
  - selection table
  - workflow steps
  - recent operations still secondary below

`Validation`

- show:
  - sticky workflow bar
  - workflow context summary
  - validation panel
  - workflow steps
- keep:
  - recent operations visible but clearly subordinate

`Confirmation`

- show:
  - sticky workflow bar
  - workflow context summary
  - confirm block
  - warnings if relevant

`Execution`

- show:
  - sticky workflow bar
  - workflow context summary
  - progress-focused body
- de-emphasize:
  - recent operations section

`Result`

- show:
  - sticky workflow bar
  - workflow context summary
  - primary `Operation Result / History`
  - compact completion cue
- keep:
  - lower recent-operations section only if it does not compete with the primary result area

`Failed / Blocked`

- show:
  - sticky workflow bar
  - workflow context summary
  - validation / blocking content
  - corrective route-outs

### 5.9 Cue Rules in This Page

Use `page-level banner` or equivalent high-priority main-content cue when:

- workflow/validation state defines the entire current task
- warning or blocking condition must be understood before proceeding

Use `compact inline strip` for:

- routed origin continuity
- lightweight return-to-origin context

Cue persistence rules here:

- workflow cue is always primary
- validation cue remains through the decision point
- warning cue remains until bypassed, resolved, or made irrelevant
- result cue remains until inspected or the user moves on
- completion cue is shorter-lived than result cue
- all workflow-specific cues must reset when a new workflow starts

### 5.10 Key CTA and Routes

- workflow selector -> chosen workflow
- selection table -> object selection
- validation panel -> inspect and route to `Sessions`, `Assets`, or `Analysis`
- result/history -> inspect result or source object
- completion or return cue -> back to origin task or `Project Overview`

### 5.11 Validation of the Resolved Decision

This page now explicitly avoids:

- becoming a tools drawer
- becoming a generic page-global browser
- letting recent operations overshadow the active workflow

It does so by:

- putting workflow identity in a sticky bar
- keeping workflow state in the main column
- demoting recent operations to a lower, clearly secondary area

## 6. Routed Continuity Pattern Across the Three Pages

The revised phase-1 rule is:

- use `compact inline strip` when continuity is object-local and does not need to dominate the whole page
- use `page-level banner` only when the route reason or validation state defines the whole current task

Applied to these three pages:

- `Project Overview`
  - no routed banner by default
  - only compact completion cue after workflow return
- `Assets`
  - compact inline strip by default for routed entry from `Sessions`
  - banner only when issue continuity from `Analysis` is page-defining
- `Backup / Migration`
  - workflow/validation state behaves like a main-content banner-level concern
  - origin cue remains compact

## 7. Phase-1 Validation Checklist

The next low-fi pass should specifically verify:

- whether `Project Overview` still feels like a triage surface rather than a dashboard
- whether `Quick Actions` stays compact enough beside `Attention Needed`
- whether `Assets` right detail panel and second-layer usage module form a clear reading sequence
- whether the second-layer `In-Effect / Usage` row feels tied tightly enough to the selected object
- whether `Backup / Migration` still reads workflow-first even with the lower recent-operations section
- whether result and completion cues exit cleanly after workflow completion
