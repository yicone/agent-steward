# Project Overview Governance QA Prompt

Use this prompt to run a focused QA pass for the Project Overview governance foundation.

## Scope

- Verify `Project Overview` opens as the default project-scoped agent context governance surface.
- Verify the module spine renders: Project Header, Context Snapshot, In-Effect Assets, Recent Sessions, Attention Needed, and Quick Actions.
- Verify explicit page states: loading placeholders, no-project-context zero cues, normal summaries, and issue-state prioritization.
- Verify provider-backed repo-local evidence is labeled as local evidence, not sample data.
- Verify empty or unavailable provider evidence shows zero/unknown cues instead of fabricated asset or finding counts.
- Verify route handoffs from each module:
  - Context Snapshot routes to `Sessions`, `Assets`, `Analysis`, or `Backup / Migration`.
  - In-Effect Assets routes to `Assets` with explicit asset or filter context.
  - Recent Sessions routes to `Sessions` with explicit session context only.
  - Attention Needed routes to the owning surface with compact issue, object, session, or workflow context.
  - Quick Actions route into existing pages or accepted `Backup / Migration` workflows only.

## Boundary Checks

- Overview must not render transcript excerpts, tool output, full asset inventory, full analysis findings table, selected finding detail, or backup workflow internals.
- Overview must not imply runtime orchestration, cross-agent sync, migration apply, vendor-runtime restore, cloud sync, privacy redaction, or new workflow types.
- Quick Actions may route to `session-backup`, `bulk-session-backup`, `import-backup`, `validate-package`, `migration-preview`, and `project-bundle`; workflow bodies remain inside `Backup / Migration`.
- Missing or unavailable provider data must show unknown, unavailable, or zero-state cues instead of invented counts, sessions, assets, findings, or workflow results.
- Provider-backed cues should reference explicit local project evidence only; they should not claim user-global runtime stores, session transcript stores, cloud sources, or arbitrary source files were scanned.

## Suggested Test Flow

1. Open the app at `/` and confirm `Project Overview` is selected by default.
2. Confirm the header copy frames the page as project-scoped agent context governance.
3. Confirm the evidence label says local project evidence when the checkout contains allowlisted agent-facing files, and that no `sample data` badge appears for provider-backed counts.
4. Click one Context Snapshot cue for each owning page and confirm the destination page receives compact route context.
5. Click an In-Effect Asset cue and confirm `Assets` selects or filters the target without showing Overview-only detail.
6. Click a Recent Session cue and confirm `Sessions` receives only session identity/source/root context.
7. Click the highest-priority Attention Needed item and confirm it opens the owning surface rather than expanding a findings table inline.
8. Click each Quick Action and confirm accepted workflow types start in safe destination states inside `Backup / Migration`.
9. Confirm Overview remains compact and does not expose forbidden detail surfaces listed above.
10. If using an empty-provider fixture, confirm Overview shows `0 assets` / `0 findings`; if using an unavailable-provider fixture, confirm `Unknown` cues and no invented counts.
