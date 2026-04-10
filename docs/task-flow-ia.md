# Task Flow IA

Updated: 2026-04-11

This document defines the task-flow IA for `Project Agent Context Steward`.

It sits below:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [page-block-ia.md](./page-block-ia.md)
- [page-state-ia.md](./page-state-ia.md)

It focuses on:

- high-value user task flows
- cross-page routing
- validation gates
- closed-loop checks across the current IA
- routing gaps and responsibility conflicts

It does not define:

- high-fidelity UI
- design system choices
- field-level content contracts
- API design
- implementation details

Primary references:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [page-block-ia.md](./page-block-ia.md)
- [page-state-ia.md](./page-state-ia.md)
- [glossary.md](./glossary.md)

## 1. Scope

This document only covers task-flow IA.

It is intended to validate whether the current top-level pages:

- form a usable closed loop
- route users to the right level of detail
- avoid role confusion between overview, evidence, analysis, and workflow pages

It should specifically verify that:

- `Project Overview` does not become a second `Analysis`
- `Sessions` does not become the hidden homepage
- `Assets` remains aggregated and reusable-asset oriented
- `Backup / Migration` remains a bounded workflow page rather than a generic tools drawer

## 2. High-Value Task Flows

The current high-value task flows are:

1. From `Project Overview` into concrete investigation
2. From `Sessions` to session backup
3. From `Sessions` to reusable asset creation
4. From `Analysis` to corrective action
5. From `Assets` to in-effect / provenance / scope confirmation
6. From `Backup / Migration` to import / validate / bundle workflows
7. From `Project Overview` to project bundle
8. From a selected finding to an executable next step

These are the minimum flows required to validate the current IA.

## 3. Task Flows

### 3.1 Overview to Investigation

- User intent: understand what needs attention and enter the correct detailed page.
- Start page: `Project Overview`
- Entry condition: project summary data exists or issue state is present.
- Key steps:
  - inspect `Context Snapshot`
    - page and module: `Project Overview` -> `Context Snapshot`
  - inspect `Recent Sessions` or `Attention Needed`
    - page and module: `Project Overview` -> `Recent Sessions` or `Attention Needed`
  - choose whether the question is about evidence, reusable assets, health interpretation, or preservation
    - page and module: `Project Overview` -> `Quick Actions`
  - route to detail page
    - `Sessions` for evidence
    - `Assets` for object review
    - `Analysis` for issue interpretation
    - `Backup / Migration` for preservation or portability work
- Page jumps:
  - `Project Overview` -> `Sessions`
  - `Project Overview` -> `Assets`
  - `Project Overview` -> `Analysis`
  - `Project Overview` -> `Backup / Migration`
- Decision points / validation gates:
  - is the user asking "what happened" or "what is wrong"
  - is the issue local to one object or systemic across objects
- Success end state:
  - user lands on the right detailed page without needing to reinterpret the homepage
- Failure / interruption paths:
  - if `Project Overview` contains too much issue detail, it becomes a second `Analysis`
  - if `Recent Sessions` becomes too rich, it becomes a disguised session browser
- Current IA gap:
  - low
  - the flow is mostly closed, but `Quick Actions` must remain routing-first rather than action-heavy

### 3.2 Sessions to Backup

- User intent: identify an important session and preserve it in canonical backup form.
- Start page: `Sessions`
- Entry condition: a session is selected and is worth preserving.
- Key steps:
  - select session
    - page and module: `Sessions` -> `Session List`
  - inspect evidence and confirm importance
    - page and module: `Sessions` -> `Session View`
  - optionally inspect failures or provenance
    - page and module: `Sessions` -> `Error Center` / `Session Inspector`
  - trigger backup action
    - page and module: `Sessions` -> `Session Actions`
  - enter backup workflow
    - page and module: `Backup / Migration` -> `Workflow Selector`
  - confirm selected session and run validation
    - page and module: `Backup / Migration` -> `Workflow Context Summary`, `Workflow Steps`, `Validation Panel`
  - execute and inspect result
    - page and module: `Backup / Migration` -> `Operation Result / History`
- Page jumps:
  - `Sessions` -> `Backup / Migration`
- Decision points / validation gates:
  - can canonical `Session Record` be created
  - does the user want optional `Source Backup`
  - are there provenance or readability issues
- Success end state:
  - a valid session backup exists and can be inspected
- Failure / interruption paths:
  - unreadable source
  - failed package validation
  - user aborts at confirmation
- Current IA gap:
  - low
  - this is a good closed flow and keeps `Backup / Migration` workflow-bounded

### 3.3 Sessions to Reusable Asset

- User intent: turn useful session evidence into a reusable context asset.
- Start page: `Sessions`
- Entry condition: a selected session contains reusable rules, memory, skills, or commands.
- Key steps:
  - inspect relevant evidence
    - page and module: `Sessions` -> `Session View`
  - narrow to the relevant event or message
    - page and module: `Sessions` -> `Session Inspector`
  - trigger promote-to-asset action
    - page and module: `Sessions` -> `Session Actions`
  - route to the right asset subtype
    - page and module: `Assets` -> `Asset Scope Header`
  - inspect resulting object in asset detail
    - page and module: `Assets` -> `Asset Detail Panel`
  - confirm provenance and in-effect status
    - page and module: `Assets` -> `Asset Detail Panel`, `In-Effect / Usage Module`
- Page jumps:
  - `Sessions` -> `Assets`
- Decision points / validation gates:
  - what asset subtype fits best
  - is the new object project-scoped, user-scoped, or global
  - is provenance preserved from the source session
- Success end state:
  - a reusable context asset exists and is inspectable in `Assets`
- Failure / interruption paths:
  - evidence is too ambiguous to classify
  - the destination subtype is unclear
  - provenance cannot be preserved cleanly
- Current IA gap:
  - medium
  - the routing exists conceptually, but there is no explicit block yet for classification handoff between session evidence and asset subtype selection

### 3.4 Analysis to Corrective Action

- User intent: understand a problem and move directly to the place where it can be corrected.
- Start page: `Analysis`
- Entry condition: findings exist and at least one finding is selected.
- Key steps:
  - inspect health summary
    - page and module: `Analysis` -> `Context Health Summary`
  - select finding
    - page and module: `Analysis` -> `Findings Table`
  - inspect evidence and scope
    - page and module: `Analysis` -> `Finding Detail`
  - choose corrective route
    - page and module: `Analysis` -> `Recommended Actions`
  - jump to evidence or object page
    - `Sessions` if evidence review is required
    - `Assets` if object-level correction is required
    - `Backup / Migration` if preservation or import/export workflow is required
- Page jumps:
  - `Analysis` -> `Sessions`
  - `Analysis` -> `Assets`
  - `Analysis` -> `Backup / Migration`
- Decision points / validation gates:
  - is the problem rooted in evidence, object state, or portability state
  - should the user preserve state before changing anything
- Success end state:
  - user reaches the right correction surface with the finding context still meaningful
- Failure / interruption paths:
  - finding detail is too abstract and does not point to an actionable destination
  - multiple possible routes are presented with no clear recommendation
- Current IA gap:
  - low to medium
  - the flow is structurally sound, but `Recommended Actions` must be opinionated enough to prevent dead-end analysis

### 3.5 Assets to In-Effect / Provenance / Scope Confirmation

- User intent: confirm whether an asset matters here, where it came from, and at what scope it applies.
- Start page: `Assets`
- Entry condition: assets exist and an asset is selected or filtered.
- Key steps:
  - choose subtype and scope
    - page and module: `Assets` -> `Asset Scope Header`
  - scan inventory
    - page and module: `Assets` -> `Asset Inventory Table`
  - select asset
    - page and module: `Assets` -> `Asset Detail Panel`
  - inspect provenance and scope
    - page and module: `Assets` -> `Asset Detail Panel`
  - inspect in-effect or usage mapping
    - page and module: `Assets` -> `In-Effect / Usage Module`
  - if needed, jump to evidence session or grouped issue view
    - page and module: `Sessions` or `Analysis`
- Page jumps:
  - `Assets` -> `Sessions`
  - `Assets` -> `Analysis`
  - `Assets` -> `Backup / Migration`
- Decision points / validation gates:
  - is the asset in effect for this project
  - is the current scope correct
  - is provenance trustworthy enough for reuse or migration
- Success end state:
  - user understands the asset's role in the current project
- Failure / interruption paths:
  - no clear usage mapping exists
  - provenance is missing
  - the page forces users into `Analysis` for questions that should be answerable in asset detail
- Current IA gap:
  - low
  - this flow is mostly closed if `In-Effect / Usage Module` remains strong

### 3.6 Backup / Migration Workflows

- User intent: import, validate, bundle, or otherwise move project-scoped agent context.
- Start page: `Backup / Migration`
- Entry condition: user enters directly or arrives from another page's workflow action.
- Key steps:
  - choose workflow
    - page and module: `Backup / Migration` -> `Workflow Selector`
  - establish context
    - page and module: `Backup / Migration` -> `Workflow Context Summary`
  - if needed, choose source objects
    - page and module: `Backup / Migration` -> `Selection Table`
  - configure options
    - page and module: `Backup / Migration` -> `Workflow Steps`
  - validate compatibility and package state
    - page and module: `Backup / Migration` -> `Validation Panel`
  - confirm or preview
    - page and module: `Backup / Migration` -> `Workflow Steps`
  - inspect result or history
    - page and module: `Backup / Migration` -> `Operation Result / History`
- Page jumps:
  - mostly contained inside `Backup / Migration`
  - optional escapes to `Sessions`, `Assets`, `Analysis`
- Decision points / validation gates:
  - workflow type selected
  - selected objects are explicit
  - validation passes or warnings are understood
  - user confirms bounded operation
- Success end state:
  - import, bundle, backup, preview, or validation result is inspectable
- Failure / interruption paths:
  - unreadable package
  - unsupported schema
  - unresolved compatibility issue
  - user must leave to repair source objects
- Current IA gap:
  - low
  - the page still reads as a bounded workflow surface, which is correct

### 3.7 Overview to Project Bundle

- User intent: package project-scoped context without manually visiting every page first.
- Start page: `Project Overview`
- Entry condition: user wants project-level preservation or portability.
- Key steps:
  - choose bundle-oriented action
    - page and module: `Project Overview` -> `Quick Actions`
  - enter bundle workflow
    - page and module: `Backup / Migration` -> `Workflow Selector`
  - inspect auto-filled project context summary
    - page and module: `Backup / Migration` -> `Workflow Context Summary`
  - confirm included sessions and assets
    - page and module: `Backup / Migration` -> `Selection Table`
  - validate and run
    - page and module: `Backup / Migration` -> `Validation Panel`, `Workflow Steps`
  - inspect result
    - page and module: `Backup / Migration` -> `Operation Result / History`
- Page jumps:
  - `Project Overview` -> `Backup / Migration`
- Decision points / validation gates:
  - what should be included in the bundle
  - whether warnings are acceptable
  - whether the current project state is ready to package
- Success end state:
  - a project bundle exists and is inspectable
- Failure / interruption paths:
  - unresolved missing provenance
  - incompatible bundle assumptions
  - user needs to inspect `Assets` or `Analysis` before retrying
- Current IA gap:
  - low to medium
  - `Project Overview` currently has the right routing role, but the bundle shortcut must stay high-level and not expose workflow internals there

### 3.8 Finding to Executable Action

- User intent: move from a finding to a concrete next step with minimal ambiguity.
- Start page: `Analysis`
- Entry condition: a finding is selected.
- Key steps:
  - inspect selected finding
    - page and module: `Analysis` -> `Finding Detail`
  - inspect proposed route
    - page and module: `Analysis` -> `Recommended Actions`
  - choose action target
    - `Sessions` for evidence review
    - `Assets` for object-level review
    - `Backup / Migration` for bounded workflow
  - complete action in destination page
    - page and module: destination page module depends on route
  - optionally return to `Analysis` to continue triage
- Page jumps:
  - `Analysis` -> `Sessions`
  - `Analysis` -> `Assets`
  - `Analysis` -> `Backup / Migration`
  - optional return to `Analysis`
- Decision points / validation gates:
  - whether action requires preservation before modification
  - whether the action is object-local or project-wide
- Success end state:
  - the user performs a real next action without being stranded in interpretation
- Failure / interruption paths:
  - recommendation is too vague
  - the destination page lacks enough context to continue
- Current IA gap:
  - medium
  - current IA implies this flow, but may need stronger context carry-over between `Analysis` and destination pages

## 4. Cross-Page Routing Closure Check

### 4.1 Pages That Currently Form a Good Loop

- `Project Overview` routes outward cleanly and does not need to absorb detailed work
- `Sessions` routes naturally to `Assets` and `Backup / Migration`
- `Assets` routes naturally to `Sessions`, `Analysis`, and `Backup / Migration`
- `Analysis` routes naturally to corrective pages
- `Backup / Migration` can route back to source pages and to `Project Overview`

There is currently no top-level page that appears to be "enter only, no exit" if the proposed routes are implemented consistently.

### 4.2 Potential Responsibility Collisions

- `Project Overview` vs `Analysis`
  - risk: `Attention Needed` grows into a second findings page
  - rule: `Project Overview` should only summarize and route, not host full issue triage
- `Project Overview` vs `Sessions`
  - risk: `Recent Sessions` grows into a compact session browser
  - rule: `Recent Sessions` should remain a small routing surface
- `Assets` vs `Analysis`
  - risk: asset issue handling moves fully into `Assets`
  - rule: `Assets` explains one object; `Analysis` interprets grouped issues
- `Backup / Migration` vs every other page
  - risk: one-off utility actions accumulate there and turn it into a tools drawer
  - rule: every operation must fit a bounded workflow with selection, validation, and result

### 4.3 Long Multi-Page Flows

The longest valid flows are:

- `Project Overview` -> `Analysis` -> `Assets`
- `Project Overview` -> `Sessions` -> `Backup / Migration`
- `Analysis` -> `Sessions` -> `Assets` or `Backup / Migration`

These are acceptable if:

- each jump answers a clearly different question
- destination pages inherit enough context from the prior step

They become problematic if the user must re-find the same object after each page jump.

### 4.4 Current IA Gaps

The main current gaps are:

- session-to-asset creation needs a stronger classification handoff
- finding-to-action routing may need explicit context carry-over
- `Project Overview` bundle initiation needs to stay summary-level and not leak workflow complexity into the homepage

## 5. Structured Conclusions

### 5.1 Task Flows That Are Already Closed

- `Project Overview` to investigation
- `Sessions` to session backup
- `Assets` to in-effect / provenance / scope confirmation
- `Backup / Migration` workflow entry and completion

### 5.2 Task Flows With Minor or Moderate Gaps

- `Sessions` to reusable asset creation
- `Analysis` to corrective action
- `Project Overview` to project bundle
- selected finding to executable action

### 5.3 Task Flows That Need Additional Routing or Modules

- `Sessions` to asset creation
  - likely needs an explicit subtype-selection or classification handoff state
- `Analysis` to executable action
  - likely needs stronger routed context, not just a generic jump

### 5.4 Suggested Responsibility Adjustments

- keep `Project Overview` routing-first
- keep `Analysis` interpretation-first
- keep `Sessions` evidence-first
- keep `Assets` object-first
- keep `Backup / Migration` workflow-first

These adjustments are already implicit in the current IA, but they should be treated as explicit guardrails for future design work.

## 6. Recommended Next Follow-Up

The next IA layer should likely define one of:

- routed context handoff rules
  - what destination pages must preserve from the prior page
- minimal task-state annotations
  - what each flow must remember at each hop

This should happen before field-level content contracts.
