# Migration Preview QA

Date: 2026-04-16
Branch: `feat/migration-preview`
Environment: macOS, Playwright CLI (Chromium), `http://localhost:3000`
Verdict: Pass

## Scope

This QA pass covered the `migration-preview` workflow added to `Backup / Migration`, including workflow selector visibility, preview-only state flow, explicit source/target/scope requirements, routed handoff, recent operations, and regression checks for neighboring surfaces.

## Result

All tested checks passed. No blocking issues or non-blocking concerns were reported.

## Key Verified Behavior

- `Backup / Migration` exposes five bounded workflows: session backup, bulk session backup, import backup, validate package, and migration preview.
- `migration-preview` follows only `selection -> configuration -> validation -> result`.
- The workflow does not show confirmation or execution steps.
- Source context, target context, and bounded scope remain explicit and editable.
- Missing fields are not silently inferred from routed context.
- Result output distinguishes `portable`, `degraded`, `unsupported`, and `blocked` classifications.
- Aggregate counts are shown for all four classifications.
- Result copy states preview-only behavior and does not imply migration apply, object writing, or bundle generation.
- Recent operations show migration preview entries with selected preview scope and do not claim migration was applied.
- `Assets -> Migration Preview` prefills asset scope without inventing source product or target context.
- `Analysis` preservation routes still open session backup.
- `Analysis` migration-preview routes open migration preview and preserve issue context without inventing missing fields.
- Project Overview routes to each workflow correctly.
- Sessions, Assets, and Analysis retained their existing page roles.

## Evidence Excerpt

The QA run verified the result state copy:

```text
Operation Result: preview-clear
Preview only: 1 sessions checked — 1 portable, 0 degraded, 0 unsupported, 0 blocked.

Preview only. This result compares explicit source, target, and bounded scope
without applying migration, generating bundles, or writing migrated objects.

No runtime restore or apply. Preview results are advisory compatibility findings only.
They do not write objects, reopen third-party runtimes, or create backup packages.
```

## Suggested Follow-Up Tests

- Use real local sessions and backup packages for end-to-end data-path validation.
- Construct mixed `degraded` / `unsupported` / `blocked` preview results and verify inspection/repair wording.
- Stress bulk session backup with a larger explicit selection set.
- Check responsive layout for the workflow spine on narrow screens.
