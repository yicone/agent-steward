# Implementation Readiness Review

Updated: 2026-04-11

This document reviews whether the current codebase is ready to move from the
approved UX and visual direction into implementation planning.

It is not an implementation plan. It defines the migration boundary and the next
safe planning target.

Primary references:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [visual-direction.md](./visual-direction.md)
- [design-system-baseline.md](./design-system-baseline.md)
- [content-contract-draft.md](./content-contract-draft.md)
- [session-backup-migration-ux.md](./session-backup-migration-ux.md)
- [glossary.md](./glossary.md)

Code references:

- [src/app/page.tsx](../src/app/page.tsx)
- [src/components/HomeClient.tsx](../src/components/HomeClient.tsx)
- [src/components/GlobalSearch.tsx](../src/components/GlobalSearch.tsx)
- [src/components/SettingsClient.tsx](../src/components/SettingsClient.tsx)
- [src/app/globals.css](../src/app/globals.css)
- [src/lib/urlState.ts](../src/lib/urlState.ts)
- [src/lib/sessionRecord.ts](../src/lib/sessionRecord.ts)
- [src/lib/sessionRecordMapper.ts](../src/lib/sessionRecordMapper.ts)
- [src/lib/server/sessionBackupService.ts](../src/lib/server/sessionBackupService.ts)

## 1. Status

The current app is implementation-ready for a scoped migration plan, but not
for a broad redesign.

The current shipped UI is still effectively:

- a local-first session viewer
- a source diagnostics surface
- a trajectory / transcript / markdown workbench
- a session backup entry point

The next product direction is:

- project-first
- local-first
- multi-agent
- focused on agent context governance

This creates a controlled migration problem:

- preserve the current viewer capability
- move that capability into the future `Sessions` page
- introduce a project-first shell and page model without breaking current
  session reading

## 2. Current UI Inventory

### 2.1 App Entry

Current entry:

- `src/app/page.tsx` renders `HomeClient`

Implication:

- the current homepage is the session viewer
- the future homepage should be `Project Overview`
- `HomeClient` should not remain the long-term root product shape

### 2.2 Main Client Component

Current main UI:

- `src/components/HomeClient.tsx`

It currently owns:

- config and source status loading
- Antigravity / Windsurf / Codex source selection
- session list loading
- session selection
- global search selection handling
- URL deep-link restoration and sync
- transcript / trajectory / compact view state
- trajectory filtering
- execution-group collapse state
- inspector state
- error center state
- session backup action and feedback
- diagnostics export link
- large portions of session rendering

Implication:

- `HomeClient` is a working product surface, but it combines app shell,
  source bar, session list, viewer, inspector, and backup entry behavior.
- It is too coupled to become the future `Project Overview`.
- It is a good source of behavior for the future `Sessions` page.

### 2.3 Existing Components

Current reusable components:

- `GlobalSearch`
- `JsonViewer`
- shadcn-style primitives:
  - `Badge`
  - `Button`
  - `Card`
  - `Input`
  - `Select`
  - `Switch`

Implication:

- the codebase has enough primitives for a first shell and page skeleton.
- it does not yet have product-specific primitives such as route cues,
  provenance blocks, workflow bars, validation panels, or object detail panels.

### 2.4 Current Styling

Current styling:

- Tailwind v4
- global CSS variables for dark background, panel, muted, text, border, accent,
  danger
- current visual language is dark, session-workbench oriented, and cyan-accented

Implication:

- some current styles are useful for `Sessions`.
- the future project-first shell needs a broader token model aligned with
  [design-system-baseline.md](./design-system-baseline.md).
- replacing global CSS immediately would be risky because the current viewer
  depends on many existing utility combinations.

### 2.5 Existing URL State

Current URL state:

- source
- session id
- root id
- view
- trajectory filters
- expanded groups
- selected row
- inspector mode
- include cleared

Implication:

- the existing URL model is session-viewer-specific.
- it should be preserved for `Sessions`.
- future project-level routing requires a separate, higher-level route state
  model for page, object context, issue context, workflow context, and return
  context.

### 2.6 Existing Backup Capability

Current backup capability includes:

- session record model
- session record mapper
- session backup service and store
- session backup API routes
- UI action to create session backup

Implication:

- foundation exists for `Backup / Migration`.
- current UI exposes backup as a session action, not a bounded workflow page.
- first implementation should not remove the current session backup affordance
  until a workflow entry surface exists.

## 3. Preserve / Move / Replace

### 3.1 Preserve

Preserve these behaviors:

- local-first source reading
- Antigravity / Windsurf / Codex source status
- session list and source-root disambiguation
- global search selection
- URL deep-link restoration for selected sessions
- trajectory / transcript / compact views
- execution group collapse and virtualization
- error center and inspector
- diagnostic JSON export
- existing session backup creation path

Reason:

- these are the current product's strongest working capabilities
- they become the foundation of the future `Sessions` page

### 3.2 Move Into `Sessions`

Move or reinterpret these current UI regions as future `Sessions` page modules:

- source tabs -> `Session Source Bar`
- conversation list -> `Session List`
- viewer card -> `Session View`
- view mode controls -> `Projection Controls`
- error button and error inspector -> `Error Center`
- inspector side panel -> `Session Inspector`
- backup action -> `Session Actions`
- diagnostic JSON export -> diagnostic action inside session detail/actions

Reason:

- this preserves capability while preventing the session viewer from remaining
  the product homepage.

### 3.3 Replace Or Reframe

Replace or reframe these current concepts:

- `Agent Storage Manager` product title
  - replace with a project-first product frame once naming is decided enough for
    internal UI
- source-first top row
  - reframe as project shell source presence, not the whole product header
- single root page
  - replace with page-level IA: `Project Overview`, `Sessions`, `Assets`,
    `Analysis`, `Backup / Migration`
- immediate backup button as primary page action
  - reframe as session action that can route into `Backup / Migration`
    workflow

### 3.4 Do Not Remove Yet

Do not remove these before replacement surfaces exist:

- current `HomeClient`
- URL deep-link behavior
- backup button
- diagnostic export
- source diagnostics panel
- transcript / trajectory / markdown views

Reason:

- removing them before a `Sessions` page exists would regress the current
  shipped capability.

## 4. Required New Product Primitives

Before broad page implementation, define these primitives at the design and code
boundary.

### 4.1 App Shell

Purpose:

- establish project-first navigation and source presence

Needed for:

- all future top-level pages

Minimum responsibilities:

- project identity
- top-level nav
- global search slot
- source presence status
- optional route or workflow cue slot

Should not own:

- session selection
- workflow execution state
- asset subtype state

### 4.2 Route Cue

Purpose:

- preserve origin, issue, return, and continue-task context across page jumps

Needed for:

- `Assets / routed-in from Sessions`
- `Analysis / routed-in from Overview`
- `Backup / Migration / validation`

Minimum variants:

- origin
- return
- continue task
- issue
- workflow entry

### 4.3 Metadata Label

Purpose:

- display scope, source, subtype, status, provenance, root, route, and
  validation facts consistently

Needed for:

- `Assets`
- `Sessions`
- `Backup / Migration`
- `Analysis`

### 4.4 Object Detail Panel

Purpose:

- explain selected object meaning without becoming a full page state manager

Needed for:

- `Assets`
- possibly `Analysis` finding detail

Must support:

- identity
- subtype
- scope
- source
- status
- provenance
- session linkage

### 4.5 Provenance Block

Purpose:

- show where an object came from and whether that source remains trustworthy

Needed for:

- session-derived assets
- backup packages
- validation results

### 4.6 Workflow Bar

Purpose:

- keep `Backup / Migration` workflow-first

Minimum structure:

- workflow family line
- active workflow and current step line

### 4.7 Validation Panel

Purpose:

- concentrate validation state, warnings, blocking checks, and decision actions

Needed for:

- session backup validation
- import validation
- migration preview
- project bundle

## 5. Recommended First Implementation Slice

Recommended first slice:

- create the future app shell and preserve the current viewer as the `Sessions`
  content surface

This should be implemented as a migration scaffold, not a redesign of every
page.

### 5.1 Why Shell First

Shell first is recommended because:

- it changes the product subject from session-first to project-first
- it creates a home for future pages without breaking current viewer behavior
- it lets the current `HomeClient` move under `Sessions` gradually
- it makes global navigation and route state explicit before page-specific
  redesign

### 5.2 First Slice Scope

The first implementation slice should include:

- new app shell frame
- top-level navigation labels
- `Project Overview` placeholder or minimal summary shell
- `Sessions` route or tab containing existing viewer behavior
- current `HomeClient` behavior preserved inside the `Sessions` surface
- source status preserved in the shell or sessions source bar
- global search preserved

It should not include:

- full high-fi implementation
- complete `Assets`
- complete `Analysis`
- complete `Backup / Migration`
- finalized design tokens
- responsive redesign
- removal of current viewer logic

### 5.3 First Slice Success Criteria

The slice succeeds if:

- the app no longer reads as session-first at the top level
- the existing session viewer still works
- deep links to selected sessions still work or have a clear compatibility
  plan
- source diagnostics and attachment status remain accessible
- no backup or diagnostic export capability is lost
- the code has a clear place to add `Assets`, `Analysis`, and
  `Backup / Migration`

## 6. Alternative Implementation Slices Considered

### 6.1 Implement `Project Overview` First

Pros:

- most directly validates product repositioning
- aligns with approved high-fi trial

Cons:

- current code has no real project overview data model yet
- risks creating static UI before data boundaries exist
- does not solve where current viewer lives

Decision:

- not first
- should follow shell scaffold

### 6.2 Implement `Assets` First

Pros:

- validates context asset model
- uses strong visual direction from `Evidence Ledger`

Cons:

- asset inventory and provenance data model are not fully implemented
- may require more backend work before UI is meaningful

Decision:

- not first
- should wait for asset source and object model planning

### 6.3 Implement `Backup / Migration` First

Pros:

- session backup foundation exists
- validation workflow has clear UX

Cons:

- current backup UI is a direct session action, not a page workflow
- page may look isolated without shell and route context
- project bundle and import workflows need more product decisions

Decision:

- not first
- should follow shell scaffold and possibly a focused OpenSpec change

### 6.4 Refactor `HomeClient` First

Pros:

- reduces complexity before UI changes
- may make later work safer

Cons:

- refactor-only work does not advance product repositioning
- high risk of spending effort without visible migration progress

Decision:

- do not start with a broad refactor
- extract only when needed by the shell or `Sessions` migration

## 7. Technical Risks

### 7.1 `HomeClient` Coupling

Risk:

- `HomeClient` combines data loading, URL state, rendering, inspector, search
  selection, and backup action.

Mitigation:

- first wrap rather than rewrite
- extract session viewer modules only when a concrete migration slice requires
  it
- avoid changing URL state and rendering structure in the same commit

### 7.2 URL Compatibility

Risk:

- existing URLs encode session viewer state against the root page.

Mitigation:

- preserve current URL parameters during first shell scaffold
- document whether future session URLs should become `/sessions?...` or remain
  query-driven during transition
- add tests before changing `urlState.ts`

### 7.3 Styling Drift

Risk:

- current dark workbench styling conflicts with the new `Steward Map` baseline.

Mitigation:

- keep existing session workbench styling initially
- introduce new baseline styles as additive shell/page primitives
- avoid replacing global CSS variables until page migration proves stable

### 7.4 Data Model Gaps

Risk:

- `Project Overview`, `Assets`, and `Analysis` need data that the current UI
  does not yet model as first-class project context.

Mitigation:

- use shell scaffold before building data-rich pages
- plan project context aggregation separately
- avoid fake permanent UI that cannot be backed by local data

### 7.5 Backup Workflow Boundary

Risk:

- current backup action is direct; future `Backup / Migration` is a bounded
  workflow page.

Mitigation:

- preserve direct session backup action initially
- later route it into workflow context only when validation and result surfaces
  exist
- do not remove current API or action until workflow replacement is tested

## 8. Open Questions Before Implementation Plan

These questions should be answered in an OpenSpec proposal or implementation
plan:

- should future navigation use routes like `/sessions` and `/assets`, or a
  single app route with internal page state?
- how should existing deep links migrate?
- what is the minimum project identity model?
- what source status belongs in global shell versus `Sessions` source bar?
- should `HomeClient` be renamed or wrapped first?
- what is the first safe test boundary for shell migration?
- does `Project Overview` initially show real data, a limited summary, or a
  guided placeholder?

## 9. Recommended Next Step

Recommended next step:

- create an OpenSpec change for a shell-first migration scaffold

Suggested change id:

- `project-shell-foundation`

Suggested scope:

- introduce a project-first app shell
- add top-level page structure
- preserve current session viewer under `Sessions`
- keep current session backup and diagnostics behavior working
- do not implement full `Assets`, `Analysis`, or `Backup / Migration`

Why OpenSpec:

- this changes product behavior and navigation
- it touches the main app shell
- it must preserve current viewer behavior
- it needs explicit compatibility criteria for URL state and session backup

Do not start broad implementation before that change exists.
