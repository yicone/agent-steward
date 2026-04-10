## Context

The product is moving from a session-first viewer toward a project-first, local-first, multi-agent context cockpit. Existing source adapters already normalize source-specific data into shared event structures for viewer and analysis use, but there is not yet a formal `Session Record` contract that is stable enough to serve as a backup boundary.

The design must address two risks at the same time:

- upstream source drift, where agent vendors change raw session file formats, storage locations, or runtime retrieval behavior
- product-side safety, where backup and import workflows must never mutate or endanger the original session source

The outcome should be a v1 baseline that is portable, versioned, and product-readable without promising full round-trip restoration into third-party agent runtimes.

## Goals / Non-Goals

**Goals:**

- Define a minimal canonical `Session Record` contract that is complete enough for backup.
- Make `Session Backup` default to canonical records, not transcripts or raw source copies.
- Keep raw source preservation available through explicit opt-in.
- Define restore/import semantics around restoring product-readable state.
- Leave a clean extension point for future `Project Bundle` packaging.

**Non-Goals:**

- Reconstruct or write back session state into third-party private stores.
- Promise lossless round-trip compatibility with vendor-specific source formats.
- Require all rendered session views to be embedded in the backup package.
- Turn `Project Bundle` into a v1 deliverable.

## Decisions

### 1. `Session Record` becomes the canonical boundary for backup

The product will define a stable session record contract with the fields backup needs, instead of backing up whichever internal API payloads happen to exist today.

Rationale:

- `Session View` is too presentation-specific and loses structure.
- `Session Source` is too vendor-coupled and unstable.
- `Session Record` is the right middle layer for local-first portability, analysis, and future migration.

Alternatives considered:

- Backup transcript/markdown output by default: rejected because it is lossy and weak for cross-agent analysis.
- Backup raw source by default: rejected because it is brittle, privacy-heavy, and not product-level.

#### Current normalization inventory by source

The current product already has source-specific retrieval paths that normalize into shared session/event structures before backup:

- `Antigravity`
  - raw storage roots are file-backed (`~/.gemini/antigravity/conversations`) but product retrieval favors LS/runtime access and normalized trajectory events
  - current viewer-facing normalization flows through `src/lib/server/antigravity.ts` and `src/lib/parse/antigravitySteps.ts`
- `Windsurf`
  - raw storage roots are file-backed (`~/.codeium/windsurf/cascade`) but current session materialization also depends on LS/runtime attach behavior for full-fidelity retrieval and diagnostics
  - current viewer-facing normalization flows through `src/lib/server/windsurf.ts` and `src/lib/parse/windsurfSteps.ts`
- `Codex`
  - session retrieval is directly file-backed from `.jsonl` session logs under `~/.codex/sessions`, with title/meta enrichment from `session_index.jsonl` and `state_5.sqlite`
  - current viewer-facing normalization flows through `src/lib/server/codex.ts` and `src/lib/parse/codexLog.ts`

These source-specific paths are intentionally not the backup contract. They are inputs that must normalize into a stable `Session Record`.

### 2. The canonical record contract is intentionally minimal but versioned

The initial contract should require:

- `schemaVersion`
- stable `sessionId`
- `source` and source metadata
- `sourceRef`
- `provenance`
- normalized `events`
- `summary`
- `timestamps`

Optional fields can include embedded source copy, derived transcript snapshots, tags, and local notes.

Rationale:

- v1 needs enough structure for backup and import, but should not freeze every internal field prematurely.
- versioning allows controlled evolution and later migration tooling.

Alternative considered:

- wait for a "complete" internal session model before defining backup: rejected because it delays backup indefinitely and leaves the product exposed to upstream drift.

#### Proposed `Session Record v1` shape

`Session Record v1` should be a product-level document with a stable top-level contract:

```json
{
  "schemaVersion": "session-record/v1",
  "session": {
    "id": "string",
    "source": "antigravity | windsurf | codex",
    "sourceSessionId": "string | null",
    "rootId": "string | null",
    "title": "string | null",
    "cwd": "string | null",
    "gitBranch": "string | null",
    "model": "string | null"
  },
  "sourceRef": {
    "kind": "file | sqlite | app_storage | runtime_rpc | unknown",
    "locator": "string",
    "snapshotTime": "ISO-8601 string | null"
  },
  "provenance": {
    "capturedBy": "agent-storage-manager",
    "capturedAt": "ISO-8601 string",
    "normalizerVersion": "string",
    "importedFromBackup": "boolean",
    "backupId": "string | null"
  },
  "timestamps": {
    "startedAt": "ISO-8601 string | null",
    "lastEventAt": "ISO-8601 string | null",
    "capturedAt": "ISO-8601 string"
  },
  "summary": {
    "totalEvents": "number",
    "userCount": "number",
    "assistantCount": "number",
    "thoughtCount": "number",
    "toolCount": "number",
    "commandCount": "number",
    "subagentCount": "number",
    "errorCount": "number"
  },
  "events": [
    {
      "id": "string",
      "index": "number",
      "kind": "user | assistant | thought | tool | command | status | subagent | other",
      "title": "string",
      "stepType": "string",
      "text": "string | null",
      "createdAt": "ISO-8601 string | null",
      "completedAt": "ISO-8601 string | null",
      "executionId": "string | null",
      "status": "string | null",
      "command": {
        "commandLine": "string | null",
        "cwd": "string | null",
        "exitCode": "number | null"
      },
      "toolCalls": [],
      "subagent": {},
      "output": {
        "text": "string | null",
        "truncated": "boolean | null"
      }
    }
  ],
  "extensions": {}
}
```

Notes:

- `schemaVersion` should be a string namespace instead of an integer so package and record schema lines can evolve independently later.
- `session.source` reuses the existing product `Source` concept.
- `sourceRef` identifies where the record came from, but the record must remain useful even if that location later becomes unreadable.
- `extensions` is reserved for source-specific metadata that should not pollute the core contract.

#### Required vs optional field policy

Required in v1:

- `schemaVersion`
- `session.id`
- `session.source`
- `sourceRef.kind`
- `sourceRef.locator`
- `provenance.capturedAt`
- `provenance.capturedBy`
- `timestamps.capturedAt`
- `summary`
- `events`

Optional in v1:

- `sourceSessionId`
- `rootId`
- `title`
- `cwd`
- `gitBranch`
- `model`
- `startedAt`
- `lastEventAt`
- source-specific extension blocks

Explicitly not required in v1:

- cached `Transcript`
- cached `Markdown`
- embedded raw source copy
- every source-specific raw payload

#### Existing types reused vs newly introduced

The v1 contract should reuse existing normalized types where they already express source-agnostic semantics:

- reuse existing `Source`
- reuse existing `TrajectoryEvent` as the canonical event payload type
- reuse existing `TrajectorySummary` as the canonical summary payload type
- reuse existing `ConversationMeta` fields (`title`, `cwd`, `gitBranch`, `model`) as session identity enrichments when available

The v1 contract should introduce new wrapper types only where backup needs additional stability and packaging semantics:

- `SessionRecord`
- `SessionRecordIdentity`
- `SessionRecordSourceRef`
- `SessionRecordProvenance`
- `SessionRecordTimestamps`
- `SessionBackupManifest`
- `SessionBackupManifestRecord`

This keeps the portable layer small while avoiding a second source-specific event model.

### 3. `Source Backup` is copy-only and opt-in

When enabled, source preservation stores a separate copy of original source material under product-managed backup artifacts. It never moves, rewrites, or mutates the upstream source.

Rationale:

- preserves forensic/debugging value without making raw source the product's main contract
- avoids accidental source corruption
- supports future adapter rebuilds when upstream formats drift

Alternative considered:

- bundle source by default: rejected because most users do not need it, and it expands privacy/storage risk.

Implementation note:

- v1 may land `Source Backup` incrementally by source type
- file-backed sources such as Codex can support copy-only source preservation earlier
- runtime-backed sources should remain explicitly unsupported until their raw-source semantics are well-defined

### 4. Restore/import scope is product-readable recovery only

`Import Backup` in v1 restores sessions into this product's readable/searchable/analyzable state. It does not reopen a live session in Codex, Cursor, Claude Code, or other vendor tools.

Rationale:

- aligns with local-first governance rather than runtime orchestration
- keeps restore semantics stable across agents
- avoids false promises around private, moving vendor formats

Alternative considered:

- restore back into upstream tools: rejected for v1 due to complexity, coupling, and uncertain feasibility.

### 5. Backup package layout should be reusable by future `Project Bundle`

The session backup package should be designed as a reusable sub-format that a later `Project Bundle` can include under a `sessions/` section.

Rationale:

- avoids re-designing session packaging when project-level bundles arrive
- keeps current work aligned with the product's project-first direction

Alternative considered:

- design session backup independently and retrofit later: rejected because it increases migration cost and naming churn.

#### Proposed `Session Backup v1` package layout

The backup package should wrap one or more canonical records with package-level metadata:

```text
session-backup/
  manifest.json
  sessions/
    <session-id>.record.json
  sources/                     # optional, only when Source Backup is enabled
    <session-id>/
      ...
```

`manifest.json` should include:

```json
{
  "schemaVersion": "session-backup/v1",
  "backupId": "string",
  "createdAt": "ISO-8601 string",
  "createdBy": "agent-storage-manager",
  "sessionCount": 1,
  "records": [
    {
      "sessionId": "string",
      "path": "sessions/<session-id>.record.json",
      "sha256": "string",
      "includesSourceCopy": false
    }
  ]
}
```

Rationale:

- package-level manifest supports validation before reading individual records
- `sessions/` can be reused directly inside a future `Project Bundle`
- `sources/` remains isolated and clearly optional

#### Import semantics for v1

Import should execute these steps:

1. validate package manifest schema
2. validate referenced record files exist
3. validate record schema versions
4. validate checksums when present
5. materialize imported sessions into product-readable state

Import should not:

- overwrite upstream source files
- register imported sessions as live vendor sessions
- assume imported source copies are executable or reopenable by third-party tools

### 6. v1 product entry point lives on the session viewer

The first interactive backup surface should live in the main `Sessions` viewer rather than a separate migration page.

The v1 entry points are:

- `Back Up Session` in the viewer header for the currently selected session
- `Include source copy` as an advanced inline control only when the current source supports copy-only preservation
- `Diagnostic JSON` as a separate adjacent action, not a backup synonym

Rationale:

- keeps backup attached to the current session context
- avoids conflating backup with export or diagnostics download
- exposes `Source Backup` only where it is actionable and source-safe

Current implementation note:

- `Back Up Session` is available from the viewer header
- `Include source copy` is currently Codex-only because Codex is file-backed and already has explicit copy-only semantics
- unsupported source-preservation requests must fail with explicit, source-named diagnostics instead of silently degrading
- create/import/verify routes should return stable diagnostic fields (`code`, `title`, `error`, optional `hint`) so UI surfaces do not depend on raw internal exception text alone
- backup package reads and writes must resolve all paths inside the managed backup root; `backupId`, manifest entry paths, and source-copy relative paths must be rejected if they attempt path traversal or escape the package directory

## Risks / Trade-offs

- [Canonical contract too small] -> Some future analysis use cases may need fields not present in v1. Mitigation: version the schema and make optional extensions explicit.
- [Canonical contract too large] -> The product may freeze accidental implementation details into the public backup shape. Mitigation: keep v1 focused on required semantic fields only.
- [Users confuse backup with export] -> They may expect Markdown/HTML output to be the main preserved artifact. Mitigation: keep `Back Up Session` and `Export Session` as separate actions and terms.
- [Users assume import means vendor restore] -> They may expect one-click re-entry into upstream tools. Mitigation: clearly state that v1 import restores product-readable state only.
- [Source preservation increases privacy exposure] -> Raw files may contain sensitive paths, outputs, and hidden metadata. Mitigation: keep source copy opt-in and warn before inclusion.
- [Upstream adapters continue to drift] -> Some source references may become stale over time. Mitigation: backup package remains valid because canonical record data is self-contained enough for product use.

## Migration Plan

1. Define the v1 `Session Record` contract alongside current normalized session/event types.
2. Map existing source adapters onto the new contract without changing current viewer semantics.
3. Introduce backup serialization and import validation around the contract.
4. Add optional source-copy packaging after the record-first flow works end to end.
5. Reuse the session package structure later when `Project Bundle` work begins.

Rollback strategy:

- If backup/import is incomplete, the product can keep current viewer and diagnostic behavior unchanged because the change introduces a new canonical persistence layer rather than replacing source retrieval.

## Open Questions

- Should v1 backup package as a directory tree, a zip archive, or support both?
- Should integrity validation be required on every import or exposed as a separate verify action?
- How much summary data should be frozen into the record versus recomputed on import?
- Should batch backup land in the same milestone as single-session backup or immediately after it?
