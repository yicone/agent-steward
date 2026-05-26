# Design System Baseline

Updated: 2026-04-11

This document defines the lightweight design-system baseline for the next phase
of `agent-steward`.

It turns the approved visual direction into reusable design rules. It is not a
complete component library, CSS token spec, implementation plan, or final brand
identity.

Primary references:

- [visual-direction.md](./visual-direction.md)
- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [content-contract-draft.md](./content-contract-draft.md)
- [routed-context-handoff.md](./routed-context-handoff.md)
- [cue-lifecycle-rules.md](./cue-lifecycle-rules.md)
- [module-interaction-rules.md](./module-interaction-rules.md)
- [glossary.md](./glossary.md)

Figma reference:

- [Agent Context Steward Low-Fi v1](https://www.figma.com/design/EWdC4ItqkJwd5NsOQBsI64)

## 1. Status

The approved visual baseline is:

- base direction: `Steward Map`
- supporting language: `Evidence Ledger`
- avoided primary direction: `Workbench Console`

This baseline exists to prevent the next phase from drifting into isolated
screen design or premature implementation.

Use it before:

- producing additional high-fi pages
- generating Figma Make prompts
- proposing UI implementation tasks
- creating production tokens or component APIs

## 2. Product Principles

### 2.1 Project-First

The product's primary subject is the project.

Design implication:

- global page shells should orient around project identity, context health,
  source presence, and routeable work
- `Sessions`, `Assets`, `Analysis`, and `Backup / Migration` should feel like
  project sub-areas, not separate products

Avoid:

- making the session transcript layout the default homepage pattern
- treating backup or migration as the product's top-level subject

### 2.2 Local-First

The product should feel like a local developer tool that understands local
agent context.

Design implication:

- source roots, local scope, provenance, and runtime attachment should be
  visible where they affect trust or action
- cloud or team collaboration patterns should not dominate the default UI

Avoid:

- cloud console aesthetics
- enterprise admin dashboard patterns
- collaboration-first cues unless a future feature explicitly requires them

### 2.3 Context Governance

The product is about understanding, governing, and migrating project-scoped
agent context.

Design implication:

- cues, provenance, route targets, and validation state are first-class
  interface concepts
- object meaning should appear before actions
- workflow actions should be bounded by selection, validation, and result

Avoid:

- generic command palettes as the main product surface
- action-heavy pages without context or provenance
- visual treatments that make all modules appear equally important

## 3. Foundations

### 3.1 Typography

Typography should separate three jobs:

- governance and page orientation
- object and evidence reading
- metadata and provenance

Recommended roles:

- `Display / Page Title`
  - purpose: page subject and state framing
  - tone: calm, confident, not marketing-heavy
- `Section Heading`
  - purpose: module identity and reading order
  - tone: precise, structural
- `Body`
  - purpose: explanatory copy and object descriptions
  - tone: readable, restrained
- `Metadata Mono`
  - purpose: scope, source, route, provenance, validation, and package facts
  - tone: inspectable, technical, compact

Rules:

- use the mono role for facts, not paragraphs
- avoid oversized dashboard numerals as the primary visual device
- avoid terminal-style typography across the full page
- keep status labels short enough to scan

Implementation note:

- final font families are not fixed here
- future implementation should choose local or web-safe fonts only after
  checking repository constraints and bundle impact

### 3.2 Color Roles

This baseline defines color roles, not exact token values.

Required roles:

- `background.base`
  - quiet page foundation
- `background.map`
  - subtle project grid or route field
- `surface.primary`
  - main task region
- `surface.secondary`
  - supporting panels
- `surface.ledger`
  - provenance, validation, and audit blocks
- `text.primary`
  - main readable text
- `text.secondary`
  - supporting descriptions
- `text.metadata`
  - mono metadata labels
- `border.structure`
  - module and grid structure
- `accent.route`
  - active handoff or route continuity
- `accent.provenance`
  - source and trust information
- `status.warning`
  - non-blocking but important condition
- `status.blocking`
  - blocking or error condition
- `status.pass`
  - validation pass or safe state
- `status.result`
  - produced workflow output

Rules:

- status colors should be semantic and sparse
- route and provenance colors should remain distinct
- warning should be visible but not permanently alarming
- blocking should be strong enough for action
- success should support confidence without celebration

Avoid:

- default purple SaaS palette
- full-page terminal green
- using the same accent for route, provenance, and warning

### 3.3 Spacing And Density

The interface may be dense, but density must communicate priority.

Density is acceptable in:

- session evidence
- asset metadata
- provenance blocks
- validation panels
- route context

Density should be constrained in:

- `Project Overview`
- quick actions
- recent sessions
- recent operations
- completion cues

Rules:

- primary task areas can be tall and information-rich
- secondary strips should stay compact
- object details should section long content before they overflow
- usage and object meaning should remain separate layers

Avoid:

- expanding secondary modules into full tables
- hiding unresolved IA inside dense panels
- making all panels equal height and weight by default

### 3.4 Shape And Surface

Surface hierarchy should clarify page role.

Recommended surface types:

- `Map Field`
  - subtle project or route background
  - useful for `Project Overview`, handoff, and workflow context
- `Governance Panel`
  - summary, routing, and attention surfaces
  - useful for overview and analysis
- `Ledger Panel`
  - provenance, validation, source, and trust surfaces
  - useful for assets and backup / migration
- `Workbench Panel`
  - evidence-reading surfaces
  - useful for sessions only
- `Workflow Panel`
  - active workflow step, validation, result
  - useful for backup / migration
- `Compact Strip`
  - origin cue, return cue, recent operations, completion cue

Rules:

- primary surface type should match the page role
- ledger panels should not become generic cards
- compact strips should not expand into hidden dashboards
- workbench panels should not become the product-wide default

## 4. Core Patterns

### 4.1 Page Shell

The page shell establishes the project-first frame.

Must include:

- project identity
- top-level navigation
- global search entry
- source or attachment presence where relevant

Should include:

- compact active route or workflow cue when the page was entered through a
  task-oriented handoff
- page-level state only when it changes the user's next action

Must not include:

- detailed workflow internals on `Project Overview`
- session transcript controls outside `Sessions`
- operation history as a global primary element

### 4.2 Top Navigation

Top navigation should preserve the approved IA:

- `Project Overview`
- `Sessions`
- `Assets`
- `Analysis`
- `Backup / Migration`

Rules:

- active page state should be clear but not oversized
- labels should remain stable across pages
- page-specific controls belong below the shell, not inside global navigation

Avoid:

- promoting asset subtypes to global nav
- making `Global Assets` a top-level item
- hiding `Backup / Migration` behind a generic tools label

### 4.3 Route And Origin Cues

Route and origin cues preserve task continuity.

Required cue variants:

- `Origin Cue`
- `Continue Task Cue`
- `Return To Origin Cue`
- `Routed Object Cue`
- `Workflow Entry Cue`

Rules:

- object-local routes use compact cues
- page-defining issue or workflow routes may use stronger strips
- return cues remain visible only while returning still helps
- cues downgrade or disappear when the user changes task focus

Placement:

- page header for route reason
- near selected object for object-local context
- inside workflow body for workflow-critical state

Avoid:

- keeping stale origin cues during ordinary browsing
- moving route meaning into an inspector only
- using large banners for every route

### 4.4 Metadata Labels

Metadata labels make context assets inspectable.

Common metadata:

- scope
- source
- status
- subtype
- provenance
- route
- source root
- session linkage
- validation state
- package or workflow id

Rules:

- metadata should be compact and scan-friendly
- mono treatment is appropriate for stable factual labels
- labels should carry meaning, not decoration

Avoid:

- long paragraphs in metadata style
- duplicating the same fact in multiple adjacent panels
- hiding trust-critical metadata behind hover-only UI

### 4.5 Object Detail

Object detail explains what the selected object is.

Must answer:

- object identity
- subtype
- scope
- source
- status
- provenance or trust signal

For session-derived assets, must also show:

- origin session or session record
- linkage state
- whether provenance is retained

Must not answer:

- full project-wide issue interpretation
- workflow execution state
- unrelated object history

Rules:

- object meaning appears before object action
- provenance belongs in object detail when trust affects reuse
- usage belongs in a second layer after object meaning

### 4.6 In-Effect / Usage

`In-Effect / Usage` explains how an asset matters in the project.

Must answer:

- whether the asset is in effect
- where it applies
- what project behavior or workflow it affects
- whether scope or override changes the result

Rules:

- it should read after object detail
- it should not merge into provenance
- it should not become an actions area

Avoid:

- placing in-effect state only in table rows
- treating usage as a generic notes panel
- making actions visually stronger than usage

### 4.7 Workflow Bar

The workflow bar preserves workflow-first behavior.

Required structure for dense workflows:

- line 1: workflow family
- line 2: active workflow and current step

Rules:

- the bar identifies workflow context; it does not execute the workflow
- workflow actions should live in the body near evidence and validation
- workflow tabs are not a generic tools drawer

Avoid:

- putting primary CTAs in the workflow selector line
- making operation history compete with active workflow
- hiding current step in body-only text

### 4.8 Validation Panel

Validation panel is the decision surface for risky or portable operations.

Must include:

- validation state
- warning state when present
- blocking checks when present
- follow-up actions
- route targets when repair requires another page

Rules:

- warning and blocking information stays inside the validation body
- primary CTA stays near the validation evidence
- pass state should be clear but not dominant over warnings

Avoid:

- floating validation banners detached from workflow context
- distributing CTA across header, bar, and history
- turning validation into settings-style form layout

### 4.9 Recent Operations

Recent operations are secondary.

Use as:

- compact strip
- low-priority history affordance
- quick confirmation that recent activity exists

Do not use as:

- primary dashboard
- workflow result substitute
- operation management center

Rules:

- result state owns result detail
- recent operations should not grow into a list by default
- history can be expanded later only through an explicit secondary view

### 4.10 Session Evidence Workbench

`Sessions` may use more technical workbench texture than other pages.

Allowed:

- transcript / trajectory / markdown projection controls
- event anchors
- error center
- source-aware session list
- inspector for selected message or event

Rules:

- the page remains evidence-first
- outbound actions are downstream from selected evidence
- `Error Center` is about evidence inside sessions, not grouped project analysis

Avoid:

- making `Sessions` look like the whole product
- making transcript controls appear in global shell
- turning `Session Actions` into workflow steps

## 5. Page Baselines

### 5.1 `Project Overview`

Primary visual mode:

- `Steward Map`

Required patterns:

- page shell
- attention surface
- compact quick actions
- secondary recent sessions
- governance panels
- route cues

Must preserve:

- summary and routing
- project-first subject
- issue-heavy attention center

Must avoid:

- findings workbench
- session inventory
- workflow execution surface

### 5.2 `Assets`

Primary visual mode:

- `Steward Map` plus `Evidence Ledger`

Required patterns:

- subtype and scope control
- asset inventory
- object detail
- provenance block
- session linkage block
- in-effect / usage layer
- secondary asset actions

Must preserve:

- object-first understanding
- visible provenance
- usage after object meaning

Must avoid:

- generic admin table
- hidden provenance
- session replay surface
- action-first layout

### 5.3 `Backup / Migration`

Primary visual mode:

- workflow-first `Steward Map`

Required patterns:

- two-line workflow bar
- workflow context summary
- workflow steps
- validation panel
- result panel
- compact recent operations

Must preserve:

- bounded operation
- validation before execution
- result inspection

Must avoid:

- tools drawer
- settings page
- operation history dashboard

### 5.4 `Sessions`

Primary visual mode:

- evidence workbench inside `Steward Map` frame

Required patterns:

- session source bar
- session list
- session view
- projection controls
- optional error center
- optional inspector
- bounded session actions

Must preserve:

- readable evidence
- source-aware diagnosis
- session-specific action

Must avoid:

- becoming the homepage
- hiding route reason in inspector
- turning actions into workflow steps

### 5.5 `Analysis`

Primary visual mode:

- interpretation surface inside `Steward Map` frame

Required patterns:

- context health summary
- findings table
- finding detail
- recommended actions
- route-to-action cues

Must preserve:

- problem explanation
- action routing
- selected finding continuity

Must avoid:

- asset inventory duplication
- correction workflow body
- passive findings warehouse

## 6. State Baselines

### 6.1 Normal

Normal state should show the page's default role without route or issue
overweight.

Rules:

- keep summary clear
- keep primary module discoverable
- keep secondary regions compact

### 6.2 Routed-In

Routed-in state should preserve why the user landed on the page.

Rules:

- show origin cue
- preserve selected object or issue class
- preserve return path while useful
- avoid restating the source page

### 6.3 Issue-Heavy

Issue-heavy state should elevate the module responsible for action routing.

Rules:

- `Project Overview` elevates `Attention Needed`
- `Sessions` elevates session-local failure evidence
- `Analysis` elevates selected finding and recommended actions
- `Assets` stays object-first unless the issue is object-local

### 6.4 Workflow Validation

Workflow validation state should center the validation decision.

Rules:

- workflow identity stays visible
- validation evidence stays in the body
- CTA stays near validation evidence
- recent operations stay secondary

### 6.5 Result

Result state should center the produced output.

Rules:

- result panel is primary
- completion cue is compact
- warning remains near result if it affects trust
- recent operations remain low-priority

## 7. Implementation Readiness Boundary

This baseline is enough to start planning implementation only after one more
translation step:

- map baseline patterns to existing app structure and current components
- identify which UI can be migrated safely without breaking current session
  viewer functionality
- decide whether to implement a new shell first or page-by-page behind the
  existing product

This baseline is not enough to immediately implement:

- a complete redesign
- a reusable component library
- finalized CSS tokens
- responsive behavior
- full page migration

## 8. Open Design Risks

The main open risks are:

- real asset copy may exceed right detail capacity
- validation panels may need grouping for multiple warnings or blockers
- `Sessions` may require stronger workbench texture without pulling the whole
  product back to session-first
- responsive behavior has not been explored
- final public naming is unresolved
- existing UI migration strategy is not yet defined

## 9. Recommended Next Step

Recommended next step:

- create an implementation-readiness review for migrating from current UI to
  this baseline

That review should answer:

- which current UI elements can be preserved
- which current UI elements should move into `Sessions`
- which new shell or layout primitives are required
- which page should be implemented first
- what should remain behind Figma-only exploration for now

Do not begin broad UI implementation before that review exists.
