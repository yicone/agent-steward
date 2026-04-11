## Context

The current app opens at `src/app/page.tsx` and renders `HomeClient`, which is a
working session viewer and diagnostics surface. `HomeClient` currently combines
app shell, source selection, session list, viewer, inspector, URL sync, global
search selection, diagnostics export, and session backup entry behavior.

The approved product direction is project-first rather than session-first. The
approved visual baseline is `Steward Map` with `Evidence Ledger` as supporting
language. The implementation readiness review recommends a shell-first scaffold
that preserves the existing viewer under the future `Sessions` area instead of
rewriting all pages at once.

Key constraints:

- Preserve local-first source reading.
- Preserve existing session viewer functionality.
- Preserve current URL deep-link behavior until an explicit migration replaces
  it.
- Preserve current session backup and diagnostics affordances.
- Do not implement full `Assets`, `Analysis`, or `Backup / Migration` in this
  foundation.

## Goals / Non-Goals

**Goals:**

- Introduce a project-first app shell with stable top-level navigation.
- Establish `Project Overview` as the landing subject.
- Keep the existing session viewer available under `Sessions`.
- Preserve current session deep links, global search selection, source status,
  diagnostics export, and direct session backup behavior.
- Create a safe structure where future `Assets`, `Analysis`, and
  `Backup / Migration` pages can be added without keeping the root page
  session-first.

**Non-Goals:**

- Do not build the full final visual design.
- Do not create a complete component library or finalized production tokens.
- Do not implement full `Assets`, `Analysis`, or `Backup / Migration`.
- Do not redesign trajectory rendering, transcript rendering, or inspector
  behavior.
- Do not remove or replace the current session backup API.
- Do not change session record or backup package schemas.

## Decisions

### Decision 1: Add a shell scaffold before page rewrites

Introduce a project-first shell that owns top-level navigation and page framing,
then place the existing viewer behavior under the `Sessions` surface.

Rationale:

- It changes the app's top-level subject without risking current viewer
  behavior.
- It creates a stable place for future pages.
- It keeps implementation scope small enough to validate with existing tests.

Alternative considered:

- Implement `Project Overview` first as a rich page.
- Rejected because current code does not yet have a first-class project context
  aggregation model, and a rich static overview would create UI ahead of data.

### Decision 2: Wrap before extracting `HomeClient`

The first implementation should wrap or contain existing `HomeClient` behavior
instead of immediately splitting it into many components.

Rationale:

- `HomeClient` is highly coupled but functional.
- Broad refactor before shell migration would spend effort without validating
  the product repositioning.
- Extraction can happen incrementally once the new shell creates real seams.

Alternative considered:

- Refactor `HomeClient` first.
- Rejected because it increases regression risk without changing the product
  subject.

### Decision 3: Preserve existing session URL semantics during the foundation

The foundation should not change `src/lib/urlState.ts` semantics unless required
for a compatibility shim.

Rationale:

- Existing session URLs encode selected source, session id, root id, view,
  filters, expanded groups, selected row, and inspector state.
- Breaking deep links would regress one of the current product strengths.

Alternative considered:

- Move immediately to route paths like `/sessions?...`.
- Deferred because route migration needs explicit compatibility criteria and
  tests.

### Decision 4: Use placeholders only where data boundaries are not ready

`Project Overview`, `Assets`, `Analysis`, and `Backup / Migration` can exist as
top-level destinations in the scaffold, but only `Sessions` should carry the
full existing working surface in this change.

Rationale:

- The shell can establish IA before all data models exist.
- Placeholder pages can communicate role and next step without pretending to be
  complete.

Alternative considered:

- Hide unavailable pages.
- Rejected because the goal of the foundation is to establish the project-first
  IA and migration target.

### Decision 5: Keep backup as a session action initially

The existing direct session backup action should remain available in `Sessions`
until `Backup / Migration` has real workflow validation and result surfaces.

Rationale:

- Session backup functionality already exists.
- Moving it into a nonfunctional workflow page would reduce capability.

Alternative considered:

- Remove direct backup and route to a placeholder `Backup / Migration`.
- Rejected because placeholders must not break working preservation behavior.

## Risks / Trade-offs

- [Risk] The shell may look like a redesign while still containing the old
  viewer.
  - Mitigation: treat this change as a scaffold; only apply additive baseline
    styling needed for shell and navigation.
- [Risk] Existing session deep links may be overwritten during shell routing.
  - Mitigation: preserve current query-driven session state and add tests before
    changing URL behavior.
- [Risk] `HomeClient` remains large after the first slice.
  - Mitigation: accept this temporarily; extract only after the shell boundary
    proves useful.
- [Risk] Placeholder pages may be mistaken for implemented features.
  - Mitigation: label them as foundation surfaces and keep actions disabled or
    clearly routed to existing working surfaces.
- [Risk] Source diagnostics may become hidden in the new shell.
  - Mitigation: preserve diagnostics access either in shell source presence or
    the `Sessions` source bar.

## Migration Plan

1. Introduce shell and page-selection structure around the existing root app.
2. Add stable top-level navigation labels.
3. Place existing viewer behavior under `Sessions`.
4. Add a minimal `Project Overview` foundation surface.
5. Add placeholder surfaces for `Assets`, `Analysis`, and `Backup / Migration`
   that communicate role without claiming full behavior.
6. Verify existing session reading, search selection, URL restoration,
   diagnostics export, and session backup still work.

Rollback strategy:

- Keep current `HomeClient` behavior intact.
- If shell routing regresses core viewer behavior, temporarily route the root
  page back to the existing viewer while preserving the new components for
  later rework.

## Open Questions

- Should later page navigation become path-based (`/sessions`, `/assets`) or
  remain internal page state under the root route?
- What is the minimum real project identity model for `Project Overview`?
- Which source status details belong in the global shell versus the `Sessions`
  source bar?
- When should direct session backup route into the future
  `Backup / Migration` workflow?
