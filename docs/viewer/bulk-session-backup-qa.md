# QA Report: bulk-session-backup

**Date:** 2026-04-15  
**Branch:** `feat/bulk-session-backup`  
**Repository:** `agent-storage-manager`

---

## Verdict

**Fail due runtime instability during browser verification**

## Environment

- **OS**: macOS
- **Local URL**: `http://127.0.0.1:3000`
- **Runner**: external QA agent using browser automation
- **Prompt**: `docs/viewer/backup-migration-foundation-qa-prompt.md`

## Triage

Classification: **needs-confirmation**

The observed blocker is a dev/runtime instability rather than a confirmed
`bulk-session-backup` product logic failure. The QA agent verified several
expected states before the app entered an unrecoverable dev-server state with a
missing Next.js chunk. A clean-server retest is required before this can be
classified as either a product blocker or an environment-only failure.

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
