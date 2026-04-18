## Why

`Project Bundle` now generates real local bundle files, so its validation,
output, and API boundaries need to be hardened before additional bundle
features build on top of it. The current follow-up line comes from review
feedback on the shipped foundation and should stay bounded to correctness,
privacy-safe display, and deterministic behavior rather than expanding bundle
scope.

## What Changes

- Harden `/api/project-bundles` request handling so unknown modes and missing
  explicit generate inputs return structured `400` responses.
- Keep generation gated by explicit composition and configuration; API callers
  must not bypass the workflow by relying on implicit defaults for `generate`.
- Strengthen project bundle validation so global blockers, warning-level
  member issues, missing session backup packages, and output-root problems are
  represented consistently.
- Ensure bundle output responses and UI-facing result data avoid raw absolute
  local path exposure, raw exception details, or misleading filesystem
  diagnostics.
- Make session backup package lookup deterministic and reasonably scalable for
  selected sessions by preferring the newest matching package and avoiding
  unnecessary payload work.
- Add focused tests for service, API, and UI/result behavior around the
  hardening cases.
- Do not add restore, migration apply, cloud sync, privacy redaction,
  non-core member toggles, or new project bundle product scope.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `backup-migration`: Adds hardening requirements for `project-bundle`
  validation, generation API boundaries, safe output display, deterministic
  session backup reuse, and structured error behavior.

## Impact

- `src/app/api/project-bundles/route.ts`
- `src/lib/server/projectBundleService.ts`
- `src/lib/server/paths.ts` if output-root validation needs path handling
  support
- `src/lib/backupMigration.ts`
- `src/components/BackupMigrationFoundation.tsx`
- Tests for project bundle model, service, route, and rendered result states
- `docs/viewer/backup-migration-foundation-qa-prompt.md` if QA coverage needs
  hardening-specific checks
- `README.md` / `CHANGELOG.md` only if user-facing behavior or shipped history
  changes
