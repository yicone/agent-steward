# Module Interaction Rules

Updated: 2026-04-11

This document defines the module interaction rules for `Project Agent Context Steward`.

It sits below:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [page-block-ia.md](./page-block-ia.md)
- [page-state-ia.md](./page-state-ia.md)
- [task-flow-ia.md](./task-flow-ia.md)
- [routed-context-handoff.md](./routed-context-handoff.md)
- [content-contract-draft.md](./content-contract-draft.md)

It focuses on:

- how modules coordinate within a page
- how routed task continuity is preserved after page jumps
- where origin, issue, workflow, and return cues should remain visible
- which modules may drive state versus only reflect state

It does not define:

- high-fidelity UI
- wireframes
- visual style
- API shapes
- component props
- implementation logic

Primary references:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [page-block-ia.md](./page-block-ia.md)
- [page-state-ia.md](./page-state-ia.md)
- [task-flow-ia.md](./task-flow-ia.md)
- [routed-context-handoff.md](./routed-context-handoff.md)
- [content-contract-draft.md](./content-contract-draft.md)
- [glossary.md](./glossary.md)

## 1. Scope

This document only covers module interaction rules.

The current architecture already defines:

- structure
- state
- task flow
- handoff
- content contract

What is still needed is:

- how modules cooperate
- how a page preserves task continuity after entry
- which cues stay visible and where
- which modules may update shared page state and which must remain passive

## 2. Interaction Problem Space

The main coordination problems are:

- a routed user can land on the correct page but lose the reason they are there
- a selected object can exist without a clear origin or return path
- an inspector can absorb too much responsibility and become a hidden complexity sink
- a workflow page can drift into a generic tools area if workflow state is not treated as primary
- summary blocks can start acting like inventories if they are allowed to own too much page state

The rules in this document are meant to prevent those failures.

## 3. Interaction Rule Categories

### 3.1 Origin Cue Rules

Purpose:

- preserve why the user arrived on the current page

Use when:

- the page was entered from another page to continue a task
- routed context changes what the user should do next

Do not use when:

- the route is ordinary top-level navigation without continuity needs

### 3.2 Continue Task Rules

Purpose:

- let the user continue the current task without reconstructing context manually

Use when:

- routed context is still valid
- the destination page has a clear next action tied to that context

Do not use when:

- the task has effectively ended
- the context has gone stale or invalid

### 3.3 Return Path Rules

Purpose:

- preserve a short-lived way back to the origin task

Use when:

- the originating page still matters
- the user is likely to bounce back after a corrective or inspection step

Do not use when:

- returning would not help the user
- the route was not task-oriented

### 3.4 Selection Persistence Rules

Purpose:

- keep the selected object stable enough for detail work

Use when:

- a selection is the current task focus

Do not use when:

- filters or context changes make the selection invalid
- selection persistence would hide that the object no longer fits current scope

### 3.5 Inspector Interaction Rules

Purpose:

- let users inspect selected objects without taking over the page

Use when:

- detail is secondary to the main inventory or reading surface

Do not use when:

- the page needs a primary detail surface in the main content area
- the inspector would be forced to carry the page's main answer

### 3.6 Workflow Panel Rules

Purpose:

- keep `Backup / Migration` and other action surfaces bounded by workflow identity

Use when:

- the user is selecting, validating, confirming, executing, or reviewing a bounded operation

Do not use when:

- the user is just browsing objects with no active workflow

### 3.7 Validation / Warning / Result Banner Rules

Purpose:

- surface workflow-critical or issue-critical status in the main content path

Use when:

- the user must understand a warning or result before proceeding

Do not use when:

- the status is low-impact and can remain secondary

### 3.8 Boundary Rules by Block Type

Purpose:

- preserve page semantics

Summary blocks:

- may route
- may summarize
- may not own long-lived object selection

Inventory blocks:

- may drive object selection
- may not become the place where full object reasoning lives

Detail blocks:

- may explain a selected object
- may not become the whole page state manager

Workflow blocks:

- may drive bounded task progression
- may not absorb unrelated browsing or analysis duties

## 4. Global Consistency Rules

### 4.1 What Counts as a Driving Module

A driving module is allowed to update shared page state such as:

- current selection
- active subtype
- active issue class
- active workflow type
- current step within a bounded workflow

Typical driving modules:

- inventory lists and tables
- filter headers
- workflow selectors
- workflow step controllers
- recommended-action modules when they route into a next task

### 4.2 What Counts as a Responding Module

A responding module may reflect page state but should not become the main owner of it.

Typical responding modules:

- detail panels
- inspectors
- provenance panels
- validation panels
- result views

### 4.3 What Counts as a Display-Only Module

A display-only module may show status or context but should not take over page flow.

Typical display-only modules:

- summary cards
- origin cues
- compact route-reason indicators

### 4.4 Banner vs Pill vs Inspector vs Main Content

Use a banner when:

- the cue affects the whole current task
- the user must understand it before acting
- it applies to the whole destination page state

Use a pill, badge, or entry label when:

- the cue is compact
- it is useful orientation, not blocking instruction
- it should remain visible without dominating the page

Use the inspector when:

- the cue is object-specific and secondary
- the user explicitly selected an object and wants structured detail

Do not hide content in the inspector when:

- the content changes what the user should do next
- the content is required to understand the page's main answer
- the content is workflow-critical or route-critical

Keep content in the main content area when:

- it defines the current task
- it explains the current issue
- it defines the current workflow step
- it gives the user the primary next action

### 4.5 When to Preserve vs Clear Context

Preserve context when:

- the routed task is still active
- the selected object is still valid
- the user would otherwise need to rediscover the same target

Clear context when:

- the routed task has ended
- the selected object no longer fits current filters or scope
- the route reason no longer changes the user's next action
- preserving the context would mislead the user about current page state

## 5. Page Rules

### 5.1 Project Overview

#### Driving Modules

- `Context Snapshot`
- `Recent Sessions`
- `Attention Needed`
- `Quick Actions`

These modules may drive outbound routing, but they should not own long-lived page state beyond compact top-level routing intent.

#### Responding Modules

- `In-Effect Assets`
- `Project Header`

These modules respond to project state and route context, but should not redefine the page's main question.

#### Display-Only or Limited-Control Modules

- compact issue cues
- compact project freshness cues

#### Origin / Issue / Workflow Visibility

- return-from-workflow context may appear in `Project Header` or a compact completion cue
- issue context should stay concentrated in `Attention Needed`
- workflow context should not persist here as ongoing workflow state

#### Continue-Task Requirements

When the user lands here after completing a workflow:

- the page may show a compact completion cue
- the page must still behave like `Project Overview`
- it must not become a workflow result page

#### Return Path Rules

- overview is usually a destination for return, not a page that requires strong return-to-origin behavior
- if the user came back from `Backup / Migration`, the return cue should expire quickly after acknowledgment

### 5.2 Sessions

#### Driving Modules

- `Session Source Bar`
- `Session List`
- `Session Actions`

`Session Source Bar` drives filter state.  
`Session List` drives selection state.  
`Session Actions` may initiate outbound workflows.

#### Responding Modules

- `Session View`
- `Error Center`
- `Session Inspector`
- `Chain / Continuation Strip`

These respond to the currently selected session and current routed context.

#### Display-Only or Limited-Control Modules

- compact origin cue when entered from `Analysis` or `Backup / Migration`
- compact issue cue if the route reason is corrective

#### Origin / Issue / Workflow Visibility

- origin cue should be visible in the main session area when the route came from `Analysis` or workflow validation
- issue context should remain visible at least until the user changes selection or resolves the route
- workflow context should not remain active here except as a compact reason for the route

#### Continue-Task Requirements

When the page is entered from `Analysis`:

- the session selected by the route must remain selected if valid
- the route reason must remain visible in main content, not only in the inspector

When the page is entered from `Backup / Migration`:

- the workflow origin must remain visible long enough to inspect the relevant session

#### Return Path Rules

- `return to origin` is appropriate when entering from `Analysis` or a workflow result
- returning should preserve only compact object and issue context

#### Selection Persistence Rules

- selection should persist across view-mode changes
- selection may persist across lightweight filter changes only if the selected object still fits the filter
- if the selected session falls out of scope, the page should clear selection explicitly rather than leaving hidden stale state

#### Inspector Rules

- `Session Inspector` may explain the selected event or message
- it may not become the sole place where route reason, issue context, or next-step guidance lives
- if the route changes what the user should do next, that cue must remain in the main content region

### 5.3 Assets

#### Driving Modules

- `Asset Scope Header`
- `Asset Inventory Table`
- `Asset Actions`

`Asset Scope Header` drives subtype and scope state.  
`Asset Inventory Table` drives object selection.  
`Asset Actions` may initiate bounded workflows.

#### Responding Modules

- `Asset Summary`
- `Asset Detail Panel`
- `In-Effect / Usage Module`

#### Display-Only or Limited-Control Modules

- compact origin cue when entered from `Sessions` or `Analysis`
- compact scope/source/status cues in summary surfaces

#### Origin / Issue / Workflow Visibility

- when the page is entered from `Sessions`, the route reason should remain visible near the selected asset context
- when the page is entered from `Analysis`, the issue class should remain visible until the user changes the focus
- workflow context should appear only when an action is being launched outward, not as ongoing page state

#### Continue-Task Requirements

When entered from `Sessions`:

- the chosen subtype and object focus must remain visible
- provenance and source-session linkage must be easy to confirm
- `Asset Scope Header` should act as the first landing owner for routed subtype intent
- `Asset Detail Panel` should only take over after subtype intent is explicit enough to support object confirmation

When entered from `Analysis`:

- the issue reason must remain visible long enough to support correction

#### Return Path Rules

- `return to origin` is appropriate when entered from `Sessions` for asset creation
- `return to origin` is also appropriate when entered from `Analysis` for issue correction

#### Selection Persistence Rules

- selected asset should persist across tab-local detail changes
- selected asset should clear if subtype or scope changes invalidate it
- `In-Effect / Usage Module` should follow the selected asset and not own independent selection

#### Inspector Rules

- asset detail may live in a detail panel, but that panel must not hide scope, source, status, provenance, and in-effect answers behind a secondary interaction
- if those answers are primary to the page task, they belong in main detail content

### 5.4 Analysis

#### Driving Modules

- `Analysis Header`
- `Findings Table`
- `Recommended Actions`

`Analysis Header` drives issue-class filtering.  
`Findings Table` drives finding selection.  
`Recommended Actions` drives task continuation out of the page.

#### Responding Modules

- `Context Health Summary`
- `Finding Detail`

#### Display-Only or Limited-Control Modules

- compact severity cues
- compact object-class cues

#### Origin / Issue / Workflow Visibility

- issue context is native to this page and must remain in the main content region
- routed origin cues matter less here unless the user arrived from a correction loop
- workflow context should only appear when the selected action leads into `Backup / Migration`

#### Continue-Task Requirements

When returning from `Sessions`, `Assets`, or `Backup / Migration`:

- the previously selected finding should remain selected if still valid
- the user should be able to continue triage without re-finding the problem

#### Return Path Rules

- this page strongly benefits from `return to origin` after object review or workflow work
- if the original finding is gone or invalid, the page should fall back to the nearest valid filtered state

#### Selection Persistence Rules

- finding selection should persist across lightweight filter or severity view changes when still valid
- if a filter change invalidates the selected finding, the page should clear selection explicitly

#### Inspector Rules

- analysis should not require an inspector for the user to understand the problem or the next route
- `Finding Detail` and `Recommended Actions` must remain in the main content path

### 5.5 Backup / Migration

#### Driving Modules

- `Workflow Selector`
- `Selection Table`
- `Workflow Steps`

These modules drive the page.  
This page should always feel workflow-first.

#### Responding Modules

- `Workflow Context Summary`
- `Validation Panel`
- `Operation Result / History`

#### Display-Only or Limited-Control Modules

- compact origin cue
- compact issue reason cue
- compact completion cue

#### Origin / Issue / Workflow Visibility

- workflow identity must always be visible in the main content region
- origin cue should remain visible while the workflow is active or until the task is clearly re-scoped
- issue context should remain visible when it materially affects validation or warning interpretation

#### Continue-Task Requirements

When entered from another page:

- the workflow type must remain visible
- the handed-off object set or object summary must remain visible
- the user must not need to remember why they entered the workflow

#### Return Path Rules

- this page often needs `return to origin`
- return should point back to the source task, not just the source page shell
- return may expire after successful completion if the source task no longer matters

#### Selection Persistence Rules

- selection persists across configuration and validation states
- selection may reset only if validation failure or workflow-type change makes it invalid
- selection state should not silently disappear during execution

#### Workflow Panel Rules

- `Workflow Steps` is the primary task spine
- `Workflow Context Summary` explains the operation but does not replace the step spine
- `Validation Panel` may interrupt progression, but should not redefine the workflow type
- `Operation Result / History` may conclude the workflow, but should not become the new workflow selector

#### Inspector Rules

- do not push workflow-critical warnings or result identity into an inspector
- inspector-style detail may exist for secondary object inspection, but workflow continuity must remain in the main content region

## 6. Origin Cue / Continue Task / Return to Origin Patterns

### 6.1 Origin Cue Rules

Origin cue is required when:

- the route reason changes what the user should do on the destination page
- the user is likely to ask "why am I here"

Origin cue is not required when:

- the route is normal top-level browsing with no task continuity need

Origin cue should contain only:

- origin page or route reason
- current object or issue focus
- compact action relevance

Origin cue should not contain:

- full source-page state
- long explanations

### 6.2 Continue Task Rules

Continue-task affordance is required when:

- a routed page is the next step of a task, not a new browsing context

It should remain visible while:

- the routed object is still valid
- the issue or workflow context is still relevant

It may disappear when:

- the user changes selection intentionally
- the route context is stale
- the task has clearly ended

### 6.3 Return to Origin Rules

Return to origin is appropriate when:

- the user likely needs to bounce back after a review or correction step
- the source page remains meaningful after the destination action

Return to origin is not required when:

- the route is one-way by nature
- the source page no longer carries a live task

Return to origin should point to:

- the prior task context
- not merely the top of the prior page

## 7. Structured Conclusions

### 7.1 Rules That Must Be Uniform

- driving modules own page state; responding modules reflect it
- route-critical cues belong in main content, not only in side panels
- inspectors explain selected objects but do not own task continuity
- workflow identity must stay visible throughout a workflow
- summary modules may route but may not become hidden inventories
- return context must be short-lived and task-oriented

### 7.2 Page-Specific Emphases

- `Project Overview`
  - routing-first, never analysis-first
- `Sessions`
  - evidence-first, with route reason visible when entered for correction
- `Assets`
  - object-first, with subtype/scope driving the page
- `Analysis`
  - interpretation-first, with explicit route to action
- `Backup / Migration`
  - workflow-first, with selection and validation subordinate to workflow identity

### 7.3 Current Coordination Risks

- `Sessions -> Assets` may still lose subtype intent or creation reason
- `Analysis -> Sessions` and `Analysis -> Assets` may still lose route reason if the origin cue is too weak
- `Backup / Migration` can drift toward a tools drawer if workflow identity is not always primary
- inspectors can become overburdened if primary task cues are hidden there

### 7.4 What to Validate Later in Wireframe Work

- whether origin cues are visible enough without dominating the page
- whether continue-task cues remain visible long enough and disappear at the right time
- whether return-to-origin is task-aware rather than page-aware
- whether `Backup / Migration` still reads as a bounded workflow surface
- whether `Project Overview` remains summary-first under issue-heavy conditions

## 8. Recommended Next Follow-Up

The next design-layer document should likely define:

- lightweight cue pattern rules
- expiration rules for origin and return context
- task completion and acknowledgment behavior

That can still happen before any high-fidelity UI work.
