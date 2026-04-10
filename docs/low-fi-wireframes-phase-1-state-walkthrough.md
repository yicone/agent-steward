# Low-Fi Wireframes Phase 1 State Walkthrough

Updated: 2026-04-11

This document walks the phase-1 low-fi wireframes through key page states for:

- `Project Overview`
- `Assets`
- `Backup / Migration`

It is constrained by:

- [low-fi-wireframes-phase-1-revised.md](./low-fi-wireframes-phase-1-revised.md)
- [page-state-ia.md](./page-state-ia.md)
- [routed-context-handoff.md](./routed-context-handoff.md)
- [module-interaction-rules.md](./module-interaction-rules.md)
- [cue-lifecycle-rules.md](./cue-lifecycle-rules.md)
- [session-backup-migration-ux.md](./session-backup-migration-ux.md)

It does not define:

- high-fidelity UI
- visual style
- wireframe styling details
- component props
- API or implementation details

## 1. Purpose

This document tests whether the phase-1 page skeletons remain coherent as state changes.

The goal is to verify:

- which modules stay fixed
- which modules rise or fall in emphasis
- which cues must persist, downgrade, or expire
- whether each page still keeps its original role

This is a walkthrough document, not a new IA layer.

## 2. Shared Walkthrough Rules

The following rules apply across all three pages:

- fixed backbone modules should remain visible unless the state explicitly suppresses them
- routed context should preserve task continuity only while it still changes the next action
- selected-state detail should add understanding, not replace page identity
- result and completion states should not pollute later ordinary browsing
- page-level banners should be used only when the routed issue or workflow defines the whole current task
- compact inline strips should be used when continuity is local to one object or one immediate area

## 3. Project Overview

### 3.1 Role Reminder

`Project Overview` is a governance and routing page.

It must remain:

- summary-first
- issue-aware
- route-oriented

It must not become:

- a mini `Analysis`
- a mini `Sessions`
- a workflow result page

### 3.2 Initial Skeleton

```text
GLOBAL TOP BAR
  - project identity
  - top-level nav
  - global search

PAGE HEADER
  - page title: Project Overview
  - compact project scope / source presence
  - optional compact completion cue

TOP SUMMARY ROW
  - Context Snapshot
  - In-Effect Assets

MAIN FOCUS ROW
  - Attention Needed
  - Quick Actions

SECONDARY ROW
  - Recent Sessions
```

### 3.3 Normal

#### Modules That Remain

- `Page Header`
- `Context Snapshot`
- `In-Effect Assets`
- `Attention Needed`
- `Quick Actions`
- `Recent Sessions`

#### Modules That Rise

- `Attention Needed` remains the main center block

#### Cue Behavior

- no persistent routed banner
- compact in-effect cues stay inside `In-Effect Assets`
- no continue-task cue unless returning from a bounded workflow very recently

#### CTA Behavior

- `Attention Needed` routes to `Analysis`, `Assets`, or `Backup / Migration`
- `Quick Actions` remains compact and routing-only
- `Recent Sessions` routes to `Sessions`, but does not become the main reading path

#### Role Check

The page still behaves as a governance/routing page because no inventory or deep detail takes over the main content region.

### 3.4 Issue-Heavy

#### State Intent

The project has meaningful risks such as stale assets, failed validation, or preservation risk.

#### Modules That Remain

- full normal backbone remains

#### Modules That Rise

- `Attention Needed` becomes the dominant visual and semantic center

#### Modules That De-Emphasize

- `Recent Sessions` remains visible but clearly lower in priority
- `Quick Actions` stays supportive and should not become a command center

#### Cue Behavior

- issue cue remains concentrated inside `Attention Needed`
- no page-level issue banner unless the issue is page-defining and blocks ordinary interpretation
- `In-Effect Assets` keeps only compact in-effect cues

#### CTA Behavior

- primary CTAs concentrate in `Attention Needed`
  - review issue in `Analysis`
  - inspect object in `Assets`
  - preserve or validate in `Backup / Migration`
- `Recent Sessions` CTA stays available but secondary

#### Role Check

The page still does not become `Analysis` because it summarizes and routes outward rather than presenting grouped findings, finding detail, or corrective triage surfaces.

### 3.5 Routed-In Return From Workflow

#### State Intent

The user has completed a bounded workflow, usually in `Backup / Migration`, and returns here.

#### Modules That Remain

- normal page backbone remains unchanged

#### Modules That Rise

- none of the summary blocks should be replaced by workflow result content

#### Cue Behavior

- a compact completion cue may appear in the header
- no persistent workflow banner
- no result detail region on this page
- completion cue should downgrade quickly after acknowledgment or renewed browsing

#### CTA Behavior

- CTAs return to ordinary top-level routing quickly
- a compact follow-up route may exist from the completion cue:
  - reopen result in `Backup / Migration`
  - review affected area in `Sessions` or `Assets`

#### Role Check

The page still behaves as `Project Overview` because workflow result content does not become a primary content section.

### 3.6 No Project Context

#### Modules That Remain

- `Page Header`
- zero-state `Context Snapshot`
- compact `Quick Actions`

#### Modules That Suppress

- `In-Effect Assets`
- `Attention Needed`
- `Recent Sessions`

#### Cue Behavior

- no routed continuity by default
- no stale completion cue should survive into this state

#### CTA Behavior

- primary actions route to:
  - `Sessions`
  - `Assets`
  - `Backup / Migration` import or restore entry

#### Role Check

Even in zero state, the page still acts as a project starting point rather than an empty error page.

## 4. Assets

### 4.1 Role Reminder

`Assets` is an inventory-plus-understanding page.

It must remain:

- subtype and scope aware
- selection-driven
- stable in its reading order

It must not become:

- a pure list/table
- a hidden inspector workflow
- an issue-triage page

The resolved reading order is:

1. subtype/scope
2. inventory
3. selected object understanding
4. project-specific in-effect / usage

### 4.2 Initial Skeleton

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
  - left / dominant: Asset Inventory Table
  - right / supporting: Asset Detail Panel

SECOND-LAYER DETAIL ROW
  - In-Effect / Usage Module
  - Asset Actions
```

### 4.3 Normal Unselected

#### Modules That Remain

- `Page Header`
- `Subtype + Scope Header`
- `Asset Summary`
- `Asset Inventory Table`
- `Asset Detail Panel` in prompt state

#### Modules That Suppress

- `In-Effect / Usage Module`
- `Asset Actions`

#### Modules That Rise

- `Asset Inventory Table` becomes the main working surface

#### Cue Behavior

- no strong routed cue unless the page was entered through a task handoff
- compact scope/source/status cues remain in summary and table context only

#### CTA Behavior

- scan, sort, filter, select
- no workflow CTA should dominate before selection

#### Role Check

The page stays more than a list because the right detail region still exists as a stable promise of object understanding, even before selection.

### 4.4 Selected

#### Modules That Remain

- full backbone
- `Asset Detail Panel`
- `In-Effect / Usage Module`
- `Asset Actions`

#### Modules That Rise

- `Asset Detail Panel` becomes the primary secondary reading surface
- `In-Effect / Usage Module` rises as the second layer after object understanding

#### Reading Order Validation

The stable sequence is now:

1. confirm subtype / scope
2. select object from table
3. understand the selected object in right detail
4. inspect how it matters in this project
5. decide whether to route outward via actions

This preserves the intended separation:

- `Asset Detail Panel` = what this asset is
- `In-Effect / Usage Module` = how this asset matters here

#### Cue Behavior

- provenance cue remains visible in the right detail
- in-effect cue remains visible in the second layer
- no inspector should be required to answer scope, source, status, provenance, or in-effect

#### CTA Behavior

- from detail:
  - open linked `Sessions`
  - open related `Analysis`
- from actions:
  - open `Backup / Migration`

#### Role Check

The page still avoids collapsing into a workflow launcher because actions remain contextual and subordinate to understanding.

### 4.5 Routed-In From Sessions

#### State Intent

The user comes from `Sessions` to confirm or create asset meaning from session evidence.

#### Modules That Remain

- selected-state skeleton remains

#### Modules That Rise

- `Subtype + Scope Header` becomes the first landing owner for routed subtype continuity
- `Asset Detail Panel` becomes primary only after subtype intent is explicit

#### Cue Behavior

- use `compact inline strip`, not page-level banner, by default
- origin cue should say the user came from a session-derived task
- continue-task cue stays visible until the user changes subtype, scope, or object intentionally
- return-to-origin cue remains compact and local

#### CTA Behavior

- primary CTA is usually to confirm the asset or continue with asset understanding
- secondary CTA may return to originating `Sessions`

#### Role Check

The page still behaves as `Assets`, not a session follow-up page, because routed continuity is compact and local while the main page remains subtype/inventory/detail driven.

### 4.6 Issue-Oriented Routed-In From Analysis

#### State Intent

The user arrives here to inspect or correct an asset related to a finding.

#### Modules That Remain

- selected-state or normal-selected skeleton remains

#### Modules That Rise

- `Asset Summary` may emphasize the issue class compactly
- `Asset Detail Panel` remains the place for object understanding

#### Cue Behavior

- use compact issue-oriented routed cue by default
- escalate to page-level banner only if the issue defines the whole immediate correction task
- issue cue should expire once the user intentionally changes focus to unrelated subtype/scope/object

#### CTA Behavior

- primary CTA is to inspect or correct the selected asset
- secondary CTA is to return to `Analysis` and continue triage

#### Role Check

The page still does not become `Analysis` because the finding is represented only as a routed issue cue, not as the page's primary content model.

### 4.7 No Assets In Scope

#### Modules That Remain

- `Page Header`
- `Subtype + Scope Header`
- zero-state `Asset Summary`
- zero-state `Asset Inventory Table`

#### Modules That Suppress

- real `Asset Detail Panel` content
- `In-Effect / Usage Module`
- `Asset Actions`

#### Cue Behavior

- routed cue may remain briefly if it helps explain why nothing is shown
- it should downgrade quickly if the user changes scope or subtype

#### CTA Behavior

- switch subtype
- switch scope
- import assets
- inspect `Sessions` for promotable material

#### Role Check

The page still behaves as an asset surface rather than as a dead end because the zero state is scoped and actionable.

## 5. Backup / Migration

### 5.1 Role Reminder

`Backup / Migration` is a restricted workflow page.

It must remain:

- workflow-first
- validation-aware
- bounded by explicit entry and exit

It must not become:

- a generic tools drawer
- a history-first archive page
- a second `Analysis`

### 5.2 Initial Skeleton

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

LOW-PRIORITY LOWER SECTION
  - compact Recent Operations
```

### 5.3 Idle

#### Modules That Remain

- `Page Header`
- `Sticky Workflow Bar`

#### Modules That Suppress

- `Workflow Context Summary`
- `Workflow Steps`
- workflow body
- result region

#### Modules That Rise

- `Workflow Selector` is the only meaningful primary control

#### Cue Behavior

- a compact origin cue may remain if the page was entered with a workflow handoff
- no result cue or completion cue should survive into idle
- no generic browsing cue should appear

#### CTA Behavior

- choose workflow

#### Role Check

The page clearly reads as a workflow entry surface, not a tool shelf.

### 5.4 Routed-In Workflow Start

#### State Intent

The user entered from `Project Overview`, `Sessions`, `Assets`, or `Analysis` with a specific workflow intent.

#### Modules That Remain

- `Page Header`
- `Sticky Workflow Bar`
- `Workflow Context Summary`
- `Workflow Steps`
- state-specific workflow body

#### Modules That Rise

- `Sticky Workflow Bar` becomes the primary continuity anchor
- `Workflow Context Summary` becomes the main semantic bridge from origin to active workflow

#### Cue Behavior

- use page-level banner only when the workflow or issue continuity defines the whole immediate task
- otherwise use compact origin cue in header plus workflow identity in the sticky bar
- continue-task cue remains active through selection and configuration
- return-to-origin cue may remain compact near the workflow context summary

#### CTA Behavior

- CTA shifts from top-level navigation to workflow progression:
  - continue
  - reopen selection
  - cancel

#### Role Check

The page remains workflow-first because route continuity is absorbed into the active workflow spine rather than appearing as detached navigation clutter.

### 5.5 Validation

#### Modules That Remain

- `Page Header`
- `Sticky Workflow Bar`
- `Workflow Context Summary`
- `Workflow Steps`
- `Validation Panel`

#### Modules That Suppress

- `Recent Operations` must stay low-priority and visually secondary

#### Modules That Rise

- `Validation Panel` becomes the dominant body region

#### Cue Behavior

- validation cue must remain continuously visible
- warning cue remains visible through the decision point
- blocking error must not silently downgrade
- result cue must not appear yet

#### CTA Behavior

- inspect warnings
- fix source issue
- go back
- continue only if safe

#### Role Check

The page still does not become `Analysis` because validation is tied to the bounded workflow and its next step, not to broad cross-project interpretation.

### 5.6 Execution

#### Modules That Remain

- `Page Header`
- `Sticky Workflow Bar`
- `Workflow Context Summary`
- `Workflow Steps` in progress state

#### Modules That Suppress

- `Selection Table`, unless progress reporting truly requires it
- `Recent Operations` should stay visually quiet

#### Modules That Rise

- workflow progress body becomes the main focus

#### Cue Behavior

- workflow cue stays fixed
- validation cue downgrades if the workflow has already passed gating
- warning cue remains only if it still affects trust in the result

#### CTA Behavior

- monitor
- avoid unrelated browsing
- cancel only if that action is explicitly supported by the workflow semantics

#### Role Check

The page remains task-bounded because progress becomes the entire center of gravity.

### 5.7 Workflow Result

#### Modules That Remain

- `Page Header`
- `Sticky Workflow Bar`
- `Workflow Context Summary`
- `Workflow Steps` in completed state
- `Operation Result / History`
- compact `Recent Operations`

#### Modules That Rise

- `Operation Result / History` becomes the dominant body region

#### Modules That Stay Secondary

- lower `Recent Operations` remains compact and subordinate

#### Cue Behavior

- result cue appears in the main result region
- completion cue may appear briefly as a compact strip
- warning cue remains only if the result carries unresolved trust or completeness limitations
- completion cue should downgrade quickly after the user inspects, navigates away, or starts a new run

#### CTA Behavior

- inspect result
- open source or result objects
- return to origin
- return to `Project Overview`
- start new workflow only after result state has been clearly resolved

#### Role Check

The page still remains workflow-first because the result is framed as the outcome of the active workflow, not as a free-floating history browser.

### 5.8 Failed / Blocked

#### Modules That Remain

- `Page Header`
- `Sticky Workflow Bar`
- `Workflow Context Summary`
- `Workflow Steps`
- `Validation Panel`

#### Conditional Modules

- `Operation Result / History` only if a partial result exists

#### Modules That Rise

- `Validation Panel` and blocking state become the main body

#### Cue Behavior

- blocking validation or error cue must remain visible until corrected, canceled, or replaced
- warning cue should not be used to soften a blocking state
- return-to-origin cue may remain if correction is expected elsewhere

#### CTA Behavior

- inspect blocking issue
- route to `Sessions`, `Assets`, or `Analysis`
- retry after correction

#### Role Check

The page still does not become a generic diagnostics page because the blocking state is explicitly tied to the current workflow and its next recoverable action.

## 6. Cue Pattern Validation Across These Pages

### 6.1 Page-Level Banner Usage

Use page-level banners only when:

- the routed issue defines the current page task
- the active workflow defines the entire current page state
- the user must understand the cue before using the page correctly

In this phase:

- `Project Overview`
  - rarely needs a banner
  - compact completion cue is enough in most cases
- `Assets`
  - usually uses compact inline strip
  - only escalates to banner in strong issue-defined correction tasks
- `Backup / Migration`
  - most likely page to justify banner-level workflow or warning emphasis, because the active workflow can define the whole page

### 6.2 Compact Inline Strip Usage

Use compact inline strip when:

- continuity is object-local
- the page remains primarily driven by another module
- the cue should orient, not dominate

In this phase:

- `Assets` is the clearest inline-strip page
- `Project Overview` uses compact completion cue rather than a heavy routed banner
- `Backup / Migration` uses compact origin cue in header, but workflow identity stays in the sticky bar

## 7. Final Validation

### 7.1 Project Overview

The walkthrough shows that `Project Overview` still holds its role when:

- issue-heavy states elevate `Attention Needed`
- `Recent Sessions` stays secondary
- workflow completion returns only as a compact cue

It does not become:

- `Analysis`
- `Sessions`
- a result page

### 7.2 Assets

The walkthrough shows that `Assets` still holds its role when:

- routed continuity stays compact
- the table remains the driving surface
- the right detail panel answers object meaning
- the second-layer usage row answers project effect

It does not become:

- a pure list
- a session follow-up surface
- an issue-triage page

### 7.3 Backup / Migration

The walkthrough shows that `Backup / Migration` still holds its role when:

- the sticky workflow bar stays visible through active states
- validation and result live in the workflow spine
- recent operations remain subordinate

It does not become:

- a generic tools drawer
- a history page
- a second analysis surface

## 8. Remaining Questions To Validate In Later Low-Fi Work

The following questions still need visual or interaction-level validation later:

- whether `Project Overview` can keep `Quick Actions` compact enough when issue-heavy
- whether the `Assets` right detail column has enough vertical space before the second layer feels detached
- whether `Backup / Migration` result state transitions cleanly back to idle or next workflow start
- whether users clearly understand the distinction between:
  - compact origin cue
  - continue-task cue
  - completion cue

These are wireframe-validation questions, not reasons to reopen the current structure.
