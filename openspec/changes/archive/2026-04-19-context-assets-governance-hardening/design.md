## Context

`Assets` already exposes reusable context assets as local objects with subtype,
scope, source, status, provenance, usage, inventory filters, selected detail,
and routed handoff cues. `Project Overview` now summarizes governance issues
and routes affected assets into `Assets`, which raises the bar for what the
Assets page must explain when an item is stale, conflicted, orphaned, unknown,
or in effect.

The current implementation is intentionally seed/provider based. This hardening
should improve semantics and user-facing explanation without adding a new
scanner, editor, sync layer, package distribution system, or source-runtime
mutation path.

## Goals / Non-Goals

**Goals:**

- Give each asset a clear governance interpretation: severity, reason, affected
  evidence, and owning route for next inspection.
- Explain active and in-effect assets with enough context that users understand
  why the asset matters to the current project.
- Explain stale, conflicted, orphaned, and unknown assets without implying that
  `Assets` can directly fix or edit them.
- Preserve compact routed issue context from `Project Overview` and `Analysis`
  until the user intentionally changes focus.
- Add testable model and component states for health summaries, issue detail,
  and route continuity.

**Non-Goals:**

- Full asset editing, conflict resolution, or canonical source mutation.
- Cross-agent sync, deployment, package distribution, MCP management, or
  runtime restore.
- Privacy redaction beyond existing local/path safety conventions.
- New backend APIs, storage formats, or broad source adapters.
- Turning `Assets` into a replacement for `Analysis`, `Sessions`, or
  `Backup / Migration`.

## Decisions

### Decision 1: Add governance interpretation as a view-model layer

Keep the existing `ContextAsset` model stable and derive a small governance
view model from it. The derived model should include severity, reason,
recommended route target, route label, and issue category where applicable.

Rationale: hardening should clarify behavior without forcing a storage or data
adapter migration. A derived layer is easier to test and can be replaced when
real source providers mature.

Alternative considered: expand each seed object with more required fields.
Rejected because it would mix canonical asset facts with UI interpretation and
make future provider integration harder.

### Decision 2: Use status plus usage/provenance to explain health

Health classification should start from existing status values:

- `active` with in-effect data maps to `healthy`.
- `active` without in-effect data maps to `informational`; it is active
  inventory, not proof that the asset currently affects the project.
- `stale` maps to `warning` because freshness review is needed.
- `conflicted` maps to `warning` because multiple local copies or
  interpretations disagree.
- `orphaned` maps to `warning` because evidence exists but no durable
  canonical owner is known.
- `unknown` maps to `unknown`; it must be explicit, but it is not
  automatically blocking.

Usage and provenance should refine the explanation, not silently override the
status.

Alternative considered: invent a new independent health enum immediately.
Rejected for v1 because it duplicates status without proving which distinctions
are needed.

### Decision 3: Preserve route ownership boundaries

`Assets` explains the asset and offers bounded next routes:

- `Sessions` owns source evidence reading.
- `Analysis` owns grouped interpretation and issue triage.
- `Backup / Migration` owns workflow execution.
- `Project Overview` owns summary-level governance return context.

The Assets page must not execute fixes or mutate third-party runtime state.

Alternative considered: put "resolve conflict", "refresh", or "deploy" actions
inside the asset detail panel. Rejected because the product does not yet have
safe mutation semantics or source-runtime ownership.

### Decision 4: Keep routed issue context compact and dismissible

Overview and Analysis handoffs may carry origin, issue label, subtype/scope,
status, asset id, and a short continue label. They must not carry full overview
summary state, full finding tables, transcript state, or workflow execution
state. The cue should remain visible until the user changes filters or object
focus intentionally.

Alternative considered: durable URL state for all routed context. Useful later,
but not required for this hardening slice and risks expanding route semantics.

### Decision 5: Treat seed data honesty as part of governance hardening

If Assets still uses seed/provider data, the page should show an explicit
foundation/provider data cue similar to Project Overview. It can still
demonstrate governance semantics, but unknown/unavailable data must stay
visible and counts must not be framed as a complete live project scan.

Alternative considered: wait for real inventory before hardening Assets.
Rejected because Project Overview already routes into Assets and needs a
coherent destination now.

## Risks / Trade-offs

- [Risk] Governance copy may look authoritative while backed by seed/provider
  data. -> Mitigation: preserve explicit provenance, unknown, unavailable, and
  routed-context labels.
- [Risk] Detail panels become noisy. -> Mitigation: group health explanation,
  provenance, usage, and next routes into distinct compact sections.
- [Risk] Route buttons drift into workflow execution. -> Mitigation: require
  route labels and keep execution in owning surfaces.
- [Risk] Status and health semantics diverge. -> Mitigation: derive health from
  status in this slice and cover the mapping with model tests.
- [Risk] Future editing/sync work becomes harder if copy promises fixes. ->
  Mitigation: use "inspect", "review", and "prepare" language, not "repair" or
  "sync" commands.

## Migration Plan

1. Add governance derivation helpers and route descriptors in the asset model
   layer.
2. Update `AssetsFoundation` summary/detail/routed cue rendering to consume the
   derived interpretation.
3. Extend shell handoff builders only for compact issue context that already
   exists.
4. Add model, component, and shell routing tests.
5. Update README / CHANGELOG / QA prompt or QA report if the behavior ships.

Rollback is front-end/model-local: remove the derived governance layer and
return Assets to the prior inventory/detail rendering. No storage formats or
backend APIs are affected.

## Open Questions

None for this slice. Future source-provider work may revisit whether
`unknown` deserves stronger visual emphasis once live inventory evidence exists.
