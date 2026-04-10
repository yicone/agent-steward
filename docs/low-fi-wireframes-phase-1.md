# Low-Fi Wireframes Phase 1

Updated: 2026-04-11

This document defines low-fi wireframe guidance for the first three priority pages of `Project Agent Context Steward`:

- `Project Overview`
- `Assets`
- `Backup / Migration`

It is constrained by:

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
- design system choices
- final visual style
- implementation code
- API design

## 1. Scope

These wireframes are intentionally structural.

They are meant to verify:

- page hierarchy
- module placement
- task continuity
- workflow containment
- low-fi page feasibility

They are not meant to define:

- styling
- spacing system
- final interactions
- final responsive behavior

## 2. Shared Wireframe Conventions

### 2.1 Global Top Bar

All three pages assume a persistent top bar containing:

- project identity
- top-level navigation
- global search entry

This document does not redesign that shell.
It only assumes it exists.

### 2.2 Cue Placement Principles

For this phase:

- route-critical or task-critical cues belong in the main content path
- object-specific secondary detail may live in a right-side detail area
- workflow-critical cues must remain inside the main workflow area
- summary pages should avoid persistent right-side inspectors unless they are truly necessary

### 2.3 Panel Terms

The following textual wireframe zones are used repeatedly:

- `header`
- `top summary row`
- `left rail`
- `main panel`
- `right detail panel`
- `sticky task strip`
- `workflow spine`
- `result section`

## 3. Project Overview

### 3.1 Page Goal

- summarize the state of project-scoped agent context
- route the user into the right detailed page
- avoid becoming a generic dashboard, findings page, or mini session browser

### 3.2 Page Mode

- overview

### 3.3 Default Low-Fi Skeleton

```text
GLOBAL TOP BAR
  - project identity
  - top-level nav
  - global search

PAGE HEADER
  - page title: Project Overview
  - compact project scope / source presence
  - optional compact return/completion cue from finished workflow

TOP SUMMARY ROW
  - Context Snapshot
  - In-Effect Assets

MAIN CONTENT ROW
  - left / wide column: Attention Needed
  - right / narrow column: Quick Actions

BOTTOM ROW
  - full-width or wide-left: Recent Sessions
```

### 3.4 Top Area

`header`

- must contain:
  - page identity
  - compact project identity
  - compact source presence summary
- may contain:
  - short-lived completion cue after returning from `Backup / Migration`
- should not contain:
  - issue triage controls
  - workflow controls

### 3.5 Main Content Regions

`top summary row`

- `Context Snapshot`
  - compact counts / health / route-outs
- `In-Effect Assets`
  - compact currently-relevant assets

`main content row`

- `Attention Needed`
  - primary issue summary block
  - should be visually larger than `Quick Actions` in issue state
- `Quick Actions`
  - compact routing actions
  - not a workflow surface

`bottom row`

- `Recent Sessions`
  - compact recent activity summary
  - should not dominate the page

### 3.6 Secondary Content

- no persistent right detail panel in the default state
- no inspector by default

Reason:

- this page should route, not inspect deeply

### 3.7 Modules Visible by Default

- `Project Header`
- `Context Snapshot`
- `In-Effect Assets`
- `Attention Needed`
- `Quick Actions`
- `Recent Sessions`

### 3.8 Modules Visible by State

`No Project Context`

- keep:
  - header
  - zero-state `Context Snapshot`
  - `Quick Actions`
- suppress:
  - `In-Effect Assets`
  - `Recent Sessions`
  - `Attention Needed`

`Issue`

- keep all default modules
- raise the prominence of:
  - `Attention Needed`
- reduce emphasis of:
  - `Recent Sessions`

`Post-Workflow Return`

- keep standard layout
- allow one compact completion cue in header area
- do not expose workflow result internals here

### 3.9 Cues That Must Remain Explicit

- issue cue inside `Attention Needed`
- in-effect cue inside `In-Effect Assets`
- completion cue only briefly after returning from workflow

### 3.10 Key CTA and Page Jumps

- `Context Snapshot` -> `Sessions`
- `Context Snapshot` -> `Assets`
- `Context Snapshot` -> `Analysis`
- `In-Effect Assets` -> `Assets`
- `Attention Needed` -> `Analysis`, `Assets`, or `Backup / Migration`
- `Recent Sessions` -> `Sessions`
- `Quick Actions` -> all top-level pages as routing targets

### 3.11 What This Page Must Not Become

- a generic dashboard with unrelated widgets
- a mini `Analysis` page
- a session-centered homepage

### 3.12 Most Likely Design Disagreements

- how much space `Attention Needed` gets relative to `Recent Sessions`
- whether `Quick Actions` should sit beside or below `Attention Needed`
- whether a returned completion cue belongs in the page header or above the top summary row

## 4. Assets

### 4.1 Page Goal

- let the user understand and work with reusable context assets
- keep `Assets` aggregated across `Rules / Memory / Skills / Commands`
- avoid becoming only a plain table or a hidden editor

### 4.2 Page Mode

- overview plus table plus detail

### 4.3 Default Low-Fi Skeleton

```text
GLOBAL TOP BAR
  - project identity
  - top-level nav
  - global search

PAGE HEADER
  - page title: Assets
  - compact origin / continue-task cue when routed in

SUBTYPE + SCOPE HEADER
  - asset subtype switcher
  - scope switcher
  - shared filters

TOP SUMMARY ROW
  - Asset Summary

MAIN CONTENT ROW
  - left / wide column: Asset Inventory Table
  - right / medium column: Asset Detail Panel

SECONDARY DETAIL BAND
  - beneath detail or attached to detail: In-Effect / Usage Module
  - contextual action area: Asset Actions
```

### 4.4 Top Area

`header`

- must contain:
  - page identity
  - compact routed origin cue when entered from `Sessions` or `Analysis`
- should not contain:
  - long route history
  - workflow state

`subtype + scope header`

- this is the main driving strip for the page
- it should sit above the inventory and detail split
- it is the first landing owner for routed subtype handoff from `Sessions`

### 4.5 Main Content Regions

`top summary row`

- `Asset Summary`
  - compact totals and health
  - should remain summary-only

`main content row`

- `Asset Inventory Table`
  - primary driving module
- `Asset Detail Panel`
  - selected asset explanation

`secondary detail band`

- `In-Effect / Usage Module`
  - directly tied to selected asset
- `Asset Actions`
  - contextual outbound actions only

### 4.6 Right Detail / Inspector

- yes, a right detail panel should exist
- but it should be a primary detail area, not a hidden inspector-only surface

Reason:

- this page needs object understanding in parallel with inventory scanning
- `scope / source / status / provenance / in-effect` cannot be hidden in an inspector

### 4.7 Modules Visible by Default

- `Asset Scope Header`
- `Asset Summary`
- `Asset Inventory Table`

### 4.8 Modules Visible by State

`Normal Unselected`

- show:
  - `Asset Scope Header`
  - `Asset Summary`
  - `Asset Inventory Table`
- use:
  - right detail area in empty-prompt state

`Selected`

- show:
  - all defaults
  - `Asset Detail Panel`
- conditional:
  - `In-Effect / Usage Module`
  - `Asset Actions`

`Issue`

- keep:
  - same overall structure
- increase emphasis in:
  - `Asset Summary`
  - routed issue cue if entered from `Analysis`

`No Assets in Scope`

- keep:
  - subtype/scope header
  - zero-state summary
  - zero-state table
- suppress:
  - detail and usage modules

### 4.9 Cues That Must Remain Explicit

- routed origin cue when entered from `Sessions` or `Analysis`
- continue-task cue while the routed task is still active
- provenance cue in selected asset detail
- in-effect cue in selected asset detail / usage module
- issue cue when entered from `Analysis`

### 4.10 Key CTA and Page Jumps

- inventory row -> select asset in detail panel
- detail panel -> related `Sessions`
- detail panel -> `Analysis`
- asset actions -> `Backup / Migration`
- scope/subtype changes -> update inventory and detail state

### 4.11 What This Page Must Not Become

- a plain registry table with no usable detail
- a generic text editor
- a second `Analysis` page

### 4.12 Most Likely Design Disagreements

- whether `Asset Summary` sits above the table or beside the scope header
- whether `In-Effect / Usage Module` sits inside the detail panel or below it as a second band
- how strong the routed cue should be when entering from `Sessions`

## 5. Backup / Migration

### 5.1 Page Goal

- support bounded workflows for preservation, import, validation, preview, and project bundle operations
- avoid becoming a tools drawer or generic object browser

### 5.2 Page Mode

- wizard plus table

### 5.3 Default Low-Fi Skeleton

```text
GLOBAL TOP BAR
  - project identity
  - top-level nav
  - global search

PAGE HEADER
  - page title: Backup / Migration
  - compact origin cue when entered from another page

STICKY WORKFLOW BAR
  - Workflow Selector
  - current workflow identity
  - current step

MAIN WORKFLOW AREA
  - Workflow Context Summary
  - Workflow Steps

WORKFLOW BODY (changes by state)
  - selection state: Selection Table
  - validation state: Validation Panel
  - confirmation state: summary + warnings + confirm action
  - execution state: progress in workflow body
  - result state: Operation Result / History

OPTIONAL LOWER SECTION
  - workflow-scoped history or recent operations
```

### 5.4 Top Area

`header`

- must contain:
  - page identity
  - compact origin cue when routed in
- should not contain:
  - a global tools menu

`sticky workflow bar`

- must remain visible throughout active workflows
- should contain:
  - workflow identity
  - current step
  - compact continue-task orientation

### 5.5 Main Content Regions

`main workflow area`

- `Workflow Context Summary`
  - what operation is being performed
  - on what object set
  - why the user is here

- `Workflow Steps`
  - the workflow spine
  - always the main control surface

`workflow body`

- selection state:
  - `Selection Table`
- validation state:
  - `Validation Panel`
- confirmation state:
  - workflow summary
  - warning area if needed
- execution state:
  - progress-focused body
- result state:
  - `Operation Result / History`

### 5.6 Right Detail / Inspector

- no persistent right-side inspector in the default page model

Reason:

- workflow identity, validation, warnings, and results must stay in the main content region
- a side inspector would weaken the workflow-first model

Secondary detail may still appear inline or below the workflow body when needed, but it should not become the page's main structure.

### 5.7 Modules Visible by Default

`Idle`

- `Workflow Selector`

`Active Workflow`

- `Workflow Selector`
- `Workflow Context Summary`
- `Workflow Steps`

### 5.8 Modules Visible by State

`Selection`

- show:
  - sticky workflow bar
  - workflow context summary
  - selection table
  - step controls

`Validation`

- show:
  - sticky workflow bar
  - workflow context summary
  - workflow steps
  - validation panel

`Confirmation`

- show:
  - sticky workflow bar
  - workflow context summary
  - validation cue if still relevant
  - confirm action area

`Execution`

- show:
  - sticky workflow bar
  - workflow context summary
  - progress-focused step body
- suppress:
  - non-essential browsing surfaces

`Result`

- show:
  - sticky workflow bar
  - workflow context summary
  - operation result / history
  - compact completion cue

`Failed / Blocked`

- show:
  - sticky workflow bar
  - workflow context summary
  - validation panel
  - corrective route-outs

### 5.9 Cues That Must Remain Explicit

- workflow cue
- validation cue when validation matters
- warning cue when a non-blocking risk affects the current decision
- result cue when something was produced
- completion cue when the task is done
- origin cue while the routed task is still active
- return-to-origin cue when bouncing back is likely useful

### 5.10 Key CTA and Page Jumps

- workflow selector -> enter chosen workflow
- selection table -> choose objects
- validation panel -> inspect and route to `Sessions`, `Assets`, or `Analysis`
- result/history -> open resulting or source object
- completion/return cue -> back to origin task or `Project Overview`

### 5.11 What This Page Must Not Become

- a generic tools drawer
- a page-global browser with filters as the primary experience
- a hidden admin page

### 5.12 Most Likely Design Disagreements

- whether the workflow selector sits in the page header or a separate sticky strip
- how much of result/history remains visible after completion
- whether operation history belongs as a lower section in the same page or only inside result mode

## 6. Cross-Page Validation Notes

### 6.1 Project Overview

This page is viable in low-fi if:

- `Attention Needed` remains a summary route-out
- `Recent Sessions` remains compact
- `Quick Actions` remains routing-first

### 6.2 Assets

This page is viable in low-fi if:

- the user can see subtype/scope before reading detail
- selected asset detail is always paired with a real inventory surface
- routed continuity from `Sessions` and `Analysis` is visible but not dominant

### 6.3 Backup / Migration

This page is viable in low-fi if:

- the workflow spine remains visually and structurally primary
- selection and validation never look like generic browsing
- result and completion states do not pollute the next workflow run

## 7. Points Requiring User Confirmation Before Next Phase

The highest-value confirmations before deeper wireframe work are:

1. `Project Overview`
   - whether `Attention Needed` should be the dominant central block in issue-heavy states

2. `Assets`
   - whether the preferred low-fi structure is:
     - table + right detail
     - or table + lower detail band

3. `Backup / Migration`
   - whether operation history should live:
     - only in result state
     - or as a secondary lower section available across workflows

4. Routed continuity
   - whether `origin cue` should be:
     - a compact inline strip
     - or a page-level banner when the route is task-critical
