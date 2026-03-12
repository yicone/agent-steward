# 跨 Agent 管理工具调研

更新时间：2026-03-12

> 目标：按统一分类框架梳理跨 agent 管理能力，覆盖开源项目、主流产品内置能力、以及商业化形态。

## 分类框架（统一口径）

1. Skills 管理（安装、分发、同步）  
2. MCP 管理（配置、连接、凭据、服务发现）  
3. 规则文件管理（AGENTS.md / CLAUDE.md / rules）  
4. 命令资产管理（slash-commands / workflow / command-pack）  
5. 多 Agent 运行时协作（含编排与会话调度）  
6. Subagent 管理（定义、目录、安装、执行桥接）  
7. Spec-driven（SDD）流程资产（需求→设计→任务→实现）  
8. 本地会话观测与诊断（与本项目定位接近）

---

## 1) Skills 管理

| 工具/产品 | 形态 | 商业性质 | 定位 |
|---|---|---|---|
| vercel-labs/skills | CLI | 开源 | skills 安装/分发入口（`npx skills`） |
| vercel-labs/agent-skills | 内容仓 | 开源 | 官方 skills 内容仓 |
| numman-ali/openskills | CLI | 开源 | 多客户端 skills 安装/管理 |
| tc9011/skills-manager | CLI | 开源 | `~/.agents` push/pull + symlink 管理 |
| Antigravity（内置） | IDE 内置 | 商业产品 | 内置技能/能力生态（以产品内能力管理为主） |

## 2) MCP 管理

| 工具/产品 | 形态 | 商业性质 | 定位 |
|---|---|---|---|
| holstein13/mcp-config-manager | CLI + GUI | 开源 | MCP config 同步、preset、启停 |
| MediaPublishing/mcp-manager | GUI(Web) | 开源 | MCP server 可视化管理 |
| MCP-Club/mcpm | CLI | 开源 | MCP 包管理/管理 server |
| Smithery | SaaS + CLI | SaaS | 托管式 MCP/skills 控制面 |
| BoltAI / EnConvo / Msty | GUI desktop | 付费本地软件 | MCP 在本地应用中的连接与使用管理 |

## 3) 规则文件管理（AGENTS.md / CLAUDE.md / rules）

| 工具/产品 | 形态 | 商业性质 | 定位 |
|---|---|---|---|
| dyoshikawa/rulesync | CLI | 开源 | 跨工具规则文件同步 |
| jpcaparas/rulesync | CLI | 开源 | 轻量规则同步 |
| lbb00/ai-rules-sync | CLI | 开源 | rules + skills + commands + subagents 同步 |

## 4) 命令资产管理（slash-commands / workflow / command-pack）

> 此类别仅关注“命令模板与流程命令资产”的组织和复用，不等同于运行时编排。

| 工具/产品 | 形态 | 商业性质 | 定位 |
|---|---|---|---|
| wshobson/commands | 内容仓 | 开源 | Claude Code slash commands 集合 |
| iannuttall/claude-sessions | 内容仓 | 开源 | 会话管理型命令集 |
| qdhenry/Claude-Command-Suite | 内容仓 | 开源 | 开发流程命令套件 |
| gotalab/cc-sdd | 命令包 + 模板 | 开源 | Kiro 风格 SDD 命令流 |
| dyoshikawa/rulesync | CLI | 开源 | commands/workflows 同步能力 |
| OpenCode + oh-my-opencode/oh-my-openagent 生态 | 插件/脚手架 | 开源生态 | 命令包与规则增强层 |

## 5) 多 Agent 运行时协作（编排 + 会话调度）

> 此类别覆盖两类运行时能力：
> - **编排（orchestration）**：任务分派、并行执行、层级控制
> - **会话调度（session switching/dispatch）**：跨项目/跨会话快速切换与调度

| 工具/产品 | 形态 | 商业性质 | 定位 |
|---|---|---|---|
| ruvnet/ruflo | CLI + 框架 | 开源 | 多 agent swarm 编排平台 |
| ComposioHQ/agent-orchestrator | CLI + 框架 | 开源 | 并行 coding agents + CI/PR 自动化 |
| awslabs/agent-squad | 框架（JS/Python） | 开源 | 多 agent 会话路由/协作 |
| awslabs/cli-agent-orchestrator | CLI | 开源 | tmux + supervisor/worker 层级编排 |
| smtg-ai/claude-squad | TUI | 开源 | 终端多 agent 协作 |
| kbwo/ccmanager | CLI/TUI | 开源 | 多 agent 会话管理/调度（Session Manager） |
| Antigravity Agent Manager（内置） | IDE 内置 | 商业产品 | 更接近“多项目多会话切换/调度”而非严格编排 |
| Kilo Orchestrator（内置） | 产品内置 | 商业产品 | 产品内多 agent 编排能力 |

## 6) Subagent 管理（定义、目录、安装、执行桥接）

| 工具/产品 | 形态 | 商业性质 | 定位 |
|---|---|---|---|
| VoltAgent/awesome-claude-code-subagents | 内容聚合仓 | 开源 | subagent 目录/索引 |
| wshobson/agents | 内容仓 | 开源 | subagent 集合与实践 |
| iannuttall/claude-agents | 内容仓 | 开源 | 可复用 subagents |
| pacphi/claude-code-agent-manager | CLI | 开源 | YAML 驱动 subagent 管理 |
| OleynikAleksandr/multicli-subagents | CLI | 开源 | 多 CLI subagent 生命周期管理 |
| shinpr/sub-agents-mcp | MCP 服务 | 开源 | subagent 执行桥接（跨 MCP 客户端） |

## 7) Spec-driven（SDD）流程资产

> Kiro 的核心特性是 SDD（Spec-driven Development），应归入本类别，而非与 Kilo 编排能力混淆。

| 工具/产品 | 形态 | 商业性质 | 定位 |
|---|---|---|---|
| github/spec-kit | CLI + 模板 | 开源 | 通用 Spec-driven 工具包 |
| Fission-AI/OpenSpec | CLI + 模板 | 开源 | 面向 AI coding assistants 的 SDD 工具链 |
| gotalab/cc-sdd | 命令包 | 开源 | SDD 命令流程（需求→设计→任务） |
| shotgun-sh/shotgun | CLI | 开源 | spec 工作流工具 |
| liatrio-labs/spec-driven-workflow | 模板/文档流程 | 开源 | 轻量 markdown SDD 流程 |
| Kiro（内置） | 产品内置 | 商业产品 | 内置 SDD 体验与流程能力 |


## 8) 本地会话观测与诊断（与本项目定位接近）

> 该类别聚焦“本地会话历史浏览、跨来源检索、日志诊断、token/成本观测”等能力，和本项目（local-first 会话查看与诊断）定位最接近。

| 工具/产品 | 形态 | 商业性质 | 定位 |
|---|---|---|---|
| esc5221/claude-code-viewer | Desktop App | 开源 | Claude Code 会话日志浏览与分析 |
| tad-hq/universal-session-viewer | Desktop App | 开源 | 会话浏览/检索/分析（含续写链识别） |
| dotneet/agent-session-view | CLI + Web/桌面 | 开源 | Claude Code + Codex CLI 会话查看/导出 |
| softaworks/agent-trail | Local Web App | 开源 | 本地多 profile 会话历史浏览 |
| InDate/claude-log-viewer | Local Web App | 开源 | 本地多项目 agent 日志查看与管理 |
| junhoyeo/tokscale | CLI | 开源 | 多 agent token 使用量观测（OpenCode/Claude/Codex 等） |
| sean-m-cooper/AgentTower | Terminal Monitor | 开源 | agentic 终端会话监控（跨多 CLI） |


---

## 结论

1. **命令资产管理** 与 **多 Agent 运行时协作** 必须分开评估：前者是“静态资产复用”，后者是“运行时系统能力”。  
2. **Subagent 管理**建议独立成类：至少区分目录（catalog）、管理器（manager）、执行桥（runtime bridge）。  
3. **Spec-driven（SDD）**是独立能力域，不应混入“编排”或“命令资产”分类中；它常与二者组合使用。  
4. 对流行 Coding Agent 的分析应纳入同一分类框架：其“内置能力”是各分类的产品内实现，而不是额外新类别。  
5. “本地会话观测与诊断”是独立高价值类别：它与配置管理/编排并列，关注历史可观测性、问题定位和跨来源检索。

## 选型建议

- 若优先 skills：先评估 `vercel-labs/skills` + `openskills`。  
- 若优先 rules + MCP + commands 一体化：先评估 `dyoshikawa/rulesync`。  
- 若优先“编排”：先评估 `awslabs/agent-squad` / `ComposioHQ/agent-orchestrator` / `ruvnet/ruflo`。
- 若优先“会话切换/调度”：关注 `kbwo/ccmanager` 与产品内置 Agent Manager 类能力。  
- 若优先 subagent 跨工具执行：对比内容仓方案（如 `wshobson/agents`）与 MCP 执行桥方案（如 `shinpr/sub-agents-mcp`）。  
- 若优先 SDD 治理：先评估 `github/spec-kit` + `Fission-AI/OpenSpec`，再叠加命令包和编排层。  
- 若优先“会话历史检索与诊断”：优先试用 `dotneet/agent-session-view` / `tad-hq/universal-session-viewer` / `esc5221/claude-code-viewer`，并结合 `tokscale` 做 token 观测。
