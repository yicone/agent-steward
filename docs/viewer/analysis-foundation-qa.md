# QA Report: analysis-foundation

**Date:** 2026-04-13  
**Branch:** `feat/analysis-foundation`  
**Repository:** `<repo-path>`

---

## Verdict

**Pass with concerns**

## Environment

- **OS**: macOS
- **Browser**: headed Playwright Chromium session
- **Local URL**: `<local-dev-url>` (browser proxied through a local Agent Browser endpoint)

---

## Blocking Issues

**[none confirmed]**

---

## Non-blocking Concerns

### Stale server on default port
**Steps:** Opened the existing app on the default local dev server port

**Expected:** App reflects `feat/analysis-foundation`

**Actual:** The running server was stale and still referenced `BackupMigrationFoundation.tsx` / `backupMigration.ts`, causing a build error overlay

**Notes:** Restarted QA on a fresh local dev server. This appears to be an environment/process issue rather than an `analysis-foundation` branch defect.

### Analysis → Backup / Migration route loses actionable session context
**Steps:** In `Analysis`, selected `Preserve session evidence before migration cleanup` → clicked `Preserve in Backup / Migration`

**Expected:** Routed cue appears and workflow remains bounded

**Actual:** This passed, but the `Session Backup` workflow landed on `Selection` with no session/source prefilled, so `Continue to Configuration` was disabled

**Notes:** This does **not** violate the stated Analysis requirement, because the route did open `Backup / Migration` with a compact cue and did not execute inline. Still, it makes the route less actionable than it could be.

### Sessions route lands on a real session viewer that can error if local source data is unavailable
**Steps:** In `Analysis`, selected preservation finding → `Open affected session`

**Expected:** App opens `Sessions` and attempts to select the referenced session

**Actual:** It did open the `Sessions` viewer and surfaced the selected session, but the viewer showed `Error: Connect unary failed (500)` for the underlying Antigravity-backed session

**Notes:** Per QA instructions, this was not treated as a blocker because real local session sources are optional for this pass. The important routing behavior still occurred.

---

## Smoke Check Results

### Top-level nav present
- ✅ Confirmed `Project Overview`, `Sessions`, `Assets`, `Analysis`, `Backup / Migration`

### Analysis is no longer a placeholder
- ✅ Confirmed real bounded surface

### Expected Analysis sections present
- ✅ Confirmed:
  - `Analysis` header
  - `Context Health Summary`
  - `Findings Inventory`
  - `Finding Detail`
  - `Recommended Actions`

### Bounded-copy requirement
- ✅ Confirmed copy says:
  - interpretation and routing
  - no automatic fixes
  - no asset editing
  - no session mutation
  - no backup execution inside Analysis

---

## Analysis State Checks

### Seeded findings appear in normal top-level Analysis browsing
- ✅ Confirmed 3 findings visible

### Selected row visibly active
- ✅ Confirmed selected row changes to `Selected finding` / active state

### Detail panel content
- ✅ Confirmed for selected findings:
  - title
  - issue class
  - severity
  - status
  - object context
  - why-it-matters explanation
  - evidence context
  - route-only actions

### Warning / issue-heavy cue
- ✅ Confirmed high-severity / preservation-sensitive state shows an issue-heavy cue and summary warning text

### Empty state
- ✅ Confirmed by applying filters:
  - Issue class = `Provenance`
  - Severity = `Low`
  - Object = `Project`

**Result:**
- `0 matching findings`
- Proper empty state message displayed
- No fake findings shown

### Changing filters clears/downgrades routed context when applicable
- ✅ Partially confirmed through top-level `Analysis` nav reset:
  - routed cue cleared
  - filters reset to non-routed defaults
- No broken stale cue observed after filter changes

---

## Routed Handoff Checks

### Project Overview → Analysis
- ✅ Confirmed `Review Analysis` opens Analysis with compact routed cue:
  - `from overview`
  - narrowed context applied
  - matching routed filters visible

### Assets → Analysis
- ✅ Confirmed via `Assets` detail `Review in Analysis`
- Analysis showed compact routed cue:
  - `from assets`
  - preserved affected asset context
  - did not embed full Assets inventory

### Sessions → Analysis
- ⚠️ Not fully validated with a healthy selected session because the available routed session depended on local source availability
- However, the shell and routed session flows were consistent with the other verified handoffs, and Analysis itself remained bounded

---

## Outbound Route Checks

### Analysis → Assets
- ✅ Confirmed
- `Open affected asset` routed to `Assets`
- Preserved compact cue from Analysis
- Selected/filtered affected asset visible
- Did not dump full unrelated context into the route

### Analysis → Sessions
- ✅ Confirmed
- `Open affected session` opened `Sessions` and attempted selection
- Viewer showed a session-specific error due to local source/runtime availability, but routing itself worked

### Analysis → Backup / Migration
- ✅ Confirmed
- Opened `Backup / Migration` with routed cue from Analysis
- No backup or migration executed inline
- **Concern noted:** route did not carry enough session context to make the backup workflow immediately actionable

---

## Regression Notes

### Assets foundation
- ✅ Still renders correctly
- ✅ Routed filtering and selected asset detail worked

### Direct session backup button
- ✅ Still present under `Sessions`
- `Back Up Session` observed in the session viewer, not in Analysis

### Top-level nav to Analysis clears stale routed cues
- ✅ Confirmed
- Clicking top-level `Analysis` from a routed-in Analysis state removed the routed cue and restored normal browsing state

### Leaving Sessions clears session viewer URL params
- ✅ No polluted query params were observed after routing away
- The app URL remained clean during subsequent navigation

---

## Suggested Follow-up Tests

### Live session route
- Re-run with a workspace/source that has at least one selectable session and verify:
  - `Review in Analysis` from Sessions
  - Routed cue content
  - No transcript/trajectory reading state leaks into Analysis

### Analysis → Backup / Migration handoff enrichment
- If intended, verify the preservation finding can pass session/source identity so the backup workflow is prefilled instead of landing disabled

### Explicit browser test for routed cue degradation
- Add a targeted UI test proving top-level `Analysis` clears routed cues and resets routed filters

### Session route hygiene test
- Add an integration/browser test that enters `Sessions` from Analysis, then leaves `Sessions`, and asserts the URL is clean

---

## Summary

**Overall status: Pass with concerns.**

The `analysis-foundation` behaves like a bounded interpretation-and-routing surface and passes the primary product intent checks, with a few non-blocking workflow concerns around downstream route usefulness and environment-dependent session loading.
