## Why

`Project Overview` is the default landing page and the intended governance
entry point, but the current implementation is still mostly a static routing
surface. After the Sessions, Assets, Analysis, and Backup / Migration
foundations shipped, the next bounded step is to make Overview answer the
project-level governance questions already defined in the IA docs without
expanding into orchestration, sync, or a second Analysis page.

## What Changes

- Add a real Project Overview governance foundation that summarizes current
  project-scoped agent context across sessions, reusable assets, analysis
  findings, and backup / migration readiness.
- Replace static overview cards with a bounded module spine:
  Project Header, Context Snapshot, In-Effect Assets, Recent Sessions,
  Attention Needed, and Quick Actions.
- Add a local overview summary model that derives compact counts, status cues,
  and route targets from existing seed/provider data and current page
  foundations.
- Make `Attention Needed` the primary governance block when high-priority
  issues exist, while keeping it summary-only and routing-first.
- Keep `Quick Actions` compact and route-oriented; it may start existing
  bounded workflows but must not expose workflow internals on Overview.
- Preserve routed handoff semantics from Overview into `Sessions`, `Assets`,
  `Analysis`, and `Backup / Migration`.
- Add explicit zero, loading, normal, and issue states for the overview surface.
- Do not add cross-agent runtime orchestration, sync infrastructure,
  project-wide editing, privacy redaction, migration apply, restore expansion,
  or new backup workflow types.

## Capabilities

### New Capabilities

- `project-overview-governance`: Defines the Project Overview governance
  foundation, module spine, derived summary model, state behavior, and
  routing-first boundaries.

### Modified Capabilities

- None.

## Impact

- Affected UI: `src/components/ProjectShellClient.tsx` and any extracted
  Project Overview component/model helpers.
- Affected model code: a local overview summary derivation helper under
  `src/lib/` if needed.
- Affected tests: model/helper tests for summary derivation and component/shell
  tests for module rendering, state behavior, issue prioritization, and routed
  handoff.
- Affected docs: README / CHANGELOG when the implementation ships; QA prompt or
  report for Project Overview governance smoke checks.
- Tracking: GitHub Issue #63.
