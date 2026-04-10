# Session Backup 调研

更新时间：2026-04-10

> 目标：为本项目后续设计 `Session Backup` 能力建立术语边界、问题拆解、参考对象与首版设计方向。

相关文档：

- [glossary.md](./glossary.md): 术语基线
- [research-agent-context-product-landscape.md](./research-agent-context-product-landscape.md): 产品版图与竞品边界
- [research-cross-agent-management-tools.md](./research-cross-agent-management-tools.md): 跨 agent 管理能力分类总览

---

## 1. 研究背景

本项目已经具备较强的本地 session 浏览、结构化查看和诊断能力，但尚未形成明确的 `Session Backup` 设计。

当前讨论的关键问题不是“是否支持导出”，而是：

1. `Session Backup` 的默认对象到底是什么
2. 它和 `Session Export`、`Source Backup`、`Project Bundle` 的边界是什么
3. 在个人本地、多 agent、project-first 的前提下，首版该做什么，不该做什么

---

## 2. 术语校准

以下术语与 [glossary.md](./glossary.md) 保持一致。

### Session Source

session 的原始来源载体。

可能是：

- `.pb`
- `jsonl`
- `SQLite`
- 本地 app storage
- 本地 runtime / LS RPC 可读取来源

### Session Record

产品内部用于索引、分析、迁移与备份的标准化 session 表达。

典型内容：

- metadata
- normalized events
- provenance
- source reference

当前代码中的首个 schema 名称：

- `session-record/v1`

### Session View

面向阅读或分析的 session 投影视图。

例如：

- `Transcript`
- `Trajectory`
- `Compact`
- `Markdown`

### Session Backup

默认指对 `Session Record` 的保留副本，用于后续恢复、重建索引、迁移、或 project bundle 打包。

当前代码中的首个 package schema 名称：

- `session-backup/v1`

### Source Backup

原始 `Session Source` 的保留副本。

### Session Export

面向阅读、分享或外部系统消费的导出产物。

例如：

- Transcript Markdown
- Trajectory JSON
- raw source copy

### Project Bundle

一个可移植的 project-level 包，可能包含：

- sessions
- rules
- memory
- skills
- commands
- metadata

---

## 3. 核心结论

### 3.1 Session Backup 默认不应等于 Transcript 导出

`Transcript` 是 `Session View`，不是产品级 canonical backup 对象。

如果把 Transcript 当作 backup 默认对象，会造成：

- 信息损失
- 跨 agent 迁移能力弱
- 无法稳定恢复结构化分析能力

### 3.2 Session Backup 默认对象应是 Session Record

推荐默认语义：

- `Session Backup` 默认备份 `Session Record`
- `Source Backup` 是高级选项
- `Session Export` 是平行概念，不等于 backup

### 3.3 Source Backup 应作为可选能力，而不是首版默认

原因：

- 原始 source 的可移植性最弱
- 不同 agent 的 source 形态差异大
- 原始 source 对终端用户的直接价值往往低于 normalized backup
- 原始 source 更容易带来格式耦合与隐私风险

但它仍然是值得保留的能力，因为它适合：

- 法证型调试
- 严格保真归档
- 未来 parser / adapter 重建

### 3.4 Session Backup 不应先等同于 Project Bundle

二者关系建议是：

- `Session Backup`: 单一 session 或 session 集合的 canonical backup
- `Project Bundle`: 以 project 为边界，把 session 与其它 context assets 一起打包

`Project Bundle` 可以在后期复用 `Session Backup` 的数据格式与打包逻辑。

---

## 4. 用户为什么需要 Session Backup

在个人本地场景下，Session Backup 的高价值场景主要有：

### 4.1 防丢失

- 原始 session source 被上游工具清理、覆盖、损坏或迁移
- 需要保留一份稳定可恢复的内部表示

### 4.2 可迁移

- 从一个工作机迁到另一台
- 从一个 agent 工具生态迁到另一个
- 在不依赖原始 source runtime 的情况下继续分析历史

### 4.3 可持续分析

- 后续做全局分析、错误挖掘、命令复用、memory 提取时，不想每次都重新 attach 上游 source

### 4.4 可归档

- 对重要 session 做冻结归档
- 为关键项目建立可重现、可审计的 session archive

---

## 5. 参考对象与可借鉴点

以下对象不是都在做“Session Backup”，但各自覆盖了 export / import / restore / archival / migration 的部分能力。

### 5.1 资产导入/导出/同步型

| 产品 | 对象 | 能力 | 启发 |
|---|---|---|---|
| [rulesync](https://github.com/dyoshikawa/rulesync) | rules / commands / MCP / skills | import + generate + sync | 证明 canonical source + target mapping 是可行模式 |
| [AgentCrew](https://github.com/saigontechnology/AgentCrew) | agent config | export / import | 冲突处理、格式互转、导入入口是值得借鉴的 |
| [app-agent-template](https://github.com/atyourserviceai/app-agent-template) | agent state / messages / tasks / DB | export / import / restore | 说明“完整状态级导出”可以存在，但产品成本很高 |

### 5.2 Session / Transcript 导出型

| 产品 | 对象 | 能力 | 启发 |
|---|---|---|---|
| [Claude Code Log](https://github.com/daaain/claude-code-log) | transcript | HTML / Markdown 导出 | 适合 `Session Export`，不适合作为 canonical backup |
| [Claude Chat Viewer](https://github.com/osteele/claude-chat-viewer) | exported chats | JSON / ZIP 输入、artifacts 下载 | 可借鉴导入外部导出文件的 viewer 模式 |
| [Claude Conversation Exporter](https://github.com/socketteer/Claude-Conversation-Exporter) | conversations | JSON / Markdown / ZIP 导出 | 可借鉴用户可理解的导出格式层次 |
| [AI Chat Exporter](https://github.com/revivalstack/ai-chat-exporter) | chat history | Markdown / JSON 导出 | 再次说明 export 不等于 backup |

### 5.3 Session / Workflow Layer 标杆

| 产品 | 对象 | 能力 | 启发 |
|---|---|---|---|
| [Agent Sessions](https://github.com/jazzyalex/agent-sessions) | multi-agent sessions | unified browse / search / resume / live cockpit | 适合作为 `Sessions` 页标杆，但公开资料里未见 backup 证据 |
| [Universal Session Viewer](https://github.com/tad-hq/universal-session-viewer) | session history | session chain / summary / search | 可借鉴 session 历史 UX，但不是 backup 模型 |
| [Agent Session View](https://github.com/dotneet/agent-session-view) | Claude/Codex sessions | multi-agent viewing + export | 可借鉴导出层，但仍是 session-first |

---

## 6. Agent Sessions 专项观察

截至 2026-04-10 的公开 README 与相关公开描述，本轮未发现 `Agent Sessions` 明确提到：

- backup
- export
- import
- restore

其公开主线是：

- unified session browser
- unified search
- readable tool outputs
- resume workflow
- live `Agent Cockpit`

因此，`Session Backup` 仍然是本项目可以探索差异化的空间。

---

## 7. 首版设计原则

### 7.1 先做 canonical backup，再做复杂 restore

首版建议聚焦：

- 保存 `Session Record`
- 保留 provenance
- 建立 portable backup format
- 支持后续导入到本产品

先不要把首版定义成：

- 可完整恢复到原始 agent 运行时
- 可一键回写到第三方 tool 私有 source store

### 7.2 Backup 与 Export 分开设计

建议在产品语义上明确分开：

- `Backup`
  - 保真
  - 结构化
  - 为恢复与迁移服务
- `Export`
  - 面向阅读或分享
  - 可降级
  - 可生成人类可读格式

### 7.3 Raw source preservation 作为高级选项

建议首版语义：

- 默认：只备份 `Session Record`
- 可选：附带 `Session Source` 副本

这样可以平衡：

- 可移植性
- 存储成本
- 隐私风险
- 对上游 source 变化的耦合程度

### 7.4 UI 入口建议

建议未来支持 3 个入口：

1. `Sessions` 页中的单 session backup
2. `Backup / Migration` 页中的批量 session backup
3. `Project Bundle` 流程中的 session inclusion

---

## 8. 当前实现对齐（2026-04-10）

截至当前仓库实现，已落地的代码级命名与边界如下：

- canonical record schema: `session-record/v1`
- backup package schema: `session-backup/v1`
- managed backup root:
  - 默认位于 `~/.agent-storage-manager/backups`
  - 可通过 `AGENT_STORAGE_MANAGER_BACKUP_ROOT` 覆盖
- 当前已实现的 create / import / verify API：
  - `POST /api/session-backups`
  - `POST /api/session-backups/import`
  - `GET /api/session-backups/[backupId]`
- 当前已实现的 UI 入口：
  - `Sessions` viewer header 中的 `Back Up Session`
  - `Include source copy` 作为高级 inline 控件，仅在当前 source 支持时显示
- 当前 API 诊断字段：
  - `code`
  - `title`
  - `error`
  - `hint`（可选）

当前仍然明确未实现：

- `Source Backup` 的跨 source 完整 source copy 落盘
- 外部文件上传式 import
- 回写第三方 agent runtime / private store

当前已实现的 `Source Backup` 边界：

- `Codex`
  - 当 `includeSourceCopy=true` 时，当前实现会把原始 `.jsonl` 文件以 copy-only 方式纳入 backup package
- `Antigravity`
  - 当前仍未实现 source copy
- `Windsurf`
  - 当前仍未实现 source copy

因此，本文中的首版判断目前已经与代码实现对齐：

- `Session Backup` 默认对象是 `Session Record`
- `Source Backup` 仍是高级选项
- import / restore 当前只恢复到本产品可读状态
- backup package 的读写路径当前被限制在 managed backup root 内部
- `backupId`、manifest entry path、source-copy relative path 如尝试路径穿越会被显式拒绝

同时也需要补充一个实现层说明：

- `Source Backup` 在 v1 不是“一次性对所有 source 对齐”的能力
- 当前更准确的状态是：先在 `Codex` 这类 file-backed source 上验证 copy-only / read-only 模型，再决定是否以及如何扩展到 runtime-backed source

---

## 9. 推荐格式方向

此处先给方向，不定义最终 schema。

### 8.1 Canonical Session Backup 应至少包含

- session identity
- source metadata
- provenance
- normalized events
- summary
- timestamps
- schema version

### 8.2 可选字段

- raw source reference
- embedded raw source copy
- derived transcript snapshot
- derived markdown snapshot
- local notes / tags

### 8.3 不建议作为首版必选内容

- 所有 derived views 的全量缓存
- 一键恢复到第三方私有格式
- 跨产品无损 round-trip 承诺

---

## 10. 与 Project Bundle 的关系

推荐层级：

- `Session Backup`
  - 单一 session 或 session 集合的 canonical backup
- `Project Bundle`
  - project 级的组合型备份与迁移容器

`Project Bundle` 可复用 `Session Backup` 作为其中的 session 子格式。

---

## 11. 待回答问题

这些问题适合在下一轮专门设计 `Session Backup` 时继续推进：

1. `Session Record` 的 canonical format 是否应该独立于现有 API payload
2. `Source Backup` 是否应默认关闭
3. 是否支持 batch backup 与增量 backup
4. backup 成功后是否应支持校验与完整性检查
5. 是否允许在 `Project Bundle` 中混合保存 session、rules、memory、skills、commands
6. restore 是否应先限制为“恢复到本产品可读状态”，而不是“回写外部工具”

---

## 12. 建议的后续讨论入口

下一轮讨论 `Session Backup` 时，建议明确要求 AI 先按以下顺序推进：

1. 术语校准
2. 问题拆解
3. 参考产品与开源项目
4. 2-3 个可选方案
5. 推荐方案
6. 首版设计建议

如果需要新的 prompt，可复用本仓库后续整理的开题提示词，并引用：

- [glossary.md](./glossary.md)
- [research-agent-context-product-landscape.md](./research-agent-context-product-landscape.md)
- 本文档
