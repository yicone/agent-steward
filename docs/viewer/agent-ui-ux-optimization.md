# Agent Viewer UI/UX 优化方案（提案）

## 背景与目标

本项目是「本地 Agent 对话/轨迹记录」的浏览器，核心诉求是：

- 在长会话、混合事件（user/assistant/thought/tool/command/status/error）下，仍能**快速定位**、**高可读**、**高性能**地查看与诊断。
- 保持 UI 简洁：主视图聚焦叙事（Transcript / 对话回合），细节（payload、stdout、diff、raw step）以结构化方式按需展开。

相关现状与统一模型请先阅读：

- `docs/viewer/trajectory-view.md`

## 当前实现概览（与优化相关）

- Antigravity Trajectory：已实现**按 execution 分组**、**折叠展开**、**动态高度虚拟滚动**（自研测量 + overscan）。
  - 见 `src/components/HomeClient.tsx`（`VirtualizedTrajectoryRows`）
- Windsurf Transcript/Trajectory：使用统一事件模型渲染，并复用 execution 分组、折叠、虚拟滚动与摘要。
  - 见 `src/components/HomeClient.tsx`（`content?.kind === "trajectory" && content.source === "windsurf"` 分支）
- Windsurf Chat：保留为 legacy 视图（直接消息列表 + `Load more`）。
  - 见 `src/components/HomeClient.tsx`（`content?.kind === "chat"` 分支）
- Markdown：使用 `react-markdown` + `rehype-highlight`，代码块在 `pre` 内横向滚动。

## Transcript 视图规范（建议作为主体验）

目标：最大化复刻 Antigravity/Windsurf 这类主流 Agent UI 的“对话阅读体验”，同时保留可一键下钻到 Trajectory 的完整过程数据。

### 核心信息架构（两层视角）

- `Transcript`：对话回合（turn）为中心的叙事视角（默认）。
- `Trajectory`：事件流为中心的过程视角（审计/排错）。
- `Markdown`（可选）：来源侧提供的 narrative 版本（目前 Antigravity 可用）。

### Transcript 的展示语义（从统一事件模型派生）

输入：`TrajectoryEvent[]`

输出（UI 形态）：

1) 对话气泡（turn）

- `user` / `assistant`：按相邻同角色合并（减少碎片）。

2) Actions 折叠块（挂在 assistant 气泡下）

- 默认折叠，仅显示摘要：`tools/commands/status/thoughts/other` 的计数。
- 展开后：
  - `tool`：可显示精简列表（标题 + stepType + 简短文本），需要深挖时切换到 `Trajectory` 查看详情与原始 output/payload。
  - `command`：在 Transcript 内不展开成功命令细节（只留计数）；失败命令直接提升为可见事件（见下）。

3) 错误与关键状态（始终可见）

- error-like 事件：始终可见（例如 `exitCode != 0`、错误状态、`title === "Error"`）。
- key status：在 Transcript 内可见（例如 running / canceled / timeout），用于让用户理解“执行仍在进行/被取消”等关键过程。

### 为什么这样设计

- Transcript 不做“有损 chat 视图”替代，而是成为对统一事件模型的“阅读投影”：
  - 默认减少噪音（thought/tool/command 细节隐藏），让用户先看清对话。
  - 需要诊断时，切到 Trajectory 看到完整事件链路。
- Actions 折叠块放在 assistant 气泡下，可读性更像主流 Agent UI（输出在上，执行细节在下）。

### 与业界交互语义对齐（复用 UI/UX 思路）

如果目标是复刻/对齐主流编辑器内 Agent UI（而不是 telemetry 平台），建议对齐的“标准”是 **交互语义**：

- ACP（Agent Client Protocol）的核心概念可映射到本项目的统一事件模型：
  - `message`（user/assistant/system） -> Transcript 的 turn 气泡
  - `tool_call`（状态 + 原始输入/输出） -> Actions 折叠块 + Inspector
  - `plan`（条目 + 状态） -> Transcript 顶部/侧栏的计划区域（未来可加）

这类对齐不会提供现成组件库，但能提供“可互操作的组件语义”，让 UI 更接近 Antigravity/Windsurf 等主流产品的呈现方式。

## 组件选型建议（对话/事件展示向）

本项目当前使用「自定义全局 CSS + 少量内联样式」，更适合优先选择 **headless / primitives** 风格的库；除非明确要引入完整设计体系（如 Mantine/Chakra/AntD）。

### 长会话性能：虚拟滚动

- `@tanstack/react-virtual`
  - 适用：希望保持现有自定义 UI/DOM 结构，仅替换虚拟化“计算与 API”，逐步降低自研成本。
  - 代价：滚动锚点保持（prepend 历史不跳）、动态高度测量策略、分组折叠等仍需要自己拼装。
- `react-virtuoso`
  - 适用：需要更“开箱即用”的长列表/对话体验（如更稳定的动态高度、滚动到项、跟随底部等）。
  - 注意：其部分更“聊天专用”的高级组件/能力可能有额外授权版本，选型前需确认使用范围与许可证。

建议：短期先复用现有 Antigravity 的虚拟化抽象，把 Windsurf chat 也虚拟化；中期若开始做 `scrollToId`/错误跳转/前插历史锚点保持，再评估是否迁移到成熟库。

### 交互与可读性：Tabs / Accordion / Dialog / Tooltip

用于把“叙事（Transcript）”与“诊断细节（Inspector）”分离，减少主消息流噪音。

- Radix Primitives
  - 优点：无样式或轻样式、无障碍与交互细节成熟，适合本项目的自定义 CSS 路线。
- shadcn/ui
  - 优点：组件现成、组合度高。
  - 注意：强依赖 Tailwind 的工程化与样式约定；若本项目不计划引入 Tailwind，采用成本会显著上升（需要重写样式或仅借结构实现）。

### 全量 UI 组件库（可选）

适用：希望快速“统一视觉 + 组件齐全”，接受其主题体系与升级节奏。

- Mantine / Chakra UI / Ant Design
  - 优点：表单、弹窗、表格、通知等更完备，能加速 Inspector、设置页、筛选器的落地。
  - 代价：会引入一套新的样式/主题体系，与当前自研 CSS 需要做融合或迁移。

建议：除非近期要大幅扩展 UI（复杂设置/可视化面板/多页应用），否则优先用 Radix + 自研样式渐进增强。

### 内容渲染：Markdown / 代码块

- 现状：`react-markdown` + `rehype-highlight`
- `rehype-pretty-code`（基于 `shiki`）
  - 定位：对 `react-markdown` 是补充；对 `rehype-highlight` 通常是替代（二选一以避免重复高亮/样式冲突）。
  - 适用：需要更一致的主题、可扩展的代码块增强（行高亮、标题、复制按钮等）。

### 诊断数据：JSON Viewer

适用：在 Inspector 中展示 tool payload / raw step 时，比 `<pre>` 更易查找与折叠。

- `@uiw/react-json-view` / `@microlink/react-json-view`
  - 通常更易直接集成到现有样式体系。
- `@textea/json-viewer`
  - 注意：依赖 MUI，若本项目未使用 MUI，引入成本更高（peer dependencies 与主题体系）。

### 变更展示：Diff Viewer（可选）

适用：展示 patch、配置变更、生成代码的前后对比（例如工具输出带 diff）。

- `react-diff-viewer` 等

### 日志展示：ANSI / Log Viewer（可选）

适用：stdout/stderr 含 ANSI 颜色时（当前适配器可能会清理 ANSI，但可按需保留原始输出给 Inspector）。

- ANSI：`ansi-to-react` / `anser`（将 ANSI 转为 React 片段）
- Log Viewer：`@melloware/react-logviewer`（更偏“日志滚动阅读”）

### 辅助能力（可选）

- 搜索高亮：`react-highlight-words` 或 `mark.js`（用于全局搜索命中高亮与跳转定位）
- 复制按钮：自研即可（`navigator.clipboard.writeText`），适用于 code/output/json 统一 UX

## 参考实现评估

你提供的两个项目更像“可运行的 Agent UI 应用/模板”，而不是可直接嵌入的通用组件库。更推荐以「借鉴交互与信息架构」为主。

### langchain-ai/agent-chat-ui

链接：`https://github.com/langchain-ai/agent-chat-ui`

可借鉴点（高价值）：

- **Artifacts / Inspector 侧栏**：把结构化输出（JSON、工具调用、文件、图片等）从主消息流中抽离，提升可读性。
- **线程/会话列表 + 搜索 + 过滤**：对“很多会话、每个会话很长”的场景更友好。
- **多视图切换**：以“对话叙事”为主、以“诊断细节”为辅的组织方式更清晰。

直接引入的成本/风险：

- 技术栈与依赖（样式体系、组件体系、Next/React 版本）可能与本项目差异较大；整套迁移通常等同一次 UI 栈升级与重构。
- 数据模型默认面向其生态（threads/messages/artifacts），与本项目的 `TrajectoryEvent`/来源适配器不同，需要做较多 glue 层。

适用本项目的方式：

- 不直接“整套搬入”，而是把其 **Inspector/Artifacts** 的信息架构落地到本项目。

### agno-agi/agent-ui

链接：`https://github.com/agno-agi/agent-ui`

可借鉴点（高价值）：

- “tool calls / reasoning / references / 多模态”信息分层呈现：主流只承载叙事，细节在结构化视图里。
- 面向诊断的 UI：错误聚合、可跳转定位、引用与来源关联等。

直接引入的成本/风险：

- 通常会更强绑定其运行时/协议（streaming、session、tool result 结构），与本项目“离线记录查看器”模式不同。

适用本项目的方式：

- 参考其“结构化详情”呈现方式，完善 tool/command/status/error 的统一详情视图。

## 优化方向（以本项目为中心）

### 1) 信息架构：主视图 + Inspector（侧栏）

目标：让主视图更像“阅读模式”，细节统一收敛到右侧 Inspector，减少气泡内零散 `<details>`。

建议落地：

- 主区域：以 `Transcript` 为默认入口，并保留 `Trajectory`/`Markdown`（按来源可用）。
- 右侧 Inspector（可折叠）：
  - 选中某条事件/消息后显示：
    - 结构化字段：stepType、time、executionId、status、exitCode、cwd、commandLine
    - tool payload（JSON tree + copy）
    - output/stdout/stderr（可折叠、可复制、可选换行/不换行）
    - 原始 step（raw JSON，便于调试适配器）

### 2) 导航与定位：搜索、过滤、错误跳转、深链接

- 过滤维度增强：
  - 现有 kind 过滤（thought/tool/command/status）扩展为：`stepType`、`toolName`、`exitCode`、`hasOutput`、`onlyErrors`。
- 错误中心：
  - “errors N” 可点开列表，点击跳转到对应事件（并高亮）。
- 深链接：
  - URL query 保存 `source`、`selectedId`、`view`、过滤条件、选中事件 id。
  - 目标：刷新/分享链接时状态可复现。

### 3) 展示细节：长内容控制、复制、差异、JSON、ANSI

长内容策略（避免信息噪音）：

- 统一对 “超长 output/tool payload/command 输出” 做：
  - 默认折叠（按高度或字符数阈值）
  - `展开 / 收起`、`复制`、`下载`（可选）
  - `换行 / 不换行`（便于看日志）

结构化渲染（按需引入）：

- JSON Viewer：更利于查字段与折叠。
- Diff Viewer：用于显示 patch/config 变更。
- ANSI 渲染：用于带颜色的终端输出（如果源数据存在 ANSI）。

### 4) 性能：虚拟化统一、滚动体验、增量渲染

当前风险点：

- Trajectory 虚拟列表自研逻辑可用，但后续加入更多视图（Windsurf chat、搜索高亮、选中态）后，维护成本会提高。
- Windsurf chat 当前全量渲染，超长会话会变慢。

建议路径：

- 短期：复用现有虚拟化抽象，把 Windsurf chat 也做虚拟滚动（统一测量/overscan/scrollTo）。
- 中期：评估是否引入第三方虚拟化库以降低维护成本：
  - `@tanstack/react-virtual`：更贴合本项目“自定义 CSS + headless”路线；需要自己拼装更多行为。
  - `react-virtuoso`：更开箱即用；更适合快速实现“贴底跟随/前插历史/滚动锚点保持”等聊天体验。

决策建议（何时引入）：

- 如果需求只停留在“几百~两千行 + 基本折叠过滤”，自研可继续用。
- 如果要做：
  - 大规模（>1 万事件）稳定滚动
  - `scrollToId`、错误跳转
  - prepend 历史且滚动位置稳定
  - 复杂高度变化（展开/折叠/高亮）不抖动
  则更建议引入成熟库。

### 5) Markdown 与代码块：rehype-pretty-code 的定位

当前：`react-markdown` + `rehype-highlight`。

- `rehype-pretty-code` 对 `react-markdown` 是**补充**（仍然用 `react-markdown`）。
- 对 `rehype-highlight` 更像是**替代**（两者都负责代码块高亮，通常二选一以避免冲突）。

是否切换取决于需求：

- 继续用 `rehype-highlight`：轻量、足够“看得清”。
- 切换到 `rehype-pretty-code`：更强主题一致性、行高亮/标题/复制等增强更好做（但会带来额外依赖与样式整合成本）。

## 实施路线（推荐）

### Phase 0（已完成/持续校正）

- 解决长内容导致布局横向溢出、容器被撑宽的问题（例如 `minmax(0, 1fr)`、`min-width: 0`、`overflow-wrap`）。

### Phase 1：Inspector 侧栏（结构化详情统一出口）

- 增加“选中事件/消息”的状态与高亮。
- 增加右侧 Inspector：JSON tree、output、raw step、复制/折叠。

### Phase 2：Windsurf chat 虚拟滚动 + 统一滚动 API

- 引入统一的 `scrollToId`/`scrollToIndex`，为错误跳转、搜索定位打基础。

### Phase 3：导航能力（搜索、错误中心、深链接）

- 搜索（按文本/stepType/toolName）与结果跳转。
- URL query 状态持久化。

### Phase 4：渲染增强（按需引入第三方渲染组件）

- JSON Viewer、Diff Viewer、ANSI 渲染、代码块增强（是否切换 `rehype-pretty-code`）。

## 验收标准（建议）

- 布局：任意长标题/UUID/无空格长串/代码块长行，不出现水平撑宽导致的错位。
- 性能：长会话滚动流畅（主观 60fps 体验），展开/折叠不明显跳动；搜索/跳转可在可接受时间内完成。
- 可用性：错误可聚合并一键定位；任一事件都能在 Inspector 中查看“结构化细节 + 原始数据”。
- 可维护性：虚拟列表与渲染增强不显著增加页面耦合；新增事件类型时有清晰的渲染扩展点。
