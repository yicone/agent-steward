# Project Overview Governance Foundation Tasks

## 1. Model

- [ ] 1.1 Define Project Overview summary types for project identity, context snapshot, in-effect assets, recent sessions, attention items, and quick actions.
- [ ] 1.2 Add summary derivation helpers that use existing local seed/provider data and shipped foundation model data.
- [ ] 1.3 Define stable severity/priority ordering for attention items.
- [ ] 1.4 Add safe zero/unknown summary states when inputs are missing or unavailable.
- [ ] 1.5 Add unit tests for summary derivation, issue prioritization, capped lists, and no-fabrication behavior.

## 2. UI

- [ ] 2.1 Replace the static Project Overview card layout with the governance module spine: Project Header, Context Snapshot, In-Effect Assets, Recent Sessions, Attention Needed, and Quick Actions.
- [ ] 2.2 Render loading, no-project-context, normal, and issue states.
- [ ] 2.3 Keep `Attention Needed` summary-only and route-first; do not render full findings tables or corrective workflow detail.
- [ ] 2.4 Keep `Recent Sessions` compact; do not render transcript excerpts, tool output, or long session lists.
- [ ] 2.5 Keep `Quick Actions` compact and routing-first; workflow bodies must remain in `Backup / Migration`.
- [ ] 2.6 Add component/static-render tests for the module spine and all explicit page states.

## 3. Routing / Handoff

- [ ] 3.1 Preserve existing Overview routes into `Sessions`, `Assets`, `Analysis`, and `Backup / Migration`.
- [ ] 3.2 Ensure Context Snapshot cues route to the owning page with compact filter or object context.
- [ ] 3.3 Ensure In-Effect Assets route to `Assets` with explicit asset or filter context.
- [ ] 3.4 Ensure Recent Sessions route to `Sessions` with explicit session context only.
- [ ] 3.5 Ensure Attention Needed routes to the owning page with compact issue/object/workflow context.
- [ ] 3.6 Add shell routing tests for each module route and stale/missing context degradation.
- [ ] 3.7 Ensure Backup / Migration quick actions use only accepted workflow identities and degrade stale or partial workflow context to safe destination states.

## 4. Boundaries

- [ ] 4.1 Verify Overview does not expose session transcript bodies, full asset inventories, full analysis finding tables, or backup workflow internals.
- [ ] 4.2 Verify Overview does not imply runtime orchestration, cross-agent sync, migration apply, vendor-runtime restore, cloud sync, privacy redaction, or new workflow types.
- [ ] 4.3 Ensure copy frames Overview as project-scoped agent context governance, not a generic dashboard or command center.

## 5. Documentation / QA

- [ ] 5.1 Update README if the implementation changes user-visible Overview behavior.
- [ ] 5.2 Update CHANGELOG under `## Unreleased` when the implementation ships.
- [ ] 5.3 Add or update a Project Overview governance QA prompt/report covering module spine, page states, route handoffs, and scope boundaries.
- [ ] 5.4 Run `pnpm test`.
- [ ] 5.5 Run `pnpm build`.
- [ ] 5.6 Run `OPENSPEC_TELEMETRY=0 openspec validate project-overview-governance-foundation --strict`.
