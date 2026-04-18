# Assets Governance Hardening QA Prompt

Use this prompt to run a focused QA pass for Assets governance hardening.

## Scope

- Verify `Assets` shows a foundation/provider data cue and does not imply a complete live project scan.
- Verify the summary keeps subtype/scope/source/status filters visible while showing governance issue counts for freshness, conflict, orphaned, and unknown classes.
- Verify selected detail explains governance health, provenance, in-effect relevance, and the route owner.
- Verify stale, conflicted, orphaned, and unknown assets use inspection/review language only.
- Verify Overview and Analysis routes into `Assets` preserve compact issue context without carrying full overview summaries, findings tables, evidence chains, mutation instructions, or workflow state.

## Expected Boundaries

- `Assets` may route to `Sessions`, `Analysis`, `Backup / Migration`, or `Project Overview`.
- `Assets` must not render inline edit, repair, sync, deploy, restore, validation, confirmation, execution, or workflow result controls.
- Unknown health should remain explicit and non-blocking.
- Seed/provider-backed data must stay labeled as incomplete foundation data.

## Suggested Flow

1. Open the app at `/` and confirm `Project Overview` is selected by default.
2. Open `Assets` from the top-level navigation.
3. Confirm the foundation data cue is visible near the Assets header.
4. Confirm filters remain visible and the summary shows governance issue class counts.
5. Select an active in-effect rule and confirm it shows `healthy`, an in-effect explanation, source/provenance context, and route ownership.
6. Select or route to a stale memory and confirm it shows freshness review copy and route-only actions.
7. Select or route to a conflicted skill and confirm it routes interpretation to `Analysis` rather than offering inline conflict resolution.
8. Select or route to an orphaned command and confirm it explains the missing canonical owner without implying runtime restore.
9. Select or route to an unknown imported fragment and confirm unknown metadata stays explicit and non-blocking.
10. From `Project Overview`, open an in-effect asset or attention item into `Assets`; confirm only compact issue context appears.
11. From `Analysis`, open an affected asset route into `Assets`; confirm only compact issue context appears.
12. Change an Assets filter or select a different asset; confirm the routed cue clears and the new local focus remains active.

## Report Format

- Environment: branch, commit, browser, date
- Pass/fail summary
- Evidence notes for health mapping, issue counts, detail route ownership, and bounded action copy
- Routed continuity notes for Overview -> Assets and Analysis -> Assets
- Regressions in neighboring `Sessions`, `Analysis`, `Backup / Migration`, or shell navigation
