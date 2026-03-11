# 搜索功能技术方案设计

> 本文档对应 issue [#21](https://github.com/yicone/agent-storage-manager/issues/21) 的设计要求，同时也是 issue [#5](https://github.com/yicone/agent-storage-manager/issues/5)（Architecture Review v1: Search + structured filters）的实现说明文档。

## 文档分类说明

本文档**不是 ADR（Architecture Decision Record）**，原因如下：

- 项目的 ADR 文档（`docs/adr/`）记录的是**技术决策**：在多个可选方案中做出不可轻易逆转的选择，包含 Context、Considered options、Decision、Consequences 等标准章节。典型示例：ADR-001（用 LS RPC 还是离线解码 `.pb`）、ADR-002（统一事件模型还是各源独立模型）。
- 本文档描述的是**功能规格与实现说明**：解释搜索功能如何工作、各字段如何被索引、内存消耗如何估算、已实现了哪些验收标准。这类文档属于 viewer feature spec，与 `docs/viewer/trajectory-view.md` 性质相同。

**存放位置**：`docs/viewer/search-design.md` ✅（当前位置正确）。

**跨会话搜索**（§5.2）的技术选型决策（QMD vs SQLite FTS5 等选项对比）属于架构决策，已另立 ADR 文档：[`docs/adr/ADR-003-cross-session-search.md`](../adr/ADR-003-cross-session-search.md)。

---

## 1. 整体定位

Agent Storage Manager 是一个**本地优先**的离线会话查看器。其核心数据流是：

1. 启动时加载会话列表（扫描 `.pb` 文件元数据，缓存 title/cwd）。
2. 用户选择某条会话后，通过 Language Server RPC 加载该会话的 `TrajectoryEvent[]` 并保存在 React 状态中。
3. **所有搜索均针对已加载到内存的数据**，不产生额外网络请求或磁盘 I/O。

这意味着搜索天然是**客户端内存搜索（client-side in-memory search）**，无需服务端搜索索引。

---

## 2. 内存模型与消耗估算

### 2.1 单次加载的数据结构

每条 `TrajectoryEvent` 包含以下字段：

| 字段 | 典型大小 |
|---|---|
| id, index, source, kind, stepType | ~100 B |
| title, text | 0 – 16 KB（已在适配器中截断） |
| output | 0 – 20 KB（已在适配器中截断） |
| commandLine, cwd | 0 – 500 B |
| toolCalls[].argumentsJson | 0 – 5 KB |
| 其他字段（timestamps, status 等） | ~100 B |

**单个事件平均约 1–5 KB**（含少量大 output 的会话取高端值）。

### 2.2 不同规模的估算

| 会话规模 | 事件数量 | 事件数据占用 | 备注 |
|---|---|---|---|
| 小型会话 | ~50 events | ~100–500 KB | 简短对话，少量工具调用 |
| 中型会话 | ~500 events | ~1–5 MB | 中等复杂度任务 |
| 大型会话 | ~2,000 events | ~5–20 MB | 长时多步骤任务 |
| 超大会话 | ~5,000+ events | ~20–50 MB | 罕见，Windsurf 多次 Load more 后 |

### 2.3 应用整体内存范围

```
基线（Next.js + React 浏览器 Tab）：~30–50 MB
会话列表元数据（仅 id/title/cwd/size/mtime）：< 1 MB（即使 500+ 条会话）
当前加载的单条会话内容：1–20 MB（典型），最高可达 ~50 MB
---
典型总消耗：35–70 MB
大型会话总消耗：50–100 MB
```

**结论**：内存消耗可接受，适合"单次加载一条会话"的使用模式。若未来支持跨会话搜索（同时加载多条），需重新评估并引入分页/LRU 卸载机制。

---

## 3. 搜索架构

### 3.1 两类搜索

**会话列表搜索**（`matchesConversationSearch`，位于 `src/lib/parse/trajectory.ts`）

- 触发条件：会话列表顶部的 `filter` 输入框。
- 搜索字段：`id`（会话唯一标识）、`title`（会话标题）、`cwd`（工作目录路径）。
- 实现：`useMemo` 对 `items[]` 做 O(n) 过滤，n ≤ 会话总数（通常 < 1000）。

**事件内容搜索**（`matchesEventSearch`，位于 `src/lib/parse/trajectory.ts`）

- 触发条件：Trajectory 视图中的 `eventSearch` 输入框。
- 搜索字段：`title`、`text`（对话内容）、`output`（命令输出）、`stepType`、`commandLine`、`toolCalls[].name`。
- 实现：`useMemo` 对当前加载的 `rawTrajectoryEvents[]` 做 O(n) 过滤，n ≤ 当前会话事件数。

### 3.2 结构化过滤器

Trajectory 视图支持以下结构化过滤（`trajectoryFilters` 状态）：

| 过滤器 | 说明 |
|---|---|
| `thought` | 显示/隐藏 thought 类型事件 |
| `tool` | 显示/隐藏 tool 类型事件 |
| `command` | 显示/隐藏 command 类型事件 |
| `status` | 显示/隐藏 status 类型事件 |
| `errorsOnly` | 仅显示 error-like 事件（`isErrorLikeTrajectoryEvent`） |
| `hasOutput` | 仅显示有 output 字段的事件 |

文本搜索与结构化过滤同时生效，逻辑为 AND（二者都满足才显示）。

### 3.3 跳转定位（jump-to-match）

当 `eventSearch` 非空时，提供 **上一处 / 下一处** 导航按钮（`navigateSearchMatchByOffset`），循环跳转到命中事件并高亮，复用已有的 `scrollToRowId` / `highlightedRowId` 机制。

---

## 4. 实现状态（对应 issue #5 验收标准）

| 验收标准 | 状态 |
|---|---|
| 在 user/assistant text + event output 中搜索 | ✅ 已实现（`matchesEventSearch` 覆盖 text/output） |
| 会话列表按 id/title/cwd 过滤 | ✅ 已实现（`matchesConversationSearch`） |
| 结构化过滤：kind（thought/tool/command/status）| ✅ 已实现 |
| 结构化过滤：onlyErrors | ✅ 已实现 |
| 结构化过滤：hasOutput | ✅ 已实现 |
| 结构化过滤：stepType（substring 文本过滤） | ✅ 已实现（`trajectoryFilters.stepTypeFilter`） |
| 搜索结果支持 jump-to-row（上一处/下一处） | ✅ 已实现 |
| 搜索命中在事件视图内文本高亮 | ✅ 已实现（`HighlightedText` 组件，title/text/commandLine/output） |
| 大型会话性能可接受 | ✅ 依赖 `useMemo` 避免冗余计算；虚拟滚动已有 |

---

## 5. 待实现功能

### 5.1 文本高亮（in-text match highlighting）— ✅ 已实现

当 `eventSearch` 非空时，事件的 `title`、`commandLine`、纯文本 `text`、`output` 字段内的命中子串被 `HighlightedText` 组件包裹为 `<mark>` 标签并高亮显示。

**实现方式**（无额外依赖）：
- `HighlightedText({ text, query })` — 纯函数，将字符串按查询词切分，命中部分包裹 `<mark className="bg-yellow-300/60">...</mark>`，未命中部分保留纯文本。
- 适用范围：`title`、`commandLine`、非 Markdown 的 `text`、`output`（在折叠的 `<details>` 内）。
- 跳过 Markdown 渲染的 `text`（thought 类型事件）以避免破坏 HTML 结构。
- 虚拟滚动确保始终只高亮当前可见行，无性能问题。

**为何不引入 `react-highlight-words` 或 `mark.js`**：
- `react-highlight-words` 仅处理纯文本 React 节点，与本项目已有自定义渲染逻辑重叠，引入收益有限。
- `mark.js` 直接操作 DOM，在 React 虚拟 DOM 环境下有冲突风险。
- 零依赖的 `HighlightedText` 在本项目的搜索场景（单词/短语子串匹配）中已完全满足需求。

### 5.2 跨会话搜索 — 🔲 未实现（技术选型已确定）

当前实现只支持在已加载的单条会话内搜索。跨会话全文搜索需要服务端索引。

**技术选型**：参见 [`docs/adr/ADR-003-cross-session-search.md`](../adr/ADR-003-cross-session-search.md)。

结论摘要：
- **推荐方案**：SQLite FTS5（通过 `better-sqlite3`）在 Next.js 服务端构建索引，按需填充（session-on-open indexing）。
- **不推荐 QMD**：QMD 的架构假设是索引本地文件目录；本项目的会话内容来自 LS RPC，不存在可直接索引的本地文件。且 QMD 对向量搜索和 LLM 模型的依赖对此场景属于过度设计。
- **入口**：建议作为 `Cmd+K` 全局搜索面板，与单会话搜索分开，不干扰现有 UI 流程。

### 5.3 stepType 结构化过滤 — ✅ 已实现

`trajectoryFilters.stepTypeFilter: string` — 非空时对 `event.stepType` 做大小写不敏感子串匹配（`includes`）。

UI：Trajectory 视图过滤栏底部新增 "Filter stepType…" 文本输入框，与事件搜索框并列。
用法示例：输入 `TOOL_CALL` 仅显示工具调用事件；输入 `RUN_COMMAND` 仅显示命令执行事件。

**为何选择文本输入而非动态枚举复选框**：
- 会话中可能出现数十种 stepType 值（完整字符串如 `CORTEX_STEP_TYPE_TOOL_CALL`），复选框列表会占用大量空间且不便阅读。
- 文本子串过滤更灵活：可匹配 stepType 前缀或中缀，用户无需预先知道所有枚举值。
- 与 eventSearch 保持一致的交互范式（文本输入）。

---

## 6. 参考文件

- `src/lib/parse/trajectory.ts` — `matchesEventSearch`、`matchesConversationSearch`
- `src/components/HomeClient.tsx` — 搜索状态、`trajectoryFilters`、`HighlightedText`、跳转逻辑
- `docs/adr/ADR-003-cross-session-search.md` — 跨会话搜索技术选型决策
- `docs/viewer/agent-ui-ux-optimization.md` — 整体 UI/UX 优化方案
- `docs/viewer/trajectory-view.md` — 统一事件模型定义
