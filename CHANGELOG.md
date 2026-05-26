# Changelog

This file records shipped, merged changes for Agent Storage Manager.

**SSoT/DRY**

- `README.md` describes the current product surface and runtime prerequisites.
- GitHub Issues track active execution work (0-2 weeks) and mid-term planning with labels/milestones.
- This file captures completed milestones so they are not duplicated elsewhere.
- GitHub Issues / PRs are optional references. For older work or ad-hoc work, plain dated entries here are still valid.

## Unreleased

### Added

- `2026-05-26` — Cursor support: first-class session browser with unified Trajectory viewer
  - Added Cursor as a fourth first-class source (alongside Antigravity, Windsurf, Codex) with bounded local SQLite read, no runtime attach required
  - Added `src/lib/server/cursor.ts` adapter: `CursorBubble` type, `readCursorBubbles()` for bubble-by-bubble transcript recovery, `buildCursorEvents()` / `buildCursorSummary()`, and `extractSummaryText()` with XML conversation-context stripping
  - API route now returns `kind: "trajectory", source: "cursor"` (unified model) instead of bare `kind: "markdown"`; search indexing uses `getTrajectoryMetaMapCached` for metadata consistency
  - `HomeClient.tsx`: added `cursorView` state, Transcript (default) / Trajectory view switcher, cursor trajectory render block with turns/user/assistant badges, filter controls, and jump-to-event cross-view navigation
  - Added `src/lib/projectEvidenceProvider.ts` for repo-local Cursor asset classification (`.cursor/rules/*.mdc` → `rule`; `.cursorrules` → `rule`; `.cursor/mcp.json` → `command`)
  - Updated `docs/storage/local-storage-notes.md` with version compatibility risk table, graceful degradation principles, upgrade detection commands, and break-fix upgrade path
  - Updated `docs/viewer/trajectory-view.md` with Cursor adapter section and API surface; updated `docs/viewer/agent-ui-ux-optimization.md` Shipped list
  - Closed all four open questions in `openspec/changes/add-cursor-support/design.md`

- `2026-04-19` — Assets governance hardening
  - Added derived governance health semantics for reusable context assets, including healthy, informational, warning, and unknown states
  - Updated `Assets` summary and detail views with governance issue class counts, provenance/in-effect explanations, route ownership, and foundation data cues
  - Preserved compact Overview/Analysis issue handoffs into `Assets` while keeping editing, repair, sync, deploy, restore, and workflow execution outside the Assets surface

- `2026-04-18` — Project bundle hardening
  - Hardened `/api/project-bundles` so generation requires explicit selection/configuration, invalid modes return structured errors, and generate responses expose summary-shaped display data only
  - Strengthened project bundle validation for global output-root blockers, structural blockers, missing-package warnings, safe diagnostics, and deterministic newest matching session backup reuse
  - Updated result rendering and QA coverage so unresolved references and display-safe bundle locations remain visible without raw local path leakage

- `2026-04-18` — Project Overview governance foundation
  - Replaced the static `Project Overview` cards with a project-scoped governance module spine for context snapshot, in-effect assets, recent sessions, attention items, and route-first quick actions
  - Added a local Overview summary model that derives compact cues from existing Sessions, Assets, Analysis, and Backup / Migration foundation data without fabricating missing provider evidence
  - Preserved routed handoffs into `Sessions`, `Assets`, `Analysis`, and accepted `Backup / Migration` workflows while keeping transcripts, full inventories, findings tables, and workflow internals off Overview

- `2026-04-16` — Project bundle foundation
  - Added a bounded `project bundle` workflow to `Backup / Migration` with explicit `selection -> configuration -> validation -> confirmation -> execution -> result` flow
  - Added local `project-bundle/v1` generation with bundle manifest, package/project metadata, member inventory, member references, validation summary, and lightweight member snapshots
  - Reused existing session backup packages for session members, preserved missing-package sessions as unresolved references with warnings, and added routed handoff into project bundle from `Project Overview`, `Assets`, and `Analysis`

- `2026-04-15` — Migration preview workflow
  - Added a bounded `migration preview` workflow to `Backup / Migration` with explicit source context, target context, and bounded scope state flow (`selection -> configuration -> validation -> result`)
  - Added preview-only classification and aggregate reporting for `portable`, `degraded`, `unsupported`, and `blocked` items, plus recent-operation entries that route back to preview detail without implying migration apply
  - Added routed handoff into migration preview from `Project Overview`, `Assets`, and `Analysis` without inventing missing source, target, or scope fields

- `2026-04-15` — Bulk session backup
  - Added a bounded `bulk session backup` workflow to `Backup / Migration` with explicit multi-session selection, per-session validation, batch confirmation, and aggregate plus per-session result reporting
  - Reused the existing single-session backup execution path for batch fan-out and kept recent operations compact with one entry per bulk run
  - Preserved existing `Sessions` direct single-session backup behavior and retained `import backup` / `validate package` workflows without regression

- `2026-04-11` — Project shell foundation
  - Added a project-first shell with `Project Overview`, `Sessions`, `Assets`, `Analysis`, and `Backup / Migration` surfaces
  - Preserved the existing session viewer under `Sessions`, including source diagnostics, URL deep links, search selection, and direct session backup
  - Added bounded foundation placeholders for future asset, analysis, backup, and migration work without claiming unavailable inventory or analysis behavior

- `2026-04-11` — Assets foundation
  - Replaced the `Assets` placeholder with a bounded reusable context assets surface for rules, memory, skills, commands, and unknown asset fragments
  - Added local asset seed data, normalization helpers, subtype/scope/source/status filtering, selected asset detail, provenance, and in-effect/usage cues
  - Added routed handoff paths into `Assets` from Sessions, Project Overview, and Analysis without carrying full transcript or trajectory state

- `2026-04-12` — Analysis foundation
  - Replaced the `Analysis` placeholder with a bounded interpretation-and-routing surface for local context findings
  - Added local analysis seed data, normalization helpers, issue/severity/object/status filtering, health summary, finding detail, evidence context, and route-only recommended actions
  - Added routed handoff paths into `Analysis` from Assets, Project Overview, and Sessions without claiming complete automated analysis or inline remediation

- `2026-04-10` — Session Backup foundation
  - Added canonical `session-record/v1` and `session-backup/v1` schemas plus managed backup storage under `~/.agent-storage-manager/backups`
  - Added create/import/verify APIs for session backups, with schema/integrity validation and stable user-facing diagnostics
  - Added `Back Up Session` to the Sessions viewer, with Codex-only opt-in source copy for v1

- `2026-04-09` — Subagent event support for Antigravity and Codex
  - **Infrastructure**: New `subagent` trajectory event kind with `SubagentInfo` metadata (`type`, `source`, `taskName`, `taskDescription`, `forkedFrom`)
  - **Antigravity**: Convert `CORTEX_STEP_TYPE_BROWSER_SUBAGENT` from `tool` to `subagent` kind; populate browser type and task details
  - **Codex**: Heuristic detection via `inferSubagentType()` matching function names (browser/delegate/research/coding patterns); `extractTaskDescription()` pulls task info from function args
  - **UI**: Amber-styled subagent badges with type indicator, trajectory filtering toggle (default on), subagent count in header summary
  - **Filters**: Add `subagent` to `TrajectoryFilterFlags` with URL bitfield support (7-bit format)

- `2026-04-09` — Codex conversation metadata enrichment (gitBranch & model)
  - Extract `gitBranch` from `session_meta.git.branch` and `model` from first `turn_context` event
  - JSONL streaming parse for both fields even when title/cwd come from SQLite (third-tier fallback)
  - UI: Display as outline badge (`git:branch-name`) and accent badge (`gpt-5.4`) in conversation list

- `2026-03-14` — Codex CLI support
  - New `"codex"` source type alongside Antigravity and Windsurf
  - Reads sessions directly from `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` — no running process or token required
  - Normalizes Codex JSONL events (`session_meta`, `user_message`, `assistant_message`, `tool_call`, `tool_result`, `exec`, `reasoning`, etc.) into the unified trajectory model
  - Extracts `title` / `cwd` from `session_meta` and first user message headers
  - Trajectory viewer with full filter/inspector support
  - New `GET /api/sources` `codex` status entry
  - Diagnostic export includes raw JSONL events
  - Codex roots section in Settings; default root: `~/.codex/sessions`
- `2026-03-13` — Multi-root scaling milestone (`refs: #6`)
  - Per-root health indicators in Settings (missing, unreadable, slow, file count)
  - Duplicate session detection across roots with UI affordance in Viewer
  - Cached directory listing with TTL and mtime-based invalidation for faster scans
  - New `GET /api/root-health` endpoint
- `2026-03-11` — Search and filtering milestone completed via GitHub issue `#5` and PR `#22`
  - Added full-text event search
  - Improved conversation filtering flow

### Fixed

- `2026-04-18` — Project Overview seed data labeling
  - Marked the default Project Overview asset/finding/attention summary as foundation sample data instead of implying it is live project inventory

- `2026-04-09` — Conversation list race condition when deep-linking to Codex
  - Fixed `loadList` AbortController to cancel in-flight fetches when source changes rapidly
  - Prevents Antigravity conversation list from overwriting Codex list on initial page load with `?source=codex` URL

- `2026-04-09` — Hot reload (Fast Refresh) no longer clears deep-link URL state
  - Add `restorationInitiatedRef` and `restorationCompletedRef` to track restoration lifecycle
  - Re-parse URL from `window.location.search` on mount to preserve deep-link parameters across hot reloads
  - Defer clearing `urlInitRef` until after restoration completes to prevent premature URL sync
  - Add `selectedButtonRef` with auto-scroll behavior for selected conversation in the list

- `2026-04-09` — Duplicate user messages in Codex trajectory view
  - Remove consecutive identical messages caused by Codex CLI emitting both `response_item` and `event_msg` for the same content
- `2026-04-08` — Conversation search filtering accuracy
  - Search now matches only `title` (not internal `id`) when a human-readable title is present
  - Fixes false positives when searching "rollout" (Codex session IDs always start with `rollout-`)
  - Updated search placeholder to "Search by title or path…"

### Improved

- `2026-04-08` — Codex title/cwd enrichment upgraded to three-tier strategy
  - Tier 1: `session_index.jsonl` for manually renamed titles
  - Tier 2: `state_5.sqlite` for auto-generated titles and `cwd`
  - Tier 3: JSONL streaming parse as fallback
- `2026-03-12` — Clarified and unified Viewer view-mode semantics
  - Unified readability mode naming to `Compact` and made it the first/default tab across sources
  - Clarified that RPC shape differences do not imply source capability differences
  - Kept normalized `Transcript`/`Trajectory` as the cross-source canonical surfaces
  - Detailed semantics and alignment notes: `docs/viewer/trajectory-view.md`
- `2026-03-10` — Error center milestone completed via GitHub issue `#2` and PRs `#17`, `#18`, `#19`, `#20`
  - Added grouped error navigation behavior
  - Improved selection, highlight, and “only errors” browsing flow
- `2026-03-10` — Inspector v2 milestone completed via GitHub issue `#3` and PRs `#13`, `#16`
  - Added collapsible structured JSON viewing
  - Fixed async copy behavior and stale expansion state
- `2026-03-03` to `2026-03-10` — Connection diagnostics milestone completed via GitHub issue `#1` and PRs `#9`, `#14`
  - Expanded source diagnostics and token/source classification
  - Improved attach evidence surfaced in the UI

## Pre-Issue History

### `2026-03-03` to `2026-03-04`

- Strengthened Antigravity attach and troubleshooting before the GitHub issue workflow was in place
  - Switched Antigravity attach toward log-derived pid/port probing with HTTPS handling and legacy discovery fallback
  - Documented stale discovery troubleshooting and `state.vscdb`-based title / cwd enrichment
- Modernized the viewer baseline
  - Introduced the Tailwind / shadcn migration foundation
  - Improved trajectory UX around the transcript-first viewer

### `2026-02-27`

- Added the transcript-first trajectory viewer baseline
  - Unified trajectory events across Antigravity and Windsurf
  - Added virtualized rendering for long trajectories
  - Added Antigravity trajectory view plus diagnostic export
- Hardened Windsurf attach for the versions verified at that time
  - Scanned all Windsurf log session folders
  - Improved resilience to stale pid values and CSRF-token flag variations
- Expanded technical documentation
  - Added the unified trajectory viewer ADR and viewer UX notes
  - Added local storage notes, verified environment records, and multi-profile troubleshooting

### `2026-02-26`

- Bootstrapped the project
  - Added the initial local UI for browsing Antigravity / Windsurf sessions
  - Added parser-focused Vitest coverage
  - Added ADR-001 and the first roadmap
- Added Antigravity metadata enrichment
  - Read title / cwd from Antigravity `state.vscdb`
- Clarified initial Windsurf attach behavior
  - Standardized README guidance
  - Improved Windsurf log session folder scanning
