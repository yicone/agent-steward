## Why

The product direction has shifted from a session-first viewer to a project-first
local agent context steward, but the current app still opens directly into the
session viewer. We need a shell-first migration scaffold that changes the
product subject without regressing the existing local session reading,
diagnostics, deep-link, and backup capabilities.

## What Changes

- Introduce a project-first app shell with stable top-level navigation for:
  `Project Overview`, `Sessions`, `Assets`, `Analysis`, and
  `Backup / Migration`.
- Preserve the existing session viewer behavior inside the `Sessions` surface
  during the first migration slice.
- Add a minimal `Project Overview` surface or placeholder that establishes the
  project-first landing role without pretending to implement full analysis or
  asset inventory.
- Keep source status, global search, diagnostics access, URL deep-link behavior,
  and direct session backup behavior working during the scaffold phase.
- Establish clear non-goals for this change: no complete redesign, no full
  `Assets`, no full `Analysis`, no full `Backup / Migration`, no final design
  system implementation, and no removal of current viewer functionality.
- No breaking changes are intended.

## Capabilities

### New Capabilities

- `project-shell`: Defines the project-first app shell, top-level page
  structure, session viewer containment, and migration compatibility
  requirements.

### Modified Capabilities

- None.

## Impact

- Affected UI entry points:
  - `src/app/page.tsx`
  - `src/components/HomeClient.tsx`
  - new shell/page components to be introduced during implementation
- Affected shared UI:
  - `src/components/GlobalSearch.tsx`
  - shadcn-style primitives under `src/components/ui/`
  - `src/app/globals.css` only through additive styling, not broad replacement
- Affected state and compatibility areas:
  - session URL state in `src/lib/urlState.ts`
  - current source status and diagnostics flows
  - current session backup entry action
- No backend storage format, session record model, or backup package schema
  change is required for this foundation.
