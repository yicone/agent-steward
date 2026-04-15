# Bulk Session Backup Tasks

## 1. Workflow Model

- [x] 1.1 Add `bulk-session-backup` to backup workflow types, labels, descriptors, and step definitions.
- [x] 1.2 Define bulk selection, per-session validation, per-session execution result, and aggregate result types.
- [x] 1.3 Add helper functions for bulk validation derivation, aggregate status derivation, and recent-operation creation.
- [x] 1.4 Ensure existing `session-backup`, `import-backup`, and `validate-package` model helpers remain backward compatible.

## 2. Selection and Handoff

- [x] 2.1 Add bounded session selection state for the bulk workflow.
- [x] 2.2 Support direct `Backup / Migration` entry into bulk selection state with no invented preselection.
- [x] 2.3 Support `Sessions -> Backup / Migration` handoff with concrete selected session IDs when available.
- [x] 2.4 Support `Project Overview -> Backup / Migration` handoff to bulk workflow without preselected sessions unless object references exist.
- [x] 2.5 Show stale or missing routed session references as unresolved selection items instead of silently dropping them.

## 3. Validation and Confirmation

- [x] 3.1 Validate canonical record availability per selected session.
- [x] 3.2 Validate provenance and source-copy readiness per selected session.
- [x] 3.3 Block confirmation when any selected session has block-level validation failures.
- [x] 3.4 Preserve warning-level validation items through confirmation.
- [x] 3.5 Render batch confirmation with selected count, source-copy configuration, warning count, and execution semantics.

## 4. Execution and Results

- [x] 4.1 Execute eligible selected sessions through existing single-session backup behavior.
- [x] 4.2 Record per-session success, warning, and failure results.
- [x] 4.3 Derive aggregate batch status from per-session outcomes.
- [x] 4.4 Render batch result detail with aggregate status, session count, per-session rows, backup IDs when available, and actionable errors.
- [x] 4.5 Keep full-failure and partial-failure result copy explicit; do not show generic success for partial results.

## 5. Recent Operations

- [x] 5.1 Add compact recent-operation entries for completed bulk session backup runs.
- [x] 5.2 Include workflow type, timestamp, aggregate status, and session count in the recent-operation entry.
- [x] 5.3 Route from a bulk recent-operation entry back to batch result detail.
- [x] 5.4 Ensure bulk execution does not create one recent-operation entry per selected session.

## 6. Tests and QA

- [x] 6.1 Add model tests for bulk workflow descriptors, validation derivation, aggregate result derivation, and recent-operation creation.
- [x] 6.2 Add component tests for no-selection, selected, mixed-warning, blocked, confirmation, success, partial-failure, and full-failure states.
- [x] 6.3 Add shell routing tests for `Sessions` and `Project Overview` handoff into the bulk workflow.
- [x] 6.4 Add regression tests proving existing single-session backup, import backup, and validate package workflows still work.
- [x] 6.5 Prepare an external QA prompt covering bulk selection, mixed eligibility, source-copy warnings, blocked validation, partial failure, and recent operations.

## 7. Documentation and Validation

- [x] 7.1 Update `README.md` if user-facing Backup / Migration behavior changes.
- [x] 7.2 Update `CHANGELOG.md` under `## Unreleased` when implementation ships.
- [x] 7.3 Run targeted tests for backup-migration model helpers, `BackupMigrationFoundation`, and shell routing.
- [x] 7.4 Run `pnpm test`, `pnpm build`, and `OPENSPEC_TELEMETRY=0 openspec validate bulk-session-backup --strict`.
