# Backup / Migration Foundation QA Prompt

Use this prompt with an external QA agent that can operate the local app through a browser.

```text
You are QA-ing the `backup-migration-foundation` implementation for the local-first Agent Storage Manager project.

Repository: <repo-path>
Branch under test: feat/backup-migration-foundation

Goal:
Verify that the new `Backup / Migration` page behaves as a bounded workflow-first foundation surface. It should support:
- single session backup
- import backup
- validate package
- routed handoff from `Project Overview`, `Sessions`, `Assets`, and `Analysis`
- compact recent operations

It must not behave like:
- a generic tools drawer
- a bulk backup surface
- a migration preview surface
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
   - bulk backup
   - migration preview
   - project bundle execution
   - vendor-runtime restore

Workflow selector / idle checks:
1. In top-level entry with no routed context, confirm the page lands in an idle workflow selection state.
2. Confirm only these workflows are present in foundation:
   - session backup
   - import backup
   - validate package
3. Confirm `migration preview`, `project bundle`, and `bulk backup` are not presented as active workflows.

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

Routed handoff checks:
1. From `Sessions`, if available, route into `Backup / Migration` for a selected session.
2. Confirm `Backup / Migration` opens the `session backup` workflow with the session prefilled and a compact origin cue.
3. From `Assets`, trigger a route into `Backup / Migration` if available.
4. Confirm the destination page preserves bounded asset context but does not embed the full Assets page.
5. From `Analysis`, trigger a preservation-oriented route into `Backup / Migration` if available.
6. Confirm issue context is preserved and workflow identity remains primary.
7. From `Project Overview`, trigger a route into backup/import/validation if available.
8. Confirm routed context opens the correct workflow and degrades safely if context is incomplete.

Recent operations checks:
1. After completing or simulating at least one workflow, confirm a compact recent-operations region appears.
2. Confirm it shows:
   - workflow type
   - result identity
   - timestamp or recency indicator
   - status
3. Confirm it reads as a secondary result/history strip, not a persistent audit console.

Regression checks:
1. `Sessions` still works as before, including existing viewer behavior and direct session backup.
2. `Assets` and `Analysis` routing into `Backup / Migration` does not break their own page roles.
3. Top-level navigation away from `Backup / Migration` clears stale routed workflow context when appropriate.
4. `Backup / Migration` does not expose bulk backup, migration preview, or project bundle execution accidentally through copy or buttons.

Boundary checks:
1. No button or copy should imply:
   - batch backup
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
