## Context

The current project shell has real `Sessions` and `Assets` surfaces, while
`Analysis` still communicates intent through a placeholder. The UX architecture
documents define `Analysis` as an interpretation-and-routing page: it should
make problems visible, explain why they matter, and route users to the page that
owns corrective work.

This foundation should continue the same local-first approach used by
`assets-foundation`: seeded data and explicit bounded behavior first, with no
claim that complete cross-agent analysis exists.

## Goals / Non-Goals

**Goals:**

- Provide a real `Analysis` foundation surface with context health summary,
  findings inventory, selected finding detail, and recommended outbound actions.
- Preserve issue framing when routed in from `Assets`, `Project Overview`, or
  `Sessions`.
- Route corrective work to owning pages: evidence review in `Sessions`, object
  review in `Assets`, and preservation workflows in `Backup / Migration`.
- Make missing evidence, stale references, and bounded foundation limits
  explicit.

**Non-Goals:**

- No complete automated project analysis engine.
- No AI-generated findings from arbitrary local files.
- No inline asset editing, session mutation, backup execution, or migration
  execution inside `Analysis`.
- No cloud sync, team dashboard, or external telemetry dependency.
- No high-fidelity redesign or design-system overhaul.

## Decisions

### Decision 1: Introduce a small local analysis finding model

Use a bounded model for findings with fields such as id, title, issue class,
severity, affected object references, evidence references, status, route targets,
and optional preservation warning.

Alternative considered: derive findings directly from Assets UI state. That
would make `Analysis` too dependent on `Assets` and would blur page ownership.
The model should be independent enough to represent session, asset, and backup
risks while still using seeded data in the foundation phase.

### Decision 2: Keep Analysis as interpretation plus routing

`Analysis` owns explanation and prioritization, not execution. Recommended
actions should call shell-level route handlers that open `Sessions`, `Assets`, or
`Backup / Migration` with bounded handoff context.

Alternative considered: add inline correction panels. That would make Analysis a
workflow page and conflict with the current IA.

### Decision 3: Use compact routed cues by default

Routed-in context should appear as compact origin / issue cues near the Analysis
header and selected finding region. Page-level banners are reserved for states
where the user must understand the route before proceeding.

Alternative considered: always use a page-level banner. That would overweight
handoff context and make normal triage feel like an interrupted workflow.

### Decision 4: Treat foundation findings as representative seed data

The first implementation should use deterministic seed findings that cover the
required states and route targets. The UI copy must make the bounded foundation
scope clear and avoid implying full analysis coverage.

Alternative considered: no seed findings until real adapters exist. That would
leave the page too abstract to validate layout, routed handoff, and action
semantics.

## Risks / Trade-offs

- Fake-authority risk -> Use bounded copy and avoid claiming complete analysis
  coverage.
- Page-role drift -> Keep recommended actions outbound and prevent inline
  workflow execution.
- Duplicate Assets behavior -> Show affected object references and route to
  `Assets`, but do not embed asset inventory or provenance panels in `Analysis`.
- Routing complexity -> Keep handoff payloads minimal and test route helpers
  separately from UI rendering.
- Seed-data brittleness -> Cover every required state in tests so the seed layer
  remains intentional rather than incidental.
