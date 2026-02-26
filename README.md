<!--
SSoT/DRY note:
- This English README is the source of truth.
- Other languages are translations and may lag behind.
-->

# Agent Storage Manager (v1)

**Language:** English | [简体中文](README.zh-CN.md)

A local Web UI for browsing conversation history generated/persisted by Antigravity and Windsurf.
It fetches readable content via their local Language Server RPC (instead of offline parsing `.pb`).

## 数据来源与配置

> Note: section headings keep the original project wording; content is canonical in English.

- Config file: `~/.agent-storage-manager/config.json`
- Default roots:
  - Antigravity: `~/.gemini/antigravity/conversations`
  - Windsurf: `~/.codeium/windsurf/cascade`

You can add/disable/delete roots in the Web UI Settings page (supports external/backup drives).

## 运行

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

## 一期功能

- Scan and list `.pb` session files (default directories + custom roots from Settings)
- Antigravity: render Markdown via `GetCascadeTrajectory` + `ConvertTrajectoryToMarkdown`
- Windsurf: Attach mode (requires Windsurf running with Cascade started); render chat view via `GetCascadeTrajectorySteps`

## 使用前提（重要）

- Antigravity: the local daemon must be running (usually it writes discovery files to `~/.gemini/antigravity/daemon/ls_*.json` after you open Antigravity).
- Windsurf: Windsurf must be running. This app parses the language-server port from Windsurf logs and tries to read `--csrf_token` from process args.
  - If your system cannot read process args, set `csrfTokenOverride` in Settings as a fallback.

## 协议

MIT. See `LICENSE`.
