# Roadmap

This document is the forward-looking plan for Agent Storage Manager. It is not a commitment; items may change as upstream products evolve.

**SSoT/DRY:** The canonical technical decision for “how we read sessions” lives in `docs/adr/ADR-001-use-language-server-rpc.md`. Historical shipped work lives in `CHANGELOG.md`. This roadmap stays future-looking. GitHub Issues are optional execution references, not the primary structure of this document.

## Guiding principles

- Local-first and privacy-preserving (no cloud sync required)
- Prefer stable runtime interfaces over reverse engineering storage formats
- Make failures diagnosable (clear errors, actionable remediation)
- Keep configuration explicit and portable

## Tracking conventions

- Organize roadmap items by **product / engineering theme**, not by GitHub issue number.
- Add GitHub references only as secondary metadata when they exist, using `refs: #...`.
- If a task has no GitHub Issue, record it here normally and move it to `CHANGELOG.md` when shipped.
- If a theme spans multiple issues or PRs, keep the roadmap entry at the theme level and let GitHub carry the execution breakdown.

## Now

- Platform abstraction for discovery (`refs: #8`)
  - Separate per-product attach/discovery details behind a cleaner internal interface
  - Preserve source diagnostics so attach failures remain debuggable instead of becoming opaque
- Multi-root scaling (`refs: #6`)
  - Add per-root health indicators
  - Detect duplicate sessions across roots
  - Improve session-list scanning with caching / incremental refresh for larger roots
- Viewer deep links (`refs: #4`)
  - Persist selected root/session/view/filter state in the URL
  - Support direct links into a specific event or error location
- Rendering hardening
  - Handle missing / partial trajectories and deleted sessions more gracefully than today’s raw backend errors
  - Define clearer degraded states for partial content, stale selections, and unavailable follow-up pages
- Test and harden the current implementation
  - Expand parser / normalization coverage for version-sensitive attach logic
  - Add targeted fixture-driven integration tests where feasible

## Next

- Privacy redaction options (`refs: #7`)
  - Redact sensitive values from diagnostics / exports on demand
  - Make redaction state explicit so exported artifacts are interpretable
- Search and navigation follow-through (`refs: shipped work in #5`)
  - Extend the current search/filter baseline into a more shareable navigation model
  - Keep search semantics, highlighting, and deep-link behavior aligned as URL state matures
- Export
  - Export a session as Markdown/JSON (local file download)
  - Batch export for a root
- Safer config handling
  - Validate config schema on read/write
  - Provide “reset to defaults”
- Cross-platform readiness
  - Generalize path/discovery assumptions beyond current macOS-first support once discovery abstraction is in place

## Later (v1.0)

- UI polish and accessibility
- Clear versioning and release packaging
  - Changelog discipline
  - Optional prebuilt binaries / packaged app (if the project direction requires it)

## Explicitly out of scope (for now)

- Offline decoding/reconstruction of `.pb` sessions (see ADR-001)
- Starting or managing the upstream Language Server processes automatically
