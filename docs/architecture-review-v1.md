# Architecture Review (v1)

Date: 2026-03-04

This document is a comprehensive review of the current `agent-storage-manager` architecture, the key evolutions that have already shipped, and the highest-value directions to go deeper next.

Primary references:

- `README.md`
- `ROADMAP.md`
- `docs/adr/ADR-001-use-language-server-rpc.md`
- `docs/adr/ADR-002-unified-trajectory-and-transcript-viewer.md`
- `docs/viewer/trajectory-view.md`
- `docs/storage/local-storage-notes.md`

---

## 1) Product & Non-Goals

**What this is**

- A **local-first** Web UI (Next.js) for browsing agent conversation history from **Antigravity** and **Windsurf**.
- The core value is **readability** (transcript-like viewing) with **diagnosability** (trajectory/process details, raw payload export) when needed.

**Explicit non-goals (today)**

- Offline decoding / reconstruction of `.pb` session files as a stable primary data source.
- Starting/managing upstream Language Server processes.

See: `docs/adr/ADR-001-use-language-server-rpc.md`, `ROADMAP.md`.

---

## 2) System Overview (Data Flow)

At a high level, the app implements a “scan → enrich → fetch → normalize → project → render” pipeline:

1. **Scan session files** (`.pb`) in configured roots.
2. **Enrich list metadata** (title/cwd) from upstream runtime data when available.
3. **Fetch session content** via local Language Server (LS) RPC.
4. **Normalize** raw source shapes into a unified event model.
5. **Project** unified events into multiple viewing modes:
   - Transcript (default)
   - Trajectory (process)
   - Markdown (vendor narrative; Antigravity only)
   - Legacy chat (Windsurf only; compatibility/contrast)
6. **Render** long sessions efficiently (grouping + virtualization) and expose diagnostics (Inspector, error center, export).

Key implementation entry points:

- List API: `src/app/api/conversations/route.ts`
- Content API: `src/app/api/conversations/[source]/[id]/route.ts`
- Diagnostic export API: `src/app/api/conversations/[source]/[id]/diagnostic/route.ts`
- Viewer: `src/components/HomeClient.tsx`

---

## 3) Sources, Roots, and Configuration

### 3.1 Roots

Session files are discovered by scanning configured root directories for `*.pb` files.

- Default roots:
  - Antigravity: `~/.gemini/antigravity/conversations`
  - Windsurf: `~/.codeium/windsurf/cascade`
- Config file: `~/.agent-storage-manager/config.json`
- Override config path for local debugging: `AGENT_STORAGE_MANAGER_CONFIG_PATH`

Implementation:

- Config read/write + sanitization: `src/lib/server/config.ts`
- Root expansion (`~`): `src/lib/server/paths.ts`
- File scanning: `src/lib/server/conversations.ts`

### 3.2 Source status / attach preconditions

The app needs upstream products running to fetch readable content.

- Antigravity: prefer **log-based attach** to locate the LS pid/ports; discovery file is legacy fallback and may be stale.
- Windsurf: parse LS pid/port from logs, then try to read `--csrf_token` from process args; allow manual override if needed.

Implementation:

- Antigravity attach + discovery fallback: `src/lib/server/antigravity.ts`
- Windsurf attach: `src/lib/server/windsurf.ts`
- Log parsing helpers: `src/lib/parse/antigravityLog.ts`, `src/lib/parse/windsurfLog.ts`
- CSRF token extraction: `src/lib/parse/commandLine.ts`

Rationale and observed storage structures:

- `docs/adr/ADR-001-use-language-server-rpc.md`
- `docs/storage/local-storage-notes.md`

---

## 4) RPC Layer (Connect/JSON Unary)

### 4.1 Why LS RPC is the source of truth

The `.pb` session files are treated as **indexable blobs** (for discovery/mtime/size), not as a stable transcript format.
Readable content and faithful reconstruction are obtained via LS RPC, aligning with upstream UI behavior and improving resilience across upstream changes.

See: `docs/adr/ADR-001-use-language-server-rpc.md`.

### 4.2 Connect/JSON client

The server runtime issues Connect-protocol unary POSTs with:

- `Content-Type: application/json`
- `Connect-Protocol-Version: 1`
- optional `x-codeium-csrf-token` header

Implementation: `src/lib/server/connect.ts`.

### 4.3 RPCs currently used

Antigravity (trajectory + markdown):

- `GetCascadeTrajectory`
- `ConvertTrajectoryToMarkdown`
- `GetAllCascadeTrajectories` (metadata enrichment; best-effort)

Windsurf (paged steps + list meta):

- `GetCascadeTrajectory` (to probe `numTotalSteps` when possible)
- `GetCascadeTrajectorySteps` (paged)
- `GetAllCascadeTrajectories` (metadata enrichment)

Implementation:

- `src/lib/server/antigravity.ts`
- `src/lib/server/windsurf.ts`
- Content routing: `src/app/api/conversations/[source]/[id]/route.ts`

---

## 5) Unified Event Model (Normalization Layer)

### 5.1 The model

All sources are normalized to:

- `TrajectoryEvent[]`
- `TrajectorySummary`

Key fields:

- identity: `id`, `index`, `source`, `executionId`
- classification: `kind`, `stepType`, `status`
- content: `title`, `text`, `output`, `toolCalls`
- command context: `commandLine`, `cwd`, `exitCode`
- timestamps: `createdAt`, `completedAt`

See: `docs/viewer/trajectory-view.md` and type definitions in `src/lib/types.ts`.

### 5.2 Antigravity normalization highlights

- `CORTEX_STEP_TYPE_*` mapping to unified `kind` buckets
- Command status de-duplication (drop repeated identical updates per `commandId`)
- Output truncation and ANSI cleanup (avoid UI blowups)
- Broad “tool” coverage for common action-like steps (view file, list dir, grep, etc.)

Implementation: `src/lib/parse/antigravitySteps.ts`.

### 5.3 Windsurf normalization highlights

- Paged `GetCascadeTrajectorySteps` pages normalized to events
- Skips `CORTEX_STEP_STATUS_CLEARED` by default (closer to upstream UI behavior), with a UI toggle to include
- Unknown shapes degrade to a generic tool-like event with truncated raw JSON

Implementation: `src/lib/parse/windsurfSteps.ts`.

### 5.4 Why the unified model matters

The unified model is the leverage point that enables:

- Consistent multi-source Viewer UX (same filters, grouping, virtualization, summary)
- Multiple projections (Transcript vs Trajectory vs Markdown) without inventing new data sources
- Repeatable onboarding for new agent sources (adapter + contract)

See: `docs/adr/ADR-002-unified-trajectory-and-transcript-viewer.md`.

---

## 6) Viewer Semantics (Projection + UX)

### 6.1 Views and projections

- **Transcript (default)**: conversation-first, shows user + assistant + errors/critical statuses. Most tool/command/thought details are hidden behind an “Actions” row.
- **Trajectory**: process-first, full event stream with kind filters and `executionId` grouping.
- **Markdown**: vendor narrative view (Antigravity only; derived from LS).
- **Legacy chat**: Windsurf-only compatibility view (lossy).

See: `docs/viewer/trajectory-view.md`.

### 6.2 Execution grouping

Events are grouped by `executionId` (best-effort). Groups are collapsible; default expansion prefers the latest group.

Implementation: `src/components/HomeClient.tsx`.

### 6.3 Performance strategy

- Long sessions are rendered via **virtualized rows** with dynamic measurement + overscan.
- Grouping + virtualization is shared across Transcript and Trajectory modes.

Implementation: `src/components/HomeClient.tsx` (virtualization logic lives in the same file today).

### 6.4 Inspector and error center (shipped)

The Viewer includes a right-side Inspector panel with:

- Inspect selected **event** and **message** (structured fields + raw JSON, copy-to-clipboard)
- **Errors mode** (error center): list detected error-like events and jump to the corresponding trajectory row
- “Jump to Trajectory” from Transcript Actions rows when a relevant event id exists

Implementation: `src/components/HomeClient.tsx`.

---

## 7) Diagnostics & Export

The app supports per-session diagnostic export as JSON. This is intended for:

- Debugging attach issues (pid/port/token presence)
- Inspecting raw LS payloads vs rendered content
- Comparing UI-visible process data vs normalized projections

Implementation:

- Export builder: `src/lib/server/diagnosticExport.ts`
- API route (download attachment): `src/app/api/conversations/[source]/[id]/diagnostic/route.ts`

Important: exports may contain sensitive data (paths, prompts, outputs, tokens) and should warn users accordingly.

---

## 8) “What Has Evolved” (Shipped Milestones)

This is a condensed narrative of the already-shipped evolution:

1. **2026-02-26**: ADR-001 accepted — LS RPC becomes source of truth (no offline `.pb` reconstruction).
2. **2026-02-27**: ADR-002 accepted — unified event model + transcript-first Viewer as the stable UI foundation.
3. **Meta enrichment hardening**: Antigravity list metadata improved via `state.vscdb` extraction to better match upstream UI.
4. **Attach hardening**: Antigravity upgraded to prefer log-based attach (random ports, stale discovery issues); Windsurf attach improved by scanning logs for viable candidates.
5. **Viewer UX baseline**: execution grouping, virtualization, Transcript Actions, Inspector + error center shipped.
6. **UI migration foundation**: Tailwind v4 + shadcn/ui introduced for incremental modernization.
7. **Test baseline**: unit tests for parsers/normalization and key helpers in `tests/`.

For the most detailed “facts on disk” about storage and attach behavior, see `docs/storage/local-storage-notes.md`.

---

## 9) Highest-Value Deepening Directions (Recommended)

This section focuses on directions with high leverage, high reuse, and/or strong risk reduction.

### 9.1 Connection diagnostics as a first-class UX

Goal: make “why it failed” immediately clear and copyable.

Concrete ideas:

- Surface attach evidence chain (log path chosen, parsed pid/port, token source, heartbeat probe result).
- Add a “copy diagnostics” button near source status pills.
- Align error messages across sources with consistent remediation steps.

Why it’s valuable: reduces support/debug time and increases trust; directly maps to `ROADMAP.md` “Improve connection diagnostics”.

### 9.2 Inspector “v2” (structured viewers)

Goal: keep Transcript readable while making deep inspection more powerful.

Concrete ideas:

- JSON viewer with collapse/search (instead of `<pre>` only).
- ANSI-aware output viewer (optional; keep sanitized output as default).
- Unified “raw step” + “normalized event” comparison panel (great for adapter debugging).

This is the natural extension of what is already shipped.

### 9.3 Error center upgrades

Goal: treat errors as a navigable index across long sessions.

Concrete ideas:

- Group errors by executionId + kind + stepType.
- Add “only errors” filter preset and a “next/prev error” navigation.
- Highlight scrolled-to row (transient background).

### 9.4 Search + deep links

Goal: make long-session navigation fast and shareable locally.

Concrete ideas:

- Full-text search across user/assistant/output (with highlighting).
- Structured filters (kind, stepType, toolName, hasOutput, onlyErrors).
- Persist Viewer state in URL query:
  `source / selectedId / view / filters / selectedEventId`.

### 9.5 Multi-root scale and correctness

Goal: handle large datasets and external drives without UX degradation.

Concrete ideas:

- Duplicate session detection across roots (same id).
- Per-root health indicators (missing dir, permissions, slow IO).
- Incremental scanning / caching to avoid repeated full directory stats.

### 9.6 Privacy & redaction knobs

Goal: keep “local-first” practical for sharing exports/screenshots.

Concrete ideas:

- Optional redaction pass for known patterns (tokens, absolute paths).
- “Show raw” toggle for power users.
- Make export warnings unavoidable but not noisy.

### 9.7 Cross-platform and packaging

Goal: move from “macOS-first” to “portable enough for v1.0”.

Concrete ideas:

- Abstract path discovery and log locations behind a platform layer.
- Add docs/notes for Windows/Linux equivalent locations once validated.

---

## 10) Architectural Risks & Watch Items

- **Upstream volatility**: LS RPC payload shapes, step types, and security requirements (CSRF) can change.
  - Mitigation: adapter tests + diagnostic export + degrade-to-raw-event fallback.
- **Attach fragility**: log parsing and process-args token extraction may fail under OS permissions changes.
  - Mitigation: clearer remediation, token override, heartbeat probing strategy.
- **Performance cliffs**: very large sessions and many roots can stress IO and render loops.
  - Mitigation: caching, incremental scanning, virtualization, summarized projections.
- **Sensitive data exposure**: raw payloads and exports can include secrets.
  - Mitigation: warnings + optional redaction + “least exposure” defaults.

---

## 11) Suggested Next Deliverables (90% value with minimal scope)

If prioritizing impact per engineering time, a pragmatic sequence is:

1. Connection diagnostics UX improvements (status → evidence → remediation).
2. Error center enhancements (grouping, jump, highlight).
3. Inspector v2 (JSON viewer + copy/download affordances).
4. Search + deep links (incremental; start with client-side search on loaded content).
5. Multi-root caching and duplicate detection.

This sequence preserves the current architectural “spine” (LS RPC → normalize → project) while increasing usability and debuggability.
