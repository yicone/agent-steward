## 1. Shared Model Semantics

- [x] 1.1 Review and tighten validation/result helper logic in `src/lib/backupMigration.ts` so all six workflows can be described through one coherent validation/result model.
- [x] 1.2 Add or tighten helper boundaries for continuation rules, terminal result semantics, recent-operation summary semantics, and safe routed degradation.
- [x] 1.3 Preserve existing workflow-specific distinctions only where a workflow-specific rule justifies different severity or terminal meaning.

## 2. Workflow UI Alignment

- [x] 2.1 Update `src/components/BackupMigrationFoundation.tsx` so validation panels, result panels, and recent-operations summaries consume the hardened shared semantics instead of ad hoc local branching.
- [x] 2.2 Ensure stale or partial routed context lands in safe input-adjacent workflow states rather than misleading confirmation or result states.
- [x] 2.3 Keep the work bounded to semantics and state behavior; do not perform a broad visual redesign.

## 3. Shell Handoff / Routed Degrade

- [x] 3.1 Update `src/components/ProjectShellClient.tsx` handoff behavior only as needed to support the hardened routed-degrade rules.
- [x] 3.2 Add or tighten tests proving incomplete or stale routed workflow context degrades safely instead of preserving false continuity.

## 4. Tests and QA

- [x] 4.1 Add or update model tests in `tests/backupMigration.test.ts` for continuation rules and severity-boundary regressions across the six workflow families.
- [x] 4.2 Add or update model tests in `tests/backupMigration.test.ts` proving existing workflow-specific terminal vocab remains valid for `validate-package`, `migration-preview`, and any other workflow with accepted custom status language.
- [x] 4.3 Add or update component tests in `tests/backupMigrationFoundation.test.tsx` for validation/result/recent-operation behavior and routed-degrade states.
- [x] 4.4 Add or update component tests in `tests/backupMigrationFoundation.test.tsx` proving non-completed degradations do not create recent-operation entries while validation-only and preview-only terminal results still can.
- [x] 4.5 Add or update shell routing tests in `tests/projectShellClient.test.ts` for stale or partial handoff behavior, including non-regression of existing workflow-specific degrade destinations.
- [x] 4.6 Update `docs/viewer/backup-migration-foundation-qa-prompt.md` only if the hardened semantics change the expected QA assertions.
  - No existing prompt assertion required a change; added dedicated QA evidence in `docs/viewer/backup-migration-validation-result-hardening-qa.md`.
- [x] 4.7 Run `pnpm test -- tests/backupMigration.test.ts tests/backupMigrationFoundation.test.tsx tests/projectShellClient.test.ts`.
- [x] 4.8 Run `pnpm exec tsc --noEmit`.
- [x] 4.9 Run `pnpm build`.
- [x] 4.10 Run `OPENSPEC_TELEMETRY=0 npx -y @fission-ai/openspec validate backup-migration-validation-result-hardening --strict`.

## 5. Post-Slice Decision

- [x] 5.1 After implementation and QA, explicitly decide whether a coherent remainder still exists under the parent hardening issue.
  - This slice completes the validation/result semantics-first hardening pass. Any routed-continuity or failure-path hardening remainder should be evaluated separately under the parent issue instead of extending this change.
- [x] 5.2 If a coherent remainder exists, track it as a new follow-up slice instead of silently continuing under an unbounded “hardening” label.
  - No automatic follow-up was created from this change. A new follow-up should be opened only if the parent issue review identifies a coherent remaining slice.
