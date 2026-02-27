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

Current mapping highlights:

- `userInput` -> `user`
- `plannerResponse.thinking` -> `thought`
- `plannerResponse.response/modifiedResponse` -> `assistant`
- `systemMessage` -> `status`
- unmatched payload -> `tool` with truncated raw JSON

## API Surface

- Antigravity conversation API returns trajectory by default:
  - `kind: "trajectory"`, `source: "antigravity"`, `events`, `summary`, optional `markdown`
- Windsurf conversation API has two modes:
  - default: `kind: "chat"`
  - `view=trajectory`: `kind: "trajectory"`, `source: "windsurf"`, `events`, `summary`

## Viewer Semantics

Default mode: `Transcript`

- shows `user` + `assistant` text plus error-like events
- shows key status events (e.g. running/canceled/timeout) as `system` bubbles
- hides `thought`, successful `command`, and non-key `status`
- renders tools as a collapsible `Actions` row directly under the relevant assistant bubble
- keeps command/status counts in the `Actions` summary (details require switching to `Trajectory`)

Process mode: `Trajectory`

- filter chips by kind (`thought`, `tool`, `command`, `status`)
- grouped by `executionId`, fallback bucket `Ungrouped`
- default expansion: latest execution expanded, older groups collapsed
- long sessions use virtualized rows with dynamic measurement + overscan
- each event card supports expandable details for `toolCalls` and `output`

For markdown rendering:

- currently available on Antigravity trajectories (`content.markdown`)

## Current Limits

- `executionId` quality depends on upstream data.
- sparse or unknown step payloads degrade to generic tool/raw event cards.
- virtualized rows may briefly reflow while heights are measured.
- Windsurf chat is treated as a legacy view; the UI defaults to `Transcript` (trajectory-backed) and pages via `stepOffset`.
