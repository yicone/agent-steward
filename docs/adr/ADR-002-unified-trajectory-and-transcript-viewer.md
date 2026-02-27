# ADR-002: Unified Trajectory Event Model and Transcript-First Viewer

- Status: Accepted
- Date: 2026-02-27

## Context

This project aims to let users review agent sessions “the way the official UI looks”, primarily as a readable conversation (transcript), and secondarily as a diagnostic/telemetry view.

We support multiple agents (Antigravity, Windsurf) that expose local Language Server (LS) RPCs. The raw RPC shapes differ by source:

- Antigravity: `GetCascadeTrajectory` returns a full `trajectory` object; `ConvertTrajectoryToMarkdown` provides a narrative alternate view.
- Windsurf: `GetCascadeTrajectorySteps` returns paged step chunks; a chat-like rendering can be derived but is a lossy projection.

Historically, different sources had different viewer UIs (Antigravity trajectory vs Windsurf chat), which made cross-agent behavior inconsistent and made long-session UX harder to evolve coherently.

## Decision drivers

- Provide a consistent cross-agent Viewer experience.
- Make the transcript the primary user workflow; keep detailed process data available on demand.
- Avoid losing information when switching views (transcript should be a projection, not a different data source).
- Keep long sessions stable and performant (grouping + virtualization).

## Considered options

1. Keep per-agent bespoke models and views
   - Pros: minimal refactors; can mirror each source independently
   - Cons: inconsistent UX; duplicated viewer logic; hard to add new agents

2. Keep Windsurf as “chat only”
   - Pros: simplest UI
   - Cons: chat is a lossy projection; cannot reliably support process analysis or consistent filters/grouping

3. Adopt a unified event model + multiple projections (chosen)
   - Pros: consistent semantics; transcript and process views derived from the same data; simpler future agent onboarding
   - Cons: requires adapter work; demands clear UI semantics to keep transcript readable

## Decision

Introduce a unified trajectory event model and make the Viewer transcript-first:

1) Unified event schema:

- Normalize all sources to `TrajectoryEvent[]` + `TrajectorySummary`.
- Preserve source identification and grouping via `source` and `executionId`.

2) Viewer projections from the same events:

- `Transcript` (default): conversation-centric.
  - Show `user` and `assistant` bubbles.
  - Surface error-like events (e.g. non-zero exit code, error status) and key status events (running/canceled/timeout).
  - Hide tool/command/thought details behind an `Actions` block attached to the relevant assistant bubble.
- `Trajectory`: process-centric.
  - Full event stream with filters, execution grouping, and virtualized rendering.
- `Markdown` (where available): vendor-provided narrative rendering (Antigravity only).

3) Source retrieval strategy:

- Windsurf defaults to trajectory-backed rendering (`view=trajectory`), with paging via `stepOffset` and optional `numTotalSteps`.
- Legacy Windsurf chat remains available, but is not the default.

## Consequences

- Consistent UX across sources (filters, summary badges, grouping, virtualization).
- Transcript becomes the primary experience while preserving drill-down to full process data.
- Adds adapter and mapping work for new agents, but makes onboarding repeatable.
- Requires clear definitions of “error-like” and “key status” to avoid hiding important user-facing state.

## Links

- Viewer semantics: `docs/viewer/trajectory-view.md`
- UI/UX optimization proposal: `docs/viewer/agent-ui-ux-optimization.md`
