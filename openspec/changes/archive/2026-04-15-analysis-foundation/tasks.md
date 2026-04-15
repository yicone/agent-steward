## 1. Analysis Model

- [x] 1.1 Define bounded analysis finding, handoff, filter, summary, and route target types.
- [x] 1.2 Add deterministic local seed findings covering normal, selected, issue-heavy, routed-in, empty, and stale handoff states.
- [x] 1.3 Add helper functions for normalization, filtering, summary derivation, selected finding resolution, and handoff-to-filter mapping.

## 2. Analysis Surface

- [x] 2.1 Replace the Analysis placeholder with a bounded Analysis foundation component.
- [x] 2.2 Render the Analysis header, context health summary, findings inventory, selected finding detail, and recommended actions.
- [x] 2.3 Render explicit empty, loading, normal, selected, issue-heavy, routed-in, and stale handoff states.
- [x] 2.4 Keep placeholder/bounded copy clear so the surface does not imply complete automated analysis.

## 3. Routed Handoff

- [x] 3.1 Add shell-level handoff builders for `Assets -> Analysis`, `Project Overview -> Analysis`, and `Sessions -> Analysis`.
- [x] 3.2 Wire Analysis outbound routes to `Sessions`, `Assets`, and `Backup / Migration` without executing destination workflows inline.
- [x] 3.3 Preserve compact origin, issue, continue-task, and preservation warning cues according to existing cue lifecycle rules.
- [x] 3.4 Ensure normal top-level navigation clears stale Analysis handoff context.

## 4. Tests and QA

- [x] 4.1 Add unit tests for analysis finding normalization, filters, summaries, and selected finding resolution.
- [x] 4.2 Add component tests for normal, empty, selected, issue-heavy, routed-in, and stale handoff Analysis states.
- [x] 4.3 Add shell tests for route builders and cross-page navigation from Analysis to destination surfaces.
- [x] 4.4 Prepare an external QA prompt covering Analysis foundation smoke flows and routed handoff flows.

## 5. Documentation and Validation

- [x] 5.1 Update README and CHANGELOG when implementation ships.
- [x] 5.2 Run targeted tests for analysis helpers, Analysis component, and project shell routing.
- [x] 5.3 Run `pnpm test`, `pnpm build`, and `openspec validate analysis-foundation --strict`.
