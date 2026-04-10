# Agent Context 产品版图调研

更新时间：2026-04-10

> 目标：沉淀本项目在“project-first, local-first agent context cockpit”方向上的可参考产品、竞品边界、可借鉴能力与不建议跟进的方向，为后续持续探索提供统一起点。

相关文档：

- [research-cross-agent-management-tools.md](./research-cross-agent-management-tools.md): 跨 agent 管理能力分类总览
- [glossary.md](./glossary.md): 术语基线
- [architecture-review-v1.md](./architecture-review-v1.md): 当前产品能力与架构基线

---

## 1. 当前研究问题

本项目已经具备较强的本地会话查看与诊断能力，但产品方向正在从：

- session-first viewer

转向：

- project-first agent context cockpit

因此，本轮调研重点不再是“谁是最强 session viewer”，而是：

1. 哪些产品已经把 `sessions / rules / memory / skills / commands` 中的一部分做到了较高完成度
2. 哪些产品值得作为局部能力标杆，而不是整体产品模板
3. 哪些能力值得收编进本项目，哪些能力不应该成为本项目的主战场
4. 哪些产品涉及 backup / export / import / migration，可作为后续 `Session Backup` 与 `Project Bundle` 设计参考

---

## 2. 推荐分类框架

为避免把所有参考对象都混在“竞品”里，建议按以下 4 类理解：

1. **Session / Workflow Layer**
   - 关注会话浏览、检索、恢复、活动监控
2. **Context Asset Layer**
   - 关注 rules / memory / skills / commands 的组织、分发、复用、同步
3. **Retrieval / Memory Infrastructure**
   - 关注 embedding、graph、symbol search、persistent memory
4. **Workflow / Harness / Agent Engineering**
   - 关注 agent runtime、测试、编排、workflow scaffold

本项目未来更适合占据：

- `Project Context Governance Layer`

即位于 `Session / Workflow Layer` 与 `Context Asset Layer` 之上，连接二者，但不直接与 retrieval infra 或 runtime harness 正面竞争。

---

## 3. 核心结论

### 3.1 最重要的产品判断

**不要继续把本项目定义成“更强的 session browser”。**

原因：

- `Agent Sessions` 已经把多 agent、本地原生、统一搜索、resume workflow、live cockpit 这条线做到了很高完成度
- `Universal Session Viewer`、`Claude Code Viewer`、`Agent Session View`、`AgentTrail` 等项目也在 session history 这条线上形成了稳定参考面

更可行的位置是：

- 将 `Sessions` 作为一个强二级页
- 将首页与整体产品定义提升为 `Project Overview` + `Rules / Memory / Skills / Commands / Analysis / Backup / Migration`

### 3.2 最值得借鉴的 4 类能力

1. **Session 浏览 / 恢复**
   - 参考 `Agent Sessions`
2. **Rules / Skills 组织、同步与分发**
   - 参考 `rulesync`、`Oh My Agents`
3. **Memory / Context Library / Citation**
   - 参考 `OpenContext`
4. **Project Context 的健康度、冲突、迁移**
   - 当前没有完全贴合的单一标杆，需要本项目自行整合形成差异化

### 3.3 本项目的推荐定位

一句话建议：

- `A local-first cockpit for inspecting, searching, analyzing, and migrating agent context across your projects.`

对应中文理解：

- 面向个人本地工作流的 project context cockpit
- 把 session、rules、memory、skills、commands 统一成可浏览、可搜索、可分析、可迁移的 context assets

---

## 4. 核心参考对象

### 4.1 Session / Workflow Layer

| 产品 | 类别 | 主语 | 强项 | 不足 | 对本项目的意义 |
|---|---|---|---|---|---|
| [jazzyalex/agent-sessions](https://github.com/jazzyalex/agent-sessions) | 多 agent session browser | session / active workflow | 多 provider、resume、unified search、live cockpit、本地原生完成度高 | 不以 project context assets 为中心 | 应成为 `Sessions` 页标杆，不应成为整个产品模板 |
| [tad-hq/universal-session-viewer](https://github.com/tad-hq/universal-session-viewer) | session viewer | session history | continuation chains、summary、索引和检索较成熟 | session-first | 借其检索、会话链识别和 session UX，不借其整体定位 |
| [esc5221/claude-code-viewer](https://github.com/esc5221/claude-code-viewer) | session viewer | transcript / tools | 阅读体验强、tool grouping、timeline/minimap 倾向 | 单一 agent、治理能力弱 | 借其 viewer 细节与阅读信息架构 |
| [dotneet/agent-session-view](https://github.com/dotneet/agent-session-view) | CLI + Web/desktop | Claude/Codex sessions | 多端形态、统一查看、多格式导出 | 仍以 session 为核心 | 借其跨 agent 浏览和导出模型 |
| [softaworks/agent-trail](https://github.com/softaworks/agent-trail) | local web app | 多 profile 历史 | quick/deep search、pin/tag、live updates | 更偏 history browser | 借其 profile、tag、watch 更新概念 |

### 4.2 Context Asset Layer

| 产品 | 类别 | 主语 | 强项 | 不足 | 对本项目的意义 |
|---|---|---|---|---|---|
| [dyoshikawa/rulesync](https://github.com/dyoshikawa/rulesync) | rules/skills sync | canonical rules | import / generate / sync / target adapters，覆盖 rules + commands + MCP + skills | 不是统一工作台 | 应作为 `Rules` 子系统核心参考，而非整体产品模板 |
| [oh-my-agents.app](https://oh-my-agents.app/) | prompts / skills organizer | prompt / skill asset | discover / organize / deploy / evolve 叙事完整 | sessions / analysis 弱 | 应作为 `Rules / Skills / Migration` 参考 |
| [0xranx/OpenContext](https://0xranx.github.io/OpenContext/en/) | context library | context docs / memory | GUI + CLI + MCP、citation、global library、本地 contexts root | session/workflow 弱 | 应作为 `Memory`、citation、global vs project scope 参考 |
| [andrewyng/context-hub](https://github.com/andrewyng/context-hub) | curated context docs | versioned docs | versioned docs、markdown 可审计、知识供给清晰 | 不是用户工作台 | 应作为知识资产的 versioning 与来源管理参考 |

### 4.3 Retrieval / Memory Infrastructure

| 产品 | 类别 | 主语 | 强项 | 不足 | 对本项目的意义 |
|---|---|---|---|---|---|
| [context-engine.ai](https://context-engine.ai/) | retrieval infra | semantic / symbol search | code-aware search、symbol graph、persistent memory | 更像 infra 平台 | 借其“code-aware context”叙事，不建议首版照搬 |
| [parallax-labs/context-harness](https://github.com/parallax-labs/context-harness) | retrieval stack | connectors + SQLite/embeddings | hybrid search、connector-driven ingestion、MCP | 产品层弱 | 借其 ingestion / indexing 分层架构 |
| [Wildcard-Official/deepcontext-mcp](https://github.com/Wildcard-Official/deepcontext-mcp) | MCP retrieval | deep code context | symbol-aware semantic search | 更偏大代码库理解 | 借其代码库上下文能力，不宜成为首页主线 |
| [volcengine/MineContext](https://github.com/volcengine/MineContext) | proactive context system | user activity context | 活动记录、主动上下文供给 | 重、侵入性更强 | 作为远期灵感，不适合首版 |

### 4.4 Workflow / Harness / Agent Engineering

| 产品 | 类别 | 主语 | 强项 | 不足 | 对本项目的意义 |
|---|---|---|---|---|---|
| [bolt-foundry/gambit](https://github.com/bolt-foundry/gambit) | harness | agent workflow | harness / testing / orchestration 经验 | 不是 context cockpit | 借鉴 workflow 和验证思路 |
| [haasonsaas/agent-harness](https://github.com/haasonsaas/agent-harness) | harness | agent runtime | runtime scaffold | 产品层弱 | 不作为近期主参考 |
| [langroid/langroid](https://github.com/langroid/langroid) | framework | multi-agent app framework | 对话与 agent 框架成熟 | 离本地 context 管理较远 | 作为方法论背景参考 |
| [peteromallet/desloppify](https://github.com/peteromallet/desloppify) | context engineering | prompt / context quality | state、quality、workflow cleanliness | 不是完整产品 | 借其质量治理视角 |

---

## 5. 备份、导出、导入、迁移相关观察

本轮调研里，涉及 backup / export / import / migration 的对象主要分三类。

### 5.1 明确偏资产导入/导出/同步

| 产品 | 备份对象 | 能力 | 备注 |
|---|---|---|---|
| [rulesync](https://github.com/dyoshikawa/rulesync) | rules / commands / MCP / skills | import + generate + sync | 更像资产迁移与分发，不是 session backup |
| [AgentCrew](https://github.com/saigontechnology/AgentCrew) | agent 配置 | export / import | 更偏 agent config 级备份 |
| [app-agent-template](https://github.com/atyourserviceai/app-agent-template) | agent state / messages / tasks / DB | export / import / restore | 形态较重，更像 app-agent 平台 |

### 5.2 明确偏 session / transcript 导出

| 产品 | 对象 | 能力 | 备注 |
|---|---|---|---|
| [Claude Code Log](https://github.com/daaain/claude-code-log) | transcript | HTML / Markdown 导出 | 属于 session export，不是 canonical backup |
| [Claude Chat Viewer](https://github.com/osteele/claude-chat-viewer) | exported chats | JSON / ZIP 输入、artifacts 下载 | 基于外部导出文件的 viewer |
| [Claude Conversation Exporter](https://github.com/socketteer/Claude-Conversation-Exporter) | Claude conversations | JSON / Markdown / ZIP 导出 | browser-side export 工具 |
| [AI Chat Exporter](https://github.com/revivalstack/ai-chat-exporter) | chat history | Markdown / JSON 导出 | conversation export |

### 5.3 对本项目的启发

对 `Session Backup` 设计最重要的不是“是否支持导出”，而是明确 3 层对象：

- `Session Source`
- `Session Record`
- `Session View`

推荐默认语义：

- `Session Backup` 默认备份 `Session Record`
- `Source Backup` 用于保留原始来源
- `Session Export` 用于生成 Transcript Markdown、Trajectory JSON、source copy 等外部可消费产物

这也是后续 `Project Bundle` 设计的基础。

---

## 6. Agent Sessions 专项结论

[Agent Sessions](https://github.com/jazzyalex/agent-sessions) 是本轮最值得重点关注的强邻近对象。

截至 2026-04-10，公开 README 显示它已经明确覆盖：

- Codex CLI
- Claude Code
- Cursor
- Gemini CLI
- GitHub Copilot CLI
- Droid / Factory CLI
- OpenCode

其特点是：

- unified session browser
- unified search
- readable transcript + tool outputs
- resume workflow
- live `Agent Cockpit`
- local-only
- macOS 原生 app

### 对本项目的意义

`Agent Sessions` 已经把：

- `multi-agent local session browser`

这条线做到了很高完成度。

因此本项目不应该与之正面竞争“谁是更强的 session browser”，而应该：

- 把 `Sessions` 做成一个强二级页
- 将首页与主定位放在 project context governance 上

### 关于 backup

本轮未发现 `Agent Sessions` 官方公开材料中明确提到：

- backup
- export
- import
- restore

其公开描述更集中在：

- browse
- search
- resume
- active session cockpit

因此，`Session Backup` 依然是本项目可以进一步探索并形成差异化的空间。

---

## 7. 推荐产品边界

### 7.1 不建议作为主线竞争的方向

- 不做“最强 session browser”
- 不做“最强 rules sync 工具”
- 不做“最强 retrieval infra”
- 不做“云端 team memory 平台”

### 7.2 建议占据的位置

- project-first
- local-first
- multi-agent
- context asset governance

主语建议固定为：

- `Project`

核心对象建议固定为：

- `Sessions`
- `Rules`
- `Memory`
- `Skills`
- `Commands`
- `Analysis`
- `Backup / Migration`

---

## 8. 产品设计与路线启发

### 8.1 首页不应是什么

首页不应再是：

- 左侧 session list
- 中间 transcript viewer
- 右侧 inspector

那种结构适合作为 `Sessions` 子页，而不适合作为整个产品首页。

### 8.2 首页应是什么

推荐转向：

- `Project Overview`

应包含：

- context snapshot
- in-effect assets
- recent activity
- attention / conflicts / stale assets
- quick actions

### 8.3 首版最值得做的不是更多 provider，而是更强的资产语义

优先级建议：

1. 建立统一 `Context Asset` 模型
2. 把 `Sessions` 从首页主角降为二级页
3. 建立 `Rules / Memory / Skills / Commands` 四类资产页
4. 补 `Analysis`
5. 再补 `Backup / Migration`

---

## 9. 推荐后续研究清单

后续可沿下列主题继续深化，每次都应回链到本文，避免重复探索。

### 9.1 Session Backup

建议重点研究：

- 何为 `Session Backup`
- `Session Source` vs `Session Record` vs `Session View`
- source preservation 是否作为高级选项
- 与 `Project Bundle` 的关系

### 9.2 Rules / Skills Sync

建议重点研究：

- canonical source
- target adapters
- preview / diff / apply
- scope mapping

### 9.3 Project Bundle

建议重点研究：

- sessions、rules、memory、skills、commands 如何一起打包
- bundle 是否包含 source copy
- restore 与 migration 的边界

### 9.4 Context Health

建议重点研究：

- stale
- duplicate
- conflicted
- orphaned
- in-effect

---

## 10. 一句话总结

这轮调研最重要的结论不是“找到一个更强的 session viewer”，而是明确：

**本项目的机会位于 session/workflow layer 之上、rules/memory/skills 之旁，即 project-first 的 local agent context cockpit。**
