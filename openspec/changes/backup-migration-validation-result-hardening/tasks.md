## 1. Shared Model Semantics

- [ ] 1.1 Review and tighten validation/result helper logic in `src/lib/backupMigration.ts` so all six workflows can be described through one coherent validation/result model.
- [ ] 1.2 Add or tighten helper boundaries for continuation rules, terminal result semantics, recent-operation summary semantics, and safe routed degradation.
- [ ] 1.3 Preserve existing workflow-specific distinctions only where a workflow-specific rule justifies different severity or terminal meaning.

## 2. Workflow UI Alignment

- [ ] 2.1 Update `src/components/BackupMigrationFoundation.tsx` so validation panels, result panels, and recent-operations summaries consume the hardened shared semantics instead of ad hoc local branching.
- [ ] 2.2 Ensure stale or partial routed context lands in safe input-adjacent workflow states rather than misleading confirmation or result states.
- [ ] 2.3 Keep the work bounded to semantics and state behavior; do not perform a broad visual redesign.

## 3. Shell Handoff / Routed Degrade

- [ ] 3.1 Update `src/components/ProjectShellClient.tsx` handoff behavior only as needed to support the hardened routed-degrade rules.
- [ ] 3.2 Add or tighten tests proving incomplete or stale routed workflow context degrades safely instead of preserving false continuity.

## 4. Tests and QA

- [ ] 4.1 Add or update model tests in `tests/backupMigration.test.ts` for continuation rules, severity boundaries, terminal result semantics, and recent-operation alignment.
- [ ] 4.2 Add or update component tests in `tests/backupMigrationFoundation.test.tsx` for validation/result/recent-operation behavior and routed-degrade states.
- [ ] 4.3 Add or update shell routing tests in `tests/projectShellClient.test.ts` for stale or partial handoff behavior.
- [ ] 4.4 Update `docs/viewer/backup-migration-foundation-qa-prompt.md` only if the hardened semantics change the expected QA assertions.
- [ ] 4.5 Run `pnpm test -- tests/backupMigration.test.ts tests/backupMigrationFoundation.test.tsx tests/projectShellClient.test.ts`.
- [ ] 4.6 Run `pnpm exec tsc --noEmit`.
- [ ] 4.7 Run `pnpm build`.
- [ ] 4.8 Run `OPENSPEC_TELEMETRY=0 npx -y @fission-ai/openspec validate backup-migration-validation-result-hardening --strict`.

## 5. Post-Slice Decision

- [ ] 5.1 After implementation and QA, explicitly decide whether a coherent remainder still exists under the parent hardening issue.
- [ ] 5.2 If a coherent remainder exists, track it as a new follow-up slice instead of silently continuing under an unbounded “hardening” label.
