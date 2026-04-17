## Why

`Backup / Migration` now ships six bounded workflows:

- session backup
- bulk session backup
- import backup
- validate package
- migration preview
- project bundle

These workflows are real and useful, but their validation status language,
result semantics, recent-operation summaries, and routed degrade behavior have
grown incrementally. The next high-value step is not another workflow. It is to
make the existing workflow stack more coherent so users can predict when a
workflow may continue, when a condition is warning vs blocker, what a terminal
result means, and how stale routed context degrades safely.

## What Changes

- Harden validation semantics across all six shipped `Backup / Migration`
  workflows.
- Align warning vs blocker boundaries where workflows currently treat similar
  conditions inconsistently without a spec reason.
- Tighten routed-context degradation so stale or partial handoff lands in safe
  workflow states instead of misleading continuity.
- Clarify terminal result semantics and align `Recent Operations` with those
  results.
- Add targeted regression and QA coverage for the hardened rules.
- Do not add new workflows, new product areas, migration apply, restore/runtime
  continuation promises, project-bundle scope expansion, or privacy-redaction.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `backup-migration`: Tightens validation, result, recent-operation, and
  routed-degrade semantics across the existing workflow stack.

## Impact

- Affected model code: `src/lib/backupMigration.ts`
- Affected UI: `src/components/BackupMigrationFoundation.tsx`
- Affected shell routing: `src/components/ProjectShellClient.tsx`
- Affected tests: `tests/backupMigration.test.ts`,
  `tests/backupMigrationFoundation.test.tsx`,
  `tests/projectShellClient.test.ts`
- Affected docs/QA guidance:
  `docs/viewer/backup-migration-foundation-qa-prompt.md`
- Tracking: GitHub Issue #62
