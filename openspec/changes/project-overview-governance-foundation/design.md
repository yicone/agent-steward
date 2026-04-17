## Context

`Project Overview` is already the default shell page and has route builders into
`Sessions`, `Assets`, `Analysis`, and `Backup / Migration`. The page currently
uses mostly static cards and intentionally avoids inventing aggregate findings
before the data contracts exist. That was the right foundation boundary, but the
surrounding surfaces now expose enough bounded state to support a real
governance summary.

Existing product IA says Overview must answer:

- what agent-relevant context exists in this project right now
- what is currently in effect
- what changed recently
- what needs attention
- where the user should go next

The implementation should advance that contract without turning Overview into a
session browser, asset inventory, findings workbench, or workflow drawer.

## Goals / Non-Goals

**Goals:**

- Provide a real overview module spine: Project Header, Context Snapshot,
  In-Effect Assets, Recent Sessions, Attention Needed, and Quick Actions.
- Derive compact governance summaries from existing local seed/provider data and
  shipped foundation models.
- Keep all overview items routeable to the owning page for detail or action.
- Make issue-heavy states prioritize `Attention Needed` while preserving
  Overview's summary-and-route role.
- Preserve no-data/loading/normal/issue state behavior.
- Keep handoff context compact, explicit, and safe when routed data is partial
  or stale.

**Non-Goals:**

- No cross-agent runtime orchestration or task dispatch.
- No asset sync, package distribution, MCP management, or rules manager buildout.
- No privacy redaction work.
- No migration apply, vendor-runtime restore, or cloud sync.
- No new backup / migration workflow types.
- No full session transcript, full asset body, full findings table, or workflow
  execution detail on Overview.
- No broad visual redesign beyond what is needed for the governance foundation.

## Decisions

### Decision 1: Build a derived overview summary model

Create a small local model layer for Overview rather than embedding all summary
logic directly inside `ProjectShellClient`.

The summary model should expose compact structures for:

- project identity and local scope
- context snapshot counts and health cues
- in-effect asset summaries
- recent session summaries
- attention items
- quick route descriptors

Rationale: summary derivation is product logic and needs unit tests. Keeping it
outside the shell component prevents Overview from becoming another static JSX
block and makes future data-source replacement less risky.

Alternative considered: keep hard-coded cards in `ProjectShellClient`. This is
too close to the current placeholder-like behavior and makes governance
semantics hard to test.

### Decision 2: Use existing local data and seed/provider contracts only

The foundation should use data already available to the app: session source
metadata, context asset seed/provider data, analysis finding seed/model data,
and backup / migration workflow descriptors.

Rationale: #63 is a governance exploration line, not a new ingestion platform.
Using existing data keeps the slice bounded and prevents accidental scope
expansion into sync, indexing, or orchestration.

Alternative considered: add a new project-wide scanner. This would create a new
data platform before the product contract is proven.

### Decision 3: Attention Needed is summary-first and route-only

`Attention Needed` should be the semantic center in issue-heavy states, but each
item must stay compact: issue class, severity/priority, affected object class,
short reason, and route target.

Rationale: Overview should answer "what needs attention?" and "where do I go?"
It should not host detailed issue triage, evidence chains, or corrective
workflow state.

Alternative considered: render an analysis-like table on Overview. This would
collapse Overview into a second `Analysis` page and violate the IA boundary.

### Decision 4: Recent Sessions remains a compact activity cue

Recent Sessions may show a small number of recent session summaries with source,
identity, recency/status cue, and route to `Sessions`.

Rationale: users need "what changed recently", but `Sessions` remains the
evidence workbench. Overview should not include transcript excerpts, long
session lists, or diagnostics detail.

### Decision 5: Quick Actions routes, it does not execute

Quick Actions may open existing pages or bounded workflow entry points, but must
not show workflow internals, validation panels, confirmation state, or results.

Rationale: keeping actions route-first prevents Overview from becoming a tools
drawer and preserves the workflow-first model inside `Backup / Migration`.

### Decision 6: Safe degradation for missing or stale summary inputs

Overview should degrade to explicit zero/unknown states when data is missing,
not fabricate counts, issues, or session sets.

Rationale: local-only tools frequently run with partial providers, missing
source runtimes, or no sessions yet. The governance surface must be honest about
available evidence.

## Risks / Trade-offs

- **Risk: Fake authority from seed data** -> Mitigation: label compact cues as
  derived from local project evidence and avoid claims that require live
  provider certainty.
- **Risk: Overview becomes a second Analysis page** -> Mitigation: enforce
  summary-only attention items and route to `Analysis` for detail.
- **Risk: Quick Actions becomes a workflow drawer** -> Mitigation: keep workflow
  bodies inside `Backup / Migration`; Overview only launches routed entry.
- **Risk: Data-source coupling grows inside the shell** -> Mitigation: extract
  summary derivation helpers and cover them with tests.
- **Risk: Issue prioritization feels arbitrary** -> Mitigation: define stable
  severity ordering and keep labels transparent; tune later based on QA.

## Migration Plan

1. Add overview summary types and derivation helpers.
2. Replace static Overview cards with module rendering backed by the summary.
3. Preserve existing route builders and update tests around routed handoff.
4. Add QA prompt/report coverage for the governance foundation.
5. Update README / CHANGELOG when the implementation ships.

Rollback is straightforward: the change is front-end/model-local and does not
change storage formats or backend APIs. Reverting the component/model changes
restores the prior static overview surface.

## Open Questions

- Whether the first implementation should read only existing seed data or also
  include already-exposed session source status or count metadata, without
  adding new scanning, indexing, or provider probes.
- Whether `Project Header` should expose local root/source diagnostics now or
  defer richer project identity controls.
- Whether `Attention Needed` should show exactly three items or use a compact
  severity-capped list.
