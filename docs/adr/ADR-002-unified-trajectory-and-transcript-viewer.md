# ADR-002: Unified Trajectory Event Model and Compact-First Viewer

- Status: Accepted
- Date: 2026-02-27

## Context

This project aims to let users review agent sessions “the way the official UI looks”, primarily as a readable conversation (transcript), and secondarily as a diagnostic/telemetry view.

We support multiple agents (Antigravity, Windsurf) that expose local Language Server (LS) RPCs. The raw RPC shapes differ by source:

- Antigravity: `GetCascadeTrajectory` returns a full `trajectory` object; `ConvertTrajectoryToMarkdown` provides a narrative alternate view.
- Windsurf: `GetCascadeTrajectorySteps` returns paged step chunks; a chat-like rendering can be derived but is a lossy projection.

Important clarification:

- Different RPC shapes do **not** imply that one source is inherently “more suitable” for transcript/chat than the other.
- Both sources expose enough semantic signal to build transcript and process views.
- The historical Windsurf chat-first path was a product/implementation sequencing choice (faster readable UX), not a hard data-capability limit.

Historically, different sources had different viewer UIs (Antigravity trajectory vs Windsurf chat), which made cross-agent behavior inconsistent and made long-session UX harder to evolve coherently.

## Decision drivers

- Provide a consistent cross-agent Viewer experience.
- Make compact readability the primary user workflow; keep normalized transcript/process data available on demand.
- Avoid losing information when switching views (transcript should be a projection, not a different data source).
- Keep long sessions stable and performant (grouping + virtualization).

## Considered options

1. Keep per-agent bespoke models and views
   - Pros: minimal refactors; can mirror each source independently
   - Cons: inconsistent UX; duplicated viewer logic; hard to add new agents

2. Keep Windsurf as “chat only”
   - Pros: simplest UI
   - Cons: chat is a lossy projection; cannot reliably support process analysis or consistent filters/grouping; risks incorrectly framing Windsurf data as “chat-only”

3. Adopt a unified event model + multiple projections (chosen)
   - Pros: consistent semantics; transcript and process views derived from the same data; simpler future agent onboarding
   - Cons: requires adapter work; demands clear UI semantics to keep transcript readable

## Decision

Introduce a unified trajectory event model and make the Viewer compact-first:

1) Unified event schema:

- Normalize all sources to `TrajectoryEvent[]` + `TrajectorySummary`.
- Preserve source identification and grouping via `source` and `executionId`.

2) Viewer projections from the same events:

- `Compact` (default): readability-first surface label that maps to source-specific compact renderings (`chat` for Windsurf, `markdown` for Antigravity).
  - Purpose: quick reading and low cognitive load.
  - Backing differs by source; structure parity is not guaranteed yet.
- `Transcript`: conversation-centric normalized projection from `TrajectoryEvent[]`.
  - Show `user` and `assistant` bubbles.
  - Surface error-like events (e.g. non-zero exit code, error status) and key status events (running/canceled/timeout).
  - Hide tool/command/thought details behind an `Actions` block attached to the relevant assistant bubble (or a fallback “Hidden summary” row when no attachment point is available).
- `Trajectory`: process-centric.
  - Full event stream with filters, execution grouping, and virtualized rendering.

3) Source retrieval strategy:

- Windsurf API supports both chat and trajectory modes; the Viewer requests trajectory-backed content by default (`view=trajectory`), with paging via `stepOffset` and optional `numTotalSteps`.
- Legacy Windsurf chat remains available (API default when `view` is omitted), but is not the Viewer default.
- Semantically, `Transcript`/`Trajectory` remain the canonical cross-source normalized surfaces; `Compact` is a unified label over source-specific readability renderings (`chat`/`markdown`) that still require alignment work.

## Consequences

- Consistent UX across sources (filters, summary badges, grouping, virtualization).
- Compact becomes the primary entry point while preserving drill-down to normalized transcript and full process data.
- Adds adapter and mapping work for new agents, but makes onboarding repeatable.
- Introduces an explicit compact-mode alignment track because Windsurf and Antigravity compact backings are structurally different today.
- Requires clear definitions of “error-like” and “key status” to avoid hiding important user-facing state.
- Diagnostic exports and raw payload views may include sensitive data (paths, tokens, prompts); the UI should warn users and the system should default to least exposure.

## Semantics (Minimum Contract)

These rules are best-effort and may evolve as upstream sources change. When in doubt, prefer surfacing information rather than hiding it.

- **Error-like**: prioritize surfacing when any of the following indicate failure:
  - `exitCode != 0`
  - `status` / `title` indicates an error (e.g. contains `ERROR`, `FAILED`, or equals `Error`)
  - adapter-detected tool failure (source-specific)
- **Key status**: surface status-like events that change user understanding of session lifecycle, such as:
  - running / in-progress
  - canceled / aborted
  - timeout

## Links

- Viewer semantics: `docs/viewer/trajectory-view.md`
- UI/UX optimization proposal: `docs/viewer/agent-ui-ux-optimization.md`
