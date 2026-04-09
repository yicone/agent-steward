## Context

Agent Storage Manager already normalizes trajectory-like data from multiple sources into a shared event model. Recent shipped work added a dedicated `subagent` event kind, source-specific metadata, and viewer affordances for subagent events. The implementation spans source adapters, shared types, trajectory summary/search helpers, and the main viewer UI.

## Goals / Non-Goals

**Goals:**
- Describe the current shared model for subagent events.
- Record the source-specific mapping rules for Antigravity and Codex.
- Document the viewer expectations that depend on the normalized subagent model.

**Non-Goals:**
- Introduce new subagent classifications beyond current behavior.
- Replace Codex heuristic detection with a stronger protocol.
- Change viewer layout or badge styling.

## Decisions

- Use a dedicated `subagent` trajectory event kind instead of overloading `tool`.
  - This allows summary counts, filtering, and rendering to treat subagent work distinctly.
- Preserve a shared `subagent` metadata object with source-specific fields.
  - Shared fields such as `type`, `source`, `taskName`, and `taskDescription` support cross-source UI behavior.
  - Source-specific fields such as `antigravityStepType`, `codexFunctionName`, `codexCallId`, and `forkedFrom` preserve debuggability.
- Detect Codex subagent invocations heuristically from function-call names and selected argument fields.
  - This matches current upstream data shape and keeps non-subagent tools classified as `tool` events.
- Render subagent events with explicit viewer affordances.
  - The viewer exposes badges, filter toggles, summary counts, and search coverage for subagent fields.

## Risks / Trade-offs

- Heuristic Codex detection can misclassify future function names → Keep detection patterns explicit and backed by tests.
- Source-specific metadata may diverge over time → Keep the shared `subagent` shape stable and additive.
- UI behavior depends on normalized event kind semantics → Treat changes to `subagent` classification as spec changes, not incidental refactors.
