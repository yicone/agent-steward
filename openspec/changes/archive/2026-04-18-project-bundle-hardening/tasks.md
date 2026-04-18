## 1. API Boundary Hardening

- [x] 1.1 Add or confirm structured `400` handling for invalid JSON and unsupported `/api/project-bundles` modes.
- [x] 1.2 Require explicit `selection` and `configuration` for `mode: "generate"` and prevent default-selection generation bypass.
- [x] 1.3 Ensure `mode: "validate"` remains side-effect free and does not write bundle files.
- [x] 1.4 Add route-level tests for invalid mode, missing generate input, validate-only behavior, and structured error payloads.

## 2. Validation Severity and Output Root Handling

- [x] 2.1 Harden project bundle output-root readiness checks for missing roots, existing directories, invalid targets, and unwritable ancestors.
- [x] 2.2 Represent output-root failures as global blocking validation items, not member-category inventory status.
- [x] 2.3 Preserve warning-level handling for selected sessions that lack existing backup packages.
- [x] 2.4 Ensure structural preconditions such as empty composition, empty bundle name, and unreadable package metadata block generation.
- [x] 2.5 Add service tests for output-root blockers, structural blockers, missing-package warnings, and validation summary counts.

## 3. Safe Generation Result Shape

- [x] 3.1 Redact or convert client-facing bundle file locations to display-safe paths.
- [x] 3.2 Avoid returning raw exception details, usernames, temporary paths, or host-specific filesystem diagnostics to API clients.
- [x] 3.3 Return a summary-shaped generation response instead of echoing the full bundle document when result UI fields are sufficient.
- [x] 3.4 Preserve `missing-package` or unresolved member references in generated metadata without silently omitting selected sessions.
- [x] 3.5 Add tests for generation response shape, path redaction, unresolved references, and no raw path leakage in rendered results.

## 4. Session Backup Reuse Determinism

- [x] 4.1 Match existing backup packages by explicit session identity: `source`, `sessionId`, and optional `rootId`.
- [x] 4.2 Select the newest matching backup package by manifest creation timestamp when multiple packages match.
- [x] 4.3 Avoid reading unrelated backup payload records when manifest metadata already excludes a package from the requested sessions.
- [x] 4.4 Treat malformed unrelated backup packages as ignored candidates rather than project bundle validation failures.
- [x] 4.5 Add tests for newest-match selection, traversal-order stability, unrelated package filtering, and malformed unrelated packages.

## 5. UI and QA Coverage

- [x] 5.1 Ensure `BackupMigrationFoundation` renders project bundle global blockers, warning-level member issues, unresolved references, and display-safe paths clearly.
- [x] 5.2 Add component tests for project bundle validation/result hardening states.
- [x] 5.3 Update `docs/viewer/backup-migration-foundation-qa-prompt.md` with project bundle hardening smoke checks if browser QA should cover them.
- [x] 5.4 Run browser QA or document why unit/service/API coverage is sufficient for this non-visual hardening slice.

## 6. Validation and Documentation

- [x] 6.1 Run `pnpm test`.
- [x] 6.2 Run `pnpm exec tsc --noEmit`.
- [x] 6.3 Run `pnpm build`.
- [x] 6.4 Run `OPENSPEC_TELEMETRY=0 openspec validate project-bundle-hardening --strict`.
- [x] 6.5 Update `README.md` only if user-facing project bundle behavior or prerequisites changed.
- [x] 6.6 Update `CHANGELOG.md` under `## Unreleased` for shipped hardening behavior.
- [x] 6.7 Add an issue comment to #67 summarizing the selected hardening scope and PR link when implementation begins.
