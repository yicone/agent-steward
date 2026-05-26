# Visual Direction

Updated: 2026-04-11

This document records the current visual-direction decision for the next phase of
`agent-steward`.

It is intentionally a direction baseline, not a final design system or
implementation specification.

Primary references:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [low-fi-wireframes-phase-1-detailed.md](./low-fi-wireframes-phase-1-detailed.md)
- [low-fi-wireframes-phase-2-sessions-analysis.md](./low-fi-wireframes-phase-2-sessions-analysis.md)
- [routed-context-handoff.md](./routed-context-handoff.md)
- [cue-lifecycle-rules.md](./cue-lifecycle-rules.md)
- [glossary.md](./glossary.md)

Figma reference:

- [Agent Context Steward Low-Fi v1](https://www.figma.com/design/EWdC4ItqkJwd5NsOQBsI64)

## 1. Status

The current product direction has moved beyond a session-first viewer.

The visual direction must support the working product definition from
[product-positioning-and-ia.md](./product-positioning-and-ia.md):

> A local-first product for understanding, governing, and migrating
> project-scoped agent context.

The visual exploration has passed three high-fi trial checks:

- `Project Overview / issue-heavy`
- `Assets / routed-in from Sessions`
- `Backup / Migration / validation`

The exploration should now stop generating additional high-fi trials until this
direction is turned into a lightweight design-system baseline.

## 2. Direction Decision

### 2.1 Base Direction: `Steward Map`

`Steward Map` is the base visual direction.

It should make the product feel like:

- a project-first context stewardship surface
- a mapped dependency and routing environment
- a calm governance tool for local agent context
- a developer-facing product without becoming terminal-first

It should emphasize:

- project structure
- issue routing
- context handoff
- lifecycle cues
- governance state
- continuity between sessions, assets, findings, and workflows

It should not feel like:

- a generic SaaS dashboard
- a project-management board
- a cloud admin console
- a session transcript viewer with a new header

### 2.2 Supporting Language: `Evidence Ledger`

`Evidence Ledger` is the supporting visual language.

It should be used where trust, source, and object understanding matter most:

- asset provenance
- session-derived evidence
- chain of custody
- validation records
- source roots
- backup and migration package state

It should emphasize:

- provenance
- auditability
- scoped metadata
- source-aware labels
- trust state
- object identity

It should not dominate the whole product.

If overused, it can make the product feel like a document archive or compliance
ledger instead of a working context product.

### 2.3 Avoided Primary Direction: `Workbench Console`

`Workbench Console` should not become the primary visual direction.

It may inform local texture inside `Sessions` or specific developer-heavy
inspection surfaces, but it should not lead the overall product.

Reason:

- it risks pulling the product back toward session-first or terminal-first
  identity
- it can make `Sessions` feel like the hidden homepage
- it may overemphasize execution logs at the expense of project-level context
  governance

## 3. Trial Results

### 3.1 `Project Overview / issue-heavy`

Figma page:

- `High-Fi Trial - Steward Map Overview`

Result:

- passed

What it validated:

- `Project Overview` can become a project-level stewardship surface rather than
  a session viewer homepage.
- `Attention Needed` can be the primary center of gravity without turning into
  `Analysis`.
- `Recent Sessions` can remain secondary evidence rather than reclaiming the
  page subject.
- `Quick Actions` can stay routing-first instead of becoming a workflow surface.

Visual conclusions:

- map grid, route nodes, destination pills, and governance panels support the
  project-first subject.
- small `Evidence Ledger` cues such as source-aware labels and chain-of-custody
  language help make the governance surface more concrete.

Risk:

- the stewardship tone can become too managerial if later pages do not preserve
  enough developer-tool texture.

### 3.2 `Assets / routed-in from Sessions`

Figma page:

- `High-Fi Trial - Evidence Ledger Assets`

Result:

- passed

What it validated:

- `Assets` can stay object-first while preserving routed session context.
- `Asset Inventory` can remain the driving module without becoming a generic
  admin table.
- right detail can answer "what is this object?"
- second-layer usage can answer "how does it matter in this project?"
- provenance and session linkage can be prominent without turning the page back
  into `Sessions`.

Visual conclusions:

- `Steward Map` should frame project continuity, subtype, scope, and route
  context.
- `Evidence Ledger` should carry provenance, trust columns, metadata labels,
  and session linkage.

Risk:

- information density is close to the upper bound. Real data may require
  sectioning, truncation, or progressive disclosure in the right detail panel.

### 3.3 `Backup / Migration / validation`

Figma page:

- `High-Fi Trial - Workflow Validation`

Result:

- passed

What it validated:

- `Backup / Migration` can remain workflow-first while using the same visual
  system.
- the two-line workflow bar can make workflow family, active workflow, and
  current step clear.
- `Validation Panel` can remain the dominant decision surface.
- warning, blocking checks, and CTA hierarchy can live inside the validation
  panel instead of dispersing into header, history, or tools areas.
- `Recent Operations` can remain a low-priority strip.

Visual conclusions:

- `Steward Map` should carry workflow continuity, origin cue, step path, and
  project route context.
- `Evidence Ledger` should carry validation, source, provenance, and trust
  wording.

Risk:

- complex validation states with multiple warnings or blocking checks may make
  the validation panel too tall. Later design should define grouping or
  disclosure rules before implementation.

## 4. Lightweight Design-System Seed

This section defines a seed for future design-system work. It is not yet a
component spec.

### 4.1 Typography Direction

Use typography to separate governance, object evidence, and metadata.

Recommended direction:

- a strong, readable sans face for page titles, module headings, and navigation
- a technical mono face for metadata, scope, source, provenance, route, and
  validation labels
- restrained weight contrast rather than oversized dashboard numerals

Typography should communicate:

- calm control
- local developer tool precision
- inspectable evidence

Avoid:

- terminal-only typography across the whole product
- generic dashboard display type
- excessive monospace text in narrative areas

### 4.2 Palette Direction

Use a calm base palette with semantic cue colors.

Recommended roles:

- base surface: quiet, low-glare, local-workbench neutral
- map/grid lines: subtle structure, not decoration
- route/accent: used for active handoff and navigation continuity
- provenance/trust: distinct but restrained
- warning: visible and warm, not alarmist
- blocking/error: strong enough for action, not permanently dominant
- success/pass: supportive, not celebratory

Avoid:

- default purple SaaS palette
- harsh terminal-green-on-black as the global identity
- high-saturation status colors everywhere

### 4.3 Surface Direction

Surfaces should clarify hierarchy and role.

Use:

- map-like page backgrounds for project continuity
- structured panels for governance and routing
- ledger-like cards for provenance, trust, and validation details
- compact strips for origin, return, and continuation cues
- strong primary panels only where the current task is decided

Avoid:

- turning every module into equal cards
- using side inspectors as the only place where task meaning appears
- making history or recent operations visually compete with active workflow

### 4.4 Cue Language

Cues are part of the product's core UX, not decoration.

Use cue treatments for:

- origin
- continue task
- return to origin
- issue
- provenance
- in-effect
- validation
- warning
- result
- completion

Visual priority should follow [cue-lifecycle-rules.md](./cue-lifecycle-rules.md):

- page-defining issue or workflow continuity may become banner-level
- object-local routed context should stay compact
- workflow-critical validation and warning cues should stay inside the workflow
  body
- completion cues should downgrade quickly once they no longer change the next
  action

### 4.5 Navigation Direction

Navigation should reinforce the project-first IA.

Use:

- stable top-level navigation for `Project Overview`, `Sessions`, `Assets`,
  `Analysis`, and `Backup / Migration`
- local subnavigation for asset subtype, scope, workflow family, and projection
  mode
- route pills or compact strips for temporary task continuity

Avoid:

- making `Sessions` visually look like the real homepage
- making `Backup / Migration` look like a utilities drawer
- exposing too many workflow internals on `Project Overview`

### 4.6 Density Direction

The product is allowed to be information-dense, but density must be purposeful.

High density is acceptable for:

- provenance
- validation
- session evidence
- object metadata
- route context

Density must be constrained for:

- homepage summary
- quick actions
- recent sessions
- recent operations
- completion cues

If real data increases density, prefer:

- grouping
- truncation with reveal
- progressive disclosure
- split between object meaning and project usage

Avoid:

- expanding every secondary region into a full table
- letting detail panels become unbounded text containers
- using density to hide unresolved IA decisions

## 5. Page-Specific Guidance

### 5.1 `Project Overview`

Primary direction:

- `Steward Map`

The page should feel like:

- project health and routing
- governance summary
- mapped attention surface

Key constraints:

- `Attention Needed` is primary in issue-heavy state
- `Recent Sessions` stays secondary
- `Quick Actions` stays routing-first
- no detailed finding triage
- no session workbench behavior

### 5.2 `Assets`

Primary direction:

- `Steward Map` plus strong `Evidence Ledger`

The page should feel like:

- object understanding
- provenance inspection
- scope and in-effect confirmation

Key constraints:

- inventory drives selection
- detail explains the selected object
- in-effect / usage is a second layer
- provenance and session linkage are visible
- actions remain secondary

### 5.3 `Backup / Migration`

Primary direction:

- workflow-first `Steward Map` with `Evidence Ledger` validation language

The page should feel like:

- bounded operation
- explicit validation
- inspectable result

Key constraints:

- workflow identity is always visible
- validation and warnings live inside the workflow body
- CTA is concentrated near validation or result evidence
- recent operations stay low-priority
- no tools drawer behavior

### 5.4 `Sessions`

Primary direction:

- `Steward Map` frame with limited `Workbench Console` texture

The page should feel like:

- evidence workbench
- readable session history
- source-aware diagnosis

Key constraints:

- it must not become the product homepage
- transcript or trajectory reading remains primary within the page
- error center is evidence-oriented, not grouped project analysis
- outbound actions remain bounded and downstream from evidence

### 5.5 `Analysis`

Primary direction:

- `Steward Map` interpretation surface with restrained evidence cues

The page should feel like:

- issue interpretation
- action routing
- selected problem explanation

Key constraints:

- findings table drives issue selection
- finding detail explains why it matters
- recommended actions route outward
- no correction workflow body
- no asset inventory duplication

## 6. Readiness Gate

Before implementation planning, the next step should be a lightweight
design-system baseline.

That baseline should define:

- page shell
- top navigation
- route / origin / return cue treatments
- metadata label style
- surface hierarchy
- issue / warning / validation / result states
- object detail and provenance blocks
- workflow bar and validation panel patterns

It should not yet define:

- a complete component library
- exhaustive variants
- production CSS tokens
- final brand identity
- public marketing name

Implementation should wait until at least one representative page can be mapped
from the visual baseline into code without breaking existing local-first viewer
functionality.

## 7. Open Risks

The main remaining risks are:

- information density may exceed the right detail panel's capacity on real
  assets
- validation states may need grouping rules for multiple warnings or blocking
  checks
- `Sessions` still needs careful treatment so technical texture does not pull
  the product back into session-first identity
- final naming is unresolved, so brand expression should remain product-role
  driven rather than name-driven
- implementation may need to coexist with current UI before a full redesign is
  safe

## 8. Recommended Next Step

Recommended next step:

- create a lightweight design-system baseline from this document and the three
  high-fi trials

Do not continue generating more high-fi pages until the baseline exists.

Reason:

- the visual direction has enough evidence to converge
- more pages without a baseline will create inconsistent local patterns
- implementation planning needs reusable rules, not more isolated mockups
