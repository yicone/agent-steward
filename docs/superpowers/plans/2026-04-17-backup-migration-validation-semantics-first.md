# Backup / Migration Validation Semantics First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make validation, result, recent-operations, and routed-degrade semantics more consistent across all six shipped `Backup / Migration` workflows without adding new workflow scope.

**Architecture:** The existing implementation already centralizes workflow types, states, validation objects, handoff resolution, and result rendering in [`src/lib/backupMigration.ts`](/Users/tr/Workspace/agent-storage-manager/src/lib/backupMigration.ts) and [`src/components/BackupMigrationFoundation.tsx`](/Users/tr/Workspace/agent-storage-manager/src/components/BackupMigrationFoundation.tsx). This slice should harden those shared primitives first, then align UI/result behavior, then add targeted tests and QA guidance so future hardening can be judged against explicit state rules instead of ad hoc review comments.

**Tech Stack:** Next.js 14, React 18, TypeScript, Vitest, OpenSpec

---

## File Map

- [`/Users/tr/Workspace/agent-storage-manager/src/lib/backupMigration.ts`](/Users/tr/Workspace/agent-storage-manager/src/lib/backupMigration.ts)
  - canonical workflow types, states, validation types, result factories, handoff resolution, and workflow helper logic
- [`/Users/tr/Workspace/agent-storage-manager/src/components/BackupMigrationFoundation.tsx`](/Users/tr/Workspace/agent-storage-manager/src/components/BackupMigrationFoundation.tsx)
  - workflow shell UI, validation panel, confirmation/result rendering, recent-operations surface, and routed-degrade behavior
- [`/Users/tr/Workspace/agent-storage-manager/src/components/ProjectShellClient.tsx`](/Users/tr/Workspace/agent-storage-manager/src/components/ProjectShellClient.tsx)
  - workflow handoff builders and shell routing into `Backup / Migration`
- [`/Users/tr/Workspace/agent-storage-manager/tests/backupMigration.test.ts`](/Users/tr/Workspace/agent-storage-manager/tests/backupMigration.test.ts)
  - model/unit tests for workflow semantics and helper logic
- [`/Users/tr/Workspace/agent-storage-manager/tests/backupMigrationFoundation.test.tsx`](/Users/tr/Workspace/agent-storage-manager/tests/backupMigrationFoundation.test.tsx)
  - component-level rendering tests for validation, result, and routed entry states
- [`/Users/tr/Workspace/agent-storage-manager/tests/projectShellClient.test.ts`](/Users/tr/Workspace/agent-storage-manager/tests/projectShellClient.test.ts)
  - shell/handoff regression tests
- [`/Users/tr/Workspace/agent-storage-manager/docs/viewer/backup-migration-foundation-qa-prompt.md`](/Users/tr/Workspace/agent-storage-manager/docs/viewer/backup-migration-foundation-qa-prompt.md)
  - external QA prompt, should be updated only if hardened semantics change the expected QA checks
- [`/Users/tr/Workspace/agent-storage-manager/CHANGELOG.md`](/Users/tr/Workspace/agent-storage-manager/CHANGELOG.md)
  - update only if the user decides this slice is shipped/merged

## Task 1: Normalize Validation and Result Semantics in the Model Layer

**Files:**
- Modify: `/Users/tr/Workspace/agent-storage-manager/src/lib/backupMigration.ts`
- Test: `/Users/tr/Workspace/agent-storage-manager/tests/backupMigration.test.ts`

- [ ] **Step 1: Add failing model tests for the target semantics**

Add or extend tests that make these expectations explicit:

- all workflows can be described through stable validation states
- routed stale/partial context resolves to a safe state
- result helpers distinguish success, success-with-warnings, preview-only, and failed outcomes coherently
- recent-operation summary/status aligns with the primary result meaning

Suggested test targets:

- `getStepsForWorkflow()`
- `canProceedFromValidation()`
- routed workflow resolution / invalid workflow state helpers
- operation result factory helpers for all six workflows

Run:

```bash
pnpm test -- tests/backupMigration.test.ts
```

Expected: at least one new/updated case fails before implementation.

- [ ] **Step 2: Introduce explicit helper boundaries instead of one-off branching**

Refactor `src/lib/backupMigration.ts` so the semantics are concentrated in small helpers rather than spread through ad hoc UI conditionals.

Recommended helpers to add or tighten:

- a helper that maps validation status to next-step allowance
- a helper that maps workflow + terminal outcome to canonical result semantics
- a helper that decides safe routed degradation state for partial/stale context
- a helper that maps recent-operation labels/status to the same canonical result semantics

Do not add new workflow types or future-state enums unless the spec note truly requires them.

- [ ] **Step 3: Re-run focused model tests**

Run:

```bash
pnpm test -- tests/backupMigration.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit model-layer hardening**

```bash
git add src/lib/backupMigration.ts tests/backupMigration.test.ts
git commit -m "fix: align backup migration validation semantics"
```

## Task 2: Align Validation Panels, Result Panels, and Recent Operations

**Files:**
- Modify: `/Users/tr/Workspace/agent-storage-manager/src/components/BackupMigrationFoundation.tsx`
- Test: `/Users/tr/Workspace/agent-storage-manager/tests/backupMigrationFoundation.test.tsx`

- [ ] **Step 1: Add failing component tests for the desired UI semantics**

Add tests that verify:

- stale/partial routed context stays in a safe input-adjacent state rather than a misleading validation/result state
- validation panels use coherent status wording across workflows
- result panels clearly express completed / warning / failed / unresolved outcomes
- recent operations entries match the result semantics and do not drift into a separate status language

Run:

```bash
pnpm test -- tests/backupMigrationFoundation.test.tsx
```

Expected: FAIL for at least one new semantic expectation before implementation.

- [ ] **Step 2: Implement minimal UI changes to reflect the model helpers**

Update `BackupMigrationFoundation.tsx` so it consumes the hardened model helpers instead of independently interpreting workflow status.

Keep the work bounded to:

- validation panel status display
- safe routed-degrade rendering
- result panel status/summary/next-step wording
- recent operations label/reopen consistency

Do not do a broad visual redesign.

- [ ] **Step 3: Re-run focused component tests**

Run:

```bash
pnpm test -- tests/backupMigrationFoundation.test.tsx
```

Expected: PASS

- [ ] **Step 4: Commit UI semantics hardening**

```bash
git add src/components/BackupMigrationFoundation.tsx tests/backupMigrationFoundation.test.tsx
git commit -m "fix: align backup migration result semantics"
```

## Task 3: Harden Shell Handoff and Routed Degrade Behavior

**Files:**
- Modify: `/Users/tr/Workspace/agent-storage-manager/src/components/ProjectShellClient.tsx`
- Test: `/Users/tr/Workspace/agent-storage-manager/tests/projectShellClient.test.ts`

- [ ] **Step 1: Add failing shell-routing tests for stale/partial handoff behavior**

Cover cases where routed workflow context is:

- incomplete
- stale
- only partially valid
- valid enough to open the workflow, but not valid enough to skip to a deeper step

Run:

```bash
pnpm test -- tests/projectShellClient.test.ts
```

Expected: FAIL for at least one targeted routed-degrade case before implementation.

- [ ] **Step 2: Tighten handoff builders and degrade rules**

Update `ProjectShellClient.tsx` only as needed to ensure routed entry semantics match the hardened model:

- no misleading direct entry into deep states
- safe fallback into selection/configuration/validation-adjacent states
- no invented continuity once required context is lost

- [ ] **Step 3: Re-run shell-routing tests**

Run:

```bash
pnpm test -- tests/projectShellClient.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit shell-routing hardening**

```bash
git add src/components/ProjectShellClient.tsx tests/projectShellClient.test.ts
git commit -m "fix: harden backup migration routed degrade"
```

## Task 4: Refresh QA Expectations and Run Full Validation

**Files:**
- Modify if needed: `/Users/tr/Workspace/agent-storage-manager/docs/viewer/backup-migration-foundation-qa-prompt.md`
- Verify: `/Users/tr/Workspace/agent-storage-manager/docs/superpowers/specs/2026-04-17-backup-migration-validation-semantics-first-design.md`

- [ ] **Step 1: Update the QA prompt only if the expected semantics changed**

If the implementation changes the wording or expected behaviors for:

- routed degrade
- result semantics
- recent-operations interpretation
- validation continuation rules

then update the QA prompt so external QA can verify the hardened rules explicitly.

- [ ] **Step 2: Run targeted validation suite**

Run:

```bash
pnpm test -- tests/backupMigration.test.ts tests/backupMigrationFoundation.test.tsx tests/projectShellClient.test.ts
pnpm exec tsc --noEmit
pnpm build
OPENSPEC_TELEMETRY=0 npx -y @fission-ai/openspec validate backup-migration --strict
```

Expected:

- tests PASS
- TypeScript PASS
- build PASS
- OpenSpec validation PASS

- [ ] **Step 3: Record whether a second hardening slice is still warranted**

Before closing the parent hardening issue, explicitly answer:

- does a coherent remainder still exist?
- if yes, is it `result continuity first`, `failure-path hardening`, or something else?

Do not silently keep broad “hardening” work open without naming the next slice.

- [ ] **Step 4: Commit QA/prompt/validation follow-up**

```bash
git add docs/viewer/backup-migration-foundation-qa-prompt.md
git commit -m "docs: update backup migration hardening qa guidance"
```

Only include this commit if the QA prompt actually changed.
