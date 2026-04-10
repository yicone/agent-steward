# Cue Lifecycle Rules

Updated: 2026-04-11

This document defines the cue lifecycle rules for `Project Agent Context Steward`.

It sits below:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [page-block-ia.md](./page-block-ia.md)
- [page-state-ia.md](./page-state-ia.md)
- [task-flow-ia.md](./task-flow-ia.md)
- [routed-context-handoff.md](./routed-context-handoff.md)
- [content-contract-draft.md](./content-contract-draft.md)
- [module-interaction-rules.md](./module-interaction-rules.md)

It focuses on:

- when cues appear
- how long they remain visible
- when they downgrade
- when they expire
- when they require acknowledgment
- how they interact with task continuity without polluting later browsing

It does not define:

- high-fidelity UI
- wireframes
- visual styling
- API shapes
- implementation details
- new page structure

Primary references:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [page-block-ia.md](./page-block-ia.md)
- [page-state-ia.md](./page-state-ia.md)
- [task-flow-ia.md](./task-flow-ia.md)
- [routed-context-handoff.md](./routed-context-handoff.md)
- [content-contract-draft.md](./content-contract-draft.md)
- [module-interaction-rules.md](./module-interaction-rules.md)
- [glossary.md](./glossary.md)

## 1. Scope

This document only covers cue lifecycle rules.

Its purpose is to stop the product from failing in two opposite ways:

- task continuity disappears too early
- old task state remains visible too long and pollutes normal browsing

The rules below should prioritize:

- preserving the current task while it is still active
- removing cues once they no longer change the user's next action
- keeping workflow-critical cues visible longer than general navigational cues

## 2. Cue Types

### 2.1 Origin Cue

Definition:

- a cue explaining where the user came from and why they landed on the current page

Typical use:

- entered `Sessions` from `Analysis`
- entered `Assets` from `Sessions`
- entered `Backup / Migration` from another page

### 2.2 Continue-Task Cue

Definition:

- a cue that tells the user a routed task is still active and can be continued here

Typical use:

- continue fixing a selected finding
- continue backing up a selected session
- continue reviewing a routed asset

### 2.3 Return-to-Origin Cue

Definition:

- a cue or affordance that lets the user return to the prior task context

Typical use:

- go back to the selected finding after checking a session
- return to the originating session after inspecting an asset

### 2.4 Issue Cue

Definition:

- a cue summarizing the current problem framing

Typical use:

- stale asset
- missing provenance
- read failure
- duplicate memory

### 2.5 Validation Cue

Definition:

- a cue exposing whether a workflow or risky action currently passes validation

Typical use:

- backup package valid
- import schema valid
- restore assumptions validated

### 2.6 Warning Cue

Definition:

- a cue indicating a non-blocking but important condition the user should notice before continuing

Typical use:

- optional source backup not included
- package is valid but partial
- provenance is incomplete but acceptable

### 2.7 Result Cue

Definition:

- a cue indicating that a workflow has produced a result worth inspecting

Typical use:

- session backup created
- project bundle created
- import preview produced

### 2.8 Completion Cue

Definition:

- a cue indicating that a task is complete and the user may move on

Typical use:

- workflow finished successfully
- task resolved and summary updated

Operational distinction:

- result cue answers: "what was produced"
- completion cue answers: "this task is done"

### 2.9 In-Effect Cue

Definition:

- a cue indicating whether a reusable asset currently matters for this project

Typical use:

- asset is in effect
- asset is not in effect

### 2.10 Provenance Cue

Definition:

- a cue indicating where an object came from or how it was derived

Typical use:

- derived from session
- imported
- generated from canonical source

## 3. Global Cue Lifecycle Rules

### 3.1 Origin Cue

- Appearance condition:
  - page entered through routed handoff where route reason changes the user's next action
- Default placement:
  - banner for page-level task continuity
  - compact inline or pill near the main destination object when object-specific
- Must remain continuously visible:
  - yes, until the routed context is acknowledged through meaningful interaction
- Downgrade condition:
  - once the user has selected a different object or explicitly changed task focus
- Expiration condition:
  - when the page has become ordinary browsing again
  - when the source task is no longer actionable
- Acknowledgment needed:
  - no explicit acknowledgment required in most cases
  - implicit acknowledgment via selection change or task step progression is sufficient
- Historical logging:
  - no
- On object / page / workflow switch:
  - keep on initial routed object
  - clear or downgrade on explicit user-driven re-scope

### 3.2 Continue-Task Cue

- Appearance condition:
  - a task is still active after routing and the destination page provides the next action
- Default placement:
  - banner or sticky inline task strip in the main content region
- Must remain continuously visible:
  - yes, while the routed task remains active
- Downgrade condition:
  - when the user moves from routed task to ordinary browsing or starts a different task
- Expiration condition:
  - when the routed task completes, is canceled, or becomes stale
- Acknowledgment needed:
  - implicit acknowledgment through task completion or explicit abandonment
- Historical logging:
  - no
- On object / page / workflow switch:
  - preserve only while task continuity remains valid

### 3.3 Return-to-Origin Cue

- Appearance condition:
  - the destination page is a temporary stop in a larger task
- Default placement:
  - compact inline action near origin or continue-task cue
- Must remain continuously visible:
  - only while returning would still help
- Downgrade condition:
  - when the user makes a meaningful independent navigation choice
- Expiration condition:
  - when the origin task is complete, invalid, or no longer relevant
- Acknowledgment needed:
  - no
- Historical logging:
  - no
- On object / page / workflow switch:
  - expire quickly after independent navigation or workflow completion

### 3.4 Issue Cue

- Appearance condition:
  - the user is in an issue state or arrived because of a specific issue
- Default placement:
  - banner for page-wide issues
  - inline section for object-local issues
  - pill for compact issue class reminders
- Must remain continuously visible:
  - yes, while the issue changes the next action
- Downgrade condition:
  - once the user has moved into a correction surface and the issue is already embodied by the selected object
- Expiration condition:
  - when the issue is resolved, dismissed, or no longer relevant to the selected object
- Acknowledgment needed:
  - only if dismissal would hide an unresolved but non-blocking issue
- Historical logging:
  - issue resolution may be logged elsewhere, but the cue itself does not need history
- On object / page / workflow switch:
  - carry only if still relevant to the new destination

### 3.5 Validation Cue

- Appearance condition:
  - a workflow is in validation, confirmation, failed, or result-sensitive state
- Default placement:
  - main content area inside the workflow spine
  - never inspector-only
- Must remain continuously visible:
  - yes, through validation and confirmation
- Downgrade condition:
  - after the user reaches a completed result and validation is no longer the active concern
- Expiration condition:
  - when the workflow resets, is abandoned, or transitions into a new run
- Acknowledgment needed:
  - required when validation blocks progress
  - not always required for pass state
- Historical logging:
  - yes, outcome or validation result may be represented in operation history
- On object / page / workflow switch:
  - clear when workflow type changes or when selected objects become invalid

### 3.6 Warning Cue

- Appearance condition:
  - a non-blocking but meaningful risk or limitation exists
- Default placement:
  - banner or inline warning section in main content
  - compact badge for low-severity persistent context
- Must remain continuously visible:
  - yes, while the warning affects the current decision
- Downgrade condition:
  - after the user has moved past the decision point
- Expiration condition:
  - when the underlying condition disappears or the workflow ends
- Acknowledgment needed:
  - required when proceeding despite the warning is a conscious decision
  - optional for informational warnings
- Historical logging:
  - warnings tied to workflow outcomes should appear in operation history
- On object / page / workflow switch:
  - warnings should be recomputed, not blindly inherited

### 3.7 Result Cue

- Appearance condition:
  - a workflow has produced an inspectable output
- Default placement:
  - main content result region
  - optionally compact completion banner on return pages
- Must remain continuously visible:
  - yes, until the user has a chance to inspect or leave the result state
- Downgrade condition:
  - after the user moves away from the completed workflow or acknowledges the result
- Expiration condition:
  - when the workflow resets or a new workflow starts
- Acknowledgment needed:
  - usually yes, at least implicitly through inspect, dismiss, or navigation away
- Historical logging:
  - yes
- On object / page / workflow switch:
  - result cue should not persist into unrelated workflows

### 3.8 Completion Cue

- Appearance condition:
  - a task or workflow is complete and the user may safely move on
- Default placement:
  - compact banner or completion strip
- Must remain continuously visible:
  - only briefly, long enough to orient the user
- Downgrade condition:
  - to a compact acknowledgment or log entry once the user resumes browsing
- Expiration condition:
  - after acknowledgment or after the user leaves the task context
- Acknowledgment needed:
  - usually lightweight acknowledgment is appropriate
- Historical logging:
  - yes, when tied to workflow results
- On object / page / workflow switch:
  - clear quickly if the user begins a new task

### 3.9 In-Effect Cue

- Appearance condition:
  - a reusable asset is being summarized or inspected
- Default placement:
  - inline section or badge in asset-oriented views
- Must remain continuously visible:
  - yes, while the selected asset or asset summary is in focus
- Downgrade condition:
  - from detailed explanation to compact badge when leaving detail view
- Expiration condition:
  - when no asset is selected and no asset summary is active
- Acknowledgment needed:
  - no
- Historical logging:
  - no
- On object / page / workflow switch:
  - update with selected asset change; never persist independently

### 3.10 Provenance Cue

- Appearance condition:
  - source or derivation affects trust, reuse, or migration understanding
- Default placement:
  - inline detail area
  - compact badge in inventories or summaries
  - inspector only for deeper provenance inspection
- Must remain continuously visible:
  - compact visibility is required where provenance is central to trust
- Downgrade condition:
  - from inline explanation to compact badge when leaving focused detail
- Expiration condition:
  - when the selected object changes or provenance is no longer relevant to the current view
- Acknowledgment needed:
  - no
- Historical logging:
  - provenance itself may inform history, but the cue does not need its own log
- On object / page / workflow switch:
  - recompute per object; do not persist across unrelated objects

## 4. Warning vs Error Lifecycle

Warnings and errors should not share the same lifecycle.

Warnings:

- may allow continuation
- often need visibility through the decision point
- may downgrade after the user proceeds consciously

Errors or blocking validation failures:

- should remain visible until corrected, canceled, or explicitly replaced by a new blocking state
- should not silently downgrade
- often require acknowledgment or explicit corrective action before progression

In workflow contexts:

- warning cues may continue into result history
- blocking error cues should prevent forward progression and remain in the active workflow state

## 5. Page-Specific Cue Rules

### 5.1 Project Overview

Fixed high-priority cues:

- issue cues inside `Attention Needed`
- completion cue when returning from finished workflow, if still relevant

Workflow-only cues:

- none as persistent workflow state

Selection-driven cues:

- minimal only; overview should not become selection-heavy

Cues that should not linger:

- origin cue from older workflows
- continue-task cue once the user resumes top-level exploration

Cues that may persist briefly after completion:

- compact completion cue from `Backup / Migration`

### 5.2 Sessions

Fixed high-priority cues:

- issue cue when session review is corrective
- origin cue when entered from `Analysis` or workflow validation

Workflow-only cues:

- lightweight route to session backup from `Session Actions`
- no persistent workflow-state cue unless actively routed into a workflow

Selection-driven cues:

- in selected state, object cue, issue cue, and provenance cue may update with selection

Cues that should not linger:

- origin cue after user intentionally picks a different session unrelated to the route
- continue-task cue after the user clearly switches to ordinary browsing

Cues that may persist briefly after completion:

- return-to-origin cue while the user may still bounce back

### 5.3 Assets

Fixed high-priority cues:

- in-effect cue
- provenance cue
- issue cue when entered from `Analysis`

Workflow-only cues:

- outbound migration or backup cue only while launching the workflow

Selection-driven cues:

- in-effect cue
- provenance cue
- continue-task cue from `Sessions` or `Analysis`

Cues that should not linger:

- origin cue after a user changes subtype, scope, and object focus intentionally
- return-to-origin cue once the asset task becomes independent

Cues that may persist briefly after completion:

- none by default unless returning from a completed workflow to a specific asset

### 5.4 Analysis

Fixed high-priority cues:

- issue cue
- route-to-action cue

Workflow-only cues:

- warning that preservation may be needed before action

Selection-driven cues:

- selected finding cue
- continue-task cue when returning from correction surfaces

Cues that should not linger:

- return-to-origin cue once the user changes issue class or finding intentionally

Cues that may persist briefly after completion:

- completion cue only if returning from a correction flow and the same finding remains relevant

### 5.5 Backup / Migration

Fixed high-priority cues:

- workflow cue
- validation cue when validation is active or relevant
- warning cue when the current decision involves non-blocking risk
- result cue and completion cue when a workflow finishes

Workflow-only cues:

- all of the above are workflow-scoped and must not outlive the workflow context

Selection-driven cues:

- selected object summary
- issue cue if routed in for correction or preservation

Cues that should not linger:

- validation pass cue after the workflow has reset
- warning cue from an older run after the user starts a new workflow
- result cue after the user acknowledges and leaves result mode

Cues that may persist briefly after completion:

- result cue
- completion cue
- compact return-to-origin cue if the user likely wants to inspect the originating page

## 6. Workflow Cue Special Rules

### 6.1 Validation Cue Lifecycle

Validation cue should:

- appear at validation start
- remain visible through confirmation if relevant
- remain visible in failed state until corrected or abandoned
- downgrade after successful result if it no longer changes the user's next action

Validation cue should not:

- survive into a different workflow type
- remain after workflow reset

### 6.2 Warning Cue Lifecycle

Warning cue should:

- appear before the decision point it affects
- stay visible until the user proceeds, cancels, or corrects the underlying condition
- remain visible in result state if the result still carries that warning

Warning cue should not:

- persist into future unrelated workflow runs
- block navigation when it is informational only

### 6.3 Result Cue Lifecycle

Result cue should:

- appear immediately upon workflow completion
- stay visible until the user inspects, dismisses, or navigates away
- enter operation history or result history after active visibility ends

Result cue should not:

- remain as a page-level persistent state after the user starts a new workflow
- be treated as equivalent to completion cue when the produced output still benefits from inspection

### 6.4 Completion Cue Lifecycle

Completion cue should:

- appear when the workflow or corrective task is clearly done
- remain briefly or until acknowledgment
- downgrade to history or disappear after the user resumes normal browsing

Completion cue should not:

- compete with result cue for long-term primary visibility
- outlive result cue when there is no remaining task-level meaning beyond "done"

## 7. Acknowledgment Rules

Explicit acknowledgment is appropriate for:

- blocking validation failures
- warnings that require conscious proceed-anyway behavior
- completion cues that would otherwise obscure whether the task is still active

Implicit acknowledgment is sufficient for:

- most origin cues
- most continue-task cues
- most provenance and in-effect cues
- result cues when the user inspects the result or starts a new task

No acknowledgment is needed for:

- compact informational badges
- ordinary in-effect or provenance cues

## 8. Cue Exit Rules

A cue should exit by one of these paths:

- resolved
- replaced
- downgraded
- acknowledged
- expired due to scope change

Preferred exit behavior:

- route-critical cue -> downgrade to compact cue -> expire
- workflow-critical cue -> remain until step transition or acknowledgment -> log if needed
- trust-critical cue -> remain until correction, cancellation, or explicit proceed decision

## 9. Structured Conclusions

### 9.1 Global Cue Lifecycle Rules

- cues should appear only when they change the user's next action
- cues should remain visible only as long as they materially preserve task continuity
- workflow cues have longer visibility than simple origin cues
- result and completion cues should degrade into history, not remain indefinitely in active page state
- warning cues and blocking error cues must not share the same downgrade rules

### 9.2 Page-Specific Cue Rules

- `Project Overview`
  - only compact issue and completion cues should persist here
- `Sessions`
  - origin and continue-task cues matter most when entered from `Analysis` or workflow validation
- `Assets`
  - provenance and in-effect cues are stable; origin cues are temporary
- `Analysis`
  - issue and route-to-action cues are the most important persistent cues
- `Backup / Migration`
  - workflow, validation, warning, result, and completion cues must all be workflow-scoped and self-clearing

### 9.3 Workflow Cue Special Rules

- validation cues stay through the decision point
- warnings remain until consciously bypassed, resolved, or made irrelevant
- result cues stay until inspection or acknowledgment
- completion cues remain briefly, then downgrade or disappear

### 9.4 Current Lifecycle Risks

- origin cue may linger too long in `Sessions` or `Assets` after independent browsing begins
- continue-task cue may compete with ordinary page use if it does not downgrade quickly enough
- return-to-origin may remain visible after the originating task has effectively expired
- `Backup / Migration` result or warning cues may pollute later workflow runs if not reset aggressively

### 9.5 Wireframe Validation Priorities

- whether users can tell when a routed task is still active
- whether users can tell when a routed task has ended
- whether cue downgrade feels natural when selection changes
- whether workflow warnings and results remain visible long enough without overstaying
- whether completed workflow cues exit cleanly when normal browsing resumes

## 10. Recommended Next Follow-Up

The next lightweight design-layer document should likely define:

- cue priority rules by state
- acknowledgment patterns
- reset and expiration triggers by task type

That can still happen before any visual design work.
