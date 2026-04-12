## Context

The project shell now frames the product around `Project Overview`, `Sessions`, `Assets`, `Analysis`, and `Backup / Migration`, but `Assets` still communicates intent rather than providing real object understanding. The IA and glossary documents define `Context Asset` as an umbrella term and `Reusable Context Asset` as rules, memory, skills, and commands that can be reused across sessions. This change turns `Assets` into the first bounded object surface for those reusable assets.

The design must remain local-first. It must not require cloud sync, third-party runtime restore, or complete cross-agent normalization before the page becomes useful. It also must not regress the existing session viewer, search selection, deep links, or session backup behavior.

## Goals / Non-Goals

**Goals:**

- Define a minimal reusable context asset view model shared by the Assets page.
- Provide a real `Assets` page backbone: subtype/scope header, summary, inventory, selected detail, provenance, and in-effect/usage.
- Support bounded page states: empty, loading, normal unselected, selected, issue, and routed-in.
- Preserve routed continuity from `Sessions`, `Project Overview`, and `Analysis` without passing full transcript or trajectory state.
- Keep actions bounded to source inspection, related sessions, analysis, backup, migration, or import preparation.

**Non-Goals:**

- Full editing of rules, memory, skills, or commands.
- Full import/export/sync between all agent tools.
- Runtime restore into third-party products.
- Cloud storage, team sharing, or remote collaboration.
- A complete asset conflict-resolution engine.
- Replacing the existing `Sessions` viewer or backup APIs.

## Decisions

### Decision: Introduce a view-model-first reusable asset layer

The foundation should introduce a small `ContextAsset` or equivalent view model before deep source-specific parsers. The view model should include identity, subtype, scope, source, status, provenance summary, optional body summary, optional source reference, and optional in-effect/usage metadata.

Alternatives considered:

- Parse every supported tool format first. This would delay UI validation and overfit the model before the object surface is tested.
- Render hardcoded placeholder content. This would repeat the project-shell placeholder problem and make the page look more complete than it is.

### Decision: Keep source adapters bounded and explicit

Initial asset data may come from local fixture-like seeds, local project files, or narrow source adapters, but every row must make source/provenance limitations visible. Missing data should appear as unknown, unavailable, or unsupported rather than being inferred silently.

Alternatives considered:

- Hide unsupported fields until adapters mature. This would make provenance and in-effect questions impossible to validate.
- Infer scope/source aggressively. This risks misleading users because `scope` and `source` are distinct terms in the glossary.

### Decision: Assets page owns object understanding, not workflows

`Assets` should let users understand what an asset is, where it came from, what scope it applies at, and whether it is in effect. Workflow execution remains owned by `Backup / Migration`; grouped interpretation remains owned by `Analysis`; session evidence reading remains owned by `Sessions`.

Alternatives considered:

- Add asset editing and migration panels directly inside `Assets`. This would turn the page into a tools drawer and conflict with the IA.
- Push all issue interpretation into `Assets`. This would duplicate `Analysis` and weaken routing clarity.

### Decision: Routed-in state is filter/object/cue based

When the user enters from `Sessions`, `Project Overview`, or `Analysis`, the target page should consume handoff context by applying subtype/scope/status filters, selecting an asset when possible, and showing a compact origin or continue-task cue. It must not carry full transcript state, trajectory expansion, or unrelated filters.

Alternatives considered:

- Encode all handoff context in durable URL parameters immediately. This may be useful later, but the foundation can start with shell state as long as existing session deep links remain valid.
- Ignore routed origin. This would force users to rediscover the object they were acting on.

## Risks / Trade-offs

- [Risk] Asset data may be sparse before deeper source adapters exist -> Mitigation: expose zero, unknown, and unsupported states explicitly and avoid fake completeness.
- [Risk] The right-side detail panel may become too dense -> Mitigation: keep the foundation fields minimal and put in-effect/usage into a second layer when needed.
- [Risk] Asset actions may grow into workflow execution -> Mitigation: route workflow actions to `Backup / Migration` and keep Assets actions contextual.
- [Risk] Scope and source may be confused in UI copy -> Mitigation: keep both fields visible and follow `docs/glossary.md` definitions.
- [Risk] Existing shell/session behavior may regress -> Mitigation: keep `Sessions` containment tests and add targeted Assets route/state tests.

## Migration Plan

1. Add reusable context asset types and small normalization helpers.
2. Replace the `Assets` placeholder with a bounded foundation page backed by the view model.
3. Add empty/loading/normal/selected/issue/routed-in behavior with tests.
4. Keep existing session search, deep link, viewer, and backup tests passing.
5. Defer richer source adapters, editing, import, export, and migration execution to later changes.

Rollback is straightforward: the shell can return to the bounded `Assets` placeholder while leaving the new model code unused, provided the `project-shell` accepted spec is not archived until implementation is validated.
