## Why

`Backup / Migration` now supports executable preservation workflows, but users
still cannot inspect portability risk before deciding whether context should be
moved into another product-readable shape. Migration preview is the next
bounded workflow because it reuses the existing workflow spine while explicitly
stopping at compatibility preview rather than migration apply.

## What Changes

- Add a `migration-preview` workflow to `Backup / Migration`.
- Support explicit source context and target context selection before preview.
- Support bounded scope selection for previewing portability of sessions,
  reusable context assets, or a project-context subset.
- Run preview-only compatibility checks that classify selected items as
  portable, degraded, unsupported, or blocked.
- Show validation and preview results without executing migration, writing
  migrated objects, or claiming vendor-runtime restoration.
- Support routed entry from `Assets`, `Analysis`, and `Project Overview` when
  those surfaces provide explicit source, target, or issue context.
- Record completed migration previews as compact recent-operation entries with
  route to preview result detail.
- Do not add migration apply, project bundle packaging, vendor-runtime restore,
  cloud sync, or cross-machine transfer behavior in this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `backup-migration`: Adds a preview-only migration workflow, source/target
  context semantics, portability classification, routed preview entry, and
  recent-operation summary behavior.

## Impact

- Affected UI: `src/components/BackupMigrationFoundation.tsx` workflow selector,
  workflow body, validation panel, result panel, and recent operations.
- Affected model code: `src/lib/backupMigration.ts` workflow descriptors,
  preview context types, compatibility result helpers, and handoff mapping.
- Affected shell code: `ProjectShellClient` route builders for overview,
  assets, and analysis migration-preview entry.
- Affected tests: model tests, component tests for preview states, and shell
  routing tests for preview handoff.
- Affected docs: `README.md`, `CHANGELOG.md`, and external QA prompt when the
  implementation ships.
- Tracking: GitHub Issue #54.
