# Roadmap

This document is the forward-looking plan for Agent Storage Manager. It is not a commitment; items may change as upstream products evolve.

**SSoT/DRY:** The canonical technical decision for “how we read sessions” lives in `docs/adr/ADR-001-use-language-server-rpc.md`. Historical shipped work lives in `CHANGELOG.md`. This roadmap stays future-looking. GitHub Issues are a useful planning index, but not a prerequisite for keeping this file accurate.

## Guiding principles

- Local-first and privacy-preserving (no cloud sync required)
- Prefer stable runtime interfaces over reverse engineering storage formats
- Make failures diagnosable (clear errors, actionable remediation)
- Keep configuration explicit and portable

## GitHub status snapshot (`2026-03-11`)

- Open planning issues:
  - `#8` Architecture Review v1: Platform abstraction for discovery
  - `#7` Architecture Review v1: Privacy redaction options
  - `#6` Architecture Review v1: Multi-root scaling (health, duplicates, caching)
  - `#4` Architecture Review v1: Viewer deep links (URL state)
- No open PRs at the time of this refresh.
- Recently completed items moved out of this file and into `CHANGELOG.md`:
  - `#5` Search + structured filters
  - `#3` Inspector v2 structured viewers
  - `#2` Error center upgrades
  - `#1` Connection diagnostics evidence chain
- If a future task has no GitHub Issue, record it here as a plain roadmap item and move it to `CHANGELOG.md` when shipped.

## Now

- `#8` Platform abstraction for discovery
  - Separate per-product attach/discovery details behind a cleaner internal interface
  - Preserve source diagnostics so attach failures remain debuggable instead of becoming opaque
- `#6` Multi-root scaling
  - Add per-root health indicators
  - Detect duplicate sessions across roots
  - Improve session-list scanning with caching / incremental refresh for larger roots
- `#4` Viewer deep links
  - Persist selected root/session/view/filter state in the URL
  - Support direct links into a specific event or error location
- Rendering hardening
  - Handle missing / partial trajectories and deleted sessions more gracefully than today’s raw backend errors
  - Define clearer degraded states for partial content, stale selections, and unavailable follow-up pages
- Test and harden the current implementation
  - Expand parser / normalization coverage for version-sensitive attach logic
  - Add targeted fixture-driven integration tests where feasible

## Next

- `#7` Privacy redaction options
  - Redact sensitive values from diagnostics / exports on demand
  - Make redaction state explicit so exported artifacts are interpretable
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
