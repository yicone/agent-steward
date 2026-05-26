# Trajectory Viewer

## Purpose

This document defines the unified trajectory model and Viewer behavior shared across agents.
It covers:

- Canonical event schema (`TrajectoryEvent`, `TrajectorySummary`)
- Source adapters (Antigravity and Windsurf)
- Viewer rendering semantics (grouping, collapse, virtualization)
- Current gaps between API capability and UI exposure

Relevant implementation:

- `src/lib/types.ts`
- `src/lib/parse/trajectory.ts`
- `src/lib/parse/antigravitySteps.ts`
- `src/lib/parse/windsurfSteps.ts`
- `src/lib/server/antigravity.ts`
- `src/lib/server/windsurf.ts`
- `src/lib/server/cursor.ts`
- `src/app/api/conversations/[source]/[id]/route.ts`
- `src/components/HomeClient.tsx`

## Unified Event Model

`TrajectoryEvent` fields:

- identity: `id`, `index`, `source`, `executionId`
- classification: `kind`, `stepType`, `status`
- content: `title`, `text`, `output`, `toolCalls`
- command context: `commandLine`, `cwd`, `exitCode`
- timestamps: `createdAt`, `completedAt`

`TrajectorySummary` fields:

- `totalSteps`
- `renderedEvents`
- `userCount`, `assistantCount`, `thoughtCount`
- `toolCount`, `commandCount`, `errorCount`

Shared helpers:

- `summarizeTrajectoryEvents(events, totalSteps)`
- `trajectoryEventsToChatMessages(events)`

## Agent Adapters

### Antigravity

Input:

- `GetCascadeTrajectory` payload (`trajectory.steps`)

Output:

- `TrajectoryEvent[]` + `TrajectorySummary`

Special normalization rules:

1. command status deduplication:
   - keep transitions for each `commandId`
   - drop repeated same-status updates
2. output truncation:
   - `thinking` 12000, `response` 16000, command output 20000
   - `sendCommandInput` 10000, error 8000, fallback payload 5000
3. ANSI cleanup:
   - strip terminal escape sequences before rendering output

### Windsurf

Input:

- `GetCascadeTrajectorySteps` pages

Output:

- `TrajectoryEvent[]` + `TrajectorySummary` via `normalizeWindsurfStepsToTrajectoryEvents`
- legacy chat messages still supported via `trajectoryEventsToChatMessages`

Clarification:

- Windsurf steps are not inherently “more chat-shaped” than Antigravity trajectory.
- For both sources, transcript/chat is a projection from normalized events; process view and transcript view share the same data backbone.

Current mapping highlights:

- `userInput` -> `user`
- `plannerResponse.thinking` -> `thought`
- `plannerResponse.response/modifiedResponse` -> `assistant`
- `systemMessage` -> `status`
- unmatched payload -> `tool` with truncated raw JSON

### Cursor

Input:

- `composerData:<composerId>` JSON from `cursorDiskKV` table in `state.vscdb`
- `bubbleId:<composerId>:<bubbleId>` entries read in `fullConversationHeadersOnly` order

Output:

- `TrajectoryEvent[]` + `TrajectorySummary` via `buildCursorEvents` + `buildCursorSummary`

Special normalization rules:

1. Bubble types: `type=1` → `kind: "user"`; `type=2` → `kind: "assistant"`
2. Tool-call infrastructure bubbles (empty assistant, `capabilityType` present, no text) are skipped
3. Summary fallback: when no `fullConversationHeadersOnly` headers exist or bubble reads fail, `extractSummaryText` provides a single `assistant` summary event
4. `extractSummaryText` strips Cursor AI conversation-context XML format (`Summary of the conversation so far:...`) and `<summary>` wrappers (including truncated forms)

## API Surface

- Antigravity conversation API returns trajectory by default:
  - `kind: "trajectory"`, `source: "antigravity"`, `events`, `summary`, optional `markdown`
- Windsurf conversation API has two modes:
  - default: `kind: "chat"`
  - `view=trajectory`: `kind: "trajectory"`, `source: "windsurf"`, `events`, `summary`
- Cursor conversation API always returns trajectory:
  - `kind: "trajectory"`, `source: "cursor"`, `events`, `summary`
  - No paging required; full bubble content read synchronously from local SQLite

Historical note:

- The Windsurf default `chat` mode is retained for legacy compatibility.
- Viewer default behavior is transcript-first on trajectory-backed data.

## View-Type Semantics (Compact / Transcript / Trajectory)

The view types are intentionally different projections with different goals. `Compact` is the unified name for source-specific readability modes (Windsurf chat + Antigravity markdown). Cursor has no Compact mode and defaults directly to `Transcript`.

- `Compact` (default, first tab for Antigravity/Windsurf only):
  - unified UX label with source-specific backing
    - Windsurf: legacy `chat` payload/message list
    - Antigravity: vendor `markdown` from `ConvertTrajectoryToMarkdown`
    - Cursor: **no Compact mode** — `Transcript` is the default entry point
  - optimized for quick reading with lower structural density
- `Transcript`:
  - source-agnostic projection from normalized `TrajectoryEvent[]`
  - conversation-first readability (`user` / `assistant` bubbles)
  - surfaces error-like and key-status events; keeps tool/command detail in `Actions` foldouts
- `Trajectory`:
  - process-first event stream for diagnostics and deep inspection
  - filter/group/search/error-center capabilities rely on structured events

Practical distinction (structure/readability):

- `Compact` is the easiest to skim but differs in structure between Windsurf and Antigravity today.
- `Transcript` and `Trajectory` share the normalized event backbone and are the alignment baseline for cross-source consistency.
- The current alignment gap to investigate: how to reduce semantic drift between Windsurf compact (`chat`) and Antigravity compact (`markdown`) while preserving readability.

## Viewer Semantics

Default mode: `Compact`

- uses source-specific compact backing:
  - Windsurf: legacy `chat` message list
  - Antigravity: vendor `markdown` from `ConvertTrajectoryToMarkdown`
- optimized for quick reading with lower structural density than `Transcript` / `Trajectory`
- may omit fine-grained event structure and per-event tool/command details; use `Transcript` or `Trajectory` for deeper inspection

Conversation mode: `Transcript`

- source-agnostic projection from normalized `TrajectoryEvent[]`
- conversation-first readability (`user` / `assistant` bubbles)
- surfaces error-like and key-status events; keeps tool/command detail in `Actions` foldouts
- hides `thought`, successful `command`, and non-key `status`
- renders tools as a collapsible `Actions` row directly under the relevant assistant bubble
- keeps command/status counts in the `Actions` summary (details require switching to `Trajectory`)

Process mode: `Trajectory`

- filter chips by kind (`thought`, `tool`, `command`, `status`)
- includes an `Only errors` preset that filters to error-like events regardless of kind (e.g., failed commands, error status events) for quick triage
- grouped by `executionId`, fallback bucket `Ungrouped`
- Inspector Errors mode groups by execution + kind/stepType and supports prev/next navigation
- default expansion: latest execution expanded, older groups collapsed
- long sessions use virtualized rows with dynamic measurement + overscan
- each event card supports expandable details for `toolCalls` and `output`
- jump-to-error expands group, switches to trajectory view, scrolls to target row, and applies a temporary yellow highlight ring distinct from the selection ring

For compact-mode backing data:

- Windsurf compact uses `kind: "chat"` (legacy message projection)
- Antigravity compact uses `content.markdown` from `ConvertTrajectoryToMarkdown`
- Cursor has no compact mode; `Transcript` is always backed by `kind: "trajectory"` events

## Inspector and Error Center (Implemented)

The current Viewer includes a right-side Inspector panel (desktop) that supports:

- Inspecting a selected **event** (including copy-to-clipboard for key fields and raw JSON).
- Inspecting a selected **message** (role/text/payload).
- An **Errors** mode ("error center") listing detected error-like events.
  - Selecting an error jumps to the corresponding trajectory row:
    - expands the relevant `executionId` group
    - ensures the relevant kind filter is enabled
    - scrolls to and selects `event:<eventId>`
  - Transcript "Actions" rows can also "Jump to Trajectory" for a related event id, switching the UI into Trajectory mode and auto-opening the details row when possible.

## Current Limits

- `executionId` quality depends on upstream data.
- sparse or unknown step payloads degrade to generic tool/raw event cards.
- virtualized rows may briefly reflow while heights are measured.
- Compact mode still has source-specific backing differences; see "View-Type Semantics" above for scope and alignment direction.
