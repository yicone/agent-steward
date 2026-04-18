## 1. API Boundary Hardening

- [ ] 1.1 Add or confirm structured `400` handling for invalid JSON and unsupported `/api/project-bundles` modes.
- [ ] 1.2 Require explicit `selection` and `configuration` for `mode: "generate"` and prevent default-selection generation bypass.
- [ ] 1.3 Ensure `mode: "validate"` remains side-effect free and does not write bundle files.
- [ ] 1.4 Add route-level tests for invalid mode, missing generate input, validate-only behavior, and structured error payloads.

## 2. Validation Severity and Output Root Handling

- [ ] 2.1 Harden project bundle output-root readiness checks for missing roots, existing directories, invalid targets, and unwritable ancestors.
- [ ] 2.2 Represent output-root failures as global blocking validation items, not member-category inventory status.
- [ ] 2.3 Preserve warning-level handling for selected sessions that lack existing backup packages.
- [ ] 2.4 Ensure structural preconditions such as empty composition, empty bundle name, and unreadable package metadata block generation.
- [ ] 2.5 Add service tests for output-root blockers, structural blockers, missing-package warnings, and validation summary counts.

## 3. Safe Generation Result Shape

- [ ] 3.1 Redact or convert client-facing bundle file locations to display-safe paths.
- [ ] 3.2 Avoid returning raw exception details, usernames, temporary paths, or host-specific filesystem diagnostics to API clients.
- [ ] 3.3 Return a summary-shaped generation response instead of echoing the full bundle document when result UI fields are sufficient.
- [ ] 3.4 Preserve `missing-package` or unresolved member references in generated metadata without silently omitting selected sessions.
- [ ] 3.5 Add tests for generation response shape, path redaction, unresolved references, and no raw path leakage in rendered results.

## 4. Session Backup Reuse Determinism

- [ ] 4.1 Match existing backup packages by explicit session identity: `source`, `sessionId`, and optional `rootId`.
- [ ] 4.2 Select the newest matching backup package by manifest creation timestamp when multiple packages match.
- [ ] 4.3 Avoid reading unrelated backup payload records when manifest metadata already excludes a package from the requested sessions.
- [ ] 4.4 Treat malformed unrelated backup packages as ignored candidates rather than project bundle validation failures.
- [ ] 4.5 Add tests for newest-match selection, traversal-order stability, unrelated package filtering, and malformed unrelated packages.

## 5. UI and QA Coverage

- [ ] 5.1 Ensure `BackupMigrationFoundation` renders project bundle global blockers, warning-level member issues, unresolved references, and display-safe paths clearly.
- [ ] 5.2 Add component tests for project bundle validation/result hardening states.
- [ ] 5.3 Update `docs/viewer/backup-migration-foundation-qa-prompt.md` with project bundle hardening smoke checks if browser QA should cover them.
- [ ] 5.4 Run browser QA or document why unit/service/API coverage is sufficient for this non-visual hardening slice.

## 6. Validation and Documentation

- [ ] 6.1 Run `pnpm test`.
- [ ] 6.2 Run `pnpm exec tsc --noEmit`.
- [ ] 6.3 Run `pnpm build`.
- [ ] 6.4 Run `OPENSPEC_TELEMETRY=0 openspec validate project-bundle-hardening --strict`.
- [ ] 6.5 Update `README.md` only if user-facing project bundle behavior or prerequisites changed.
- [ ] 6.6 Update `CHANGELOG.md` under `## Unreleased` for shipped hardening behavior.
- [ ] 6.7 Add an issue comment to #67 summarizing the selected hardening scope and PR link when implementation begins.
