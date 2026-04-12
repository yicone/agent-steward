# Analysis Foundation QA Prompt

Use this prompt with an external QA agent that can operate the local app through a browser.

```text
You are QA-ing the `analysis-foundation` implementation for the local-first Agent Storage Manager project.

Repository: /Users/tr/Workspace/agent-storage-manager
Branch under test: feat/analysis-foundation

Goal:
Verify that the new Analysis foundation behaves as a bounded interpretation-and-routing surface. It should show local context findings, explain why they matter, and route users to owning pages without claiming complete automated analysis, automatic fixes, asset editing, session mutation, or backup execution inside Analysis.

Setup:
1. Run `pnpm install` if dependencies are missing.
2. Start the app with `pnpm dev`.
3. Open the local dev URL, usually `http://localhost:3000`.
4. If the session list is empty, focus QA on the project shell, Assets, Analysis, and visible seeded/foundation states. Do not require real Antigravity/Windsurf/Codex sessions unless available locally.

Primary smoke checks:
1. Open `Project Overview`.
2. Confirm the top-level nav includes `Project Overview`, `Sessions`, `Assets`, `Analysis`, and `Backup / Migration`.
3. Open `Analysis` from the top-level nav.
4. Confirm the Analysis page is no longer a placeholder.
5. Confirm it shows:
   - Analysis header
   - Context Health Summary
   - Findings Inventory
   - Finding Detail
   - Recommended Actions
6. Confirm copy clearly says this is bounded foundation behavior and does not claim automatic remediation.

Analysis state checks:
1. In normal top-level Analysis browsing, confirm seeded findings appear.
2. Select at least one finding and confirm the selected row is visibly active.
3. Confirm the detail panel shows title, issue class, severity/status/object context, why it matters, evidence context when available, and route-only actions.
4. Confirm high-severity or preservation-sensitive findings show a warning/issue-heavy cue.
5. Change filters until no findings match. Confirm an empty state appears and no fake findings are shown.
6. Confirm changing filters or object focus clears/downgrades routed context cues when applicable.

Routed handoff checks:
1. From `Project Overview`, use a route into Analysis if present, such as `Review Analysis`.
2. Confirm Analysis shows a compact routed cue from overview and applies the relevant issue context.
3. From `Assets`, select or route to an issue-related asset and use `Review in Analysis` or equivalent.
4. Confirm Analysis shows a compact routed cue from assets, preserves affected asset context, and does not embed the full Assets inventory.
5. From `Sessions`, if a selected session is available, use `Review in Analysis`.
6. Confirm Analysis shows a compact routed cue from sessions and does not carry transcript/trajectory reading mode into Analysis.

Outbound route checks:
1. From a selected Analysis finding with an Assets route, click the route.
2. Confirm the app opens `Assets` with routed context, selected or filtered affected asset when available, and compact origin cue from Analysis.
3. From a selected Analysis finding with a Sessions route, click the route.
4. Confirm the app opens `Sessions` and attempts to select the referenced session without polluting URL state after leaving Sessions.
5. From a selected Analysis finding with a Backup / Migration route, click the route.
6. Confirm the app opens `Backup / Migration` with a routed cue, but does not execute backup or migration inline.

Regression checks:
1. Assets page still renders its asset foundation correctly.
2. Existing direct session backup button remains under `Sessions`, not under Analysis.
3. Top-level navigation to Analysis without routed context clears old routed cues.
4. Top-level navigation away from Sessions clears session viewer URL params as before.

Report format:
- Verdict: Pass / Fail / Pass with concerns
- Environment: browser, OS, local URL
- Blocking issues: list exact steps, expected result, actual result, screenshots if possible
- Non-blocking concerns: wording, layout, confusing state transitions
- Regression notes: anything broken in Sessions, Assets, or Backup / Migration
- Suggested follow-up tests
```
