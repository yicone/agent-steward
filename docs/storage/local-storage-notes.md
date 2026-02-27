# Antigravity / Windsurf 本地存储结构（持续记录）

本文档用于记录 **Antigravity** 与 **Windsurf** 在 macOS 上的本地存储布局、关键文件、以及我们在实现/调试 `agent-storage-manager` 过程中验证过的“可用事实”。它是一个活文档：每次发现新结构或出现不兼容变更时，都应补充到这里（最好附上“如何复现/如何验证”）。

> 约定：文中路径均以 macOS 为准；`~` 表示用户主目录。  
> 重要：这些目录里可能包含会话内容、仓库路径、token 等敏感信息；调试/截图/开源文档时注意脱敏。

---

## 验证环境（已验证）

本文档中标注为“已验证”的结论，至少在以下环境成立（后续版本可能变更）：

- macOS：`Darwin arm64 24.6.0`
- Windsurf：
  - App Version：`1.9566.11`
  - Extension Version：`1.48.2`
  - Commit：`8911695f6454083fd48c3422f4736eb88053357c`
  - VS Code OSS：`1.108.2`
  - Electron：`39.2.7`（Chromium `142.0.7444.235`）
  - 构建时间：`2026-02-26T04:44:02.979Z`
- Antigravity：
  - App Version：`1.19.5`
  - Commit：`6adfc1a7e4a1a9af62bc45e8f2d7e6a97b7a9756`
  - VS Code OSS：`1.107.0`
  - Electron：`39.2.3`（Chromium `142.0.7444.175`）
  - 构建时间：`2026-02-26T07:23:14.771Z`

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
  - `daemon/ls_*.json`：Language Server discovery 信息（端口、pid、csrf token 等）
  - `playground/`：内置示例/实验空间（会在 `cwd` 里出现）

### 2) discovery 文件（用于发现/连接 Antigravity LS）

- 路径：`~/.gemini/antigravity/daemon/ls_*.json`（取最新 `mtime`）
- 我们使用的字段（版本可能变化）：
  - `httpPort` / `httpsPort`
  - `csrfToken`
  - `pid`

`agent-storage-manager` 中的实现入口：
- `src/lib/server/antigravity.ts`（`findLatestAntigravityDiscovery()` / `getAntigravityStatus()`）

### 3) VS Code global state（会话列表 title/cwd 的关键来源）

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

### 2) Attach 模式：通过日志发现 LS 的 pid/port，再从进程参数提取 CSRF token

Windsurf 的 LS 连接信息不通过固定 discovery 文件暴露（至少在我们已验证路径中没有），因此采用 attach：

- 日志根：`~/Library/Application Support/Windsurf/logs/<timestamp>/`
- 典型 log 文件：
  - `window*/exthost/codeium.windsurf/Windsurf.log`

从日志中提取：
- `pid`：`Starting language server process with pid (\d+)`
- `port`：`listening on random port at (\d+)`

从进程命令行提取：
- `--csrf_token <uuid>`

`agent-storage-manager` 的实现入口：
- `src/lib/server/windsurf.ts`
  - `findLatestWindsurfLogFile()`（扫描 logs 目录以定位可解析的 `Windsurf.log`）
  - `getWindsurfStatus()`（解析 pid/port/token，决定 attached 状态）
  - `getWindsurfTrajectoryMetaMap()`（LS `GetAllCascadeTrajectories`）

常见失败模式：
- logs 目录存在，但最新若干 `<timestamp>` 文件夹里没有 `Windsurf.log`（启动中间态/空 session）  
  → 需要扫描更多 session 文件夹来找到最近的有效 log（我们已在代码中修复为扫描全部 session 目录）。

---

## 已知差异与未解问题（TODO）

1. `.pb` 本体是否包含可稳定提取的 `title/cwd`？
   - Antigravity：对若干 `.pb` 做过粗字符串扫描，未发现可读路径/标题（可能高熵/加密/压缩）。
   - Windsurf：未作为一期目标逆向 `.pb`。
2. Windsurf 是否也存在类似 Antigravity 的 `state.vscdb` 结构存储 `trajectorySummaries`？
   - 在 `~/Library/Application Support/Windsurf/User/globalStorage/state.vscdb` 中暂未发现类似 key（至少在 “验证环境” 所列版本中成立；需要持续观察不同版本/不同使用路径）。
3. 多 window / 多 profile 场景下：
   - Windsurf 可能同时存在多个 `window*`，每个 window 有独立 log。
4. token 变化与权限：
   - token 通常随进程启动变化；无法读取进程参数时需 UI 兜底（override）。

---

## 变更记录（建议维护）

- 2026-02-27：确认 Antigravity 的 `title/cwd` 可从 `state.vscdb` 的 `*trajectorySummaries` 获取，并在项目中实现为列表 enrichment 的主要来源之一。
- 2026-02-27：补充“验证环境”，将已验证结论与具体版本/构建信息关联，便于后续排查兼容性变更。
