# Doc Stack Review

Updated: 2026-04-11

This document reviews the current UX architecture document stack for `Project Agent Context Steward` and checks whether the stack is internally consistent enough to move into low-fi wireframe work.

Reviewed documents:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [page-block-ia.md](./page-block-ia.md)
- [page-state-ia.md](./page-state-ia.md)
- [task-flow-ia.md](./task-flow-ia.md)
- [routed-context-handoff.md](./routed-context-handoff.md)
- [content-contract-draft.md](./content-contract-draft.md)
- [module-interaction-rules.md](./module-interaction-rules.md)
- [cue-lifecycle-rules.md](./cue-lifecycle-rules.md)
- [glossary.md](./glossary.md)

This review does not introduce a new IA layer.
It only checks consistency, contradiction risk, and wireframe readiness.

## 1. Review Scope

This review only covers:

- consistency
- contradiction risk
- terminology stability
- page-role clarity
- task-flow continuity
- handoff continuity
- cue lifecycle coherence

It does not cover:

- high-fidelity UI
- wireframe solutions
- API design
- implementation plans

## 2. Summary Judgment

The document stack is largely coherent and already strong enough to support low-fi wireframe work.

The main structure is stable:

- `Project Overview` is summary-first and routing-first
- `Sessions` is evidence-first
- `Assets` is aggregated and object-first
- `Analysis` is interpretation-first
- `Backup / Migration` is workflow-first

There are, however, a small number of hidden tension points that should be corrected before wireframe work goes too far.

These are not foundational IA failures.
They are mostly boundary and continuity problems that would otherwise surface as layout churn during low-fi exploration.

## 3. No-Conflict Areas That Can Be Retained

The following areas are internally consistent across the current doc stack and can be retained as-is:

### 3.1 Product Subject and Top-Level IA

Stable across:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [page-block-ia.md](./page-block-ia.md)
- [page-state-ia.md](./page-state-ia.md)
- [task-flow-ia.md](./task-flow-ia.md)

Consistent conclusions:

- `Project` remains the primary subject
- `Project Overview` remains the default landing page
- `Sessions` is important but not the homepage
- `Assets` remains aggregated
- `Analysis` and `Backup / Migration` remain distinct top-level areas

### 3.2 Page-Role Boundaries

Stable across:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [task-flow-ia.md](./task-flow-ia.md)
- [content-contract-draft.md](./content-contract-draft.md)
- [module-interaction-rules.md](./module-interaction-rules.md)

Consistent conclusions:

- `Project Overview` should summarize and route, not triage deeply
- `Sessions` should answer "what happened"
- `Assets` should answer reusable-object questions
- `Analysis` should answer "what is wrong and where to act"
- `Backup / Migration` should remain bounded by workflow identity

### 3.3 Task Continuity Model

Stable across:

- [task-flow-ia.md](./task-flow-ia.md)
- [routed-context-handoff.md](./routed-context-handoff.md)
- [module-interaction-rules.md](./module-interaction-rules.md)
- [cue-lifecycle-rules.md](./cue-lifecycle-rules.md)

Consistent conclusions:

- routed continuity should preserve only the minimum next-step context
- origin, issue, workflow, and return context should not become infinite sticky state
- return-to-origin is short-lived and task-oriented

### 3.4 Cue Philosophy

Stable across:

- [module-interaction-rules.md](./module-interaction-rules.md)
- [cue-lifecycle-rules.md](./cue-lifecycle-rules.md)

Consistent conclusions:

- route-critical cues belong in main content, not only in side panels
- inspectors are secondary
- workflow-critical cues outlive ordinary orientation cues
- cues should expire when they stop changing the user's next action

## 4. Mild Repetition That Does Not Block Progress

The following repeated ideas appear in multiple documents, but they are not currently harmful:

### 4.1 `Project Overview` Must Not Become `Analysis`

Repeated in:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [task-flow-ia.md](./task-flow-ia.md)
- [content-contract-draft.md](./content-contract-draft.md)

Assessment:

- repetition is acceptable because this is a core guardrail

### 4.2 `Backup / Migration` Must Stay Workflow-First

Repeated in:

- [page-block-ia.md](./page-block-ia.md)
- [task-flow-ia.md](./task-flow-ia.md)
- [module-interaction-rules.md](./module-interaction-rules.md)
- [cue-lifecycle-rules.md](./cue-lifecycle-rules.md)

Assessment:

- repetition is acceptable because this is the main anti-drift constraint for that page

### 4.3 `Sessions` Is Important but Not the Product Home

Repeated in:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [task-flow-ia.md](./task-flow-ia.md)
- [content-contract-draft.md](./content-contract-draft.md)

Assessment:

- repetition is acceptable because it protects against regression to a session-first structure

## 5. Hidden Conflicts or Tension Points That Should Be Corrected

### 5.1 `Sessions -> Assets` Handoff Has No Stable Landing Owner

Conflict source:

- [task-flow-ia.md](./task-flow-ia.md)
- [routed-context-handoff.md](./routed-context-handoff.md)
- [page-block-ia.md](./page-block-ia.md)
- [module-interaction-rules.md](./module-interaction-rules.md)

Conflict type:

- task-flow continuity gap
- implicit ownership gap

Problem:

- multiple docs agree that `Sessions -> Assets` is a key flow
- multiple docs also agree that this flow needs subtype and provenance continuity
- but no document makes fully explicit which existing block on `Assets` is the primary landing owner for that routed classification handoff

Why this matters:

- low-fi wireframes will otherwise oscillate between:
  - putting subtype resolution in `Asset Scope Header`
  - putting it in `Asset Detail Panel`
  - inventing a temporary sub-flow that is not yet defined

Recommended source of truth:

- [routed-context-handoff.md](./routed-context-handoff.md) for continuity requirement
- [module-interaction-rules.md](./module-interaction-rules.md) for ownership rule

Recommended minimal fix:

- make `Asset Scope Header` the explicit first landing owner of subtype handoff
- make `Asset Detail Panel` the object-confirmation owner after subtype is resolved
- add a one-sentence clarification to both docs rather than inventing a new module

### 5.2 Shared Filter Bar on `Backup / Migration` Risks Generic-Tools Drift

Conflict source:

- [page-block-ia.md](./page-block-ia.md)
- [module-interaction-rules.md](./module-interaction-rules.md)
- [cue-lifecycle-rules.md](./cue-lifecycle-rules.md)

Conflict type:

- page-role tension

Problem:

- [page-block-ia.md](./page-block-ia.md) says the shared filter bar is visible on "some `Backup / Migration` tables"
- later docs strongly insist that `Backup / Migration` must remain workflow-first and not become a generic object browser

Why this matters:

- in wireframes, a page-level shared filter bar on `Backup / Migration` could visually and behaviorally pull the page toward a generic data table

Recommended source of truth:

- [module-interaction-rules.md](./module-interaction-rules.md)

Recommended minimal fix:

- clarify in [page-block-ia.md](./page-block-ia.md) that shared filters may appear only inside workflow-scoped selection tables or history tables
- explicitly state that `Backup / Migration` does not have a page-global browsing filter model

### 5.3 Result Cue vs Completion Cue Boundary Is Still Slightly Fuzzy

Conflict source:

- [content-contract-draft.md](./content-contract-draft.md)
- [module-interaction-rules.md](./module-interaction-rules.md)
- [cue-lifecycle-rules.md](./cue-lifecycle-rules.md)

Conflict type:

- cue-semantics ambiguity

Problem:

- the current docs distinguish result and completion cues
- but the line between "result worth inspecting" and "task done, can move on" is still more conceptual than operational

Why this matters:

- wireframe work may otherwise produce duplicate banners or ambiguous end states in `Backup / Migration`

Recommended source of truth:

- [cue-lifecycle-rules.md](./cue-lifecycle-rules.md)

Recommended minimal fix:

- add one explicit rule:
  - result cue = "what was produced"
  - completion cue = "the task is done"
- state that result cue may survive slightly longer than completion cue when inspection is still useful

### 5.4 `Analysis` Return Loop Is Strong in Principle but Weak in State Ownership

Conflict source:

- [task-flow-ia.md](./task-flow-ia.md)
- [routed-context-handoff.md](./routed-context-handoff.md)
- [page-state-ia.md](./page-state-ia.md)
- [module-interaction-rules.md](./module-interaction-rules.md)

Conflict type:

- return-path ownership gap

Problem:

- several docs say the user should be able to leave `Analysis`, inspect or correct something elsewhere, and then continue triage
- but `page-state-ia.md` does not make this return loop as explicit as the later handoff and interaction docs

Why this matters:

- wireframe work may underspecify the "return and continue triage" behavior on `Analysis`

Recommended source of truth:

- [routed-context-handoff.md](./routed-context-handoff.md)
- [module-interaction-rules.md](./module-interaction-rules.md)

Recommended minimal fix:

- in [page-state-ia.md](./page-state-ia.md), add a compact note under `Analysis Selected` that a routed return from correction should restore the selected finding when still valid

### 5.5 Terminology Drift Around `Cockpit`

Conflict source:

- [glossary.md](./glossary.md)
- [product-positioning-and-ia.md](./product-positioning-and-ia.md)

Conflict type:

- terminology drift

Problem:

- the glossary still presents `Context Cockpit` as a recommended product metaphor in strategy discussions
- later docs intentionally shift away from `cockpit` toward `steward`

Why this matters:

- not a functional IA conflict
- but it can create wording ambiguity if more docs are added later

Recommended source of truth:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md) for current working direction

Recommended minimal fix:

- update [glossary.md](./glossary.md) to note that `Context Cockpit` remains a historical/strategic metaphor, while current internal direction uses `Project Agent Context Steward`

## 6. Likely Rework Triggers If Wireframe Starts Now Without Fixes

The most likely rework points are:

1. `Sessions -> Assets` landing behavior
   - because subtype-resolution ownership is still implicit

2. `Backup / Migration` page-level filtering behavior
   - because a generic filter bar could visually and behaviorally derail the workflow-first model

3. `Analysis` return-to-triage behavior
   - because return continuity is conceptually defined but not yet reinforced strongly enough in state terms

4. `Backup / Migration` end-state banners
   - because result cue and completion cue can still be conflated

5. terminology drift in future docs
   - because `cockpit` and `steward` could be used inconsistently if not normalized now

## 7. Readiness Judgment

### 7.1 Can the Stack Move Into Low-Fi Wireframe?

Yes.

The stack is already coherent enough to support low-fi wireframe work.
The remaining issues are important, but they are narrow enough that they can be corrected with small doc edits rather than a deeper IA reset.

### 7.2 What Is the Minimum Remaining Gap?

The minimum remaining gap is not a new IA layer.
It is a small correction pass across existing docs to make these points explicit:

- `Sessions -> Assets` landing ownership
- workflow-scoped filters in `Backup / Migration`
- result cue vs completion cue distinction
- `Analysis` return-to-triage state restoration
- `cockpit` vs `steward` wording alignment

### 7.3 What Must Be Validated First in Low-Fi Wireframe?

Wireframe work should prioritize:

- `Project Overview`
  - confirm it still reads as summary + routing, not hidden analysis
- `Sessions`
  - confirm routed issue context is visible without making the page feel like a second homepage
- `Assets`
  - confirm routed subtype and provenance continuity from `Sessions`
- `Analysis`
  - confirm "inspect problem -> jump out -> return and continue" is natural
- `Backup / Migration`
  - confirm workflow identity remains primary during selection, validation, result, and completion

## 8. Recommended Minimal Edit Pass

If a follow-up correction pass is performed, it should:

- edit [page-block-ia.md](./page-block-ia.md)
  - narrow `Shared Filter Bar` usage on `Backup / Migration`
- edit [page-state-ia.md](./page-state-ia.md)
  - strengthen `Analysis` return-to-triage state note
- edit [module-interaction-rules.md](./module-interaction-rules.md)
  - make `Asset Scope Header` the explicit landing owner for routed subtype selection
- edit [cue-lifecycle-rules.md](./cue-lifecycle-rules.md)
  - explicitly distinguish result cue from completion cue
- edit [glossary.md](./glossary.md)
  - align `Context Cockpit` with current internal working direction

These are small consistency edits, not structural changes.
