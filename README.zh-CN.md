<!--
SSoT/DRY note:
- README.md（英文）为事实来源（Single Source of Truth）。
- 本文件为简体中文翻译，可能会滞后；如有不一致，以英文为准。
-->

# Agent Storage Manager（一期）

**语言：** [English](README.md) | 简体中文

本项目提供一个本地 Web UI，用于查看 Antigravity 与 Windsurf 在本地生成/持久化的对话历史（通过它们的本地 Language Server RPC 获取可读内容，而不是直接离线解析 `.pb`）。

## 数据来源与配置

- 配置文件：`~/.agent-storage-manager/config.json`
- 默认 roots：
  - Antigravity：`~/.gemini/antigravity/conversations`
  - Windsurf：`~/.codeium/windsurf/cascade`

可在 Web UI 的 Settings 页面新增/禁用/删除 roots（支持外置备份盘目录）。

## 运行

需要 Node.js + pnpm：

```bash
pnpm install
pnpm dev
```

打开：`http://localhost:3000`

可选：用环境变量覆盖配置文件位置（便于调试或放到工作区内）：

```bash
export AGENT_STORAGE_MANAGER_CONFIG_PATH=./.local/config.json
```

## 一期功能

- 扫描并列出 `.pb` 会话文件（默认目录 + Settings 里自定义 roots）
- Antigravity：通过 `GetCascadeTrajectory` + `ConvertTrajectoryToMarkdown` 展示 Markdown
- Windsurf：Attach 模式（要求 Windsurf 正在运行并启动过 Cascade），通过 `GetCascadeTrajectorySteps` 展示聊天视图

## 使用前提（重要）

- Antigravity：需要本地 daemon 已启动（通常打开 Antigravity 后会写出 discovery 文件到 `~/.gemini/antigravity/daemon/ls_*.json`）。
- Windsurf：需要 Windsurf 正在运行；工具会从 Windsurf 日志解析语言服务器端口，并尝试从进程参数读取 `--csrf_token`。
  - 如果你的系统上无法读取进程参数，可在 Settings 里填写 `csrfTokenOverride` 作为兜底。

## 协议

MIT，见 `LICENSE`。
