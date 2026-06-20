<!--
SSoT/DRY note:
- This README is the source of truth.
-->

# AgentSteward (v1)

A local Web UI for browsing conversation history generated/persisted by Antigravity, Windsurf, Codex CLI, and Cursor.
It fetches Antigravity and Windsurf content via their local Language Server RPC, reads Codex sessions directly from `.jsonl` files (no running process required), and reads bounded Cursor composer state from local SQLite/app-storage files.

## Data Sources & Configuration

- Config file: `~/.agent-steward/config.json`
- Default roots:
  - Antigravity: `~/.gemini/antigravity/conversations`
  - Windsurf: `~/.codeium/windsurf/cascade`
  - Codex: `~/.codex/sessions`
  - Cursor: `~/Library/Application Support/Cursor/User`

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
export AGENT_STEWARD_CONFIG_PATH=./.local/config.json
```

### Testing multi-project shell switching

To exercise the bounded project switcher with multiple local projects:

```bash
AGENT_STEWARD_PROJECT_ROOTS="/Users/tr/Workspace/project-a:/Users/tr/Workspace/project-b" pnpm dev
```

The shell header will display the active project name and boundary, and the project switcher will list the current working directory plus the configured roots. `Sessions` and `GlobalSearch` are scoped to the active project root.

### Testing multi-root features

To exercise health indicators, duplicate detection, and multi-root listing without real sessions:

```bash
node scripts/seed-multi-root.mjs                                        # create fixtures
AGENT_STEWARD_CONFIG_PATH=.local/seed-config.json pnpm dev      # start with seeded data
node scripts/seed-multi-root.mjs --clean                                # remove fixtures
```

See `docs/storage/local-storage-notes.md` § "Multi-root testing" for details.

## Project Docs

- `README.md`: current product scope, configuration, and runtime prerequisites
- GitHub Issues: active execution tracking for concrete work in progress
- `openspec/specs/` and `openspec/changes/`: normative specs and active change artifacts when work is tracked in OpenSpec
- `CHANGELOG.md`: shipped changes and merged GitHub work
- `docs/adr/ADR-001-use-language-server-rpc.md`: canonical decision for session retrieval strategy
- `docs/storage/local-storage-notes.md`: version-scoped Antigravity / Windsurf storage and attach facts

## Features (v1)

- Project shell:
  - top-level surfaces for `Project Overview`, `Sessions`, `Assets`, `Analysis`, and `Backup / Migration`
  - `Project Overview` provides a project-scoped agent context governance foundation with compact context snapshot, in-effect assets, recent sessions, attention items, and route-first quick actions; when repo-local provider evidence is available, asset/finding counts are derived from explicit local evidence instead of foundation sample data
  - `Sessions` contains the existing viewer, source diagnostics, URL deep links, search selection, and direct session backup behavior
  - `Assets` provides a bounded reusable context assets foundation for rules, memory, skills, commands, and unknown asset fragments
  - `Analysis` provides a bounded interpretation-and-routing foundation for local context findings
  - `Backup / Migration` provides bounded workflow-first backup and migration-preview surfaces without turning into a generic tools drawer or migration apply UI
- Assets foundation:
  - repo-local project evidence provider for explicit agent-facing files: `AGENTS.md`, Copilot instructions/prompts/skills, Codex skills/agents/hooks, cross-agent `.agents` / `.agent` skills, Windsurf skills/rules/workflows/hooks, and Cursor repo-local files such as `.cursor/mcp.json`, `.cursorrules`, and `.cursor/rules/*.mdc`
  - local-first reusable context asset model with subtype, scope, source, status, provenance, optional body summary, in-effect/usage metadata, and derived governance health
  - provider-backed inventory uses project-relative provenance paths and does not read user-global runtime stores, external paths, cloud sources, session transcript stores, or paths outside the repository root
  - subtype/scope/source/status filtering with asset summary, governance issue class counts, inventory, selected detail, provenance, and in-effect/usage regions
  - route-only governance inspection for Sessions, Analysis, Backup / Migration, or Project Overview without inline edit, repair, sync, deploy, restore, or workflow execution controls
  - routed handoff into `Assets` from Sessions, Project Overview, and Analysis with compact issue context only, without carrying full transcript, overview summary state, findings tables, or trajectory state
- Analysis foundation:
  - local-first analysis finding model with issue class, severity, status, affected object, evidence references, route targets, and preservation warnings
  - provider diagnostics for unreadable, ambiguous, duplicate, or unsupported repo-local evidence become bounded findings; a clean provider result shows an explicit no-current-findings state instead of seed issues
  - context health summary, findings inventory, selected finding detail, evidence context, and route-only recommended actions
  - routed handoff into `Analysis` from Assets, Project Overview, and Sessions without claiming complete automated project analysis or inline remediation
- Scan and list session files (default directories + custom roots from Settings)
  - Antigravity / Windsurf: `.pb` session files (flat directory)
  - Codex CLI: `.jsonl` session files (nested `YYYY/MM/DD/` directory structure)
  - Cursor: bounded composer sessions from `User/globalStorage/state.vscdb` and related `workspaceStorage/*` state
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
- Codex CLI: read sessions directly from `.jsonl` files — no running process required
  - sessions stored in `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`
  - normalizes JSONL events (user, assistant, tool_call, tool_result, exec, reasoning, etc.) into the unified trajectory model
  - title/cwd extracted from `session_meta` and first user message headers
  - Trajectory viewer with full filtering and event inspector
  - Diagnostic export includes raw JSONL events
- Unified trajectory model:
  - canonical event schema used by Antigravity, Windsurf, and Codex trajectory viewers
  - Windsurf adapter available via API (`view=trajectory`) for cross-agent normalization
- Diagnostic export:
  - download per-conversation diagnostic JSON from Viewer
  - includes raw LS payloads (Antigravity/Windsurf) or JSONL events (Codex) to compare UI-visible process data vs rendered output
  - note: may include sensitive content (paths, commands, outputs, conversation text)
- Session Backup:
  - create managed session backups from the Viewer via `Back Up Session`
  - backup packages use canonical `session-record/v1` inside `session-backup/v1`
  - verify/import flows are available through `/api/session-backups`, `/api/session-backups/import`, and `/api/session-backups/[backupId]`
  - v1 `Source Backup` is opt-in and currently supports copy-only source preservation for Codex sessions only
- Backup / Migration workflows:
  - `Backup / Migration` now provides bounded `session backup`, `bulk session backup`, `import backup`, `validate package`, `migration preview`, and `project bundle` workflows
  - bulk session backup requires explicit session selection, validates each selected session independently, and fans out through the existing single-session backup execution path
  - bulk results show aggregate status plus per-session detail, while recent operations record one compact batch entry instead of one entry per session
  - migration preview requires explicit source context, target context, and bounded scope, and ends at preview-only validation/result states without migration apply or bundle generation
  - project bundle requires explicit composition and validation before generation, writes a real local `project-bundle/v1` file, shows display-safe bundle locations, preserves missing session packages as unresolved references, and reuses existing session backup packages instead of inventing a second session archive format
  - the foundation still does not implement migration apply, restore/apply for project bundles, vendor-runtime reopen, or cloud sync

For detailed view semantics and cross-source alignment notes, see `docs/viewer/trajectory-view.md`.

## Prerequisites

- Antigravity: Antigravity must be running (and have started a session at least once). This app attaches to the running language server by parsing Antigravity logs for the LS pid/port, and extracting the CSRF token from process args when possible.
  - Legacy fallback: `~/.gemini/antigravity/daemon/ls_*.json` (may be stale on newer builds).
- Antigravity: for conversation list `title/cwd`, this app reads `~/Library/Application Support/Antigravity/User/globalStorage/state.vscdb` (VS Code global state) locally.
- Windsurf: Windsurf must be running (and have started a Cascade session at least once). This app parses the language-server port from Windsurf logs and tries to read `--csrf_token` from process args.
  - On current Windsurf builds, the live token may be present in the LS process environment as `WINDSURF_CSRF_TOKEN`, so this app prefers `ps eww` output when available.
  - Manual fallback: set `csrfTokenOverride` in Settings, but only if you obtained the live LS token from the running Windsurf process/session.
  - Do not use `codeium.windsurf-windsurf_auth-` from `~/Library/Application Support/Windsurf/User/globalStorage/state.vscdb`; that UUID is not the LS CSRF token on current Windsurf builds.
- Codex CLI: no running process required. Install the [Codex CLI](https://github.com/openai/codex) and run at least one session — session files will be created automatically at `~/.codex/sessions/`.
  - Sessions are `.jsonl` files nested under `YYYY/MM/DD/` date subdirectories.
  - No token or attach configuration needed; sessions are read directly from disk.
- Cursor: no runtime attach is required for the current implementation. Open Cursor and use Composer/Agents at least once so local state is written under `~/Library/Application Support/Cursor/User/`.
  - Current support is intentionally bounded: the app lists Cursor composer sessions and renders reliable local metadata/summary/todo/context state, but does not promise a full bubble-by-bubble transcript for every historical session.

## Project Status

- Active execution tracking lives in GitHub Issues.
- When work is managed with OpenSpec, active changes live in `openspec/changes/` and accepted behavior baselines live in `openspec/specs/`.
- Current shipped milestones are tracked in `CHANGELOG.md`.

## Technical Docs

- Unified trajectory viewer semantics: `docs/viewer/trajectory-view.md`
- UI/UX optimization proposal (includes component/library choices): `docs/viewer/agent-ui-ux-optimization.md`
- Tailwind + shadcn migration notes: `docs/dev/tailwind-shadcn-migration.md`

## UI Stack

- Tailwind CSS v4 + shadcn/ui (migration in progress; some legacy CSS classes still exist in `src/app/globals.css`)

## License

MIT. See `LICENSE`.
