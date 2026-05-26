## Context

Agent Storage Manager currently models supported session sources as `antigravity`, `windsurf`, and `codex`. That assumption is embedded in shared unions, default root generation, source-status payloads, settings UI options, source labels, project evidence classification, and source-specific loader/parser modules.

Cursor support cuts across two existing product areas:

1. `Sessions`
   - the app must recognize Cursor as a first-class source for root configuration, session discovery, loading, viewer normalization, and diagnostics
   - unlike current sources, the concrete Cursor storage/runtime contract has not yet been documented in this repository, so the implementation must preserve an explicit validation/documentation step rather than hard-coding unverified assumptions
2. `Assets` / `Analysis`
   - the project evidence provider currently recognizes repo-local Codex, Windsurf, Copilot, and cross-agent assets from an explicit allowlist
   - Cursor-specific repo-local assets such as `.cursor/` rules/configuration are currently invisible or downgraded to generic unsupported evidence even when they matter for project governance

The design must preserve the repository's local-first model, keep third-party runtime details version-scoped and documented, and avoid promising full Cursor runtime control or inline asset editing.

## Goals / Non-Goals

**Goals:**
- Add Cursor as a first-class source in shared product abstractions, configuration, and UI routing.
- Support bounded Cursor session discovery, selection, loading, normalization, and diagnostics in the `Sessions` surface.
- Support bounded discovery of repo-local Cursor assets through the existing project evidence provider so they can appear in `Assets` and `Analysis`.
- Keep unsupported or unverified Cursor details explicit through diagnostics and documentation rather than silently fabricating behavior.
- Prefer helper-level and model-level test coverage that matches the repository's current Vitest/node testing approach.

**Non-Goals:**
- Reopen or sync sessions back into the Cursor runtime.
- Add cloud dependencies, account integration, or remote Cursor APIs.
- Turn `Assets` into a Cursor rules editor or workflow executor.
- Reverse-engineer every historical Cursor storage format before shipping a bounded first version.

## Decisions

### 1. Add Cursor as a shared first-class source across the product model
Cursor will be added to shared source unions and source-derived helpers rather than treated as an ad hoc special case.

Rationale:

- Source-specific branching already exists in `types`, config defaults, settings, root health, labels, routing, and viewer state.
- A first-class `cursor` source keeps the product model coherent and makes future source-specific features testable.

Alternatives considered:

- Treat Cursor as a variant of Codex or Windsurf.
  - Rejected because Cursor has different repo-local asset conventions and may have different session storage/runtime semantics.
- Hide Cursor behind generic external roots only.
  - Rejected because the request is to add actual product support, not just allow arbitrary folders.

### 2. Implement Cursor sessions behind a dedicated source adapter boundary
Cursor session support will land behind a dedicated server/parser path, parallel to existing source-specific modules, while reusing the shared conversation list, selection, search, and viewer abstractions.

Rationale:

- The repository already isolates source-specific retrieval logic under `src/lib/server/` and `src/lib/parse/`.
- Cursor storage/attach facts are not yet validated here; isolating them behind a dedicated adapter limits blast radius while preserving explicit diagnostics.

Alternatives considered:

- Fold Cursor logic into an existing generic scanner.
  - Rejected because source-specific metadata, root layout, and diagnostics would become harder to reason about.
- Block the proposal until every Cursor storage detail is fully verified.
  - Rejected because the change should establish the intended contract now while leaving version-scoped validation as an implementation task.

### 3. Keep Cursor source status bounded and evidence-based
The product will expose Cursor source availability using the same bounded philosophy as existing sources: show discovered/available state when validated facts exist, and otherwise present explicit unavailable or unsupported diagnostics instead of guessing.

Rationale:

- Existing Antigravity and Windsurf support already depends on attach/runtime facts that change by product version.
- Cursor may require file-backed, runtime-backed, or hybrid status semantics depending on validated implementation facts.

Alternatives considered:

- Always report Cursor as file-backed only.
  - Rejected until validated facts prove that runtime attach is unnecessary for the intended session fidelity.
- Hide Cursor status until perfect parity exists.
  - Rejected because users still need explicit visibility into whether the source is supported, misconfigured, or not yet attachable.

### 4. Extend the project evidence allowlist with explicit Cursor-owned repo-local paths
Cursor repo-local assets will be discovered through an explicit allowlist in the project evidence provider, mapping recognized Cursor files into the existing bounded asset kinds (`rule`, `command`, `unknown`) and source labels.

Initial expected scope:

- `.cursor/` project assets that the repository can classify from explicit allowlisted subpaths and file names
- legacy project-level Cursor rule files when present

Rationale:

- The current provider is intentionally allowlist-based and bounded.
- Cursor support in `Assets` and `Analysis` should behave like other repo-local agent-facing evidence: recognized where explicit, unsupported where outside the allowlist, and never inferred from arbitrary files.

Alternatives considered:

- Recursively ingest all `.cursor/` files.
  - Rejected because it would violate the provider's bounded-governance model.
- Delay Cursor asset support until a full editor/integration exists.
  - Rejected because the request explicitly includes asset/rule recognition, and read-only governance support fits the current product.

### 5. Prefer helper and state-derivation tests over DOM-heavy coverage
Validation for this change will focus on parser, scanner, provider, normalization, and view-model tests, with UI assertions limited to state derivation and small rendering helpers unless the test environment changes.

Rationale:

- The repository currently uses Vitest with a node environment.
- Source support changes are most reliably covered through pure helpers, server modules, and deterministic data-shape tests.

Alternatives considered:

- Introduce broad DOM-rendering coverage as part of this change.
  - Rejected as unnecessary scope growth for a source-support slice.

## Risks / Trade-offs

- **Cursor storage/runtime facts may change or be incomplete** → Mitigation: make validation/documentation a first implementation step, keep diagnostics explicit, and isolate source-specific assumptions behind a dedicated adapter.
- **Source-model changes touch many files** → Mitigation: centralize Cursor additions in shared unions/labels first, then update source-specific consumers with targeted tests.
- **Repo-local Cursor assets may have multiple evolving conventions** → Mitigation: ship an explicit allowlist, classify unsupported paths as bounded diagnostics, and document version-scoped facts.
- **Users may assume full Cursor runtime interoperability** → Mitigation: keep specs and docs explicit that support is for local reading/governance, not reopening sessions or editing third-party runtime state.

## Migration Plan

1. Validate and document the current Cursor local storage/runtime facts needed for bounded support.
2. Add Cursor to shared source/config/label/filter abstractions and default root handling.
3. Implement Cursor session scanning, load/normalize flows, and source diagnostics behind a dedicated adapter.
4. Extend the project evidence allowlist and context asset source labels for Cursor repo-local assets.
5. Update README and storage documentation to describe supported Cursor behavior and constraints.
6. Run targeted tests for scanning, parsing, provider classification, and affected view-model helpers.

Rollback strategy:

- If Cursor session retrieval proves too unstable, the session adapter can be gated back to explicit unsupported diagnostics while preserving non-destructive config and project-evidence support.
- Repo-local Cursor asset recognition can be narrowed by shrinking the allowlist without affecting other sources.

## Open Questions (Resolved)

- **What validated Cursor session storage path(s), metadata store(s), and title/cwd sources should be treated as the initial macOS implementation target?**
  Resolved: `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` (`cursorDiskKV` table, keys prefixed `composerData:` and `bubbleId:`). Workspace-to-composer mapping read from per-workspace `state.vscdb` files under `workspaceStorage/`. Documented in `docs/storage/local-storage-notes.md`.

- **Does Cursor require a running local runtime for full-fidelity session retrieval, or is a file-backed reader sufficient for the accepted viewer modes?**
  Resolved: File-backed SQLite reader is sufficient. No runtime attach is required. Full bubble-by-bubble transcripts are recovered from `bubbleId:<composerId>:<bubbleId>` keys. See `src/lib/server/cursor.ts`.

- **Which Cursor repo-local files should map to `rule` versus `command` versus `unknown` in the bounded provider model?**
  Resolved: `.cursor/rules/*.mdc` → `rule`; `.cursorrules` → `rule`; `.cursor/mcp.json` → `command`; `.cursor/settings/` files → `unknown`. Implemented in `src/lib/projectEvidenceProvider.ts`.

- **Should Cursor-specific storage notes live in the existing storage document or in a dedicated Cursor storage note referenced from README?**
  Resolved: Added a `## Cursor` section to the existing `docs/storage/local-storage-notes.md` (consistent with the Antigravity, Windsurf, and Codex sections already there). Referenced from `README.md`.
