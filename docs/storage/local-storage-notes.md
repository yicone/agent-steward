# Antigravity / Windsurf 本地存储结构（持续记录）

本文档用于记录 **Antigravity** 与 **Windsurf** 在 macOS 上的本地存储布局、关键文件、以及我们在实现/调试 `agent-storage-manager` 过程中验证过的“可用事实”。它是一个活文档：每次发现新结构或出现不兼容变更时，都应补充到这里（最好附上“如何复现/如何验证”）。

> 约定：文中路径均以 macOS 为准；`~` 表示用户主目录。  
> 重要：这些目录里可能包含会话内容、仓库路径、token 等敏感信息；调试/截图/开源文档时注意脱敏。

---

## 验证环境（已验证）

本文档中标注为“已验证”的结论，只对下列**已实测样本**成立；未列出的版本需要按“同产品最近样本”先选实现方案，再用后文命令二次验证。

### 如何阅读这里的版本记录

- 每条样本固定回答三件事：`版本指纹`、`对应实现方案`、`回归时先验证什么`。
- 只记录已经实测过的事实；没有单独采集到的字段明确写成“未单独记录”。
- 对项目用户/贡献者最关键的字段不是版本号本身，而是“这个版本的 attach / token / metadata 依赖哪条实现路径”。

### 已验证样本

- `Windsurf 1.9566.11 / Extension 1.48.2`
  - 版本指纹：Commit `8911695f6454083fd48c3422f4736eb88053357c`；VS Code OSS `1.108.2`；Electron `39.2.7`；Chromium `142.0.7444.235`；构建时间 `2026-02-26T04:44:02.979Z`；OS `Darwin arm64 24.6.0`
  - 对应实现方案：`pid/port` 从 `Windsurf.log` 读取；live CSRF token 从进程启动参数 `argv`（如 `--csrf_token <uuid>`）读取
  - 回归时先验证：`ps -o args= -ww -p <pid>` 是否仍能看到 `--csrf_token`
- `Windsurf 1.9577.24 / Extension 1.48.2`
  - 版本指纹：Commit `73ca2d6aa880de1bc504ad960c1ab79c9248d476`；VS Code OSS `1.108.2`；Electron `39.2.7`；Chromium `142.0.7444.235`；Node.js `22.21.1`；V8 `14.2.231.21-electron.0`；构建时间 `2026-03-09T19:00:54.154Z`；OS `Darwin arm64 24.6.0`
  - 对应实现方案：`pid/port` 从 `Windsurf.log` 读取；live CSRF token 从 LS 子进程环境变量 `WINDSURF_CSRF_TOKEN` 读取；`state.vscdb` 中的 `codeium.windsurf-windsurf_auth-` 不是可用 fallback
  - 回归时先验证：`ps eww -o command= -ww -p <pid>` 是否仍能看到 `WINDSURF_CSRF_TOKEN=`；`Heartbeat` 对 `state.vscdb` UUID 是否仍返回 `401 invalid CSRF token`
- `Antigravity 1.19.5`
  - 版本指纹：Commit `6adfc1a7e4a1a9af62bc45e8f2d7e6a97b7a9756`；VS Code OSS `1.107.0`；Electron `39.2.3`；Chromium `142.0.7444.175`；构建时间 `2026-02-26T07:23:14.771Z`；OS `Darwin arm64 24.6.0`
  - 对应实现方案：LS 发现仍应优先走 `Antigravity.log` attach，并以 `Heartbeat` 成功作为准入；`daemon/ls_*.json` 可作为 legacy discovery；`title/cwd` 通过 `state.vscdb` 的 `*trajectorySummaries` enrichment
  - 回归时先验证：discovery 是否仍写入 fixed ports，以及 log attach 与 discovery 是否指向同一 pid/port
- `Antigravity 1.19.6`
  - 版本指纹：App Version `1.19.6`；OS `Darwin arm64 24.6.0`；其余字段未单独记录
  - 对应实现方案：LS 发现优先走 `Antigravity.log` attach；`daemon/ls_*.json` 可能陈旧；`title/cwd` 仍通过 `state.vscdb` 的 `*trajectorySummaries` enrichment
  - 回归时先验证：是否出现 random ports，以及 discovery 文件是否停留在旧 pid/旧端口

### 版本到实现方案的速查

- `Windsurf 1.9566.11`：`log + argv token`
- `Windsurf 1.9577.24`：`log + env token (WINDSURF_CSRF_TOKEN)`
- `Antigravity 1.19.5`：`log attach preferred + discovery legacy + state.vscdb metadata`
- `Antigravity 1.19.6`：`log attach required in practice + stale discovery risk + state.vscdb metadata`

### 为什么要持续追踪 attach / token 变化

有必要，而且适合继续放在这份文档里维护，原因是：

- attach 依赖的是上游内部实现细节（日志格式、端口发现、token 注入方式），并不是稳定公开协议；
- App 升级后，最容易失效的常常不是会话内容解析，而是“如何连上 LS”这一步；
- 这类问题通常具有明确版本边界，不把版本与现象绑在一起记录，下次排查会重新回到逆向阶段。

建议每次遇到 attach 回归时，固定补齐以下字段：

- 版本：App / Extension / Commit / VS Code OSS / Electron / Node / OS
- 现象：`401 missing CSRF token`、`401 invalid CSRF token`、端口不通、stale pid 等
- 当时真实来源：token 来自 `argv`、`env`、discovery 文件，还是根本不可读
- 验证命令：`ps` / `curl` / `rg` / `sqlite3`
- 结论：旧假设哪里失效、代码层做了什么修复

---

## 总体策略（为什么不直接解码 `.pb`）

两者会话文件多为 `.pb`（protobuf 二进制），但**格式不是公开稳定协议**，且观察到内容可能是压缩/加密/嵌套 protobuf。直接离线反序列化成本高、易碎。

当前一期产品策略是：

- **优先通过本地 Language Server（LS）RPC 获取结构化数据**（详情见 `docs/adr/ADR-001-use-language-server-rpc.md`）
- 对 **Antigravity**，额外利用其 **VS Code global state（`state.vscdb`）** 来稳定提取会话列表所需的 `title/cwd` 元信息（这是我们实际验证过的可靠来源）

---

## Antigravity

### 1) Antigravity 数据根目录（主要面向会话文件）

- 根：`~/.gemini/antigravity/`
- 典型结构（非穷举）：
  - `conversations/*.pb`：会话（文件名通常是 UUID）
  - `daemon/ls_*.json`：Language Server discovery 信息（端口、pid、csrf token 等；**可能陈旧**，见下文）
  - `playground/`：内置示例/实验空间（会在 `cwd` 里出现）

### 2) Attach 模式（推荐）：通过 Antigravity.log 发现 LS 的 pid/port，再从进程参数提取 CSRF token

**结论（已验证）：** 在部分 Antigravity 版本中，LS 会使用 **random port**，且不一定会更新 `~/.gemini/antigravity/daemon/ls_*.json`。这会导致 discovery 文件长期“看似存在但不可用”（stale pid/port），而 Antigravity UI 仍然正常工作。

因此 `agent-storage-manager` 对 Antigravity 采用 Windsurf 类似的 attach：

- 日志根：`~/Library/Application Support/Antigravity/logs/<timestamp>/`
- 典型 log 文件：
  - `window*/exthost/google.antigravity/Antigravity.log`

从日志中提取：
- `pid`：`Starting language server process with pid (\d+)`
- `httpPort`：`listening on (random|fixed) port at (\d+) for HTTP`
- `httpsPort`：`listening on (random|fixed) port at (\d+) for HTTPS`

从进程命令行提取（如果可读）：
- `--csrf_token <uuid>` / `--csrf-token <uuid>` / `--csrfToken <uuid>`（具体 flag 可能随版本变更）
- 或环境变量形式：`CODEIUM_CSRF_TOKEN=<uuid>`（若存在）

排查命令：

```bash
# 找到最新的 Antigravity.log
find "$HOME/Library/Application Support/Antigravity/logs" -path '*Antigravity.log' -print | tail -n 5

# 在最新 Antigravity.log 中查看 pid/ports
rg -n 'Starting language server process with pid|listening on (random|fixed) port at' \
  "$HOME/Library/Application Support/Antigravity/logs/<ts>/window*/exthost/google.antigravity/Antigravity.log"
```

### 3) discovery 文件（legacy）：用于发现/连接 Antigravity LS（可能陈旧）

- 路径：`~/.gemini/antigravity/daemon/ls_*.json`（取最新 `mtime`）
- 我们使用的字段（版本可能变化）：
  - `httpPort` / `httpsPort`
  - `csrfToken`
  - `pid`

`agent-storage-manager` 中的实现入口：
- `src/lib/server/antigravity.ts`（log attach + discovery fallback）

典型故障模式：
- discovery 文件存在但 `pid` 不存活（stale discovery）
- discovery 指向 fixed port，但实际 LS 已改为 random port（导致连不上）

#### 如何判定 discovery 是否陈旧（stale）

在出现 UI 显示 `Antigravity: discovered`、但 Viewer 报 `fetch failed` / `reachable: false` 时，优先怀疑 discovery stale：

1) **确认 pid 是否仍在运行**

```bash
# 从 discovery 读取 pid（示例）
cat "$HOME/.gemini/antigravity/daemon/ls_*.json" | tail -n 1

# 检查 pid 是否存在（pid 不存在则 discovery 基本可判定为 stale）
ps -p <pid> -o pid=,comm=
```

2) **确认端口是否仍可连通**

```bash
# 用 curl 测试 Heartbeat（不保证每个版本都允许无 token；仅用于快速排查）
curl -sS "http://127.0.0.1:<httpPort>/google.antigravity.language_server.v1.LanguageServerService/Heartbeat" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Connect-Protocol-Version: 1' \
  -d '{}' | head
```

若 pid 不存在或端口不通，但 Antigravity UI 仍正常，则多半是 **LS 已重启到新 pid/新端口**，而 discovery 文件未更新。

**恢复建议：**
- 保持 Antigravity 打开；
- 在 Antigravity 中发起/打开一次对话（触发 extension host 重新拉起 LS）；
- 让 `agent-storage-manager` 走 “Attach 模式（Antigravity.log）” 重新定位 pid/ports。

### 4) VS Code global state（会话列表 title/cwd 的关键来源）

**结论（已验证）：** Antigravity 的“会话标题（summary/title）+ 工作目录（cwd）”在很多情况下并不完全依赖 LS 返回，而是存在于 Antigravity 的 VS Code global state 数据库里；并且该映射的 key 与 `conversations/*.pb` 的文件名（UUID）能直接对应。

- 路径：`~/Library/Application Support/Antigravity/User/globalStorage/state.vscdb`
- 表：`ItemTable`
- 关键 key（两者择一存在，优先前者）：
  - `antigravityUnifiedStateSync.trajectorySummaries`
  - `unifiedStateSync.trajectorySummaries`
- value 特征：
  - 是一个很长的 **base64 字符串**
  - base64 解码后仍是一个 protobuf（我们用“无 schema 的最小解析”解析出它是一个 map-like 结构）
  - map 的 key 是 UUID（与 `.pb` 文件名一致）
  - map value 内部包含另一个 base64 字符串（解码后是某个 `CascadeTrajectorySummary` 的 protobuf bytes）
  - `CascadeTrajectorySummary` bytes 中可以稳定提取：
    - **title**：观察到为 `field 1` 的 string
    - **cwd**：消息中包含 `file://...` 的 workspace URI；常见前缀为 `#file://...`（需要去掉 `#`）

> 备注：这里的 “field 1 / 结构形态” 是基于当前版本的实测与最小解析推断；不是官方 schema，未来版本可能变更。

#### 多 profile / 非默认 User Data Dir 的排查

如果用户启用了 **VS Code Profiles**（或应用使用了非默认的 User Data 目录），对应的 `state.vscdb` 可能不在默认路径下。

建议以“搜文件”为准（优先找 `*/globalStorage/state.vscdb`）：

```bash
# Antigravity：列出所有可能的 globalStorage DB
find "$HOME/Library/Application Support/Antigravity" \
  -path '*/globalStorage/state.vscdb' -print
```

排查思路：
- 如果发现多个 `state.vscdb`，逐个用下方 sqlite 命令查询 `*trajectorySummaries*`，以“能查到且能解析出 map”为准；
- 产品代码层可以考虑：优先默认路径；为空时再枚举候选 DB（避免误扫过大目录）。

如何快速验证（本地命令示例）：

```bash
sqlite3 "$HOME/Library/Application Support/Antigravity/User/globalStorage/state.vscdb" \
  "select key, length(value) from ItemTable where key like '%trajectorySummaries%';"
```

`agent-storage-manager` 的实现入口：
- `src/lib/server/antigravityGlobalState.ts`
  - `getAntigravityTrajectoryMetaMapFromVscdb()`
  - `buildMetaMapFromGlobalStateTrajectorySummariesValue()`
  - `extractMetaFromCascadeTrajectorySummaryProtoBytes()`

为何需要它：
- 我们实际遇到过：LS `GetAllCascadeTrajectories` 只返回了**部分 workspace scope 的 summaries**，导致对话列表缺失 `title/cwd`；
- 从 `state.vscdb` 读取可覆盖更多（与 Antigravity UI 更一致）。

---

## Windsurf

### 1) Windsurf 数据根目录（主要面向会话文件）

- 根：`~/.codeium/windsurf/`
- 典型结构（非穷举）：
  - `cascade/*.pb`：会话（文件名通常是 UUID）
  - `database/`：本地数据库目录（结构未完全逆向）
  - `memories/`, `brain/`, `context_state/`, `implicit/` 等：状态与缓存
  - `user_settings.pb`：用户设置（protobuf）

> 目前一期产品并没有依赖 Windsurf 本地数据库去取 `summary/cwd`；列表 enrichment 依赖 LS RPC。

### 2) Attach 模式：通过日志发现 LS 的 pid/port，再按版本从进程参数或环境提取 CSRF token

Windsurf 的 LS 连接信息不通过固定 discovery 文件暴露（至少在我们已验证路径中没有），因此采用 attach：

- 日志根：`~/Library/Application Support/Windsurf/logs/<timestamp>/`
- 典型 log 文件：
  - `window*/exthost/codeium.windsurf/Windsurf.log`

从日志中提取：
- `pid`：`Starting language server process with pid (\d+)`
- `port`：`listening on random port at (\d+)`

从进程可读信息提取：
- 启动参数：`--csrf_token <uuid>`（已在 `Windsurf 1.9566.11` 验证）
- 进程环境变量：`WINDSURF_CSRF_TOKEN=<uuid>`（已在 `Windsurf 1.9577.24` 验证）

已验证版本差异：

- `Windsurf 1.9566.11 / Extension 1.48.2`
  - live CSRF token 可直接从进程启动参数读取
  - `ps -o args= -ww -p <pid>` 是有效验证命令
- `Windsurf 1.9577.24 / Extension 1.48.2`
  - 当前构建会在 extension host 启动时生成一个新的 `crypto.randomUUID()` 作为 root LS CSRF token，并用该 token 启动/访问本地 LS
  - 该 live token 会传给 LS 子进程环境变量 `WINDSURF_CSRF_TOKEN`，因此若系统允许，`ps eww` 可直接读到
  - `~/Library/Application Support/Windsurf/User/globalStorage/state.vscdb` 中的 `codeium.windsurf-windsurf_auth-` 虽然也是 UUID，但实测对 `Heartbeat` 返回 `401 invalid CSRF token`，因此**不能**作为 LS CSRF token fallback

`agent-storage-manager` 的实现入口：
- `src/lib/server/windsurf.ts`
  - `findLatestWindsurfLogFile()`（扫描 logs 目录以定位可解析的 `Windsurf.log`）
  - `getWindsurfStatus()`（解析 pid/port/token，决定 attached 状态）
  - `getWindsurfTrajectoryMetaMap()`（LS `GetAllCascadeTrajectories`）

常见失败模式：
- logs 目录存在，但最新若干 `<timestamp>` 文件夹里没有 `Windsurf.log`（启动中间态/空 session）  
  → 需要扫描更多 session 文件夹来找到最近的有效 log（我们已在代码中修复为扫描全部 session 目录）。

---

## 跨平台路径参考（Cross-platform path reference）

项目通过 `src/lib/server/platform.ts` 统一管理平台相关路径。macOS 为已验证的参考实现；Windows / Linux 路径遵循 VS Code / Electron 的惯例，但尚未经过实机验证。

| 路径用途 | macOS（已验证） | Windows（待验证） | Linux（待验证） |
|---|---|---|---|
| Antigravity logs root | `~/Library/Application Support/Antigravity/logs` | `%APPDATA%\Antigravity\logs` | `$XDG_CONFIG_HOME/Antigravity/logs`（默认 `~/.config`） |
| Windsurf logs root | `~/Library/Application Support/Windsurf/logs` | `%APPDATA%\Windsurf\logs` | `$XDG_CONFIG_HOME/Windsurf/logs` |
| Antigravity state.vscdb | `~/Library/Application Support/Antigravity/User/globalStorage/state.vscdb` | `%APPDATA%\Antigravity\User\globalStorage\state.vscdb` | `$XDG_CONFIG_HOME/Antigravity/User/globalStorage/state.vscdb` |
| Antigravity discovery（legacy） | `~/.gemini/antigravity/daemon/ls_*.json` | 同左（跨平台） | 同左 |
| 进程参数/token 读取 | `ps` 命令 | TODO: `wmic` 或 PowerShell | `ps` 命令（与 macOS 类似，flag 可能有差异） |

> TODO: 在 Windows / Linux 上实际安装 Antigravity / Windsurf 后验证上述路径，并更新此表。

---

## 已知差异与未解问题（TODO）

1. `.pb` 本体是否包含可稳定提取的 `title/cwd`？
   - Antigravity：对若干 `.pb` 做过粗字符串扫描，未发现可读路径/标题（可能高熵/加密/压缩）。
   - Windsurf：未作为一期目标逆向 `.pb`。
2. Windsurf 是否也存在类似 Antigravity 的 `state.vscdb` 结构存储 `trajectorySummaries`？
   - 在 `~/Library/Application Support/Windsurf/User/globalStorage/state.vscdb` 中暂未发现类似 key（至少在 “验证环境” 所列版本中成立；需要持续观察不同版本/不同使用路径）。
   - 建议验证命令（没有输出通常表示“无匹配 key”或 DB 路径不同）：

     ```bash
     sqlite3 "$HOME/Library/Application Support/Windsurf/User/globalStorage/state.vscdb" \
       "select key, length(value) from ItemTable where key like '%trajectorySummaries%';"
     ```

     若怀疑是 profile / 非默认目录导致，可先枚举：

     ```bash
     find "$HOME/Library/Application Support/Windsurf" \
       -path '*/globalStorage/state.vscdb' -print
     ```
3. 多 window / 多 profile 场景下：
   - Windsurf 可能同时存在多个 `window*`，每个 window 有独立 log。
4. token 变化与权限：
   - token 会随 extension host / LS 启动变化。
   - 当前已验证版本里，`state.vscdb` 的 auth UUID 不是 LS CSRF token。
   - 因此无法读取进程参数时，只有“拿到 live token 后手动 override”这一条路；否则 attach 无法完成。

---

## 多 root 配置与测试（Multi-root setup & testing）

### 背景：每个产品在 macOS 上只有一个默认存储目录

| 产品 | 默认路径 |
|------|---------|
| Antigravity | `~/.gemini/antigravity/conversations` |
| Windsurf | `~/.codeium/windsurf/cascade` |
| Codex CLI / App | `~/.codex/sessions` (JSONL, `YYYY/MM/DD/rollout-*.jsonl`); archived: `~/.codex/archived_sessions/` |
| Codex state DB | `~/.codex/state_5.sqlite` — thread titles, cwd, first_user_message, archived flag |

正常安装下，每个产品只写入一个目录。**多 root 场景**主要出现在：

- **备份/恢复**：把历史会话目录拷贝到其他位置（如外部硬盘 `/Volumes/Backup/ag-conversations`）
- **多版本/多 profile**：不同 Antigravity/Windsurf profile 使用不同 data dir
- **手动归档**：把旧会话移到独立目录以减小主目录体积

### 如何手动添加额外 root

1. **通过 Settings UI**（推荐）：在 Web UI Settings 页 → "Add root" 表单，选择 source（antigravity/windsurf），填入目录绝对路径，点击 Add。
2. **直接编辑 config.json**：修改 `~/.agent-storage-manager/config.json`（或 `$AGENT_STORAGE_MANAGER_CONFIG_PATH`），在 `roots` 数组中追加条目：

```json
{
  "id": "ag-backup-202603",
  "source": "antigravity",
  "path": "/Volumes/Backup/ag-conversations",
  "enabled": true
}
```

### 构造测试条件（开发/CI 环境）

由于开发环境通常没有真实的 Windsurf/Antigravity 会话文件，项目提供了一个 seed 脚本来创建合成测试数据：

```bash
# 生成 5 个 root、16 个 dummy .pb 文件（含跨 root 重复）+ 测试 config
node scripts/seed-multi-root.mjs

# 用生成的 config 启动 dev server
AGENT_STORAGE_MANAGER_CONFIG_PATH=.local/seed-config.json pnpm dev

# 清理
node scripts/seed-multi-root.mjs --clean
```

生成的数据结构：

| Root ID | Source | 内容 |
|---------|--------|------|
| `ag-primary` | antigravity | 6 个 .pb（含 1 个与 ag-backup 重复的 ID） |
| `ag-backup` | antigravity | 3 个 .pb（含 1 个与 ag-primary 重复的 ID） |
| `ag-empty` | antigravity | 0 个 .pb（测试空目录健康状态） |
| `ws-primary` | windsurf | 5 个 .pb（含 1 个与 ws-external 重复的 ID） |
| `ws-external` | windsurf | 2 个 .pb（含 1 个与 ws-primary 重复的 ID） |

验证要点：
- **Settings 页**：5 个 root 各显示 health badge（pb 数量）；`ag-empty` 显示 "0 pb"
- **会话列表**（Antigravity tab）：重复会话显示 "⚠ duplicate in 1 other root"
- **会话列表**（Windsurf tab）：重复会话显示 "⚠ duplicate in 1 other root"
- **API** `GET /api/root-health`：5 个 root 全部 "healthy"

### 自动化测试覆盖

项目的 `tests/conversations.test.ts` 已覆盖多 root 核心逻辑（不依赖真实 .pb 内容）：

- 多 root 并行扫描（`listConversationFiles` 跨 root 合并 + 排序）
- 目录缓存命中/失效（TTL + mtime 变化检测）
- 跨 root 重复检测（2-way、3-way）
- 单 root 健康探测（healthy/missing/unreadable）
- 全 root 并行探测（`probeAllRootsHealth`）

这些测试使用 `os.tmpdir()` 下的临时目录和 dummy 文件，不需要外部依赖。

---

## 变更记录（建议维护）

- 2026-02-27：确认 Antigravity 的 `title/cwd` 可从 `state.vscdb` 的 `*trajectorySummaries` 获取，并在项目中实现为列表 enrichment 的主要来源之一。
- 2026-02-27：补充“验证环境”，将已验证结论与具体版本/构建信息关联，便于后续排查兼容性变更。
- 2026-03-03：确认 Antigravity 在部分版本中会使用 random ports 且可能不更新 `~/.gemini/antigravity/daemon/ls_*.json`；因此将 Antigravity 的 LS 发现逻辑升级为“优先从 `Antigravity.log` attach，并以 Heartbeat 成功作为选择依据”。
- 2026-03-13：补充「多 root 配置与测试」章节——说明 macOS 上每个产品的默认存储路径、手动添加 root 的方法、seed 脚本构造测试条件的完整流程，以及自动化测试的覆盖范围。
- 2026-03-11：修正 Windsurf token 提取策略记录：此前项目实现依赖从进程启动参数读取 live CSRF token；排查过程中曾尝试把 `state.vscdb` 中的 auth UUID 当作 fallback，但实测始终无效。确认在 Windsurf `1.9577.24` / Extension `1.48.2` 中，当前有效来源是运行中 LS 进程环境变量 `WINDSURF_CSRF_TOKEN`，因此项目实现改为优先读取 `ps eww` 输出。
- 2026-03-13：引入平台抽象层 `src/lib/server/platform.ts`，将本地存储的发现与解析逻辑拆分为「平台相关实现细节」与「产品无关公共接口」两层；先统一收敛 Antigravity / Windsurf 的 macOS 路径（logs root、state.vscdb），并补充 Windows / Linux 路径占位（待验证）与本文档“跨平台路径参考”表。后续 Antigravity / Windsurf / Codex 的存储变更均通过该抽象层接入，以便在不同操作系统之间复用与测试。
- 2026-03-14：新增 Codex CLI 会话支持 — 会话文件为 `.jsonl` 格式，存储在 `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`。与 Antigravity/Windsurf 不同，Codex 不需要连接正在运行的进程，而是直接从磁盘读取文件。解析器将 `session_meta`、`user_message`、`assistant_message`、`tool_call`、`tool_result`、`exec`、`reasoning` 等事件归一化为统一的 trajectory 模型；`title/cwd` 从 `session_meta` 及首条用户消息头部提取。
- 2026-04-08：确认 Codex App 与 CLI 的对话标题存储于 `~/.codex/state_5.sqlite`，`threads` 表，`title` 列（`better-sqlite3` 写入，App 在首轮结束后自动生成，支持用户手动重命名，重启后持久化）。`rollout_path` 列为 JSONL 文件的完整绝对路径（含 `archived_sessions/` 分支），session ID 为 `basename(rollout_path, '.jsonl')`。项目实现改为优先从 SQLite 读取标题，仅对数据库中未记录的会话（如极新会话或仅通过 CLI 创建）才回退到 JSONL 流式解析。此外，将 JSONL 元数据提取的字节预算从 8 KB（raw buffer，不足以跨越 ~15 KB 的 `session_meta` 行）提升至 256 KB 逐行流式读取，作为 SQLite 的后备方案。
