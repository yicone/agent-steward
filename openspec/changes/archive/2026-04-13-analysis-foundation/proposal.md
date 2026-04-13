## Why

`Assets` now exposes reusable context objects and issue-oriented routes, but
`Analysis` still behaves as a placeholder. This leaves a product gap: users can
see affected assets, but they do not yet have a bounded interpretation surface
that explains grouped issues and routes them to the owning page for action.

## What Changes

- Replace the `Analysis` placeholder with a bounded foundation surface for
  context health, findings, selected finding detail, and recommended outbound
  actions.
- Add a local-first seeded analysis model that can represent issue class,
  severity, affected object references, evidence references, and route targets
  without claiming complete automated analysis.
- Support routed handoff into `Analysis` from `Assets`, `Project Overview`, and
  `Sessions` through issue class filters, selected findings when available, and
  compact origin / continue-task cues.
- Support bounded outbound routes from `Analysis` to `Sessions`, `Assets`, and
  `Backup / Migration` while keeping execution on the owning destination page.
- Preserve the project-first shell role boundaries: `Analysis` explains and
  routes; it does not become a second asset inventory, a backup workflow body,
  or a fake auto-remediation engine.

## Capabilities

### New Capabilities

- `analysis-foundation`: Defines the local-first Analysis foundation surface,
  finding model, states, routed handoff behavior, and bounded outbound actions.

### Modified Capabilities

- `project-shell`: Replaces the Analysis placeholder requirement with a bounded
  Analysis foundation requirement while preserving the shell-level role boundary.

## Impact

- Affected UI: `src/components/ProjectShellClient.tsx` and a new or extracted
  Analysis foundation component.
- Affected model code: local seeded analysis finding helpers and handoff helpers,
  likely under `src/lib/`.
- Affected tests: unit tests for analysis model helpers and component tests for
  normal, selected, issue-heavy, routed-in, and outbound action states.
- Affected docs: README / CHANGELOG updates when the implementation ships.
- Tracking: GitHub Issue #47.
