## Why

`Sessions`, `Assets`, and `Analysis` now have real foundation surfaces, but
`Backup / Migration` still shows a static placeholder. This leaves the last
top-level project shell page unable to perform bounded preservation, import,
or trust-check workflows. Users who need to preserve a session from routed
context, import a backup package, or validate package trust still have no
workflow-first project-level surface for those tasks.

## What Changes

- Replace the `Backup / Migration` placeholder with a bounded workflow-first
  foundation surface containing a workflow selector, workflow spine, context
  summary, validation panel, and operation result / recent operations.
- Lift the existing single-session backup capability into the workflow surface
  so it can be entered from routed handoff (`Sessions`, `Analysis`, `Assets`,
  `Project Overview`) rather than only from the `Sessions` viewer action.
- Add an import-backup workflow that accepts a session-backup package, validates
  schema/integrity/provenance, and restores product-readable state through the
  existing import API.
- Add a standalone validate-package workflow that runs trust and compatibility
  checks without executing import.
- Add a recent-operations module that displays completed workflow results with
  compact identity, timestamp, and route to result detail.
- Support routed handoff into `Backup / Migration` from `Project Overview`,
  `Sessions`, `Assets`, and `Analysis` through workflow context, object context,
  issue context, and return context.
- Preserve the existing direct session backup action inside the `Sessions`
  viewer without change.
- Use explicit bounded copy and preservation/destructive-risk warnings
  throughout. No vendor-runtime restore claims, no cloud dependency, no bulk
  backup, no migration preview, and no project bundle execution in this change.

## Capabilities

### New Capabilities

- `backup-migration-foundation`: Defines the workflow-first Backup / Migration
  foundation surface, workflow model, workflow states, routed handoff behavior,
  validation-first semantics, and bounded operation results.

### Modified Capabilities

- `project-shell`: Replaces the Backup / Migration placeholder requirement with
  a bounded Backup / Migration foundation requirement while preserving the
  shell-level role boundary.

## Impact

- Affected UI: `src/components/ProjectShellClient.tsx` and a new
  `BackupMigrationFoundation` component.
- Affected model code: local backup-migration workflow model, handoff helpers,
  validation helpers, and recent-operations helpers under `src/lib/`.
- Affected tests: unit tests for workflow model helpers and component tests for
  idle, selection, validation, result, routed-in, and empty states.
- Affected docs: README / CHANGELOG updates when the implementation ships.
- Tracking: GitHub Issue #50.
