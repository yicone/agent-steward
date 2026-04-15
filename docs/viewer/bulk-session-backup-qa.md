# QA Report: bulk-session-backup

**Date:** 2026-04-15
**Branch:** `feat/bulk-session-backup`
**Repository:** `agent-storage-manager`

---

## Current Verdict

**Pass with concerns**

The initial failed browser run was retested in prod mode after a clean build and
is no longer considered a confirmed product blocker.

## Initial Verdict

**Fail due runtime instability during browser verification**

## Environment

- **OS**: macOS
- **Local URL**: `http://127.0.0.1:3000`
- **Runner**: external QA agent using browser automation
- **Prompt**: `docs/viewer/backup-migration-foundation-qa-prompt.md`

## Triage

Classification: **resolved by clean prod-mode smoke retest**

The observed blocker is a dev/runtime instability rather than a confirmed
`bulk-session-backup` product logic failure. The QA agent verified several
expected states before the app entered an unrecoverable dev-server state with a
missing Next.js chunk. A clean-server retest is required before this can be
classified as either a product blocker or an environment-only failure.

## Clean Prod-mode Retest

**Date:** 2026-04-15
**Environment:** macOS, prod build using `pnpm build && pnpm start`,
`http://localhost:3000`

Verdict: **Pass with concerns**

### Primary Smoke Checks

- Top-level nav rendered:
  - `Project Overview`
  - `Sessions`
  - `Assets`
  - `Analysis`
  - `Backup / Migration`
- `Backup / Migration` was no longer a placeholder.
- Workflow-first structure was present:
  - selector
  - workflow spine
  - routed context
  - result / recent operations
- Boundary copy excluded:
  - migration preview
  - project bundle packaging
  - vendor-runtime restore
  - cloud sync

### Workflow Selector / Idle Checks

- Idle state rendered the workflow selector with no routed context.
- Exactly four workflows were shown:
  - `Session Backup`
  - `Bulk Session Backup`
  - `Import Backup`
  - `Validate Package`
- No migration preview or project bundle workflows were exposed.

### Bulk Session Backup Workflow Checks

- Selection:
  - Empty state showed `No sessions selected yet.`
  - Copy said the workflow does not invent a session set.
  - `Add session` was disabled until session ID and source were filled.
  - `Continue to Configuration` was disabled until at least one session was selected.
- Multi-select:
  - QA added two sessions: one real Codex session and one fake Windsurf session.
  - Both rows showed source/root context and `Remove` actions.
  - Selected count updated to 2.
- Configuration:
  - Source-copy opt-in was shown per session.
  - Windsurf source-copy was disabled with explanation.
  - `Back` and `Validate` actions were present.
- Validation:
  - Overall validation showed `valid`.
  - Per-session canonical record and provenance checks were shown.
  - Per-session eligibility showed both selected sessions as `valid`.
  - `Proceed to Confirmation` was enabled.
- Confirmation:
  - Selected count was 2.
  - Warning count was 0.
  - Execution was described as sequential fan-out.
  - Source-copy summary and preservation notice were visible.
  - Copy stated the workflow does not create a batch backend API.
- Execution and result:
  - Both selected sessions failed in this environment.
  - Aggregate status was `failed`.
  - Per-session rows showed actionable errors.
  - Backup IDs were absent for failed rows, as expected.
  - Timestamp and `No vendor-runtime restore` boundary copy were present.

### Recent Operations Checks

- Compact recent-operations region appeared after execution.
- The entry showed workflow type, status, timestamp, summary, and session count.
- The bulk run produced one batch entry, not one entry per selected session.
- The region read as a secondary result strip, not a persistent audit console.

### Routed Handoff Checks

- `Sessions -> Backup / Migration` single-session route opened the session
  backup workflow with source/root/session prefilled and routed origin cue.
- `Assets -> Backup / Migration` preserved bounded asset context and showed the
  workflow selector.
- `Analysis -> Backup / Migration` preserved issue/preservation context and
  opened session backup.
- `Project Overview -> Session Backup` opened session backup selection.
- `Project Overview -> Bulk Session Backup` opened bulk selection with empty
  explicit selection.
- `Project Overview -> Browse backup workflows` opened idle workflow selector.
- Navigating away cleared routed context.

### Regression Checks

- `Sessions` still exposed direct `Back Up Session`.
- `Sessions`, `Assets`, and `Analysis` continued to work in their existing
  roles.
- Assets/Analysis routes into `Backup / Migration` did not break their source
  pages.
- No migration preview or project bundle execution was exposed through buttons
  or copy.

### Remaining Non-blocking Concerns

- `favicon.ico` returned 404.
- `/api/session-backups` returned 502 in prod mode without full backend runtime;
  the workflow degraded with actionable result errors.
- `/api/conversations/antigravity/...` returned 502 when Antigravity LS was not
  running; the session viewer showed an error message.
- The QA prompt previously said `batch backup` in boundary checks. This was
  reworded to distinguish unscoped/implicit batch backup from the valid bounded
  `Bulk Session Backup` workflow.

### Suggested Follow-up Tests

- Successful bulk execution with a smaller backup-eligible Codex session.
- Partial failure batch with one eligible and one ineligible session to verify
  aggregate `success-with-warnings`.
- Blocked validation case to verify confirmation is blocked and `Remove blocked
  selections` is available.
- Dedicated import backup and validate package workflow pass.
- Sessions multi-selection handoff after the `Sessions` UI gains real
  multi-select.

## What Passed Before Failure

- Top-level shell rendered with:
  - `Project Overview`
  - `Sessions`
  - `Assets`
  - `Analysis`
  - `Backup / Migration`
- `Backup / Migration` idle state rendered as a workflow-first surface.
- Idle selector showed only:
  - `Session Backup`
  - `Bulk Session Backup`
  - `Import Backup`
  - `Validate Package`
- Boundary copy correctly excluded:
  - migration preview
  - project bundle packaging
  - vendor-runtime restore
  - cloud sync
- `Bulk Session Backup` entry rendered at least once.
- Bulk selection state started empty and explicit.
- Empty bulk state said it does not invent a session set.
- `Continue to Configuration` was disabled with no selections.
- `Sessions` still exposed the existing direct `Back Up Session` action.

## Blocking Issues Observed

### Runtime instability blocked QA completion

Steps:

1. Open app at `http://127.0.0.1:3000`.
2. Navigate through `Project Overview`, `Sessions`, and `Backup / Migration`.
3. Interact with session detail and route controls.

Expected:

- App remains stable.
- Shell surface changes consistently.
- Routed handoffs remain testable.

Actual:

- The app entered an unrecoverable dev/runtime state.
- Console showed:
  - `Error: Cannot find module './522.js'`
  - full reload / Fast Refresh unrecoverable error
  - subsequent `_next/static/...` 404s
  - API `502` errors on conversation fetch
- After this, navigation state became inconsistent and reliable QA could not
  continue.

Impact:

- Prevented end-to-end verification of:
  - session-routed handoff into `Backup / Migration`
  - bulk validation / confirmation / execution / result
  - recent operations behavior
  - assets / analysis routed handoffs

### Surface/nav desync after runtime failure

Steps:

1. From `Project Overview`, click `Start bulk session backup`.
2. Or click top nav `Backup / Migration`.

Expected:

- `Current Surface` and main content switch to `Backup / Migration`.

Actual:

- In the broken runtime state, the nav/button could become active while
  `Current Surface` still displayed `Project Overview`.
- Main content remained overview content.

Impact:

- Workflow routing could not be trusted after the runtime error occurred.

## Non-blocking Concerns

### favicon 404

`favicon.ico` returned `404`. This is unrelated to workflow behavior but adds
console noise.

### QA confidence limited by dev-only failure mode

The QA agent saw correct idle workflow copy and empty bulk selection state, but
could not complete the full checklist after the runtime failure.

## Regression Notes

### Sessions

- Direct `Back Up Session` remained present.
- Session viewer loaded enough to show action controls before runtime
  instability.

### Backup / Migration

- Idle selector and bounded copy looked correct.
- Bulk empty selection state looked correct when reachable.

### Assets / Analysis

- Not fully verified in live routed flow because runtime failure blocked
  trustworthy completion.

### Shell routing

- Initially looked correct.
- Became unreliable after the module/chunk failure.

## Required Retest

Run a clean browser QA pass after resetting the local server:

1. Stop the current dev server.
2. Remove stale `.next`.
3. Restart `pnpm dev`, or run a prod-mode smoke using `pnpm build` followed by
   `pnpm start`.
4. Re-run the same QA checklist.

Priority retest areas:

- `Project Overview -> Backup / Migration` quick routes:
  - `Start session backup`
  - `Start bulk session backup`
  - `Import backup package`
  - `Validate backup package`
  - `Browse backup workflows`
- `Sessions -> Backup / Migration`
- `Assets -> Backup / Migration`
- `Analysis -> Backup / Migration`
- bulk workflow deep checks:
  - one valid + one invalid selection for blocked validation
  - remove blocked selections and continue
  - multi-valid batch
  - partial failure batch
  - compact recent operations batch entry

## Status Summary

Current QA status is **failed due runtime instability**. The failure is not yet
confirmed as a product logic defect. PR readiness should wait for a clean-server
retest or an explicit decision to accept this as environment-only.
