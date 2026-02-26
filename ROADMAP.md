# Roadmap

This document is the forward-looking plan for Agent Storage Manager. It is not a commitment; items may change as upstream products evolve.

**SSoT/DRY:** The canonical technical decision for “how we read sessions” lives in `docs/adr/ADR-001-use-language-server-rpc.md`. This roadmap references it instead of repeating details.

## Guiding principles

- Local-first and privacy-preserving (no cloud sync required)
- Prefer stable runtime interfaces over reverse engineering storage formats
- Make failures diagnosable (clear errors, actionable remediation)
- Keep configuration explicit and portable

## Now (v0.x hardening)

- Improve connection diagnostics
  - Surface last-known Antigravity discovery file and Windsurf attach details (pid/port/token source)
  - Make “why it failed” clear and copyable
- Make rendering more robust
  - Handle missing/partial trajectories and deleted sessions gracefully
  - Add pagination/“load more” for large step sets
- Performance and UX
  - Faster session list scanning (cache meta; incremental updates)
  - Search/filter by id and basic metadata
- Testing
  - Expand unit tests around parsers and normalization
  - Add a small set of fixture-driven integration tests where feasible

## Next (v0.x features)

- Export
  - Export a session as Markdown/JSON (local file download)
  - Batch export for a root
- Better multi-root experience
  - Duplicate session detection (same id across roots)
  - Per-root health indicators
- Safer config handling
  - Validate config schema on read/write
  - Provide “reset to defaults”

## Later (v1.0)

- Cross-platform paths and discovery (macOS first today)
- UI polish and accessibility
- Clear versioning and release packaging
  - Changelog discipline
  - Optional prebuilt binaries / packaged app (if the project direction requires it)

## Explicitly out of scope (for now)

- Offline decoding/reconstruction of `.pb` sessions (see ADR-001)
- Starting or managing the upstream Language Server processes automatically

