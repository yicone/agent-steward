## Why

`Project Overview` now routes governance attention into `Assets`, but the
Assets surface still treats status, provenance, and in-effect relevance as
thin inventory metadata. This change hardens Assets into a clearer governance
surface so users can understand what is active, stale, conflicted, orphaned,
or unresolved without adding editing, sync, deployment, or runtime controls.

## What Changes

- Tighten reusable asset health semantics with explicit severity,
  explanation, and recommended route ownership.
- Clarify in-effect and provenance explanations so active assets explain why
  they matter and issue assets explain why they need attention.
- Improve routed continuity from `Project Overview` and `Analysis` by keeping
  issue context visible without carrying full overview or findings state.
- Add detail inspection affordances for affected object, source reference,
  freshness, conflict/orphan cues, and bounded next routes.
- Preserve zero/unknown states and avoid silently inferring missing source,
  scope, usage, or health data.
- Keep `Assets` bounded: no full editing, cross-agent sync, deployment,
  privacy redaction, vendor-runtime restore, or workflow execution in this
  change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `context-assets`: Adds governance hardening requirements for health
  semantics, in-effect/provenance explanation, routed issue continuity, detail
  inspection, and bounded next routes.
- `project-shell`: Clarifies that Overview/Analysis-to-Assets handoffs may
  carry compact issue context, but not full source page state or executable
  asset operations.

## Impact

- Affected model code: `src/lib/contextAssets.ts` and any related overview or
  analysis handoff builders.
- Affected UI code: `src/components/AssetsFoundation.tsx` and shell routes in
  `src/components/ProjectShellClient.tsx`.
- Affected tests: asset model tests, Assets component rendering tests, and
  shell handoff tests.
- Affected docs: README / CHANGELOG if user-facing behavior changes, and a
  focused QA prompt or report for Assets governance hardening.
- No new backend APIs, external services, storage formats, cloud dependencies,
  or source-runtime mutation.
