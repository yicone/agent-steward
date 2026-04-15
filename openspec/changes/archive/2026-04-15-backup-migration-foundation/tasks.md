## 1. Backup-Migration Workflow Model

- [x] 1.1 Define bounded workflow types (`session-backup`, `import-backup`, `validate-package`), workflow state enum (`idle`, `selection`, `configuration`, `validation`, `confirmation`, `execution`, `result`, `failed`), selected-object model, validation-result model, operation-result model, and recent-operations model.
- [x] 1.2 Add helper functions for workflow state transitions, validation derivation, operation-result creation, recent-operations management, and handoff-to-workflow mapping.

## 2. Backup-Migration Handoff Model

- [x] 2.1 Define `BackupMigrationHandoff` type with workflow context, object context, issue context, and return context fields.
- [x] 2.2 Add shell-level handoff builders for `Sessions -> Backup / Migration`, `Analysis -> Backup / Migration`, `Assets -> Backup / Migration`, and `Project Overview -> Backup / Migration`.
- [x] 2.3 Add handoff consumption logic that maps incoming handoff to the correct workflow type, prefills selections, and degrades safely when context is stale.

## 3. Backup-Migration Foundation Surface

- [x] 3.1 Replace the `Backup / Migration` placeholder surface with a bounded `BackupMigrationFoundation` component.
- [x] 3.2 Render the workflow selector in idle state with workflow list, compact descriptions, and origin cue when routed.
- [x] 3.3 Render the workflow context summary showing current workflow type, selected objects, and current state.
- [x] 3.4 Render the selection/intake surface for `session-backup`, `import-backup`, and `validate-package` workflows with eligibility cues.
- [x] 3.5 Render the validation panel with schema/integrity/provenance check results, warning/block distinction, and route to correction.
- [x] 3.6 Render the workflow steps indicator showing current step, prior steps, and available next action.
- [x] 3.7 Render the operation result for completed workflows with result identity, package summary, status, and next-step routes.
- [x] 3.8 Render the recent-operations module showing completed workflow history with compact identity, type, timestamp, and status.

## 4. Workflow Implementations

- [x] 4.1 Implement `session-backup` workflow: selection -> configuration (`source backup` opt-in) -> validation -> confirmation -> execution (existing API) -> result.
- [x] 4.2 Implement `import-backup` workflow: package selection -> validation (schema/integrity/provenance) -> confirmation -> execution (existing import API) -> result.
- [x] 4.3 Implement `validate-package` workflow: package selection -> validation -> result (no execution).

## 5. Shell Integration and Routed Handoff

- [x] 5.1 Wire `BackupMigrationFoundation` into `ProjectShellClient`, replacing the `Backup / Migration` placeholder surface.
- [x] 5.2 Update existing backup-route handlers from `Assets` and `Analysis` to build proper `BackupMigrationHandoff` instead of placeholder cue state.
- [x] 5.3 Add `Project Overview` and `Sessions` handoff builders for backup/import/validation entry.
- [x] 5.4 Wire overview and routed action entry points to open specific backup/migration workflows.
- [x] 5.5 Ensure normal top-level navigation clears stale backup-migration handoff context.

## 6. Preservation and Risk Warnings

- [x] 6.1 Add explicit preservation warnings at confirmation gates for backup and import workflows.
- [x] 6.2 Add explicit `no vendor-runtime restore` messaging in import result and validation result copy.
- [x] 6.3 Ensure result states show explicit success, warning, or failure semantics rather than generic success.

## 7. Tests and QA

- [x] 7.1 Add unit tests for workflow model helpers: state transitions, validation derivation, result creation, and recent-operations management.
- [x] 7.2 Add unit tests for handoff builders and handoff-to-workflow mapping including stale/invalid context degradation.
- [x] 7.3 Add component tests for `BackupMigrationFoundation` covering idle, selection, validation, result, routed-in, empty, and failed/blocked states.
- [x] 7.4 Add shell tests for route builders and cross-page navigation into and out of `Backup / Migration`.
- [x] 7.5 Prepare an external QA prompt covering `Backup / Migration` foundation smoke flows, routed handoff flows, and boundary messaging.

## 8. Documentation and Validation

- [x] 8.1 Update `README.md` and `CHANGELOG.md` when implementation ships.
- [x] 8.2 Run targeted tests for backup-migration model helpers, `BackupMigrationFoundation` component, and project shell routing.
- [x] 8.3 Run `pnpm test`, `pnpm build`, and `openspec validate backup-migration-foundation --strict`.
