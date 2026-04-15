## Why

The `Backup / Migration` foundation now supports real single-session backup,
import, and package validation workflows, but preserving several sessions still
requires repeating the single-session workflow manually. Bulk session backup is
the next bounded follow-up because it extends an existing executable workflow
without introducing migration, project bundle, or cloud-sync semantics.

## What Changes

- Add a `bulk-session-backup` workflow to the existing `Backup / Migration`
  workflow selector and workflow spine.
- Support explicit multi-session selection from direct `Backup / Migration`
  entry and routed entry from `Sessions` or `Project Overview`.
- Add per-session validation for canonical record availability, provenance,
  and optional source-copy readiness.
- Add batch confirmation that summarizes selected count, blocking items,
  warnings, and source-copy choices before execution.
- Execute bulk backup by applying the existing single-session backup behavior
  to each selected session; this change does not introduce a new backend batch
  endpoint or new backup package format.
- Show aggregate and per-session result reporting, including partial failures,
  warnings, and actionable next-step routes.
- Extend recent operations so a completed bulk backup appears as one compact
  batch operation with route to per-session result detail.
- Preserve the existing direct single-session backup action and existing
  `session-backup`, `import-backup`, and `validate-package` workflows.
- Do not add migration preview, project bundle packaging, vendor-runtime
  restore, cloud sync, or team collaboration behavior in this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `backup-migration`: Adds a bounded bulk session backup workflow, multi-session
  selection semantics, per-session validation, batch confirmation, partial
  result reporting, and recent-operation summary behavior.

## Impact

- Affected UI: `src/components/BackupMigrationFoundation.tsx` and shell entry
  points that route to `Backup / Migration`.
- Affected model code: `src/lib/backupMigration.ts` workflow descriptors,
  validation helpers, execution/result models, and handoff helpers.
- Affected tests: model tests, component tests for bulk selection/validation/
  confirmation/result states, and shell routing tests for bulk handoff.
- Affected docs: `README.md` and `CHANGELOG.md` when implementation ships, plus
  external QA coverage for mixed eligibility and partial failure states.
- Tracking: GitHub Issue #53.
