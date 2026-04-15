# Backup / Migration Foundation QA Prompt

Use this prompt with an external QA agent that can operate the local app through a browser.

```text
You are QA-ing the `migration-preview` and `bulk-session-backup` implementation for the local-first Agent Storage Manager project.

Repository: <repo-path>
Branch under test: feat/migration-preview

Goal:
Verify that the new `Backup / Migration` page behaves as a bounded workflow-first foundation surface. It should support:
- single session backup
- bulk session backup
- import backup
- validate package
- migration preview
- routed handoff from `Project Overview`, `Sessions`, `Assets`, and `Analysis`
- compact recent operations

It must not behave like:
- a generic tools drawer
- a migration apply surface
- a project bundle implementation
- a vendor runtime restore UI

Setup:
1. Use the QA agent's local checkout path for `<repo-path>`.
2. Run `pnpm install` if dependencies are missing.
3. Start the app with `pnpm dev`.
4. Open the local dev URL, usually `http://localhost:3000`.
5. If real local sessions/backups are unavailable, still validate shell routing, bounded messaging, state transitions, and any seeded/empty workflow states that are intentionally present.

Primary smoke checks:
1. Open `Project Overview`.
2. Confirm the top-level nav includes `Project Overview`, `Sessions`, `Assets`, `Analysis`, and `Backup / Migration`.
3. Open `Backup / Migration` from the top-level nav.
4. Confirm the page is no longer a placeholder.
5. Confirm it shows a workflow-first structure, not a generic inventory:
   - workflow selector or workflow spine
   - workflow context summary
   - validation-oriented state
   - result / recent operations region
6. Confirm copy clearly states bounded foundation behavior and does not imply:
   - migration apply
   - project bundle execution
   - vendor-runtime restore

Workflow selector / idle checks:
1. In top-level entry with no routed context, confirm the page lands in an idle workflow selection state.
2. Confirm only these workflows are present in foundation:
   - session backup
   - bulk session backup
   - import backup
   - validate package
   - migration preview
3. Confirm `project bundle` is not presented as an active workflow.

Session backup workflow checks:
1. Enter the `session backup` workflow from `Backup / Migration`.
2. If a selectable session exists, confirm the workflow shows:
   - selected session context
   - configuration step
   - validation step
   - confirmation / execution boundary
   - result state
3. Confirm `source backup` is explicit opt-in rather than default.
4. Confirm warnings are shown before destructive-adjacent or trust-sensitive steps when applicable.
5. Confirm the existing direct `Back Up Session` action still remains available under `Sessions` and was not removed.

Bulk session backup workflow checks:
1. Enter the `bulk session backup` workflow from `Backup / Migration`.
2. Confirm the workflow starts in explicit session selection and does not invent a session set automatically.
3. Add or verify multiple selected sessions and confirm the workflow shows:
   - explicit selected-session rows
   - per-session source / root context when available
   - per-session source-copy configuration
4. Validate the batch and confirm:
   - canonical record availability is checked per selected session
   - provenance is checked per selected session
   - source-copy readiness is checked per selected session
   - warning-level items stay visible into confirmation
   - block-level items prevent confirmation until removed or repaired
5. Confirm batch confirmation shows:
   - selected count
   - source-copy configuration summary
   - warning count
   - sequential fan-out semantics using existing single-session backup behavior
6. Execute or simulate a mixed run if possible and confirm result states distinguish:
   - full success
   - partial failure / success with warnings
   - full failure
7. Confirm batch result detail shows aggregate status plus per-session rows, including backup IDs and actionable errors when available.

Import backup workflow checks:
1. Enter the `import backup` workflow.
2. Confirm the workflow is validation-first.
3. If package intake is available, confirm:
   - schema/integrity/provenance checks are shown before import execution
   - unsupported or malformed package paths show actionable diagnostics
4. Confirm result copy states restore into product-readable state only.
5. Confirm no copy suggests reopening inside Antigravity, Windsurf, Codex, Claude, or other vendor runtimes.

Validate package workflow checks:
1. Enter the `validate package` workflow.
2. Confirm it performs trust / compatibility checks without executing import.
3. Confirm result states distinguish:
   - valid
   - valid with warnings
   - invalid
4. Confirm validation result is still clearly a workflow result, not an editor or generic inspector.

Migration preview workflow checks:
1. Enter the `migration preview` workflow from `Backup / Migration`.
2. Confirm the workflow follows this bounded path only:
   - selection
   - configuration
   - validation
   - result
3. Confirm no confirmation or execution step appears for migration preview.
4. Confirm preview requires explicit:
   - source context
   - target context
   - bounded scope
5. Confirm missing fields remain visible and editable instead of being silently inferred.
6. Confirm bounded scope choices include:
   - sessions
   - reusable context assets
   - project-context subset
7. Confirm validation and result copy clearly state `preview only` and never imply migration apply, object writing, or bundle generation.
8. Confirm result output distinguishes item classifications:
   - portable
   - degraded
   - unsupported
   - blocked
9. Confirm aggregate counts are shown for all four preview classifications.
10. Confirm degraded / unsupported / blocked rows offer inspection or repair-oriented follow-up wording without executing work inline.

Routed handoff checks:
1. From `Sessions`, if available, route into `Backup / Migration` for a selected session.
2. Confirm `Backup / Migration` opens the `session backup` workflow with the session prefilled and a compact origin cue.
3. If `Sessions` exposes explicit multi-selection under this branch, route that selection into `Backup / Migration`.
4. Confirm the destination opens `bulk session backup` with the selected sessions prefilled and no silently dropped entries.
5. From `Assets`, trigger a route into `Backup / Migration` if available.
6. Confirm the destination page may open migration preview with explicit asset scope context only, while missing source product or target context remains editable.
7. From `Analysis`, trigger a preservation-oriented route into `Backup / Migration` if available.
8. Confirm preservation-oriented analysis routes still open `session backup` and preserve the issue/preservation warning context.
9. From `Analysis`, trigger a migration-preview route into `Backup / Migration` if available.
10. Confirm migration-preview analysis routes open `migration preview`, preserve issue context, and do not invent missing source or target.
11. From `Project Overview`, trigger a route into single backup, bulk backup, import, validation, and migration preview if available.
12. Confirm routed context opens the correct workflow and degrades safely to selection/configuration if preview context is incomplete.

Recent operations checks:
1. After completing or simulating at least one workflow, confirm a compact recent-operations region appears.
2. Confirm it shows:
   - workflow type
   - result identity
   - timestamp or recency indicator
   - status
   - session count for bulk runs
   - selected preview scope for migration preview runs
3. Confirm it reads as a secondary result/history strip, not a persistent audit console.
4. Confirm a bulk run produces one recent-operation entry for the batch, not one entry per selected session.
5. Confirm a migration preview entry routes back to preview detail and does not claim migration was applied.

Regression checks:
1. `Sessions` still works as before, including existing viewer behavior and direct session backup.
2. `Assets` and `Analysis` routing into `Backup / Migration` does not break their own page roles.
3. Top-level navigation away from `Backup / Migration` clears stale routed workflow context when appropriate.
4. `Backup / Migration` does not expose migration apply or project bundle execution accidentally through copy or buttons.

Boundary checks:
1. No button or copy should imply:
   - unscoped or implicit batch backup
   - migration apply
   - project bundle packaging
   - runtime continuation in third-party tools
2. If any such implication exists, record it as a blocker or strong concern.

Report format:
- Verdict: Pass / Fail / Pass with concerns
- Environment: browser, OS, local URL
- Blocking issues: exact steps, expected result, actual result, screenshots if possible
- Non-blocking concerns: wording, workflow clarity, cue clarity, state confusion
- Regression notes: anything broken in `Sessions`, `Assets`, `Analysis`, or shell routing
- Suggested follow-up tests
```
