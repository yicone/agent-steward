# Phase 1 Wireframe Decisions

Updated: 2026-04-11

This document resolves the highest-impact open design decisions from [low-fi-wireframes-phase-1.md](./low-fi-wireframes-phase-1.md).

It is intentionally limited to:

- low-fi structural decisions
- page hierarchy trade-offs
- task continuity trade-offs
- workflow containment trade-offs

It does not define:

- high-fidelity visuals
- visual style
- design tokens
- component implementations
- API design

Primary references:

- [low-fi-wireframes-phase-1.md](./low-fi-wireframes-phase-1.md)
- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [page-block-ia.md](./page-block-ia.md)
- [page-state-ia.md](./page-state-ia.md)
- [task-flow-ia.md](./task-flow-ia.md)
- [routed-context-handoff.md](./routed-context-handoff.md)
- [module-interaction-rules.md](./module-interaction-rules.md)
- [cue-lifecycle-rules.md](./cue-lifecycle-rules.md)
- [session-backup-migration-ux.md](./session-backup-migration-ux.md)
- [research-project-bundle.md](./research-project-bundle.md)
- [glossary.md](./glossary.md)

## 1. Scope

This document only resolves four phase-1 wireframe decisions:

1. `Project Overview`
   - `Attention Needed` vs `Recent Sessions`
   - `Quick Actions` placement
2. `Assets`
   - `table + right detail` vs `table + lower detail band`
   - `In-Effect / Usage` placement
3. `Backup / Migration`
   - `Workflow Selector` in header vs sticky workflow bar
   - `Operation Result / History` only in result state vs low-priority persistent area
4. Routed continuity cue
   - `compact inline strip` vs `page-level banner`
   - when to use which

## 2. Project Overview Decisions

### 2.1 `Attention Needed` vs `Recent Sessions`

#### Option A: `Attention Needed` Primary, `Recent Sessions` Secondary

Pros:

- keeps the page aligned with project triage rather than recent activity browsing
- protects against `Project Overview` drifting into a session-first homepage
- supports issue-heavy states naturally

Risks:

- may feel too "problem-led" if the project is mostly healthy
- recent activity can feel underexposed

Best fit:

- issue-heavy states
- governance-first positioning

#### Option B: Equal Weight

Pros:

- balanced appearance between activity and risk
- easier transition for users coming from session-first mental models

Risks:

- weakens the page's routing clarity
- increases the chance that `Recent Sessions` is treated like the page's main attraction

Best fit:

- early product phases when recent activity is expected to dominate user interest

#### Option C: `Recent Sessions` Primary, `Attention Needed` Secondary

Pros:

- familiar to users with a viewer-first expectation
- foregrounds current activity

Risks:

- strongly reintroduces session-first gravity
- conflicts with the role of `Analysis`
- makes `Project Overview` behave like a disguised session home

Best fit:

- not recommended for current direction

#### Recommendation

Recommend `Option A`.

`Attention Needed` should be the primary block in the main content row, while `Recent Sessions` should remain a secondary summary row below.

#### Wireframe Impact

- center of gravity stays on triage and routing
- `Recent Sessions` remains useful without becoming the hidden homepage
- easier consistency with `Analysis` as the place for deeper problem interpretation

### 2.2 `Quick Actions` Placement

#### Option A: Side Column Beside `Attention Needed`

Pros:

- keeps the page action-oriented
- makes "what should I do next" visible at first glance
- works well when actions are compact and routing-first

Risks:

- if actions proliferate, the side column can feel like a utility drawer
- in narrow layouts, it may collapse awkwardly

Best fit:

- when `Quick Actions` stays compact and contextual

#### Option B: Below `Attention Needed`

Pros:

- keeps issue triage fully central
- reduces the feeling of a two-column dashboard
- makes actions feel subordinate to current project state

Risks:

- next-step actions become easier to miss
- page can become too report-like

Best fit:

- when `Attention Needed` needs strong vertical emphasis

#### Option C: Mixed Placement

Pros:

- allows one or two top actions near the issue summary and the rest below

Risks:

- creates hierarchy ambiguity
- harder to keep consistent across states

Best fit:

- not ideal for phase 1

#### Recommendation

Recommend `Option A`, with a strict content guardrail:

- `Quick Actions` must remain compact and routing-first
- it must not become a secondary workflow surface

#### Wireframe Impact

- supports clear next-step scanning
- preserves the overview page as a routing page
- requires strong discipline to keep the action set small

## 3. Assets Decisions

### 3.1 `table + right detail` vs `table + lower detail band`

#### Option A: `table + right detail`

Pros:

- supports side-by-side scanning and inspection
- keeps the inventory as the driving module and the detail as the responding module
- fits the object-first nature of `Assets`
- matches the need to keep `scope / source / status / provenance` visible during selection

Risks:

- can become cramped if detail content grows too large
- may tempt overloading the right side with too much secondary information

Best fit:

- object selection and confirmation workflows
- routed entry from `Sessions` or `Analysis`

#### Option B: `table + lower detail band`

Pros:

- gives more horizontal room to the inventory
- can support longer textual detail comfortably

Risks:

- weakens the immediate link between selected row and detail
- increases scroll or layout jumps
- makes routed continuity less immediate

Best fit:

- content-heavy detail surfaces with long descriptions

#### Option C: Hybrid Adaptive

Pros:

- could respond to different asset subtypes or screen sizes

Risks:

- adds inconsistency early
- makes low-fi evaluation less decisive

Best fit:

- later phase, not phase 1

#### Recommendation

Recommend `Option A`: `table + right detail`.

#### Wireframe Impact

- reinforces the page as inventory-plus-object-understanding, not plain list
- makes routed context from `Sessions` and `Analysis` easier to preserve visibly
- gives a cleaner distinction between inventory and explanation

### 3.2 `In-Effect / Usage` Placement

#### Option A: Inside the Right Detail Panel

Pros:

- keeps all selected-object understanding in one place
- tighter object narrative

Risks:

- makes the detail panel too vertically dense
- weakens the distinction between "what this asset is" and "how it applies here"

Best fit:

- simple assets with very small usage payloads

#### Option B: Below Detail as a Second Layer

Pros:

- preserves a clean separation:
  - detail = what the asset is
  - second layer = how it matters here
- supports the product's emphasis on in-effect status as project-context meaning
- prevents the detail panel from becoming an everything-container

Risks:

- introduces more page depth
- requires careful visual linking in later phases

Best fit:

- current product direction

#### Option C: Conditional Split

Pros:

- allows inline display for simple cases and second-layer display for complex ones

Risks:

- adds inconsistency early
- makes content placement rules more fragile

Best fit:

- later refinement, not phase 1

#### Recommendation

Recommend `Option B`: `In-Effect / Usage` should sit below the primary detail panel as a second layer tied to the selected asset.

#### Wireframe Impact

- keeps the right detail panel focused on stable object understanding
- gives `In-Effect / Usage` enough room to answer project-specific relevance
- reduces risk that `Asset Detail Panel` becomes an overloaded inspector substitute

## 4. Backup / Migration Decisions

### 4.1 `Workflow Selector` in Header vs Sticky Workflow Bar

#### Option A: Selector in Page Header

Pros:

- simpler top-level page shell
- fewer persistent zones

Risks:

- weakens workflow identity during multi-step work
- makes the page feel more like a general operations page than a workflow surface
- easier for validation and result states to feel detached

Best fit:

- shallow single-step workflows

#### Option B: Dedicated Sticky Workflow Bar

Pros:

- keeps workflow identity visible at all times
- supports step continuity across selection, validation, confirmation, and result
- reinforces that the page is workflow-first, not tools-first

Risks:

- adds one more structural band to the page
- requires discipline to keep it concise

Best fit:

- the current `Backup / Migration` direction

#### Option C: Hybrid Header + Sticky Mode

Pros:

- header for idle state, sticky bar only after workflow start

Risks:

- introduces one more state transition to resolve in low-fi
- page identity may shift too much between idle and active states

Best fit:

- possible later optimization

#### Recommendation

Recommend `Option B`: use a dedicated sticky workflow bar.

#### Wireframe Impact

- strongly protects against `Backup / Migration` becoming a generic tools drawer
- keeps workflow continuity explicit through all states
- makes validation and result states easier to anchor structurally

### 4.2 `Operation Result / History` Placement

#### Option A: Only in Result State

Pros:

- keeps the page clean and tightly workflow-scoped
- avoids idle-state clutter
- reduces risk of turning the page into a browsing archive

Risks:

- users may lose quick access to recent outputs after leaving result state
- makes history feel ephemeral

Best fit:

- strong workflow discipline

#### Option B: Low-Priority Persistent Lower Section

Pros:

- gives users a stable place to inspect recent workflow outputs
- supports continuity after completion without keeping result cues overly active

Risks:

- can slowly drift toward generic tools/history drawer behavior
- may compete with the active workflow body if overemphasized

Best fit:

- if treated as clearly secondary and collapsed by default in many states

#### Option C: Hybrid

Pros:

- full result surface in result state
- compact low-priority recent operations section outside result state

Risks:

- more moving parts
- needs strong low-priority treatment discipline

Best fit:

- current phase, if the persistent section stays clearly subordinate

#### Recommendation

Recommend `Option C`.

Use:

- a primary `Operation Result / History` section in result state
- a compact, clearly secondary recent-operations area outside result state

Guardrail:

- this lower area must never become the page's primary experience
- it exists to support continuity, not browsing-first behavior

#### Wireframe Impact

- preserves strong result-state clarity
- still gives users a low-friction way to revisit recent outputs
- requires low-fi validation to ensure the lower section stays obviously secondary

## 5. Routed Continuity Cue Decisions

### 5.1 `compact inline strip` vs `page-level banner`

#### Option A: Always Use Compact Inline Strip

Pros:

- low visual noise
- scales well across many pages
- reduces chance of cue overload

Risks:

- can be too weak for task-critical routed entry
- easier to miss when the route reason strongly affects the next action

Best fit:

- object-local continuity
- return or origin context that is helpful but not dominant

#### Option B: Always Use Page-Level Banner

Pros:

- very explicit
- hard to miss

Risks:

- too heavy for ordinary routed continuity
- pages can feel permanently interrupted by old task state
- high risk of banner fatigue

Best fit:

- only rare, high-urgency states

#### Option C: Use Both by Rule

Pros:

- supports graduated severity and task relevance
- aligns with current handoff and cue lifecycle logic

Risks:

- requires a clear decision rule
- otherwise teams may choose inconsistently

Best fit:

- current phase

#### Recommendation

Recommend `Option C` with this rule:

- use `page-level banner` when:
  - the routed context affects the whole current task
  - the user must understand it before acting
  - the route reason is issue-critical or workflow-critical

- use `compact inline strip` when:
  - the routed context is object-local
  - the user is already inside a stable page mode
  - the cue is for continuity, not interruption

#### Wireframe Impact

- preserves page calm in ordinary routed entries
- still makes critical routed states explicit
- aligns cleanly with `module-interaction-rules.md` and `cue-lifecycle-rules.md`

### 5.2 Where This Rule Applies First

Recommended first application:

- `Project Overview`
  - usually no routed banner, except compact completion cue after workflow return
- `Assets`
  - compact inline strip for routed entry from `Sessions`
  - banner only when the routed issue context from `Analysis` changes the whole immediate task
- `Backup / Migration`
  - banner or sticky task strip when workflow/validation state is page-defining
- `Sessions`
  - inline strip for object-focused routed continuity
  - banner when entered for corrective review from `Analysis` and the issue framing is central

## 6. Final Recommended Decisions

### 6.1 Project Overview

- `Attention Needed` should outweigh `Recent Sessions`
- `Quick Actions` should remain in a side column beside `Attention Needed`

### 6.2 Assets

- use `table + right detail`
- place `In-Effect / Usage` below the primary detail panel as a second layer

### 6.3 Backup / Migration

- use a dedicated sticky workflow bar
- use result-state-first `Operation Result / History` plus a compact secondary recent-operations area outside result state

### 6.4 Routed Continuity Cue

- use `page-level banner` for page-defining issue/workflow continuity
- use `compact inline strip` for object-local continuity

## 7. Follow-On Impact

These decisions should improve consistency in the next wireframe round by:

- keeping `Project Overview` governance-first rather than session-first
- keeping `Assets` from flattening into a pure table
- keeping `Backup / Migration` workflow-first rather than utility-first
- keeping routed continuity visible without letting old task state dominate pages

## 8. What Still Needs Validation in Low-Fi

Even with these decisions, the next low-fi pass should validate:

- whether the side-column `Quick Actions` stays compact enough
- whether `Assets` right-detail width feels sufficient without overloading the panel
- whether the second-layer `In-Effect / Usage` relationship is obvious
- whether the sticky workflow bar feels necessary rather than heavy
- whether the compact recent-operations area in `Backup / Migration` stays clearly secondary
- whether banner vs inline cue thresholds are intuitive in practice
