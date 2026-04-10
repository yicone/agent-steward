# Low-Fi Page Scenarios Phase 1

Updated: 2026-04-11

This document pushes phase-1 low-fi work one step further by walking through four priority page states:

- `Project Overview / issue-heavy`
- `Assets / routed-in from Sessions`
- `Backup / Migration / validation`
- `Backup / Migration / result`

It is constrained by:

- [low-fi-wireframes-phase-1-revised.md](./low-fi-wireframes-phase-1-revised.md)
- [low-fi-wireframes-phase-1-state-walkthrough.md](./low-fi-wireframes-phase-1-state-walkthrough.md)
- [page-state-ia.md](./page-state-ia.md)
- [routed-context-handoff.md](./routed-context-handoff.md)
- [module-interaction-rules.md](./module-interaction-rules.md)
- [cue-lifecycle-rules.md](./cue-lifecycle-rules.md)
- [session-backup-migration-ux.md](./session-backup-migration-ux.md)

It does not define:

- high-fidelity UI
- visual design
- design systems
- component styling
- implementation details
- API design

## 1. Purpose

This document is a page-scenario walkthrough.

Its purpose is to verify that the most important phase-1 states already have a stable low-fi structure for:

- content hierarchy
- task continuity
- cue placement
- CTA priority
- page-role preservation

## 2. Shared Scenario Rules

The following rules apply across all four scenarios:

- the page backbone should remain recognizable after state change
- the current task should be legible without hiding key meaning in an inspector
- routed continuity should remain only as long as it changes the user's next action
- page-level banners should be rare and reserved for page-defining issue or workflow states
- secondary modules should remain visible only if they do not compete with the current page-defining task

## 3. Project Overview / Issue-Heavy

### 3.1 Page Goal

- summarize the project's highest-priority risks
- route the user to the correct next page
- remain a governance and triage-entry page rather than an analysis workbench

### 3.2 Page Skeleton

```text
GLOBAL TOP BAR
  - project identity
  - top-level nav
  - global search

HEADER
  - page title
  - compact project scope / source presence

TOP SUMMARY ROW
  - Context Snapshot
  - In-Effect Assets

MAIN FOCUS ROW
  - primary column: Attention Needed
  - secondary column: Quick Actions

SECONDARY ROW
  - Recent Sessions
```

### 3.3 Primary vs Secondary Regions

`primary column`

- `Attention Needed`
- this is the interpretive center of gravity
- this is where issue cue and top-priority next actions must live

`secondary column`

- `Quick Actions`
- compact only
- routing-only

`secondary row`

- `Recent Sessions`
- still visible
- explicitly lower priority than the issue surface

### 3.4 Must-Appear Cues

- issue cue inside `Attention Needed`
- compact in-effect cues inside `In-Effect Assets`

Do not use:

- persistent page-level routed banner
- persistent completion cue unless the page was just re-entered from a finished workflow

### 3.5 CTA and Executable Actions

Primary CTAs inside `Attention Needed`:

- open grouped issue context in `Analysis`
- inspect affected asset in `Assets`
- preserve or validate in `Backup / Migration`

Secondary CTAs:

- compact routes inside `Quick Actions`
- recent session drill-down from `Recent Sessions`

### 3.6 Modules That Compress or Downgrade

- `Recent Sessions`
  - remains visible but compressed into a secondary row
  - must not compete with the main focus row
- `Quick Actions`
  - remains narrow and compact
  - must not expand into workflow setup
- `Context Snapshot`
  - remains summary-only
  - should not become a filtered issue inventory

### 3.7 Why The Page Still Holds Its Role

This page still behaves as `Project Overview` because:

- the main surface is issue summary, not issue inventory
- all corrective depth still routes outward
- session activity remains secondary
- no detail panel or workflow body is introduced

It does not become:

- `Analysis`, because it does not host findings, finding detail, or correction loops
- `Sessions`, because recent activity is not the primary reading path

## 4. Assets / Routed-In From Sessions

### 4.1 Page Goal

- help the user confirm or continue asset understanding that originated from session evidence
- preserve routed subtype continuity without letting session context take over the page
- keep object understanding separate from project-specific in-effect usage

### 4.2 Page Skeleton

```text
GLOBAL TOP BAR
  - project identity
  - top-level nav
  - global search

HEADER
  - page title
  - compact routed cue

SUBTYPE + SCOPE HEADER
  - subtype switcher
  - scope switcher
  - shared filters

TOP SUMMARY ROW
  - Asset Summary

MAIN CONTENT ROW
  - primary column: Asset Inventory Table
  - right detail panel: Asset Detail Panel

SECOND-LAYER DETAIL ROW
  - In-Effect / Usage Module
  - Asset Actions
```

### 4.3 Primary vs Secondary Regions

`primary column`

- `Asset Inventory Table`
- this remains the driving module
- routed entry should land with subtype already biased, not with the table displaced

`right detail panel`

- `Asset Detail Panel`
- this answers:
  - what the asset is
  - subtype
  - scope
  - source
  - status
  - provenance

`second-layer detail row`

- `In-Effect / Usage Module`
- `Asset Actions`
- this layer must remain below object understanding

### 4.4 Must-Appear Cues

- compact routed origin / continue-task cue near the header or top of main content
- provenance cue in `Asset Detail Panel`
- in-effect cue in `In-Effect / Usage Module`
- compact return-to-origin affordance while routed task remains active

Do not use by default:

- page-level banner

Escalate to banner only if:

- the routed task becomes a page-defining correction task rather than an object-local review task

### 4.5 CTA and Executable Actions

Primary CTAs:

- confirm or inspect selected asset
- inspect linked session relationship
- continue asset understanding via selection and detail

Secondary CTAs:

- return to origin session
- open related `Analysis`
- launch bounded action in `Backup / Migration`

### 4.6 Modules That Compress or Downgrade

- `Asset Summary`
  - remains compact and non-dominant
- routed cue
  - remains compact inline, not banner-level
- `Asset Actions`
  - stays contextual and secondary to understanding

Do not compress:

- `Subtype + Scope Header`
  - it is the first landing owner for routed subtype continuity
- `Asset Detail Panel`
  - it must carry primary object understanding

### 4.7 Why The Page Still Holds Its Role

This page still behaves as `Assets` because:

- routed continuity remains compact
- subtype/scope still defines the page
- table still drives selection
- object understanding still happens before usage interpretation

It does not become:

- a session follow-up page, because session origin remains a cue, not the page model
- a pure table page, because right detail remains structurally primary after selection

## 5. Backup / Migration / Validation

### 5.1 Page Goal

- help the user decide whether the current workflow can safely proceed
- keep the current workflow explicit
- make validation and warnings central without turning the page into an analysis surface

### 5.2 Page Skeleton

```text
GLOBAL TOP BAR
  - project identity
  - top-level nav
  - global search

HEADER
  - page title
  - compact origin cue when relevant

STICKY WORKFLOW BAR
  - Workflow Selector
  - active workflow identity
  - current step

MAIN WORKFLOW COLUMN
  - Workflow Context Summary
  - Workflow Steps
  - Validation Panel

LOW-PRIORITY LOWER SECTION
  - compact Recent Operations
```

### 5.3 Primary vs Secondary Regions

`sticky workflow bar`

- always visible
- the main continuity anchor
- keeps the page workflow-first

`main workflow column`

- `Workflow Context Summary`
- `Workflow Steps`
- `Validation Panel`
- the validation panel is the dominant body region in this state

`lower section`

- compact `Recent Operations`
- visible only as a subordinate reference surface

### 5.4 Must-Appear Cues

- workflow cue in the sticky workflow bar
- validation cue in main workflow column
- warning cue if proceeding carries non-blocking risk
- blocking error cue if validation cannot pass
- compact origin cue if entered from another page with workflow intent

Do not use:

- inspector-only validation explanation
- free-floating history cue that competes with active workflow

### 5.5 CTA and Executable Actions

Primary CTAs:

- continue if validation passes
- review warning and proceed consciously
- go back to selection or configuration
- route out to fix source issue

Secondary CTAs:

- inspect recent operations only if needed

### 5.6 Modules That Compress or Downgrade

- `Recent Operations`
  - remains low-priority and compact
- `Workflow Context Summary`
  - stays present but secondary to `Validation Panel`

Suppress or avoid:

- large result areas
- generic browsing filters
- inventory-like surfaces unrelated to current validation step

### 5.7 Why The Page Still Holds Its Role

This page still behaves as `Backup / Migration` because:

- validation is framed as part of one bounded workflow
- the workflow bar remains the page's main continuity anchor
- next actions are workflow progression or correction, not open-ended diagnosis

It does not become:

- `Analysis`, because it does not group or interpret cross-page findings
- a tools drawer, because every visible region still belongs to the active workflow

## 6. Backup / Migration / Result

### 6.1 Page Goal

- show what the workflow produced
- let the user inspect outcome and decide the next step
- keep the result attached to the active workflow instead of turning the page into a history browser

### 6.2 Page Skeleton

```text
GLOBAL TOP BAR
  - project identity
  - top-level nav
  - global search

HEADER
  - page title
  - compact origin cue when relevant
  - optional compact completion cue

STICKY WORKFLOW BAR
  - Workflow Selector
  - active workflow identity
  - completed step state

MAIN WORKFLOW COLUMN
  - Workflow Context Summary
  - Workflow Steps
  - Result Panel / Operation Result

LOW-PRIORITY LOWER SECTION
  - compact Recent Operations
```

### 6.3 Primary vs Secondary Regions

`sticky workflow bar`

- still visible
- confirms that the result belongs to the workflow that just completed

`main workflow column`

- `Workflow Context Summary`
- `Workflow Steps` in completed state
- `Result Panel / Operation Result`
- result panel becomes the dominant body region

`lower section`

- compact `Recent Operations`
- remains subordinate and must not outrank the active result

### 6.4 Must-Appear Cues

- result cue in the result panel
- completion cue as a compact orientation strip or equivalent
- warning cue only if the result has unresolved trust or completeness limits
- compact return-to-origin cue if returning would still help the active task

The lifecycle should be:

- result cue stays until the user inspects or leaves the result state
- completion cue downgrades quickly after acknowledgment or new task start
- warning cue persists only while it changes how the result should be trusted

### 6.5 CTA and Executable Actions

Primary CTAs:

- inspect result
- open affected object or source object
- return to origin
- return to `Project Overview`

Secondary CTAs:

- review recent operations
- start another workflow only after the current result is clearly resolved

### 6.6 Modules That Compress or Downgrade

- `Recent Operations`
  - remains compact and low-priority
- `Workflow Context Summary`
  - stays present for continuity, but secondary to the result body
- origin cue
  - remains compact, not banner-level, unless the route back remains critical

Do not retain:

- stale validation emphasis after result is already established
- prior workflow warnings that no longer affect the current result

### 6.7 Why The Page Still Holds Its Role

This page still behaves as `Backup / Migration` because:

- the result is still framed as the endpoint of the current workflow
- workflow identity remains visible in the sticky bar
- recent operations never become the center of gravity

It does not become:

- a generic history page
- a tools drawer
- a project-level result dashboard

## 7. Scenario-Level Validation

### 7.1 What These Four Scenarios Confirm

- `Project Overview / issue-heavy`
  - can emphasize governance risk without becoming `Analysis`
- `Assets / routed-in from Sessions`
  - can preserve routed continuity without becoming session-led
- `Backup / Migration / validation`
  - can elevate validation without becoming generic diagnostics
- `Backup / Migration / result`
  - can surface outcome without becoming history-first

### 7.2 What Still Needs Later Validation

These are later low-fi or interaction-level questions, not structural gaps:

- whether `Project Overview` keeps `Quick Actions` sufficiently narrow in issue-heavy states
- whether the `Assets` second-layer usage row remains clearly downstream from object understanding
- whether `Backup / Migration / result` exits cleanly back to idle or next workflow start without stale cue residue
- whether the distinction between compact origin cue and compact completion cue is sufficiently legible in low-fi form
