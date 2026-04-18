# Project Overview Governance Foundation Tasks

## 1. Model

- [x] 1.1 Define Project Overview summary types for project identity, context snapshot, in-effect assets, recent sessions, attention items, and quick actions.
- [x] 1.2 Add summary derivation helpers that use existing local seed/provider data and shipped foundation model data.
- [x] 1.3 Define stable severity/priority ordering for attention items.
- [x] 1.4 Add safe zero/unknown summary states when inputs are missing or unavailable.
- [x] 1.5 Add unit tests for summary derivation, issue prioritization, capped lists, and no-fabrication behavior.

## 2. UI

- [x] 2.1 Replace the static Project Overview card layout with the governance module spine: Project Header, Context Snapshot, In-Effect Assets, Recent Sessions, Attention Needed, and Quick Actions.
- [x] 2.2 Render loading, no-project-context, normal, and issue states.
- [x] 2.3 Keep `Attention Needed` summary-only and route-first; do not render full findings tables or corrective workflow detail.
- [x] 2.4 Keep `Recent Sessions` compact; do not render transcript excerpts, tool output, or long session lists.
- [x] 2.5 Keep `Quick Actions` compact and routing-first; workflow bodies must remain in `Backup / Migration`.
- [x] 2.6 Add component/static-render tests for the module spine and all explicit page states.

## 3. Routing / Handoff

- [x] 3.1 Preserve existing Overview routes into `Sessions`, `Assets`, `Analysis`, and `Backup / Migration`.
- [x] 3.2 Ensure Context Snapshot cues route to the owning page with compact filter or object context.
- [x] 3.3 Ensure In-Effect Assets route to `Assets` with explicit asset or filter context.
- [x] 3.4 Ensure Recent Sessions route to `Sessions` with explicit session context only.
- [x] 3.5 Ensure Attention Needed routes to the owning page with compact issue/object/workflow context.
- [x] 3.6 Add shell routing tests for each module route and stale/missing context degradation.
- [x] 3.7 Ensure Backup / Migration quick actions use only accepted workflow identities and degrade stale or partial workflow context to safe destination states.

## 4. Boundaries

- [x] 4.1 Verify Overview does not expose session transcript bodies, full asset inventories, full analysis finding tables, or backup workflow internals.
- [x] 4.2 Verify Overview does not imply runtime orchestration, cross-agent sync, migration apply, vendor-runtime restore, cloud sync, privacy redaction, or new workflow types.
- [x] 4.3 Ensure copy frames Overview as project-scoped agent context governance, not a generic dashboard or command center.

## 5. Documentation / QA

- [x] 5.1 Update README if the implementation changes user-visible Overview behavior.
- [x] 5.2 Update CHANGELOG under `## Unreleased` when the implementation ships.
- [x] 5.3 Add or update a Project Overview governance QA prompt/report covering module spine, page states, route handoffs, and scope boundaries.
- [x] 5.4 Run `pnpm test`.
- [x] 5.5 Run `pnpm build`.
- [x] 5.6 Run `OPENSPEC_TELEMETRY=0 openspec validate project-overview-governance-foundation --strict`.
