## 1. Asset Model

- [x] 1.1 Define reusable context asset TypeScript types for subtype, scope, source, status, provenance, optional body summary, and optional in-effect metadata.
- [x] 1.2 Add a bounded local asset data provider or seed adapter that covers normal, selected, issue, empty, and routed-in states without implying complete cross-agent normalization.
- [x] 1.3 Add normalization helpers that keep missing source, provenance, status, and in-effect fields explicit.
- [x] 1.4 Add unknown subtype handling that avoids silently assigning a default asset subtype.

## 2. Assets Surface

- [x] 2.1 Replace the Assets placeholder with a foundation page composed of scope header, summary, inventory, detail, and in-effect/usage regions.
- [x] 2.2 Implement subtype, scope, source, and status filtering with the active filter context visible in the header.
- [x] 2.3 Implement empty, loading, normal unselected, selected, and issue states without fake complete inventory claims.
- [x] 2.4 Implement routed-in empty state messaging that preserves active filters and origin cue until the user changes focus intentionally.
- [x] 2.5 Implement selected asset detail with identity, subtype, scope, source, status, provenance summary, optional body summary, and bounded evidence routes.
- [x] 2.6 Implement in-effect/usage rendering for available applicability data and explicit unavailable messaging when applicability is unknown.

## 3. Routed Handoff

- [x] 3.1 Add shell-level routed handoff support into Assets for subtype, scope, object selection, issue, and return context from `Sessions`, `Project Overview`, and `Analysis`.
- [x] 3.2 Add compact origin and continue-task cues for routed-in Assets states.
- [x] 3.3 Ensure routed handoff does not carry full transcript, trajectory state, or unrelated session-local reading mode.
- [x] 3.4 Degrade stale handoff references safely while preserving still-valid filters.

## 4. Bounded Actions

- [x] 4.1 Add contextual action affordances for source inspection, related session review, analysis, backup, migration, import preparation, or archive preparation when relevant.
- [x] 4.2 Route backup and migration actions to `Backup / Migration` rather than executing workflow internals inside the Assets detail panel.
- [x] 4.3 Keep full editing, cloud sync, cross-agent sync, and runtime restore controls out of the foundation behavior.

## 5. Validation

- [x] 5.1 Add or update unit tests for asset model normalization and missing metadata behavior.
- [x] 5.2 Add or update component tests for Assets filtering, empty state, selected detail, issue state, and routed-in cues.
- [x] 5.3 Verify existing Sessions search selection, URL restoration, viewer, and backup tests still pass.
- [x] 5.4 Run `openspec validate assets-foundation --strict`.
