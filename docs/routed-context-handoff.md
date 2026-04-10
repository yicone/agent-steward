# Routed Context Handoff

Updated: 2026-04-11

This document defines the routed context handoff rules for `Project Agent Context Steward`.

It sits below:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [page-block-ia.md](./page-block-ia.md)
- [page-state-ia.md](./page-state-ia.md)
- [task-flow-ia.md](./task-flow-ia.md)

It focuses on:

- the minimum context that should survive a page jump
- how cross-page task continuity is preserved
- where handoff should be explicit rather than implicit
- how to degrade safely when handoff state is missing or stale

It does not define:

- visual design
- content contract details
- API shapes
- implementation details
- global unlimited state inheritance

Primary references:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [page-block-ia.md](./page-block-ia.md)
- [page-state-ia.md](./page-state-ia.md)
- [task-flow-ia.md](./task-flow-ia.md)
- [glossary.md](./glossary.md)

## 1. Scope

This document only covers routed context handoff.

The goal is to preserve enough context across page transitions to keep high-value task flows closed, while avoiding a design in which every page inherits all prior state indefinitely.

The handoff model should:

- preserve user intent when a task crosses pages
- preserve object focus when one specific session, asset, or finding matters
- preserve enough filters to avoid forcing re-discovery
- preserve issue or workflow continuity when that continuity is the point of the route
- expire gracefully when the source context is missing, stale, or no longer valid

## 2. Handoff Context Types

### 2.1 Object Context

Definition:

- the specific object or object set the user is acting on

Typical examples:

- selected session
- selected asset
- selected finding target
- selected backup package
- selected workflow candidate set

Role:

- preserve task focus across pages

Expected lifespan:

- short to medium
- should survive the next page jump and the immediate follow-up action

Serialization:

- yes

Best fit:

- URL when the object is stable and directly addressable
- page state when selection is local and derived from a stable URL object

Avoid:

- passing full object payloads between pages

### 2.2 Filter Context

Definition:

- the narrowed view state that made the user reach the current object set

Typical examples:

- source filter
- status filter
- scope filter
- issue-class filter
- time window
- asset subtype

Role:

- reduce rediscovery cost on the target page

Expected lifespan:

- short
- should usually survive one route and optionally the return route

Serialization:

- yes, when compact and meaningful

Best fit:

- URL for stable, shareable filters
- page state for local refinements that are not worth encoding globally

Avoid:

- carrying deeply nested or page-specific UI controls that the target page cannot interpret

### 2.3 Issue Context

Definition:

- the problem framing that explains why the user is being routed

Typical examples:

- stale asset
- missing provenance
- failed validation
- duplicate memory
- session read failure

Role:

- preserve problem meaning across page boundaries

Expected lifespan:

- short
- should survive until the user reaches the corrective surface

Serialization:

- yes, in compact form

Best fit:

- page state or compact URL token when the issue class is stable and interpretable by the target page

Avoid:

- carrying full analysis result sets into non-analysis pages

### 2.4 Workflow Context

Definition:

- the bounded operation state that explains what workflow the user is entering or resuming

Typical examples:

- session backup
- project bundle
- import
- migration preview
- restore validation

Role:

- preserve operation continuity across workflow entry points

Expected lifespan:

- short to medium
- should survive until the workflow is completed, canceled, or explicitly restarted

Serialization:

- partially

Best fit:

- URL for workflow type and stable object selection
- page state or transient state for in-progress workflow steps

Avoid:

- treating workflow context as a global app-wide sticky state

### 2.5 Return Context

Definition:

- the minimal information needed to get back to the origin task with useful continuity

Typical examples:

- origin page
- origin module
- origin object id
- origin filter subset

Role:

- support "return to origin" and "continue task" patterns

Expected lifespan:

- short
- should expire after the user resumes or abandons the originating task

Serialization:

- yes, compactly

Best fit:

- transient page state or compact URL token

Avoid:

- turning return context into full navigation history replay

## 3. Handoff Storage Principles

### 3.1 URL-Suitable Context

Use the URL when the handoff state is:

- stable
- compact
- directly interpretable by the target page
- useful to preserve on reload or share

Good examples:

- object id
- workflow type
- asset subtype
- scope
- source
- issue class

### 3.2 Page-State-Suitable Context

Use page state when the handoff state is:

- helpful for continuity
- local to the destination page
- not important to preserve externally

Good examples:

- open detail panel
- highlighted finding
- selected related tab

### 3.3 Transient-State-Suitable Context

Use transient state when the handoff state is:

- useful only for the immediate next action
- unsafe or noisy to encode in the URL
- expected to expire quickly

Good examples:

- return-to-origin token
- one-time route reason
- in-progress workflow step handoff

### 3.4 Non-Goals

The handoff model should not:

- preserve every prior page's full UI state
- chain unlimited inherited filters across many pages
- transport full object payloads rather than references
- make every page responsible for every originating task

## 4. Route Rules

### 4.1 Project Overview -> Sessions

- Trigger scenario: the user inspects recent activity or evidence-oriented attention items.
- Source page: `Project Overview`
- Target page: `Sessions`
- Required context:
  - object context when a specific session is targeted
  - filter context for source or recency if the route comes from `Recent Sessions`
- Optional context:
  - issue context when the route starts from an issue that still requires evidence review
  - return context back to `Project Overview`
- Should not pass:
  - full overview summary state
  - unrelated asset filters
- Target-page consumption:
  - preselect session if object context exists
  - pre-apply lightweight filters if filter context exists
  - show origin cue if routed from overview issue triage
- Fallback:
  - if session object is missing, land in filtered session list
  - if filters are invalid, land in default `Sessions` state

### 4.2 Project Overview -> Assets

- Trigger scenario: the user inspects in-effect assets or asset-related attention items.
- Source page: `Project Overview`
- Target page: `Assets`
- Required context:
  - object context when a specific asset is targeted
  - filter context for subtype and scope when the route originates from `In-Effect Assets`
- Optional context:
  - issue context for stale, conflicted, or missing-provenance asset state
  - return context
- Should not pass:
  - session-reading state
  - workflow step state
- Target-page consumption:
  - preselect asset subtype
  - preselect asset if identifiable
  - pre-apply scope or status filter if relevant
- Fallback:
  - if asset object is missing, land in subtype-filtered inventory
  - if subtype is invalid, land on default asset subtype view

### 4.3 Project Overview -> Analysis

- Trigger scenario: the user chooses to investigate a health or conflict question.
- Source page: `Project Overview`
- Target page: `Analysis`
- Required context:
  - issue context
- Optional context:
  - object context if one object is already implicated
  - filter context such as issue class or status
  - return context
- Should not pass:
  - full overview state
  - workflow context
- Target-page consumption:
  - pre-filter findings to the relevant issue class
  - optionally preselect finding target if object context is available
- Fallback:
  - if issue class is invalid, land in default analysis view
  - if object target is missing, retain only issue-class filter

### 4.4 Project Overview -> Backup / Migration

- Trigger scenario: the user starts project bundle or preservation work from overview.
- Source page: `Project Overview`
- Target page: `Backup / Migration`
- Required context:
  - workflow context for bundle or other preservation operation
- Optional context:
  - object context for preselected sessions or assets
  - return context back to overview
- Should not pass:
  - full overview filters
  - issue-summary state except as compact issue context when directly relevant
- Target-page consumption:
  - open the intended workflow directly
  - prefill selection when object context exists
  - show origin cue that this workflow started from overview
- Fallback:
  - if workflow type is invalid, land in workflow selector idle state
  - if preselected objects are invalid, keep workflow type and request new selection

### 4.5 Sessions -> Assets

- Trigger scenario: the user promotes session evidence into a reusable asset or jumps from a selected event to its linked asset.
- Source page: `Sessions`
- Target page: `Assets`
- Required context:
  - object context for the source session or selected event reference
  - filter context for intended asset subtype when known
- Optional context:
  - issue context if the handoff is corrective
  - return context back to the originating session
- Should not pass:
  - full transcript or trajectory state
  - session-local reading mode
- Target-page consumption:
  - preselect asset subtype
  - display origin cue showing the source session
  - if a resulting asset already exists, open it directly
- Fallback:
  - if subtype is unknown, land in `Assets` with a subtype-selection prompt
  - if the source session reference is stale, keep only the subtype filter and route context

### 4.6 Sessions -> Backup / Migration

- Trigger scenario: the user starts session backup from a selected session.
- Source page: `Sessions`
- Target page: `Backup / Migration`
- Required context:
  - workflow context for session backup
  - object context for selected session
- Optional context:
  - issue context when backup was triggered from error or preservation concern
  - return context back to the selected session
- Should not pass:
  - session-local view mode
  - unrelated filter state from the entire session workspace
- Target-page consumption:
  - enter session-backup workflow directly
  - prefill selected session
  - optionally surface relevant issue warning in validation
- Fallback:
  - if selected session is missing, keep workflow type but return to selection state

### 4.7 Analysis -> Sessions

- Trigger scenario: the selected finding requires evidence review.
- Source page: `Analysis`
- Target page: `Sessions`
- Required context:
  - issue context
  - object context for the affected session when known
- Optional context:
  - filter context for source or time window
  - return context back to the selected finding
- Should not pass:
  - full findings list state
  - unrelated issue classes
- Target-page consumption:
  - preselect affected session when known
  - show origin cue that the user is here because of a finding
  - optionally prioritize `Error Center` or inspector state
- Fallback:
  - if session object is missing, land in filtered session list with issue cue preserved
  - if filters are invalid, land in default `Sessions` state with issue cue

### 4.8 Analysis -> Assets

- Trigger scenario: the selected finding requires object-level review or cleanup.
- Source page: `Analysis`
- Target page: `Assets`
- Required context:
  - issue context
  - object context for affected asset when known
- Optional context:
  - filter context for subtype, status, or scope
  - return context
- Should not pass:
  - full grouped analysis state
  - unrelated finding selections
- Target-page consumption:
  - pre-filter relevant asset subtype or status
  - preselect asset when possible
  - show origin cue for the issue class
- Fallback:
  - if the asset is missing, keep issue-class and subtype filter only
  - if subtype is invalid, land in default asset inventory with issue cue

### 4.9 Analysis -> Backup / Migration

- Trigger scenario: the selected finding requires preservation, import/export, or restore-oriented workflow.
- Source page: `Analysis`
- Target page: `Backup / Migration`
- Required context:
  - issue context
  - workflow context
- Optional context:
  - object context for affected session or asset
  - return context back to the selected finding
- Should not pass:
  - full finding payload
  - general analysis filter state
- Target-page consumption:
  - open the intended workflow
  - use issue context to explain why validation matters
  - prefill selected objects if valid
- Fallback:
  - if workflow type is invalid, land in selector with issue cue
  - if selected object is missing, request new selection while preserving issue reason

### 4.10 Assets -> Analysis

- Trigger scenario: the user needs grouped interpretation of stale, conflicted, or missing-provenance asset issues.
- Source page: `Assets`
- Target page: `Analysis`
- Required context:
  - issue context
- Optional context:
  - object context for the selected asset
  - filter context for subtype, scope, or status
  - return context
- Should not pass:
  - full asset detail state
  - editing intent
- Target-page consumption:
  - prefilter findings around the relevant issue class
  - optionally preselect findings involving the handed-off asset
- Fallback:
  - if no finding matches the object, keep the issue-class filter only
  - if the issue class is stale, land in default analysis view

### 4.11 Backup / Migration -> Sessions

- Trigger scenario: workflow result or validation points back to a source or backed-up session.
- Source page: `Backup / Migration`
- Target page: `Sessions`
- Required context:
  - object context for the session
- Optional context:
  - workflow context in compact form
  - return context back to the workflow result
  - issue context if the route exists because of validation failure
- Should not pass:
  - in-progress workflow steps beyond what is needed for return
  - unrelated workflow selection state
- Target-page consumption:
  - open the relevant session
  - show origin cue linking back to the workflow
- Fallback:
  - if session is missing, land in default `Sessions` state and preserve return target only if still meaningful

### 4.12 Backup / Migration -> Project Overview

- Trigger scenario: a workflow completes successfully and the user wants to return to project-level summary.
- Source page: `Backup / Migration`
- Target page: `Project Overview`
- Required context:
  - none
- Optional context:
  - workflow context in completed form
  - return context
- Should not pass:
  - selection table state
  - validation detail state
  - workflow internals
- Target-page consumption:
  - optionally show a compact completion cue
  - refresh summary modules affected by the completed workflow
- Fallback:
  - if completion cue is lost, the overview should still reflect the updated project state normally

## 5. Handoff Failures and Safe Degradation

When routed context fails or is stale:

- object context should degrade to target-page inventory or default selection state
- filter context should degrade to the nearest valid subset or default filters
- issue context should degrade to a general issue-class cue or be dropped if not interpretable
- workflow context should degrade to workflow selection rather than broken in-progress state
- return context should degrade silently rather than trapping the user

The target page should prefer:

- preserving task direction
- preserving object focus when valid
- dropping invalid precision rather than blocking navigation

## 6. Current IA Breakpoints and Patches

### 6.1 Flows Most Likely to Break Without Clear Handoff

- `Sessions -> Assets`
  - because subtype and provenance intent can be lost
- `Analysis -> Sessions`
  - because the reason for the jump can disappear and the user may just land in a session with no issue framing
- `Analysis -> Assets`
  - because object-level remediation can lose the original issue context
- `Analysis -> Backup / Migration`
  - because the workflow can open correctly but the risk rationale may disappear

### 6.2 Pages That Need Explicit Return or Continue-Task Ability

- `Assets`
  - when entered from `Sessions` for asset creation or from `Analysis` for correction
- `Sessions`
  - when entered from `Analysis` or from workflow validation
- `Backup / Migration`
  - when entered from `Sessions`, `Analysis`, or `Project Overview`
- `Analysis`
  - when returning from corrective action to continue triage

### 6.3 Pages That Likely Need a Small Origin Cue

The following pages likely need a compact continuity device such as an origin banner, entry badge, or origin pill:

- `Sessions`
  - when entered from `Analysis` or `Backup / Migration`
- `Assets`
  - when entered from `Sessions` or `Analysis`
- `Backup / Migration`
  - when entered from any other page with prefilled workflow context

The cue should communicate:

- where the user came from
- what object or issue this route is about
- whether a return path is still available

It should not:

- restate the full origin page
- duplicate the destination page's own summary content

## 7. Structured Conclusions

### 7.1 Strong Handoff Routes

- `Project Overview -> Sessions`
- `Project Overview -> Assets`
- `Project Overview -> Analysis`
- `Project Overview -> Backup / Migration`
- `Sessions -> Backup / Migration`
- `Assets -> Analysis`
- `Backup / Migration -> Project Overview`

These routes have relatively clear minimum context and degrade cleanly.

### 7.2 Routes With Higher Continuity Risk

- `Sessions -> Assets`
- `Analysis -> Sessions`
- `Analysis -> Assets`
- `Analysis -> Backup / Migration`
- `Backup / Migration -> Sessions`

These routes are more likely to lose task meaning if issue, workflow, or return context is not explicit.

### 7.3 Main Guardrails

- preserve only the minimum context needed for the next action
- prefer explicit route reason over hidden inherited state
- degrade to valid destination page states instead of preserving broken precision
- keep workflow context bounded to the workflow page
- keep return context short-lived and task-oriented

## 8. Recommended Next Follow-Up

The next layer should likely define:

- origin cue patterns
- continue-task patterns
- minimal route tokens and expiration rules

This should still happen before field-level content contracts.
