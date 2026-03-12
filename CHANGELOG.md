# Changelog

This file records shipped, merged changes for Agent Storage Manager.

**SSoT/DRY**

- `README.md` describes the current product surface and runtime prerequisites.
- `ROADMAP.md` tracks open and planned work only.
- This file captures completed milestones so they do not remain duplicated in the roadmap.
- GitHub Issues / PRs are optional references. For older work or ad-hoc work, plain dated entries here are still valid.

## Unreleased

### Added

- `2026-03-11` — Search and filtering milestone completed via GitHub issue `#5` and PR `#22`
  - Added full-text event search
  - Improved conversation filtering flow

### Improved

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
