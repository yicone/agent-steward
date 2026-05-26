# Codex 本地存储结构（持续记录）

本文档记录 **Codex CLI / Codex App (macOS)** 在本地磁盘上的会话存储布局、标题存储机制，以及 `agent-switch` 在集成过程中验证过的"可用事实"。

> 约定：路径均以 macOS 为准；`~` 表示用户主目录。  
> 这些目录可能包含会话内容、仓库路径、API key 等敏感信息；调试/截图时注意脱敏。

---

## 已验证环境

| 组件 | 版本 / 构建 |
| --- | --- |
| Codex CLI | `0.39.0` – `0.107.0`（多个版本） |
| Codex App (macOS) | `26.303.x` |
| macOS | `Darwin arm64 24.6.0` |

---

## 一、会话文件（JSONL）

### 存储路径

```text
~/.codex/sessions/YYYY/MM/DD/rollout-<ISO_TIMESTAMP>-<UUID>.jsonl
~/.codex/archived_sessions/YYYY/MM/DD/rollout-<ISO_TIMESTAMP>-<UUID>.jsonl
```

- 日期子目录按会话创建时间分层（`YYYY/MM/DD`）。
- 每个会话一个 `.jsonl` 文件，文件名包含 ISO 时间戳和 thread UUID（UUIDv7，时间有序）。
- 归档会话移至 `archived_sessions/`，路径结构相同；两处 basename 格式一致，可用同一解析逻辑处理。

### JSONL 行结构

每行是一个 JSON 对象，`type` 字段区分事件类型：

| type | 说明 |
| --- | --- |
| `session_meta` | 会话元数据（id、cwd、base_instructions 等）；通常是文件首行，但可能很长（>15 KB） |
| `response_item` | 对话轮次条目；`item.role` 区分 `user` / `assistant`；**每个用户消息会出现一次** |
| `event_msg` | 内部事件通知；`payload.type` 包含 `user_message` / `agent_message` / `agent_reasoning` 等；**与 response_item 内容重复** |
| `turn_context` | 轮次上下文快照 |
| `tool_call` / `tool_result` | 工具调用及结果 |
| `exec` | Shell 命令执行 |
| `reasoning` | 推理摘要（o 系列模型） |

### 重复事件模式（Duplicate Events）

Codex CLI 对**每条用户消息 emit 两次**：

1. **`response_item` / `message` / `user`** —— 结构化对话记录（conversation history 中的条目）
2. **`event_msg` / `user_message`** —— 流式通知事件（用于 UI 实时更新）

两者 `timestamp` 相同，`text` 内容完全一致。若不做处理，解析后会出现连续两条完全相同的用户消息。

**agent-session-view 的处理方式**：只解析 `response_item`，**完全忽略 `event_msg`**（因此不存在重复问题，但丢失 `agent_reasoning` 等仅存在于 `event_msg` 的数据）。

**我们的处理方式**（`src/lib/parse/codexLog.ts`）：

- 同时解析两种事件类型，保留 `event_msg` 独有的数据（reasoning、token_count 等）
- 在 `normalizeCodexEventsToTrajectoryEvents` 末尾执行**连续去重**：若两条相邻 `user` 事件 `text` 相同，则丢弃第二条
- 实现见：`src/lib/parse/codexLog.ts` lines 516–531

### 注入上下文（Injected Context）

Codex CLI/App 在**每个新会话的开头**自动注入若干上下文行（`role: user`），这些行不是真实用户输入，不应作为标题：

| 注入前缀 | 来源 |
| --- | --- |
| `<environment_context>` | CLI 自动注入（cwd、沙箱策略等） |
| `<user_instructions>` | 用户配置的 instructions |
| `<permissions instructions>` | 权限策略说明 |
| `# AGENTS.md instructions for <path>` | 项目 AGENTS.md 内容 |
| `<system_instruction>` / `<system-instruction>` | 第三方编排工具（如 Conductor）注入的系统提示 |

`agent-switch` 的处理：`isInjectedContextMessage()` + `extractCodexTitle()` in `src/lib/parse/codexLog.ts`。

### `session_meta` 行的体积问题

`session_meta` 的 `base_instructions` 字段可包含数万字节的内容，导致文件首行长达 ~15 KB 以上。原先 8 KB 的 raw buffer 读取会截断此行，导致解析失败并回退到文件名标题（`rollout-*`）。

**已修复**：改为逐行流式读取，预算 256 KB（`META_READ_BUDGET_BYTES`，`src/lib/server/codex.ts`）。

---

## 二、标题存储（三层结构）

Codex 标题来自三个独立来源，优先级从高到低：

### 层级 1：`~/.codex/session_index.jsonl`（最高优先级）

**这是标题的权威来源**，包含：

- 首轮完成后由 App/CLI 自动生成的标题
- 用户在 App 中**手动重命名**的标题

格式：append-only JSONL，每行：

```json
{"id": "<thread-uuid>", "thread_name": "<title>", "updated_at": "<ISO8601>"}
```

- Key 是 thread UUID（`id` 字段），同一 UUID 可能有多行（自动生成 → 用户改名），**最后一行赢**。
- 由 Codex Rust 二进制（`~/.codex/app.asar` 中的 `codex` 可执行文件）通过 `set_thread_name` handler 写入。
- 当前已观测到 54 个 UUID 条目（截至 2026-04-08）。

**join key**：session_index 的 `id` = rollout 文件名末尾的 UUID。  
提取方式：`rollout-DATE-<UUID>.jsonl` → 用正则 `/([0-9a-f]{8}-[0-9a-f]{4}-...-[0-9a-f]{12})$/i` 从 session ID 末尾提取。

**验证命令**：

```bash
# 查看某个会话的完整重命名历史
grep "<thread-uuid>" ~/.codex/session_index.jsonl | python3 -c \
  "import sys,json; [print(json.dumps(json.loads(l), ensure_ascii=False)) for l in sys.stdin]"
```

### 层级 2：`~/.codex/state_5.sqlite`（次级来源）

SQLite 数据库，由 Codex Rust 二进制通过 `sqlx` 管理。

**关键表：`threads`**

| 列 | 类型 | 说明 |
| --- | --- | --- |
| `id` | TEXT | Thread UUID（与 session_index 的 `id` 相同） |
| `rollout_path` | TEXT | JSONL 文件的完整绝对路径（含 `archived_sessions/` 分支） |
| `title` | TEXT | 自动生成标题；**从不因用户重命名而更新**（已通过二进制逆向确认） |
| `first_user_message` | TEXT | 首条用户消息原文（通常与 title 相同） |
| `cwd` | TEXT | 会话工作目录 |
| `source` | TEXT | 来源标识：`cli` / `exec` / `vscode` / `unknown` |
| `cli_version` | TEXT | 创建时的 CLI 版本 |
| `has_user_event` | INTEGER | 是否有用户事件（0 = 空会话） |
| `tokens_used` | INTEGER | 消耗 token 数（0 = 空会话） |
| `archived` | INTEGER | 是否已归档 |

**重要限制**：

- `title` 列在会话创建时写入，此后 **Rust 二进制中不存在 `UPDATE threads SET title = ?`**（逆向 `strings` 确认）。
- 因此，用户通过 App 重命名后，SQLite 的 `title` 仍是旧值；真实标题只在 `session_index.jsonl` 里。
- `state_5.sqlite` 是 **cwd 的唯一持久化来源**（session_index 只存 `thread_name`，不存 cwd）。

**已知迁移历史**（`_sqlx_migrations` 表中，截至 2026-04-08 共 22 条迁移）：

- v1 threads, v2 logs, v5 threads cli_version, v7 threads first_user_message, v13 threads agent_nickname, v22 threads agent_path 等。

**join key**：`threads.id` = thread UUID = `rollout_path` basename 末尾的 UUID。

**验证命令**：

```bash
# 查看指定会话的 SQLite 记录
sqlite3 ~/.codex/state_5.sqlite \
  "SELECT id, title, cwd, has_user_event, tokens_used FROM threads WHERE id = '<uuid>'"

# 确认 title 列从未被更新（只有这两条 UPDATE）
strings /Applications/Codex.app/Contents/Resources/codex 2>/dev/null \
  | grep "^UPDATE threads"
# 预期输出：只有 SET memory_mode 和 SET updated_at，无 SET title
```

### 层级 3：JSONL 流式解析（最终 fallback）

当 `session_index.jsonl` 和 `state_5.sqlite` 均无匹配时（极新会话、纯 CLI 会话），逐行读取 JSONL 文件提取 title 和 cwd。预算 256 KB，跳过所有注入上下文行，取第一条真实用户消息的首行（截断至 120 字符）。

---

## 三、空壳会话（has_user_event = 0）

Codex 在**每次启动新会话时立即写入 JSONL 和 SQLite 记录**，然后等待用户输入。若用户在发送任何消息之前关闭了会话（Ctrl+C、关窗等），文件中只有注入上下文行，没有真实用户消息。

特征：

- `state_5.sqlite`: `has_user_event = 0`, `tokens_used = 0`, `title = ''`, `first_user_message = ''`
- JSONL: 仅 2–3 行（`session_meta` + 1–2 条注入行）
- 显示标题：`rollout-*`（filename fallback）

这是**预期行为**，不是 bug。这类会话无法从任何来源获得有意义的标题。

---

## 四、第三方编排工具（Conductor 等）

### 现象

Conductor（`https://conductor.build`）及类似的多 agent 编排工具会在第一条用户消息之前注入 `<system_instruction>` 块，内容包含 worktree 路径、分支名、联系方式等。Codex 将整段拼接内容存为 `first_user_message` 和 `title`，导致标题显示为 `<system_instruction>\nYou are working inside Conductor...`。

示例（`state_5.sqlite` 中的 `title` 列）：

```text
<system_instruction>
You are working inside Conductor, a Mac app that lets the user run many coding agents in parallel.
Your work should take place in the /Users/tr/conductor/workspaces/clipvibe/sarajevo directory...
</system_instruction>

请运行 `PORT=3001 pnpm test:e2e`
```

### 处理

`sanitizeSqliteCodexTitle()` in `src/lib/parse/codexLog.ts`：

1. 用正则 `/<system[_-]instruction>[\s\S]*?<\/system[_-]instruction>\s*/gi` 剥离所有此类块
2. 取剩余内容的第一行，截断至 120 字符
3. 若剩余为空、或仍是注入前缀、或仅剩 `---`（OpenSpec frontmatter 分隔符），返回 `undefined` 触发 JSONL 流式解析 fallback

当前已知受影响的会话来源标识：`source = 'exec'`（Conductor 通过 exec 模式启动 Codex）。

---

## 五、其他相关文件

| 路径 | 用途 |
| --- | --- |
| `~/.codex/.codex-global-state.json` | Electron globalState 持久化（`thread-titles.titles` 字段**永远为空**——曾是 title 的候选存储位置，但实际迁移已切换到 `session_index.jsonl`） |
| `~/.codex/internal_storage.json` | 少量 App 状态（如 `gpt_5_codex_model_prompt_seen`） |
| `~/.codex/auth.json` | 认证信息（敏感） |
| `~/.codex/logs_1.sqlite` | 请求/响应日志（不含标题） |
| `~/.codex/sqlite/codex-dev.db` | inbox_items、automations 等（不含会话标题） |
| `~/.codex/mcp/shared-memory/memory.sqlite3` | MCP 共享记忆 |
| `~/.codex/shell_snapshots/<uuid>.<nanos>.sh` | 会话结束时的 shell 状态快照 |
| `~/Library/Application Support/Codex/Local Storage/leveldb/` | Electron renderer 端 localStorage（statsig feature flags、UI 布局，不含 title） |
| `/Applications/Codex.app/Contents/Resources/codex` | Rust 二进制，约 148 MB；app-server（含 SQLite 写入逻辑） |
| `/Applications/Codex.app/Contents/Resources/app.asar` | Electron 前端代码（可用 `@electron/asar extract` 解包） |

---

## 六、`agent-switch` 实现入口

| 功能 | 文件 | 函数 |
| --- | --- | --- |
| 标题分级读取 | `src/lib/server/codex.ts` | `getCodexTrajectoryMetaMap()` |
| session_index 解析 | `src/lib/server/codex.ts` | `getCodexTitlesFromSessionIndex()` |
| SQLite 读取 | `src/lib/server/codex.ts` | `getCodexDataFromSqlite()` |
| JSONL 流式元数据提取 | `src/lib/server/codex.ts` | `extractCodexFileMeta()` |
| 注入上下文识别 | `src/lib/parse/codexLog.ts` | `isInjectedContextMessage()` |
| JSONL 标题提取 | `src/lib/parse/codexLog.ts` | `extractCodexTitle()` |
| SQLite title 清洗 | `src/lib/parse/codexLog.ts` | `sanitizeSqliteCodexTitle()` |
| 文件收集 | `src/lib/server/codex.ts` | `collectJsonlFiles()` |
| 状态诊断 | `src/lib/server/codex.ts` | `getCodexStatus()` |

---

## 七、常见失败模式 & 排查

### 大量 `rollout-*` 标题

**原因 A**：空壳会话（`has_user_event = 0`）—— 用户开了但没发消息，正常现象。  
**原因 B**（已修复）：`session_meta` 行超过旧的 8 KB raw buffer 预算，导致该行截断、解析失败。现已改为 256 KB 逐行流式读取。

**验证**：

```bash
# 检查某个 rollout-* 会话的实际内容
python3 -c "
import json, sys
with open('$HOME/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl') as f:
    for i, line in enumerate(f):
        if i > 5: break
        obj = json.loads(line)
        print(i, obj.get('type'), str(obj)[:100])
"
```

### 标题显示为 `<system_instruction>...`

**原因**：Conductor 或类似工具注入 `<system_instruction>` 块到首条用户消息。`sanitizeSqliteCodexTitle()` 已处理此情况。

### 标题显示为 `logseq://graph/...` 而非手动重命名的短标题

**原因**：`session_index.jsonl` 未被读取，回退到 SQLite `title`（仅含自动生成值）。  
**验证**：

```bash
grep "<uuid>" ~/.codex/session_index.jsonl
```
若有输出则说明 index 中有记录，检查代码路径是否正确提取了 UUID 并查询了 index。

### 标题显示为 `# AGENTS.md instructions for ...` 或 `<environment_context>`

**原因**（已修复）：`extractCodexTitle()` 未跳过注入前缀。现已在 `INJECTED_CONTEXT_PREFIXES` 中处理。

---

## 八、变更记录

- **2026-03-14**：新增 Codex CLI 会话支持，JSONL 解析器，`title/cwd` 从 `session_meta` 及首条用户消息提取。
- **2026-04-08**：
  - 将 JSONL 元数据提取从 8 KB raw buffer 升级为 256 KB 逐行流式读取（修复 `session_meta` 超长行截断问题）。
  - 在 `INJECTED_CONTEXT_PREFIXES` 中新增 `<system_instruction>` 变体；导出 `sanitizeSqliteCodexTitle()`。
  - 调查并确认 `~/.codex/state_5.sqlite` 为自动标题的持久化存储（Rust app-server 通过 sqlx 写入）；确认 `title` 列从不被重命名操作更新。
  - 发现 `~/.codex/session_index.jsonl` 为手动重命名的权威来源（append-only，Rust `set_thread_name` handler 写入）。
  - 将标题读取升级为三层策略：`session_index.jsonl` → `state_5.sqlite` → JSONL 流式解析。
  - 确认空壳会话（`has_user_event = 0`）显示 `rollout-*` 为正常预期行为。
- **2026-04-09**：
  - 调查 Codex JSONL 中 `response_item` 与 `event_msg` 的重复 emit 模式；确认 Codex CLI 对每条用户消息 emit 两次（结构化记录 + 流式通知）。
  - 在 `normalizeCodexEventsToTrajectoryEvents` 中实现连续去重逻辑：相邻 `user` 事件若 `text` 相同则丢弃第二条；对比 `agent-session-view` 的处理策略（仅解析 `response_item`）。
  - 补充文档：新增「重复事件模式」章节（第二节），说明重复原因、对比竞品处理方式、记录我们的实现策略。
