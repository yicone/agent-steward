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

### Testing multi-root features

To exercise health indicators, duplicate detection, and multi-root listing without real sessions:

```bash
node scripts/seed-multi-root.mjs                                        # create fixtures
AGENT_STORAGE_MANAGER_CONFIG_PATH=.local/seed-config.json pnpm dev      # start with seeded data
node scripts/seed-multi-root.mjs --clean                                # remove fixtures
```

See `docs/storage/local-storage-notes.md` § "Multi-root testing" for details.

## Project Docs

- `README.md`: current product scope, configuration, and runtime prerequisites
- `ROADMAP.md`: open/planned work only
- `CHANGELOG.md`: shipped changes and merged GitHub work
- `docs/adr/ADR-001-use-language-server-rpc.md`: canonical decision for session retrieval strategy
- `docs/storage/local-storage-notes.md`: version-scoped Antigravity / Windsurf storage and attach facts

## Features (v1)

- Scan and list `.pb` session files (default directories + custom roots from Settings)
- Search and filtering:
  - full-text event search within the current conversation
  - enhanced conversation filtering in the session list / viewer flow
- Antigravity:
  - list enrichment: load `title/cwd` from Antigravity VS Code global state (`state.vscdb`) for better coverage vs LS-only summaries
  - fetch `GetCascadeTrajectory` and normalize steps into a unified event model
  - default Viewer mode: Compact
  - Compact is backed by `ConvertTrajectoryToMarkdown`; Transcript and Trajectory remain available for structured analysis
  - group trajectory events by `executionId` with collapsible sections
  - use virtualized list rendering for long sessions
  - Inspector: inspect selected event/message, plus an error list with jump-to-event
- Windsurf: connect to the running language server (discover port from logs + CSRF token from process args)
  - on newer builds, prefer `WINDSURF_CSRF_TOKEN` from the LS process environment when available
  - default Viewer mode: Compact
  - Compact is currently backed by legacy chat payloads; Transcript and Trajectory remain available for cross-source alignment and diagnostics
- Unified trajectory model:
  - canonical event schema used by Antigravity trajectory viewer
  - Windsurf adapter available via API (`view=trajectory`) for cross-agent normalization
- Diagnostic export:
  - download per-conversation diagnostic JSON from Viewer
  - includes raw LS payloads to compare UI-visible process data vs rendered output
  - note: may include sensitive content (paths, commands, outputs, conversation text)

For detailed view semantics and cross-source alignment notes, see `docs/viewer/trajectory-view.md`.

## Prerequisites

- Antigravity: Antigravity must be running (and have started a session at least once). This app attaches to the running language server by parsing Antigravity logs for the LS pid/port, and extracting the CSRF token from process args when possible.
  - Legacy fallback: `~/.gemini/antigravity/daemon/ls_*.json` (may be stale on newer builds).
- Antigravity: for conversation list `title/cwd`, this app reads `~/Library/Application Support/Antigravity/User/globalStorage/state.vscdb` (VS Code global state) locally.
- Windsurf: Windsurf must be running (and have started a Cascade session at least once). This app parses the language-server port from Windsurf logs and tries to read `--csrf_token` from process args.
  - On current Windsurf builds, the live token may be present in the LS process environment as `WINDSURF_CSRF_TOKEN`, so this app prefers `ps eww` output when available.
  - Manual fallback: set `csrfTokenOverride` in Settings, but only if you obtained the live LS token from the running Windsurf process/session.
  - Do not use `codeium.windsurf-windsurf_auth-` from `~/Library/Application Support/Windsurf/User/globalStorage/state.vscdb`; that UUID is not the LS CSRF token on current Windsurf builds.

## Project Status

- Current planning is tracked in `ROADMAP.md`.
- Current shipped milestones are tracked in `CHANGELOG.md`.
- GitHub Issues / PRs help index work when they exist, but these docs remain usable without them.

## Technical Docs

- Unified trajectory viewer semantics: `docs/viewer/trajectory-view.md`
- UI/UX optimization proposal (includes component/library choices): `docs/viewer/agent-ui-ux-optimization.md`
- Tailwind + shadcn migration notes: `docs/dev/tailwind-shadcn-migration.md`

## UI Stack

- Tailwind CSS v4 + shadcn/ui (migration in progress; some legacy CSS classes still exist in `src/app/globals.css`)

## License

MIT. See `LICENSE`.
