<!--
SSoT/DRY note:
- This README is the source of truth.
-->

# Agent Storage Manager (v1)

A local Web UI for browsing conversation history generated/persisted by Antigravity and Windsurf.
It fetches readable content via their local Language Server RPC (instead of offline parsing `.pb`).

## Data Sources & Configuration

- Config file: `~/.agent-storage-manager/config.json`
- Default roots:
  - Antigravity: `~/.gemini/antigravity/conversations`
  - Windsurf: `~/.codeium/windsurf/cascade`

You can add/disable/delete roots in the Web UI Settings page (supports external/backup drives).

## Running

Requires Node.js + pnpm:

```bash
pnpm install
pnpm dev
```

Open: `http://localhost:3000`

Optional: override the config file path via env var (useful for local workspace debugging):

```bash
export AGENT_STORAGE_MANAGER_CONFIG_PATH=./.local/config.json
```

## Features (v1)

- Scan and list `.pb` session files (default directories + custom roots from Settings)
- Antigravity:
  - fetch `GetCascadeTrajectory` and normalize steps into a unified event model
  - default Viewer mode: Transcript (user/assistant + errors; tools/commands summarized)
  - group trajectory events by `executionId` with collapsible sections
  - use virtualized list rendering for long sessions
  - allow switching to Markdown view rendered via `ConvertTrajectoryToMarkdown`
- Windsurf: connect to the running language server (discover port from logs + CSRF token from process args)
  - default Viewer mode: Transcript (trajectory-backed via `view=trajectory`)
  - legacy chat view available for raw transcript-style browsing
- Unified trajectory model:
  - canonical event schema used by Antigravity trajectory viewer
  - Windsurf adapter available via API (`view=trajectory`) for cross-agent normalization
- Diagnostic export:
  - download per-conversation diagnostic JSON from Viewer
  - includes raw LS payloads to compare UI-visible process data vs rendered output
  - note: may include sensitive content (paths, commands, outputs, conversation text)

## Prerequisites

- Antigravity: the local daemon must be running (usually it writes discovery files to `~/.gemini/antigravity/daemon/ls_*.json` after you open Antigravity).
- Windsurf: Windsurf must be running (and have started a Cascade session at least once). This app parses the language-server port from Windsurf logs and tries to read `--csrf_token` from process args.
  - If your system cannot read process args, set `csrfTokenOverride` in Settings as a fallback.

## Technical Docs

- Unified trajectory viewer semantics: `docs/viewer/trajectory-view.md`

## License

MIT. See `LICENSE`.
