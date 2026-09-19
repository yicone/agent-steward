# Agent Work Continuity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first local-first cross-agent handoff slice: a developer can create or capture one Work Item from a Session, inspect bounded evidence, generate a deterministic `work-package/v1` package with a Codex CLI projection, and record the handoff result.

**Architecture:** Add a pure domain layer for Work Items, canonical packages, confidence, redaction, and deterministic hashing. Persist Work Items and packages under the existing app-managed `~/.agent-steward` storage boundary, expose them through narrow Next.js API routes, and render them through a new `Continue`/Work Item experience while preserving existing Session, Assets, Analysis, and Backup routes. Reuse `SessionRecord` and existing backup/project-bundle provenance concepts instead of creating a second session archive format.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Node `fs/promises` and `crypto`, Vitest, existing shadcn/ui components, existing session and project-evidence adapters.

**Source design:** `docs/superpowers/specs/2026-09-19-agent-work-continuity-design.md`

---

## Implementation boundaries

This plan is intentionally a thin vertical slice. It includes one Work Item, one associated Session at minimum, one project/worktree reference, a Codex CLI projection, manual handoff confirmation, and local validation. It does not implement automatic agent injection, automatic code modification, semantic repository indexing, cloud sync, automatic completion, multi-provider projections, or a full asset editor.

The existing `Project Overview`, `Sessions`, `Assets`, `Analysis`, and `Backup / Migration` routes remain valid. New `Continue` and Work Item surfaces are additive and must preserve existing session deep links.

## File map

### Domain and persistence

- Create `src/lib/workContinuity.ts`: public `work-item/v1` and `work-package/v1` types, lifecycle/result enums, confidence values, validation helpers, deterministic canonical JSON, path/source reference normalization, and SHA-256 helpers.
- Create `src/lib/workItemInference.ts`: bounded extraction of Work Item candidates from one `SessionRecord` plus project/worktree metadata; every derived field receives confidence and attribution metadata.
- Create `src/lib/server/workItemStore.ts`: safe local persistence under an app-managed Work Item root, stable ID validation, atomic writes, reads, listing, schema migration hooks, and bounded normalized `session-record/v1` evidence snapshots.
- Create `src/lib/server/sessionRecordLoader.ts`: reuse the existing source adapters to load one live Session into a `SessionRecord` for Work Item creation and handoff, without requiring a prior backup.
- Create `src/lib/server/workPackageService.ts`: preflight, redaction, manifest creation, canonical package serialization, hash generation, generic Markdown/JSON projections, Codex projection, package writes, and handoff outcome append.
- Modify `src/lib/server/paths.ts`: add the Work Item and Work Package roots under `~/.agent-steward`, with `AGENT_STEWARD_WORK_ITEM_ROOT` and `AGENT_STEWARD_WORK_PACKAGE_ROOT` overrides for tests and local debugging.
- Modify `src/lib/sessionRecord.ts` only if shared source-reference or provenance types need a non-breaking extension; keep `session-record/v1` unchanged otherwise.

### API and routing

- Create `src/app/api/work-items/route.ts`: list and create Work Items; accept explicit project identity and optional source Session identity.
- Create `src/app/api/work-items/[workItemId]/route.ts`: read and update one Work Item; reject invalid IDs and stale update versions.
- Create `src/app/api/work-items/[workItemId]/handoff/route.ts`: run preflight, create a package, return display-safe package metadata, and append manual outcome records.
- Modify `src/app/page.tsx`: derive the initial shell page from server `searchParams` so the clean root renders Continue on first paint while existing Session deep links render Sessions without a hydration flash.
- Modify `src/components/ProjectShellClient.tsx`: add `continue` and `work` page states, put `Continue` first in `NAV_ITEMS`, make a clean root URL resolve to `Continue`, preserve legacy page states/deep links, and route Session-to-Work Item actions without carrying viewer-local state.

### UI

- Create `src/components/ContinueSurface.tsx`: local Work Item inbox grouped by active, ready-to-handoff, blocked, captured, recent-failure, and recently-used-project states.
- Create `src/components/WorkItemSurface.tsx`: goal/status/progress/evidence/context/actions workspace with confidence and warning displays.
- Create `src/components/HandoffFlow.tsx`: three-step target selection, preflight review, and package/result confirmation flow for Codex CLI plus generic Markdown/JSON outputs.
- Modify `src/components/HomeClient.tsx`: add a bounded “Create Work Item from this Session” action and return the selected session identity only.
- Modify `src/components/ProjectShellClient.tsx`: render the new surfaces and compatibility links; do not remove existing foundation pages in this slice.

### Tests and documentation

- Create `tests/workContinuity.test.ts`.
- Create `tests/workItemInference.test.ts`.
- Create `tests/sessionRecordLoader.test.ts`.
- Create `tests/workItemStore.test.ts`.
- Create `tests/workPackageService.test.ts`.
- Create `tests/workItemsRoute.test.ts`.
- Create `tests/handoffRoute.test.ts`.
- Create or extend `tests/continueSurface.test.tsx` and `tests/workItemSurface.test.tsx`.
- Create `tests/page.test.tsx` for server-derived initial page selection and clean-root first render.
- Modify `tests/projectShellClient.test.ts` and `tests/homeClient.test.ts` for compatibility and handoff routing.
- Modify `README.md` to describe Work Items, local storage, Codex handoff projection, and the warning-only semantics of no-session packages.
- Modify `docs/glossary.md` with `Work Item`, `Work Package`, `handoff`, and confidence-state definitions.
- Add an entry to `CHANGELOG.md` under `## Unreleased` only when the vertical slice is shipped and user-facing behavior is complete.

---

### Task 1: Define Work Item and Work Package contracts

**Files:**
- Create: `src/lib/workContinuity.ts`
- Test: `tests/workContinuity.test.ts`

- [ ] **Step 1: Write failing contract tests**

Cover:

- `work-item/v1` and `work-package/v1` schema constants.
- Work Item lifecycle values, including repeated handoffs as events rather than a terminal state.
- Handoff outcomes: `created`, `confirmed`, `failed`, `cancelled`, `expired`, `superseded`.
- Confidence values: `verified`, `observed`, `inferred`, `stale`, `missing`, `unknown`.
- Manual no-session package eligibility: package creation is allowed with a `missing` evidence warning and cannot claim verified continuation.
- Invalid IDs, invalid schema versions, and invalid lifecycle transitions are rejected.
- Canonical serialization sorts keys, normalizes UTC timestamps and relative source paths, and produces the same SHA-256 hash for semantically identical input.
- Provider-specific Markdown projection hashes refer back to the canonical package hash and do not alter canonical facts.
- Context entries require source, scope, observed timestamp, confidence, and attribution (`observed available`, `explicitly referenced`, `user attached`, or `unknown influence`); repo-local provider evidence is distinguishable from unknown global runtime influence.

Run: `pnpm exec vitest run tests/workContinuity.test.ts`
Expected: FAIL because the domain module does not yet exist.

- [ ] **Step 2: Implement the pure domain contract**

Define focused types for:

- Work Item identity, project/worktree reference, goal, progress, decisions, questions, evidence references, context attribution, artifacts, and Handoff History.
- Package metadata, validation manifest, redaction manifest, projections, and immutable outcome records.
- Explicit `observed available`, `explicitly referenced`, `user attached`, and `unknown influence` context attribution; each context entry carries source, scope, observed timestamp, provenance, confidence, and attribution.
- The MVP populates `observed available`, `explicitly referenced`, and `unknown influence`; `user attached` remains a reserved schema value until a bounded attachment input is designed.

Implement pure functions for validation, transition checks, stable key ordering, normalized path/source references, canonical bytes, and SHA-256. Keep all filesystem and request handling out of this module.

- [ ] **Step 3: Run the focused tests**

Run: `pnpm exec vitest run tests/workContinuity.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit the contract**

```bash
git add src/lib/workContinuity.ts tests/workContinuity.test.ts
git commit -m "feat: define agent work continuity contracts"
```

### Task 2: Add local Work Item persistence

**Files:**
- Modify: `src/lib/server/paths.ts`
- Create: `src/lib/server/workItemStore.ts`
- Test: `tests/workItemStore.test.ts`

- [ ] **Step 1: Write failing store tests**

Use a temporary `AGENT_STEWARD_WORK_ITEM_ROOT` and cover:

- root and per-Work-Item directory creation
- stable ID validation and path traversal rejection
- atomic create/read/update/list behavior
- bounded normalized SessionRecord evidence snapshots survive later source unavailability and remain distinct from raw source copies/Session Backup packages
- optimistic version or updated-at guard for stale updates
- schema-version rejection and a migration hook that fails closed for unknown versions
- append-only handoff outcome records
- no writes outside the configured managed root

Run: `pnpm exec vitest run tests/workItemStore.test.ts`
Expected: FAIL because the store and paths do not yet exist.

- [ ] **Step 2: Implement the managed local store**

Use the existing `paths.ts` and session backup store path-safety conventions. Store Work Item metadata plus a size-bounded normalized `session-record/v1` evidence snapshot when a Session-derived Work Item is created. Keep raw provider sources and optional full Session Backup packages separate; the snapshot is the durable evidence cache used when a live source is unavailable. Write through a temporary file followed by rename. Use `work-item/v1` records and preserve unknown future fields when safe.

- [ ] **Step 3: Run store tests and the existing backup tests**

Run: `pnpm exec vitest run tests/workItemStore.test.ts tests/sessionBackupService.test.ts tests/projectBundleService.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit persistence**

```bash
git add src/lib/server/paths.ts src/lib/server/workItemStore.ts tests/workItemStore.test.ts
git commit -m "feat: persist local agent work items"
```

### Task 3: Implement bounded Session-to-Work Item and Context Snapshot inference

**Files:**
- Create: `src/lib/workItemInference.ts`
- Create: `src/lib/server/sessionRecordLoader.ts`
- Test: `tests/workItemInference.test.ts`
- Test: `tests/sessionRecordLoader.test.ts`
- Modify: `src/lib/sessionRecordMapper.ts` only if a reusable normalized field is missing

- [ ] **Step 1: Write failing inference tests**

Given a deterministic Codex `SessionRecord` fixture and project metadata, assert that inference extracts:

- a goal candidate from the first user request
- progress and next-step candidates from bounded user/assistant events
- errors from failed command/status events
- relevant file and command references without claiming full repository influence
- branch, commit, worktree cleanliness, and project root as observed metadata
- project-local evidence-provider assets as context entries with source, scope, observed timestamp, provenance, confidence, and attribution
- explicit `unknown influence` for global runtime assets the provider cannot observe
- confidence and attribution for every inferred field
- explicit `unknown` or `missing` when a source cannot provide the value

Run: `pnpm exec vitest run tests/workItemInference.test.ts tests/sessionRecordLoader.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement bounded inference**

Accept one `SessionRecord`, a project snapshot, and the existing `ProjectEvidenceProviderResult` when available. Include only bounded repo-local provider evidence already exposed by `src/lib/projectEvidenceProvider.ts`; capture its source, scope, observed timestamp, provenance, and confidence. Do not scan the entire repository or infer global runtime assets. Keep extraction deterministic, size-bounded, and source-attributed. Require user confirmation before marking inferred goal/progress as confirmed Work Item fields, and preserve `unknown influence` for sources that cannot be observed.

- [ ] **Step 3: Implement the SessionRecord loader**

Extract the source-specific loading currently embedded in `src/app/api/session-backups/route.ts` into a reusable server-only loader that can produce one `SessionRecord` for Codex, Antigravity, Windsurf, or Cursor using the existing adapters. Preserve source/root validation, `sourceLocator`, Codex source-copy behavior, and unsupported-copy errors for other providers; do not write a backup as an implicit side effect. Update the session-backup route to call the loader without changing its response contract.

The loader tests must cover deterministic success/error branches for all four providers, stale or invalid root IDs, unavailable runtime attach, Cursor metadata-only behavior, Codex source-copy inclusion, and unsupported source-copy errors for Antigravity/Windsurf/Cursor. Existing adapter tests may cover parser details, but the loader contract itself must be tested at this boundary.

- [ ] **Step 4: Run focused and session mapping tests**

Run: `pnpm exec vitest run tests/workItemInference.test.ts tests/sessionRecordLoader.test.ts tests/sessionRecordMapper.test.ts tests/codexLog.test.ts tests/conversationRouteCodex.test.ts tests/sessionBackupsRoute.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit inference and loader**

```bash
git add src/lib/workItemInference.ts src/lib/server/sessionRecordLoader.ts src/app/api/session-backups/route.ts tests/workItemInference.test.ts tests/sessionRecordLoader.test.ts src/lib/sessionRecordMapper.ts
git commit -m "feat: infer bounded work item state from sessions"
```

### Task 4: Build deterministic Work Package preflight and service

**Files:**
- Create: `src/lib/server/workPackageService.ts`
- Test: `tests/workPackageService.test.ts`

- [ ] **Step 1: Write failing package-service tests**

Cover:

- machine statuses `ready`, `ready_with_warnings`, and `blocked` (the API/UI may render `ready with warnings`)
- no-session manual package allowed only with a `missing` evidence warning
- invalid project/worktree identity and missing referenced files
- dirty/untracked state captured without mutation
- default summary-only content and explicit evidence inclusion
- baseline redaction for tokens, private keys, passwords, command arguments, environment values, absolute paths, localhost/private-network URLs, and `sourceRef` metadata
- bounded raw prompt/tool-output limits, stable truncation markers, and redaction-manifest counts
- deterministic canonical JSON plus SHA-256 over canonical package and manifest bytes
- source fingerprints, repository identity, worktree dirty/untracked snapshot, per-field stale markers, and later validation against changed fingerprints
- normalized relative paths and normalized `sourceRef` metadata in the manifest
- projection output carries the canonical hash and preserves confidence/warning metadata
- unresolved references remain visible and are never treated as embedded evidence
- append-only handoff outcome records with package ID/hash, target provider/session, actor, time, method, result, and failure reason
- package and outcome paths reject traversal/absolute-path escapes and remain confined to the configured managed roots after simulated write failures

Run: `pnpm exec vitest run tests/workPackageService.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement preflight and package creation**

Read Work Item data and referenced `SessionRecord`/backup evidence, capture project/worktree identity read-only from the explicitly stored trusted project root, normalize paths relative to that root, apply redaction and bounded truncation before hashing, and construct the `work-package/v1` canonical representation. Use the existing `projectRootFilter.ts` normalization plus an allowlist of configured roots; obtain Git identity and dirty/untracked state with allowlisted `execFile` calls (never a shell string), and treat unavailable Git state as `unknown`. Capture source fingerprints, repository identity, dirty/untracked summary, per-field stale markers, and validation results. Reuse existing backup/project-bundle concepts as compatibility references, but keep the package schema independent from provider projections. Package writes and outcome records must use root confinement and atomic writes.

- [ ] **Step 3: Implement generic projections and the Codex CLI projection**

Generate the canonical JSON projection and a generic human-readable Markdown projection first. Then generate the Codex CLI projection as a Markdown handoff entry plus JSON sidecar. Every projection must state that direct session injection is not performed, include the canonical package hash, list warnings/missing evidence, and give the next-agent entry instructions.

- [ ] **Step 4: Run package and existing package tests**

Run: `pnpm exec vitest run tests/workPackageService.test.ts tests/sessionBackupService.test.ts tests/projectBundleService.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit the package service**

```bash
git add src/lib/server/workPackageService.ts tests/workPackageService.test.ts
git commit -m "feat: create verifiable agent work packages"
```

### Task 5: Expose Work Item and handoff APIs

**Files:**
- Create: `src/app/api/work-items/route.ts`
- Create: `src/app/api/work-items/[workItemId]/route.ts`
- Create: `src/app/api/work-items/[workItemId]/handoff/route.ts`
- Test: `tests/workItemsRoute.test.ts`
- Test: `tests/handoffRoute.test.ts`

- [ ] **Step 1: Write failing route tests**

Cover:

- list returns local Work Items grouped by status metadata
- create accepts a manual Work Item and a Session-derived Work Item
- update rejects unknown IDs, malformed payloads, unsupported schema versions, and stale versions
- update supports an explicit `organize` confirmation that moves `captured` to `organized` only after the user confirms goal and trusted project root; inferred values remain unconfirmed until then
- handoff preflight returns structured validation and warning/block details
- handoff creation returns display-safe package paths and canonical hash
- manual outcome recording validates result/method and preserves immutable fields
- errors use the repository's existing `{ error, code, title, hint }` response shape

Run: `pnpm exec vitest run tests/workItemsRoute.test.ts tests/handoffRoute.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement list/create/update routes**

Keep request validation explicit and bounded. Require an explicitly stored `projectRootPath`, normalize it with the existing `projectRootFilter.ts` helpers, and accept it only when it matches the current working root or an `AGENT_STEWARD_PROJECT_ROOTS` allowlisted root. Do not accept arbitrary file contents or paths without normalization. For Session-derived creation, call `sessionRecordLoader.ts`, pass the bounded record plus the selected project's existing `ProjectEvidenceProviderResult` to inference, and persist the bounded normalized evidence snapshot before responding. Return Work Item references and evidence summaries, not full raw Session payloads by default.

- [ ] **Step 3: Implement the handoff route**

Support `mode: preflight | create | record-outcome`. Require explicit target provider (`codex` for the first projection), package inclusion choices, and redaction choices. Return machine status `ready`, `ready_with_warnings`, or `blocked` without mutating the Work Item on preflight. Expose display text as `Ready`, `Ready with warnings`, or `Blocked`.

- [ ] **Step 4: Run route and related API tests**

Run: `pnpm exec vitest run tests/workItemsRoute.test.ts tests/handoffRoute.test.ts tests/sessionBackupsRoute.test.ts tests/projectBundlesRoute.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit the API**

```bash
git add src/app/api/work-items tests/workItemsRoute.test.ts tests/handoffRoute.test.ts
git commit -m "feat: expose work item and handoff APIs"
```

### Task 6: Add Continue and Work Item surfaces

**Files:**
- Create: `src/components/ContinueSurface.tsx`
- Create: `src/components/WorkItemSurface.tsx`
- Create: `src/components/HandoffFlow.tsx`
- Modify: `src/components/ProjectShellClient.tsx`
- Modify: `src/components/HomeClient.tsx`
- Test: `tests/continueSurface.test.tsx`
- Test: `tests/workItemSurface.test.tsx`
- Modify: `tests/projectShellClient.test.ts`
- Modify: `tests/homeClient.test.ts`

- [ ] **Step 1: Write failing UI tests**

Cover:

- `Continue` renders active, ready-to-handoff, blocked, and captured Work Items with next-action labels.
- Work Item detail displays confidence states, warnings, evidence references, current project/worktree state, and handoff history.
- Project Overview exposes relevant Work Item entry points for recent/blocked/ready work instead of only routing to legacy Sessions/Assets/Analysis/Backup surfaces.
- no-session packages show an explicit warning and cannot show “verified continuation.”
- HandoffFlow executes target selection → preflight → create/result states without hiding missing evidence.
- HandoffFlow exposes source review, per-source exclusion, path redaction, raw-content truncation, and summary-only defaults before package creation.
- HandoffFlow exports a pure state-transition helper for target → preflight → create/result and privacy-option updates; SSR output includes the corresponding controls. This keeps tests compatible with the repository's Node Vitest environment without adding jsdom.
- Session action emits only Session identity/project context; it does not carry transcript viewer-local state.
- legacy `?source=&id=` deep links still open Sessions.
- clean-root server render initializes Continue without a first-paint Overview flash.
- a captured Work Item remains visibly `captured` until the user confirms project and goal boundary through an organize action.

Run: `pnpm exec vitest run tests/page.test.tsx tests/continueSurface.test.tsx tests/workItemSurface.test.tsx tests/projectShellClient.test.ts tests/homeClient.test.ts`
Expected: FAIL.

- [ ] **Step 2: Add compatibility page state and navigation**

Extend `ProjectShellPage` with `continue` and `work`, put `Continue` first in `NAV_ITEMS`, make a clean root URL resolve to `continue`, preserve `overview`, `sessions`, `assets`, `analysis`, and `backup`, and update `resolveInitialProjectShellPage` so session deep links retain precedence. Accept an `initialPage` prop from `page.tsx` and initialize state from it rather than hard-coding `overview`; retain a client-side URL update only for navigation after hydration. Keep existing URL cleanup and routed handoff behavior intact. Add Work Item entry points to `ProjectOverviewSurface`, plus explicit navigation links from the new Continue/Work surfaces to legacy Overview and evidence/recovery subviews.

- [ ] **Step 3: Implement ContinueSurface**

Fetch `/api/work-items`, render local-only active, ready-to-handoff, blocked, captured, recent-failure, and recently-used-project groups, show confidence and warning badges, and link to the Work Item surface. Keep loading, empty, unavailable, and error states explicit.

- [ ] **Step 4: Implement WorkItemSurface**

Fetch one Work Item, render goal/progress/decisions/questions/evidence/context/repository state, and expose actions to organize/confirm goal and project, prepare handoff, record outcome, mark blocked, or complete. In this MVP, Session association is one source Session at creation; additional-session attachment is deferred and must not be shown as an available action. Do not auto-mark completion from Session termination.

- [ ] **Step 5: Implement HandoffFlow**

Use existing Card, Badge, Button, Input, and Select components. Make the three steps explicit: target/options, preflight review, package/result. Default to summary-only output and require explicit source review before including evidence. Provide per-source exclusion, path redaction, raw-content truncation, and warning text for unresolved or redacted references. Keep Codex CLI as the only dedicated provider projection while exposing generic Markdown/JSON output references.

- [ ] **Step 6: Add Session-to-Work Item entry point**

Add a bounded action in `HomeClient` that creates or opens a Work Item from the selected Session, passes `sessionId`, `source`, `rootId`, and active project identity only, and returns to the Work Item surface after creation.

- [ ] **Step 7: Run UI tests and the full test suite**

Run: `pnpm exec vitest run tests/page.test.tsx tests/continueSurface.test.tsx tests/workItemSurface.test.tsx tests/projectShellClient.test.ts tests/homeClient.test.ts`
Expected: PASS.

Then run: `pnpm test`
Expected: PASS.

- [ ] **Step 8: Commit the UI slice**

```bash
git add src/app/page.tsx tests/page.test.tsx src/components/ContinueSurface.tsx src/components/WorkItemSurface.tsx src/components/HandoffFlow.tsx src/components/ProjectShellClient.tsx src/components/HomeClient.tsx tests/continueSurface.test.tsx tests/workItemSurface.test.tsx tests/projectShellClient.test.ts tests/homeClient.test.ts
git commit -m "feat: add continue and work item handoff surfaces"
```

### Task 7: Document the new product contract and migration boundary

**Files:**
- Modify: `README.md`
- Modify: `docs/glossary.md`
- Modify: `CHANGELOG.md` when behavior is shipped
- Test/validation: `pnpm lint`, `pnpm build`

- [ ] **Step 1: Update README product scope**

Describe `Continue`, Work Items, Work Packages, local storage roots, Codex CLI projection, manual confirmation, and warning-only no-session packages. Keep existing source prerequisites and route compatibility notes.

- [ ] **Step 2: Update glossary and migration language**

Add the canonical terms and confidence states. Explain that existing Sessions, Assets, Analysis, and Backup / Migration remain valid evidence/recovery surfaces during additive rollout.

- [ ] **Step 3: Run documentation and build validation**

Run: `pnpm lint`
Expected: PASS.

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 4: Commit documentation**

```bash
git add README.md docs/glossary.md CHANGELOG.md
git commit -m "docs: document agent work continuity workflow"
```

### Task 8: Execute the five-task local validation protocol

**Files/artifacts:**
- Create local-only validation notes outside the repository or under an explicitly ignored test-results directory.
- Reuse the package manifests and handoff outcome records generated by the app.

- [ ] **Step 1: Prepare five representative cross-agent tasks**

Use local tasks that cover a bug fix, feature change, investigation, documentation task, and blocked task. Do not include secrets or production credentials.

- [ ] **Step 2: Record the handoff funnel**

For each task, record:

- time to find/create a Work Item
- time to create a package
- missing or incorrect required fields
- preflight status
- whether the target Codex session could begin the stated next step without a full re-explanation
- manual handoff result and failure reason when applicable

- [ ] **Step 3: Verify the design thresholds**

Confirm at least four of five tasks reach `Package Created` without an undisclosed required-field gap and at least three of five reach manual `Handoff Confirmed`. Any failure must preserve the package manifest and outcome record for diagnosis.

- [ ] **Step 4: Review compatibility and sensitive-data behavior**

Verify a pre-existing Session deep link still opens Sessions, legacy backup/project-bundle flows remain usable, default package output is summary-only, localhost/private-network URLs are shortened or excluded, and redaction occurs before hashing.

- [ ] **Step 5: Run browser smoke QA for the runtime slice**

Start the local app with a temporary Work Item root and project root, then use the repository's browser QA workflow to verify: root opens Continue, a Work Item can be organized, the handoff flow exposes summary-only/privacy controls, preflight warnings remain visible, and an existing Session deep link still opens Sessions. Capture the URL/state and result as review evidence; keep the PR draft if this evidence is unavailable.

- [ ] **Step 6: Decide follow-up scope**

Only after the thin slice meets the thresholds should the next plan address multi-session aggregation, richer context attribution, Cursor/Windsurf projections, or automated confirmation.

---

## Final validation checklist

- [ ] `pnpm exec vitest run tests/workContinuity.test.ts tests/workItemStore.test.ts tests/workItemInference.test.ts tests/workPackageService.test.ts tests/workItemsRoute.test.ts tests/handoffRoute.test.ts`
- [ ] `pnpm exec vitest run tests/sessionRecordLoader.test.ts tests/continueSurface.test.tsx tests/workItemSurface.test.tsx`
- [ ] `pnpm exec vitest run tests/page.test.tsx`
- [ ] `pnpm test`
- [ ] `pnpm lint`
- [ ] `pnpm build`
- [ ] Existing Session deep links still resolve.
- [ ] Existing Backup / Migration workflows still resolve.
- [ ] Package hashes are deterministic and projection metadata points to the canonical hash.
- [ ] No-session packages carry warning-only semantics.
- [ ] No raw secrets are emitted in package or manifest output.
- [ ] Five-task local validation evidence is recorded before expanding scope.
