# 搜索功能技术方案设计

> 本文档对应 issue [#21](https://github.com/yicone/agent-storage-manager/issues/21) 的设计要求，同时也是 issue [#5](https://github.com/yicone/agent-storage-manager/issues/5)（Architecture Review v1: Search + structured filters）的实现说明文档。

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
| 搜索结果支持 jump-to-row（上一处/下一处） | ✅ 已实现 |
| 在主视图或 Inspector 中高亮匹配 | 🔲 **未实现**（见下方 "未来工作"） |
| 大型会话性能可接受 | ✅ 依赖 `useMemo` 避免冗余计算；虚拟滚动已有 |

---

## 5. 未来工作

### 5.1 文本高亮（in-text match highlighting）

当 `eventSearch` 非空时，在事件的 `title`、`text`、`output` 等字段内，将命中的子串包裹在高亮标签中。

**推荐方案**：引入 `mark.js` 或 `react-highlight-words`，在 EventRow 渲染文本时包装。

**注意事项**：
- 仅对可见行做高亮（虚拟滚动已保证渲染行数有限）。
- `output` 字段文本较长，需在截断/折叠后再高亮，避免布局抖动。

### 5.2 跨会话搜索

当前实现只支持在已加载的单条会话内搜索。跨会话全文搜索需要：
- 预构建搜索索引（SQLite FTS / in-process index）或全量加载（内存代价高）。
- 建议作为独立功能（例如 `Cmd+Shift+F` 打开全局搜索面板），与单会话搜索分开实现。

### 5.3 stepType 结构化过滤

issue #5 中提到 `stepType` 可选过滤。当会话加载后，可枚举所有出现的 `stepType` 值，动态生成复选框供过滤。目前 `matchesEventSearch` 已支持对 `stepType` 文本搜索作为替代方案。

---

## 6. 参考文件

- `src/lib/parse/trajectory.ts` — `matchesEventSearch`、`matchesConversationSearch`
- `src/components/HomeClient.tsx` — 搜索状态、`trajectoryFilters`、跳转逻辑
- `docs/viewer/agent-ui-ux-optimization.md` — 整体 UI/UX 优化方案
- `docs/viewer/trajectory-view.md` — 统一事件模型定义
