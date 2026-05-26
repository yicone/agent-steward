## Why

Agent Storage Manager currently treats supported agent products as Antigravity, Windsurf, and Codex only. Users who work in Cursor cannot browse Cursor sessions in the Sessions surface and cannot inspect Cursor-specific project governance assets alongside the rest of a repository-local agent setup.

## What Changes

- Add first-class Cursor support as a new source in the local product model.
- Support listing, selecting, loading, and diagnosing Cursor sessions using Cursor-specific storage/runtime rules instead of forcing users to treat Cursor data as unsupported.
- Support Cursor project evidence discovery so `.cursor/` and other repo-local Cursor-facing assets can appear in `Assets` and `Analysis` alongside existing agent-facing files.
- Extend product configuration, routing, and source-status surfaces so Cursor appears as a peer to Antigravity, Windsurf, and Codex where applicable.
- Keep the change local-first and bounded: no cloud dependency, no inline editing of Cursor assets, and no promise to reopen sessions inside Cursor itself.

## Capabilities

### New Capabilities
- `cursor-support`: Support Cursor session browsing/inspection plus Cursor repo-local asset discovery and governance routing.

### Modified Capabilities
- `project-shell`: Expand shell-visible supported source behavior so Cursor appears in source presence, session switching, and related routing surfaces.

## Impact

- Affected code:
  - `src/lib/types.ts`
  - `src/lib/server/config.ts`
  - session scanning/loading and source-status code under `src/lib/server/`
  - parsing/normalization code under `src/lib/parse/`
  - project evidence discovery under `src/lib/projectEvidenceProvider.ts`
  - session and asset UI surfaces in `src/components/`
  - tests covering source scanning, parsing, provider evidence, and UI state derivation
- Affected docs:
  - `README.md`
  - storage notes under `docs/storage/`
  - new and modified OpenSpec artifacts under `openspec/`
- Expected constraints:
  - Cursor support must fit the existing local-first architecture.
  - Any Cursor attach or metadata assumptions must be documented as version-scoped facts, similar to existing Windsurf and Antigravity notes.
