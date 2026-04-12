# Changelog

This file records shipped, merged changes for Agent Storage Manager.

**SSoT/DRY**

- `README.md` describes the current product surface and runtime prerequisites.
- GitHub Issues track active execution work (0-2 weeks) and mid-term planning with labels/milestones.
- This file captures completed milestones so they are not duplicated elsewhere.
- GitHub Issues / PRs are optional references. For older work or ad-hoc work, plain dated entries here are still valid.

## Unreleased

### Added

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
