# Content Contract Draft

Updated: 2026-04-11

This document defines the content contract draft for the core pages and blocks of `Project Agent Context Steward`.

It sits below:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [page-block-ia.md](./page-block-ia.md)
- [page-state-ia.md](./page-state-ia.md)
- [task-flow-ia.md](./task-flow-ia.md)
- [routed-context-handoff.md](./routed-context-handoff.md)

It focuses on:

- the minimum information that must appear in each core block
- the recommended optional information that improves usability
- the information that does not belong in each block
- how state and routed handoff requirements affect content needs

It does not define:

- visual design
- API schema
- implementation details
- final component props
- TypeScript types

Primary references:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [page-block-ia.md](./page-block-ia.md)
- [page-state-ia.md](./page-state-ia.md)
- [task-flow-ia.md](./task-flow-ia.md)
- [routed-context-handoff.md](./routed-context-handoff.md)
- [glossary.md](./glossary.md)

## 1. Scope

This document only covers the content contract draft.

The goal is to make sure every core block already has a known information boundary before:

- high-fidelity UI work
- API design
- implementation planning at field level

The contract should:

- preserve the current page IA
- preserve the current task-flow IA
- preserve routed context continuity where required
- prevent summary blocks from becoming hidden inventories
- prevent workflow blocks from becoming generic information dumps

## 2. Contract Layers

### 2.1 Page-Level Content Contract

Definition:

- the minimum information a page as a whole must make available in order to satisfy its core question

Purpose:

- preserve page identity and prevent page-role drift

Rule:

- page-level contract decides what the page must answer
- it does not decide every field inside every block

### 2.2 Block-Level Content Contract

Definition:

- the minimum information a specific block must present to fulfill its role within a page

Purpose:

- keep blocks narrow and coherent

Rule:

- block-level contract decides what must appear in that block
- it also decides what must not be placed there

### 2.3 State-Specific Content Contract

Definition:

- the subset of a block's content that must remain visible or must disappear in different page states

Purpose:

- keep blocks meaningful in empty, loading, selected, issue, and completed states

Rule:

- state-specific contract should reduce or simplify content
- it should not change the block into a different block type

### 2.4 Handoff-Required Content

Definition:

- content that must appear in the destination page because routed context was handed off

Purpose:

- preserve task continuity across page jumps

Rule:

- this content should be compact and purpose-driven
- it should not restate the whole source page

### 2.5 Relationship Between Layers

- page-level contract defines the page's question
- block-level contract defines each block's minimum contribution to that question
- state-specific contract defines what remains in different states
- handoff-required content defines what must surface when a route lands from another page

## 3. Priority Labels

Each content item in this draft should be interpreted with one of three priorities:

- `Must`
  - required for the block to fulfill its job in v1
- `Should`
  - recommended for strong usability, but not required to preserve block identity
- `Later`
  - useful future enrichment that should not block v1

## 4. Project Overview

### 4.1 Page-Level Contract

The page must answer:

- what context exists in this project
- what is currently in effect
- what changed recently
- what needs attention
- where the user should go next

The page must not become:

- a session inventory
- a findings workbench
- a workflow execution page

### 4.2 Project Header

- Block goal: establish project identity and current scope.
- Must:
  - project identity
  - current project scope boundary
  - source presence summary
- Should:
  - last-updated or freshness cue
  - route to project-level settings or roots
- Later:
  - richer project diagnostics summary
- Should not contain:
  - detailed session list
  - asset inventory
  - validation result history
- Handoff relevance:
  - return context from `Backup / Migration`
- State retention:
  - in loading or no-data states, project identity must remain visible

### 4.3 Context Snapshot

- Block goal: summarize what context exists now.
- Must:
  - counts or compact summaries for sessions and reusable assets
  - compact health signal or issue presence
  - route targets into detailed pages
- Should:
  - grouped count distinctions by major class
  - lightweight source distribution
- Later:
  - trend comparisons over time
- Should not contain:
  - multi-row inventory
  - detailed issue explanations
  - object-by-object listings
- Handoff relevance:
  - object context or filter context when routing to `Sessions`, `Assets`, or `Analysis`
- State retention:
  - in zero state, the block must still show that the project currently lacks context rather than disappearing

### 4.4 In-Effect Assets

- Block goal: show which reusable assets currently matter in this project.
- Must:
  - asset identity in compact form
  - asset subtype
  - in-effect status
  - route into `Assets`
- Should:
  - scope cue
  - provenance cue
- Later:
  - richer cross-asset conflict hints
- Should not contain:
  - full asset body
  - asset editing surface
  - full asset inventory
- Handoff relevance:
  - object context
  - filter context for subtype and scope
- State retention:
  - in issue state, in-effect items should still remain compact and not become an issue list

### 4.5 Recent Sessions

- Block goal: show recent activity without becoming a session browser.
- Must:
  - compact session identity
  - recency signal
  - source cue
  - route into `Sessions`
- Should:
  - compact activity status or issue cue
  - continuation or chain cue when meaningful
- Later:
  - richer source-specific activity hints
- Should not contain:
  - transcript content
  - long lists
  - detailed diagnostics
- Handoff relevance:
  - object context
  - filter context for source or recency
- State retention:
  - in loading state, the block may use placeholders
  - in issue state, it should not overtake `Attention Needed`

### 4.6 Attention Needed

- Block goal: summarize the highest-priority issues and route out.
- Must:
  - issue class
  - issue severity or priority cue
  - target route for correction or review
- Should:
  - affected object class
  - compact reason why this needs attention now
- Later:
  - grouped issue trend or historical comparison
- Should not contain:
  - full findings inventory
  - long evidence chains
  - corrective workflow detail
- Handoff relevance:
  - issue context
  - object context when available
- State retention:
  - in issue state, this block must remain summary-only and must not become a second `Analysis`

### 4.7 Quick Actions

- Block goal: route the user into the correct next page.
- Must:
  - high-value next actions
  - destination clarity
- Should:
  - context-sensitive prioritization
- Later:
  - more personalized or learned recommendations
- Should not contain:
  - workflow internals
  - validation detail
  - multi-step operation state
- Handoff relevance:
  - workflow context
  - return context in some routes
- State retention:
  - in no-data state, this block still needs to provide starting actions

## 5. Sessions

### 5.1 Page-Level Contract

The page must answer:

- what happened
- what the important evidence is
- where errors or key execution points are
- what session-specific next actions are available

The page must not become:

- the whole product homepage
- the reusable asset library
- the full workflow center

### 5.2 Session Source Bar

- Block goal: scope the session workspace.
- Must:
  - source filter
  - time or recency filter
  - status or chain-relevant filter
- Should:
  - active filter visibility
  - quick reset path
- Later:
  - richer saved filter presets
- Should not contain:
  - detailed session object content
  - session diagnostics payloads
- Handoff relevance:
  - filter context from `Project Overview` or `Analysis`
- State retention:
  - in no-session state, active filters must remain visible so the user can understand why nothing appears

### 5.3 Session List

- Block goal: let users discover and choose sessions.
- Must:
  - session identity
  - source
  - recency or timestamp cue
  - compact status cue
- Should:
  - chain/continuation cue
  - cwd or project-relevant location cue
- Later:
  - richer grouping or comparison hints
- Should not contain:
  - transcript body
  - full error details
  - inspector-level raw data
- Handoff relevance:
  - object context
  - filter context
  - issue context when entered from `Analysis`
- State retention:
  - in no-session state, the reason for emptiness must be understandable

### 5.4 Session View

- Block goal: provide the main readable evidence surface.
- Must:
  - readable session content in the chosen projection
  - visible selected-session identity
  - route path to deeper inspection
- Should:
  - projection mode cue
  - execution-group or trajectory orientation cue
- Later:
  - richer comparative reading aids
- Should not contain:
  - full inventory metadata for all sessions
  - multi-object issue triage
- Handoff relevance:
  - object context
  - issue context when entered from `Analysis`
- State retention:
  - in selected state, the chosen session identity must remain visible
  - in loading state, the user must still know which session is being loaded if one was selected

### 5.5 Error Center

- Block goal: expose error-like events as navigable evidence.
- Must:
  - error identity or label
  - route to event location
  - compact failure cue
- Should:
  - affected command or event type
  - severity cue
- Later:
  - grouped failure patterns across the session
- Should not contain:
  - generalized cross-session findings
  - backup workflow detail
- Handoff relevance:
  - issue context into `Backup / Migration` or `Analysis`
- State retention:
  - in issue state, error routing must remain visible if error-like events exist

### 5.6 Session Inspector

- Block goal: explain the selected event or message in structured form.
- Must:
  - selected object identity
  - structured detail for the selected session object
  - provenance route if relevant
- Should:
  - raw detail access
  - copyable stable reference
- Later:
  - richer side-by-side provenance comparison
- Should not contain:
  - full session list
  - grouped issue analysis
- Handoff relevance:
  - object context for `Sessions -> Assets`
- State retention:
  - when selected, object identity must remain visible even if some detail cannot load

### 5.7 Session Actions

- Block goal: expose bounded next actions from a selected session.
- Must:
  - backup route
  - export route if present
  - promote-to-asset route
- Should:
  - diagnostics route
  - preservation reason when relevant
- Later:
  - more specialized workflow entry points
- Should not contain:
  - workflow step detail
  - asset subtype editing interface
- Handoff relevance:
  - workflow context
  - object context
  - return context
- State retention:
  - in selected state, actions must remain tied to the current session, not become generic toolbar actions

## 6. Assets

### 6.1 Page-Level Contract

The page must answer:

- what reusable assets exist
- what subtype and scope they belong to
- what their current status is
- where they came from
- whether and how they are in effect here

The page must not become:

- a second analysis workbench
- a generic editor for everything

### 6.2 Asset Scope Header

- Block goal: orient the user across subtype and scope.
- Must:
  - current asset subtype
  - current scope
  - active source or status filters when applied
- Should:
  - current filter summary
  - quick subtype switching
- Later:
  - saved scope views
- Should not contain:
  - asset body content
  - issue explanations
- Handoff relevance:
  - filter context
  - object context in subtype-oriented routes
- State retention:
  - in zero state, subtype and scope still must remain explicit

### 6.3 Asset Summary

- Block goal: summarize inventory and health before detail inspection.
- Must:
  - count or compact distribution by relevant asset grouping
  - compact status distribution
  - route into filtered inventory or analysis
- Should:
  - in-effect count
  - stale/conflicted cue
- Later:
  - cross-scope trends
- Should not contain:
  - per-row inventory
  - full asset body
  - detailed remediation instructions
- Handoff relevance:
  - filter context
  - issue context
- State retention:
  - in issue state, summary must highlight affected classes without becoming a findings table

### 6.4 Asset Inventory Table

- Block goal: let users scan and select reusable assets.
- Must:
  - asset identity
  - subtype or category cue
  - scope
  - source
  - status
- Should:
  - compact provenance cue
  - in-effect cue
- Later:
  - richer comparison hints
- Should not contain:
  - full asset body
  - long provenance history
  - grouped findings
- Handoff relevance:
  - object context
  - filter context
  - issue context from `Analysis`
- State retention:
  - in zero state, it must still explain the active subtype/scope context

### 6.5 Asset Detail Panel

- Block goal: explain one selected asset.
- Must:
  - asset identity
  - scope
  - source
  - status
  - provenance summary
- Should:
  - concise asset body or body summary
  - route to source session if available
- Later:
  - deeper source lineage
- Should not contain:
  - unrelated inventory rows
  - grouped issue inventory
- Handoff relevance:
  - object context
  - issue context
  - return context when entered from `Sessions` or `Analysis`
- State retention:
  - in selected state, identity, scope, source, and status must remain visible even if some deeper detail is missing

### 6.6 In-Effect / Usage Module

- Block goal: show whether and how the selected asset matters in this project.
- Must:
  - in-effect state
  - usage or applicability cue
  - route to related session or issue when needed
- Should:
  - project-specific applicability reason
  - target compatibility cue when relevant
- Later:
  - richer downstream usage mapping
- Should not contain:
  - generic issue inventory
  - workflow result history
- Handoff relevance:
  - object context
  - issue context
- State retention:
  - if the block appears, the in-effect answer must remain explicit in all selected states

### 6.7 Asset Actions

- Block goal: expose bounded asset-related actions.
- Must:
  - migration route when relevant
  - backup or archive route when relevant
  - import route when relevant
- Should:
  - canonical-source review route
- Later:
  - richer bulk action support
- Should not contain:
  - workflow internals
  - detailed migration comparison body
- Handoff relevance:
  - workflow context
  - object context
  - return context
- State retention:
  - action set must remain tied to the selected asset

## 7. Analysis

### 7.1 Page-Level Contract

The page must answer:

- what is wrong
- why it matters
- what object or area is affected
- where the user should go to act

The page must not become:

- a passive reporting page with no exit path
- a second asset inventory
- a second session reader

### 7.2 Analysis Header

- Block goal: orient the user across issue classes and analysis scope.
- Must:
  - active issue-class view
  - active object-type or relevant filter state
- Should:
  - compact filter summary
- Later:
  - saved issue views
- Should not contain:
  - findings body
  - remediation detail
- Handoff relevance:
  - issue context
  - filter context
- State retention:
  - in no-findings state, active analysis scope still must remain visible

### 7.3 Context Health Summary

- Block goal: summarize health and indicate where risk exists.
- Must:
  - compact issue-class visibility
  - severity or priority cue
  - route into findings
- Should:
  - relative issue weight
  - compact object-class breakdown
- Later:
  - trend comparison
- Should not contain:
  - detailed finding evidence
  - object-level body content
- Handoff relevance:
  - issue context into selected finding or routed correction
- State retention:
  - in no-findings state, the block must clearly show a clear state rather than disappearing

### 7.4 Findings Table

- Block goal: make issues selectable and actionable.
- Must:
  - finding identity
  - issue class
  - affected object class
  - severity or priority cue
- Should:
  - compact route recommendation
  - source or scope hint when relevant
- Later:
  - richer grouped finding relationships
- Should not contain:
  - full finding explanation
  - full evidence transcript
- Handoff relevance:
  - object context
  - issue context
  - filter context
- State retention:
  - in selected state, the row-to-detail relationship must remain obvious

### 7.5 Finding Detail

- Block goal: explain one selected problem and why the user should care.
- Must:
  - finding identity
  - issue explanation
  - affected object or area
  - evidence cue
  - next-step route target
- Should:
  - compact validation or risk cue
  - route reason summary
- Later:
  - deeper supporting evidence graph
- Should not contain:
  - full destination-page content
  - complete workflow UI
- Handoff relevance:
  - issue context
  - object context
  - workflow context in some routes
  - return context
- State retention:
  - in selected and severe-issue states, issue explanation and route target must remain visible

### 7.6 Recommended Actions

- Block goal: turn analysis into movement.
- Must:
  - at least one clear route to action
  - route target clarity
- Should:
  - reason why this route is the preferred next step
  - preservation warning when relevant
- Later:
  - richer ranked alternatives
- Should not contain:
  - multi-step remediation workflow
  - long-form issue evidence
- Handoff relevance:
  - issue context
  - object context
  - workflow context
  - return context
- State retention:
  - if the block appears, it must preserve "what to do next" even when some detail is unavailable

## 8. Backup / Migration

### 8.1 Page-Level Contract

The page must answer:

- what workflow the user is in
- what objects are involved
- what validation or compatibility state exists
- what warnings matter
- what result or preview the workflow produced

The page must not become:

- a generic tools drawer
- a second asset or session inventory outside workflow context

### 8.2 Workflow Selector

- Block goal: orient the user to a bounded workflow.
- Must:
  - workflow identity
  - route into the chosen workflow
- Should:
  - compact description of what the workflow is for
- Later:
  - richer workflow grouping
- Should not contain:
  - selected object inventory
  - validation details
- Handoff relevance:
  - workflow context
- State retention:
  - in idle state, workflow identity must remain the main content

### 8.3 Workflow Context Summary

- Block goal: explain what operation is being performed and on what scope.
- Must:
  - workflow type
  - selected object summary
  - current workflow state
- Should:
  - origin cue when entered from another page
  - compact issue reason when relevant
- Later:
  - richer scope comparison summary
- Should not contain:
  - full selection inventory
  - full validation detail
- Handoff relevance:
  - workflow context
  - object context
  - issue context
  - return context
- State retention:
  - throughout workflow states, the user must never lose track of what operation they are in

### 8.4 Selection Table

- Block goal: let the user choose the objects in scope for the workflow.
- Must:
  - candidate object identity
  - object class
  - eligibility or selection relevance cue
- Should:
  - compact source or scope cue
  - compact warning cue when known early
- Later:
  - richer comparison aids
- Should not contain:
  - full object detail
  - final validation explanation
- Handoff relevance:
  - object context
  - filter context
- State retention:
  - in selection state, the current workflow and selected-object count or summary must remain visible

### 8.5 Workflow Steps

- Block goal: show where the user is in the bounded workflow.
- Must:
  - current step identity
  - available next action
  - completion or blocked state
- Should:
  - prior-step and next-step orientation
- Later:
  - richer step-level audit trail
- Should not contain:
  - full validation payload
  - full result history
- Handoff relevance:
  - workflow context
  - return context
- State retention:
  - in every workflow state, step identity and next action must remain clear

### 8.6 Validation Panel

- Block goal: make trust and compatibility explicit.
- Must:
  - validation status
  - warnings or blocking issues
  - route or action to resolve a problem
- Should:
  - compact explanation of why the warning matters
  - distinction between warning and block
- Later:
  - richer category breakdown of validation checks
- Should not contain:
  - unrelated workflow history
  - full destination-page remediation UI
- Handoff relevance:
  - issue context
  - workflow context
  - object context in correction routes
- State retention:
  - in validation, confirmation, and failed states, warning/block information must remain visible

### 8.7 Operation Result / History

- Block goal: show what the workflow produced and what the user can do next.
- Must:
  - result identity
  - completion state
  - route to inspect the output or source object
- Should:
  - compact package contents summary
  - rerun or validate-again route
- Later:
  - richer historical comparison
- Should not contain:
  - full in-progress workflow controls
  - raw workflow internals that do not affect next action
- Handoff relevance:
  - object context
  - workflow context in completed form
  - return context
- State retention:
  - in result state, outcome identity and next route must remain visible

## 9. State-Specific Content Rules

### 9.1 Summary Blocks

Summary blocks must always preserve:

- the page's current answer at summary level
- the route into a more detailed page

Summary blocks must not expand into:

- row-based inventory
- full evidence presentation
- workflow execution detail

This especially applies to:

- `Context Snapshot`
- `In-Effect Assets`
- `Recent Sessions`
- `Attention Needed`
- `Asset Summary`
- `Context Health Summary`

### 9.2 Inventory Blocks

Inventory blocks must always preserve:

- object identity
- current filter interpretation
- enough metadata to choose the next object

Inventory blocks must not expand into:

- full explanation of a selected object
- grouped system-level issue analysis

### 9.3 Detail Blocks

Detail blocks must always preserve:

- selected object identity
- enough context to explain why this object is selected

If entered through routed handoff, they should also preserve:

- origin cue or route reason where relevant

### 9.4 Workflow Blocks

Workflow blocks must always preserve:

- workflow identity
- current step identity
- next valid action

Workflow blocks must not become:

- generic object browsers outside the workflow
- permanent global utility surfaces

## 10. Routed Handoff Content Requirements

Blocks that must surface compact handoff content when routed context is present:

- `Sessions`
  - `Session View`
  - `Session Inspector`
- `Assets`
  - `Asset Detail Panel`
  - `Asset Scope Header` when subtype/scope was routed
- `Analysis`
  - `Finding Detail`
  - `Recommended Actions`
- `Backup / Migration`
  - `Workflow Context Summary`
  - `Validation Panel`
  - `Operation Result / History`

The handoff-visible content should be compact and limited to:

- origin or route reason
- object focus
- issue focus when relevant
- workflow identity when relevant

It should not reproduce:

- the full source page state
- long route histories
- source-page summary blocks

## 11. Deferred Content

### 11.1 Must in v1

These content elements are required for the IA to work:

- project identity and current scope in overview
- summary routing content in overview blocks
- session identity, source, recency, and readable detail in `Sessions`
- scope, source, status, provenance, and in-effect cues in `Assets`
- issue identity, affected area, and next-step route in `Analysis`
- workflow identity, validation status, warnings, and result identity in `Backup / Migration`

### 11.2 Should in v1 if Feasible

- compact provenance cues in overview and inventory surfaces
- compact issue reason cues in routed handoffs
- compact origin cues for routes from `Analysis`, `Sessions`, and `Project Overview`
- compact package content summary in workflow results

### 11.3 Later

- trend and historical comparison content
- deeper lineage and citation content
- richer compare views
- expanded workflow history and audit content
- more advanced recommendation ranking

## 12. Final Guardrails

- do not let content contract redefine page IA
- do not let summary blocks absorb inventory work
- do not let inventory blocks absorb analysis work
- do not let workflow blocks absorb generic browsing
- preserve routed context only where it changes the user's next action
