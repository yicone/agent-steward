## Why

The project-first shell currently exposes `Assets` only as a bounded placeholder, but the product direction depends on making reusable context assets understandable at the project level. This change establishes the first real Assets foundation so users can inspect rules, memory, skills, and commands by subtype, scope, source, status, provenance, and in-effect relevance without turning the page into a generic editor or migration workflow.

## What Changes

- Introduce a local-first reusable context asset model for the `Assets` surface.
- Replace the current `Assets` placeholder with a bounded foundation page that includes subtype/scope orientation, summary, inventory, selected detail, provenance, and in-effect/usage cues.
- Support empty, loading, normal, selected, issue, and routed-in states for the Assets page.
- Support routed handoff into `Assets` from `Sessions`, `Project Overview`, or `Analysis` through filters, selected objects when available, and compact origin/continue-task cues.
- Keep asset actions bounded to routes such as source inspection, related session review, analysis, backup, migration, or import preparation.
- Do not introduce cloud sync, team sharing, full asset editing, full runtime restore, or complete cross-agent asset normalization in this foundation change.

## Capabilities

### New Capabilities

- `context-assets`: Defines reusable context asset concepts, inventory behavior, object detail, provenance, in-effect usage, bounded actions, and routed handoff requirements for the Assets surface.

### Modified Capabilities

- `project-shell`: Replaces the `Assets` placeholder requirement with a bounded real Assets foundation while preserving top-level navigation and the existing shell contract.

## Impact

- Affected UI: `ProjectShellClient` Assets route and any extracted Assets components.
- Affected model layer: new local reusable context asset types and view models.
- Affected tests: route selection, assets inventory states, detail selection, and routed-in behavior.
- Affected docs: Assets behavior should align with `docs/glossary.md`, `docs/page-block-ia.md`, `docs/page-state-ia.md`, `docs/content-contract-draft.md`, and `docs/routed-context-handoff.md`.
- No new external services or cloud dependencies.
