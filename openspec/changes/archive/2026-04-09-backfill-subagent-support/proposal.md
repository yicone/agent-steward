## Why

Subagent behavior is already implemented across Antigravity, Codex, and the viewer, but it is not yet captured as an OpenSpec capability. Backfilling the current behavior gives future changes a normative reference and reduces the risk of regressions during parser or UI refactors.

## What Changes

- Document the existing normalized `subagent` trajectory event behavior for Antigravity and Codex.
- Capture the current heuristics and metadata preservation rules used for Codex subagent detection.
- Capture the current viewer behavior for rendering, counting, searching, and filtering subagent events.

## Capabilities

### New Capabilities
- `subagent-events`: Normalized subagent event detection, metadata preservation, and viewer presentation across supported sources.

### Modified Capabilities

## Impact

- Affected code:
  - `src/lib/parse/antigravitySteps.ts`
  - `src/lib/parse/codexLog.ts`
  - `src/lib/parse/trajectory.ts`
  - `src/lib/types.ts`
  - `src/components/HomeClient.tsx`
  - `tests/antigravitySteps.test.ts`
  - `tests/codexLog.test.ts`
- No intended runtime behavior changes; this change documents current behavior.
