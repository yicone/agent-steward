# QA Report: backup-migration-foundation

**Date:** 2026-04-13  
**Branch:** `feat/backup-migration-foundation`  
**Repository:** `<repo-path>`

---

## Verdict

**Pass with concerns**

## Environment

- **OS**: macOS
- **Browser**: headed Playwright Chromium session
- **Local URL**: `http://localhost:3000`
- **Targeted tests**: `pnpm test -- backupMigration.test.ts backupMigrationFoundation.test.tsx projectShellClient.test.ts sessionBackupsRoute.test.ts`
- **Test result**: **65/65 passed**

## What Passed

### Top-level nav
- `Project Overview`, `Sessions`, `Assets`, `Analysis`, and `Backup / Migration` are present.

### Backup / Migration is no longer a placeholder
- The page renders a workflow-first selector with:
  - workflow choices
  - context summary
  - validation-oriented steps
  - result / recent operations region

### Bounded messaging
- Live copy clearly excludes:
  - bulk backup
  - migration execution
  - project bundle packaging
  - vendor-runtime restore
  - cloud sync

### Workflow selector / idle state
- Top-level entry lands in an idle selector.
- Only these workflows are exposed:
  - `Session Backup`
  - `Import Backup`
  - `Validate Package`

### Session backup workflow
- Verified live:
  - selection
  - configuration
  - validation
  - confirmation
  - execution
  - result
- `Include source copy` is explicit opt-in.
- Confirmation state includes preservation/boundary copy before execution.
- Recent operations appears as a compact secondary strip after a terminal result.

### Import backup workflow
- Verified live from `Project Overview` handoff.
- Opens with compact routed cue.
- Validation is shown before confirmation/execution.
- Confirmation/result copy correctly says restore is **product-readable only** and not vendor-runtime reopen.

### Validate package workflow
- Verified live from `Project Overview` handoff.
- Acts as validation-only workflow and ends in a workflow result state.
- Result is not presented as a generic inspector/editor.

### Routed handoffs
- **From Project Overview**
  - `Import backup package` routes correctly into `Import Backup`.
  - `Validate backup package` routes correctly into `Validate Package`.
- **From Assets**
  - Route preserves bounded asset cue and does **not** embed the full Assets surface.
  - Destination stays workflow-first.
- **From Analysis**
  - Route preserves issue/preservation context and keeps workflow identity primary.
  - Lands in `Session Backup` with compact origin cue.
- **Stale context clearing**
  - Leaving `Backup / Migration` and returning via top-level nav resets to clean idle selector as expected.

### Sessions regression
- `Sessions` shell still loads.
- Code-level regression check confirms both remain present:
  - `Open in Backup / Migration`
  - direct `Back Up Session`

## Blocking Issues

**[none confirmed]**

## Non-blocking Concerns

### Import validation does not reject bad package IDs before execution
**Steps**
1. Open `Project Overview`
2. Click `Import backup package`
3. Enter a fake package ID like `bad-package-id`
4. Click `Validate`

**Expected**
- Validation-first flow should surface unsupported/malformed/not-found package diagnostics before execution, or at least mark the package invalid.

**Actual**
- Validation returned `valid-with-warnings`.
- The package only failed after `Execute` with:
  `Import failed: The requested backup package could not be found in the managed backup store.`

**Assessment**
- This weakens the intended validation-first boundary.
- Logged as a **strong concern**.

### `Validate Package` invalid state was not reachable through normal UI
**Expected**
- Clear user-reachable distinction among:
  - valid
  - valid with warnings
  - invalid

**Actual**
- Live flow showed `valid-with-warnings`.
- The normal UI disables validation when no package is entered, so an explicit invalid workflow result was not observable through standard interaction.

**Assessment**
- The model supports invalid states structurally, but the UI path to demonstrate them appears incomplete.

### Sessions-to-backup routed handoff not fully live-verified
**Actual environment**
- `Sessions` loaded, but the current source view showed `Items: 0`, so I did not have a selectable conversation to drive the route live.

**Assessment**
- Code and tests strongly indicate the route is wired, but this specific live handoff remains **partially unverified** in this environment.

## Regression Notes

### Sessions
- Shell still works.
- Direct session backup action still exists in code.
- No live-selected session was available to fully validate routed handoff.

### Assets
- Assets routing into `Backup / Migration` worked and remained bounded.
- Assets page role stayed focused on asset context, not backup execution.

### Analysis
- Analysis routing into `Backup / Migration` worked.
- Analysis remained route-only and did not execute backup behavior inline.

### Shell routing
- Top-level navigation behaved correctly.
- Returning to `Backup / Migration` after leaving cleared stale routed context.

## Evidence

- **Screenshot**: `.playwright-cli/page-2026-04-13T14-15-27-866Z.png`

## Suggested Follow-up Tests

### Live session route
- Re-run with a workspace/source that has at least one selectable session and verify:
  - `Open in Backup / Migration`
  - prefilled session context
  - origin cue
  - direct `Back Up Session` still works

### Validation hardening
- Add QA cases for:
  - nonexistent backup ID
  - malformed backup ID
  - unsupported schema
  - provenance failure
- These should ideally fail during validation, not only at execution.

### Explicit invalid-state UX
- Verify `Validate Package` exposes a user-reachable invalid result state.

### Recent operations persistence/ordering
- Run multiple workflows in one session and confirm ordering, timestamps, and status labels remain compact and secondary.

---

## Summary

**Overall status: Pass with concerns.**

The `Backup / Migration` surface is correctly bounded and workflow-first, and the routed handoffs from `Project Overview`, `Assets`, and `Analysis` behave as intended. The main concern is that `Import Backup` currently allows obviously bad package IDs to pass validation and only fail at execution, which undercuts the validation-first expectation.
