## 1. Model Semantics

- [x] 1.1 Add derived asset governance health types and route descriptor types in `src/lib/contextAssets.ts`.
- [x] 1.2 Implement a helper that derives health severity, issue class, explanation, and recommended route owner from status, provenance, usage, and source reference.
- [x] 1.3 Implement summary helpers that count governance issue classes for filtered asset inventories.
- [x] 1.4 Preserve existing normalization behavior for unknown subtype, scope, source, status, provenance, and usage fields.

## 2. Assets UI

- [x] 2.1 Update `AssetsFoundation` summary to show governance issue counts by class without hiding existing filters.
- [x] 2.2 Update selected asset detail to show health explanation, provenance, in-effect relevance, and route ownership.
- [x] 2.3 Keep recommended actions as routes to Sessions, Analysis, Backup / Migration, or Overview; do not add inline edit, repair, sync, deploy, restore, or workflow execution controls.
- [x] 2.4 Ensure stale/conflicted/orphaned/unknown assets use inspection or review copy rather than mutation promises.
- [x] 2.5 Add an explicit foundation/provider data cue when Assets is backed by seed or partial provider data rather than complete live project inventory.

## 3. Routed Continuity

- [x] 3.1 Review Overview-to-Assets and Analysis-to-Assets handoff builders for compact issue context only.
- [x] 3.2 Preserve valid subtype, scope, status, asset id, issue label, and continue label from routed handoff context.
- [x] 3.3 Ensure full overview summary state, full findings tables, evidence chains, and mutation instructions are not carried into Assets.
- [x] 3.4 Keep routed issue cues visible until the user intentionally changes filters or selected asset focus.
- [x] 3.5 Preserve safe degradation when routed asset ids are stale or missing.

## 4. Tests

- [x] 4.1 Add or update model tests for health derivation across active, stale, conflicted, orphaned, and unknown assets.
- [x] 4.2 Add or update model tests for governance issue summary counts.
- [x] 4.3 Add or update component tests for summary, selected detail, bounded action copy, and routed issue cue behavior.
- [x] 4.4 Add or update shell tests for Overview/Analysis compact asset handoffs.
- [x] 4.5 Confirm existing Sessions, Analysis, Backup / Migration, and Project Overview routing tests continue to pass.

## 5. Documentation and QA

- [x] 5.1 Update README if user-facing Assets behavior or limitations change.
- [x] 5.2 Update CHANGELOG under `## Unreleased` for shipped Assets governance hardening behavior.
- [x] 5.3 Add or update an Assets governance QA prompt/report under `docs/viewer/` if browser QA is needed for the UI flow.
- [x] 5.4 Keep external QA reports historical if failures are found; add retest notes rather than deleting original findings.

## 6. Validation

- [x] 6.1 Run targeted model/component/shell tests for the changed files.
- [x] 6.2 Run `pnpm exec tsc --noEmit`.
- [x] 6.3 Run `pnpm build` if UI or Next configuration changes.
- [x] 6.4 Run `OPENSPEC_TELEMETRY=0 openspec validate context-assets-governance-hardening --strict`.
- [x] 6.5 Before PR readiness, request OpenSpec artifact review and address only necessary review feedback.
  - Volta reviewed the artifacts before implementation and approved after the necessary severity/provider-cue revisions.
