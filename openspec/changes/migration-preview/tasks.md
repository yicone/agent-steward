## 1. Workflow Model

- [x] 1.1 Add `migration-preview` to backup workflow types, labels, descriptors, and step definitions.
- [x] 1.2 Define migration preview source context, target context, and preview scope types.
- [x] 1.3 Define preview item, closed classification enum, and preview-specific aggregate result status types.
- [x] 1.4 Add helper functions for preview validation, item classification, aggregate count derivation, and recent-operation creation.
- [x] 1.5 Ensure existing backup/import/validate/bulk workflow helpers remain backward compatible.

## 2. Selection and Configuration

- [x] 2.1 Add migration preview selection/configuration state to `BackupMigrationFoundation`.
- [x] 2.2 Require explicit source context before preview can proceed.
- [x] 2.3 Require explicit target context before preview can proceed.
- [x] 2.4 Support bounded preview scope choices for sessions, reusable context assets, and project-context subset.
- [x] 2.5 Keep missing source, target, and scope fields visible and user-editable.
- [x] 2.6 Update idle-state description copy in `BackupMigrationFoundation` to include migration preview and remove the migration-preview exclusion statement.

## 3. Preview Validation and Result

- [x] 3.1 Validate source context, target context, canonical source data availability, and metadata completeness before preview result.
- [x] 3.2 Classify preview items as `portable`, `degraded`, `unsupported`, or `blocked`.
- [x] 3.3 Render aggregate counts for all preview classifications.
- [x] 3.4 Render item-level preview detail with explanations.
- [x] 3.5 Ensure result copy says preview-only and never offers migration apply.
- [x] 3.6 Offer repair or inspection routes for degraded, unsupported, or blocked items when relevant.

## 4. Routed Handoff

- [x] 4.1 Extend backup-migration handoff types to carry migration preview source, target, and scope context after task 1.1 adds `migration-preview` to `BackupWorkflowType`.
- [x] 4.2 Add `Project Overview -> Migration Preview` route that opens preview selection/configuration without invented context.
- [x] 4.3 Add `Assets -> Migration Preview` route that may prefill explicit asset source/scope context only.
- [x] 4.4 Add `Analysis -> Migration Preview` route that preserves issue context but does not infer missing source or target.
- [x] 4.5 Ensure stale or incomplete preview handoff degrades to selection/configuration instead of broken result state.

## 5. Recent Operations

- [x] 5.1 Record completed migration previews as compact recent-operation entries.
- [x] 5.2 Include workflow type, timestamp, aggregate preview status, and selected scope in recent operations.
- [x] 5.3 Route from a migration-preview recent operation back to preview result detail.
- [x] 5.4 Ensure recent-operation copy does not claim migration was applied.

## 6. Tests and QA

- [x] 6.1 Add model tests for migration preview workflow descriptors, validation, classification, aggregate counts, and recent-operation summary.
- [x] 6.2 Add component tests for missing source, missing target, valid preview, degraded preview, unsupported preview, blocked preview, and result states.
- [x] 6.3 Add shell routing tests for overview, assets, and analysis handoff into migration preview.
- [x] 6.4 Add regression tests proving existing backup/import/validate/bulk workflows still work.
- [x] 6.5 Prepare an external QA prompt covering preview-only boundary, source/target/scope configuration, classification results, routed handoff, and recent operations.

## 7. Documentation and Validation

- [x] 7.1 Update `README.md` if user-facing Backup / Migration behavior changes.
- [x] 7.2 Update `CHANGELOG.md` under `## Unreleased` when implementation ships.
- [x] 7.3 Run targeted tests for backup-migration model helpers, `BackupMigrationFoundation`, and shell routing.
- [x] 7.4 Run `pnpm test`, `pnpm build`, and `OPENSPEC_TELEMETRY=0 openspec validate migration-preview --strict`.
- [x] 7.5 Update `docs/viewer/backup-migration-foundation-qa-prompt.md` to include migration preview smoke checks and remove the migration-preview exclusion assertion.
