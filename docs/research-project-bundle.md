# Project Bundle 调研

更新时间：2026-04-11

> 目标：在 `Session Backup` foundation 已完成的前提下，收敛 `Project Bundle` 的术语边界、问题空间、对象范围与格式方向，为后续 OpenSpec 变更提供统一的研究基线。

相关文档：

- [glossary.md](./glossary.md): 术语基线
- [research-agent-context-product-landscape.md](./research-agent-context-product-landscape.md): 产品版图、边界与参考模式
- [research-session-backup.md](./research-session-backup.md): `Session Backup` 研究与当前语义
- [product-positioning-and-ia.md](./product-positioning-and-ia.md): project-first, local-first 产品定位与 IA
- [page-block-ia.md](./page-block-ia.md): `Backup / Migration` 页面模块边界
- [page-state-ia.md](./page-state-ia.md): `Project Bundle` workflow state
- [task-flow-ia.md](./task-flow-ia.md): `Project Overview -> Project Bundle` 与相关流转
- [routed-context-handoff.md](./routed-context-handoff.md): page-to-page handoff 约束
- [session-backup spec](../openspec/changes/archive/2026-04-11-session-backup-foundation/specs/session-backup/spec.md): `Session Backup` foundation
- [session-record-model spec](../openspec/changes/archive/2026-04-11-session-backup-foundation/specs/session-record-model/spec.md): canonical `Session Record` contract

---

## 1. 研究背景

`Session Backup` foundation 已经明确三件事：

1. `Session Backup` 的默认对象是 canonical `Session Record`，而不是 transcript 或原始 source
2. `Source Backup` 是显式高级选项，不应成为默认
3. session backup package 未来应可复用于 `Project Bundle`

与此同时，当前产品方向已经从 session-first viewer 转向：

- project-first
- local-first
- multi-agent
- project-scoped agent context stewardship

因此，本轮 `Project Bundle` 研究的核心问题不再是“如何导出更多东西”，而是：

- 以什么边界定义 project-level context package
- 它与 `Session Backup`、`Import`、`Restore`、`Migration` 如何分工
- 首版应承诺什么，不应承诺什么

本研究只讨论：

- 术语边界
- 问题空间
- 参考模式
- 候选方案
- 推荐格式方向
- spec 前提

本研究不讨论：

- cloud sync
- team collaboration package
- 全量 app snapshot
- 外部 vendor runtime 的 round-trip restore
- 具体实现细节

---

## 2. 术语边界

### Backup

`Backup` 指为了保留与后续恢复而生成的 preserved copy。

这里强调的是：

- preservation
- safekeeping
- later recovery

不是面向阅读体验的导出，也不是立即跨系统适配的迁移结果。

### Export

`Export` 指把对象单向提取成外部可消费格式。

典型产物：

- transcript markdown
- trajectory json
- source copy

`Export` 可以离开当前产品，但不自动意味着可完整恢复。

### Import

`Import` 指把外部 package 或对象带入当前产品。

`Import` 的职责是：

- 读取
- 校验
- 接纳

它本身不等于最终 materialize，也不自动等于迁移成功。

### Restore

`Restore` 指把已导入且可读的 package 恢复成当前产品可浏览、可搜索、可分析的状态。

在当前方向下，首版 `Restore` 应限定为：

- restore to product-readable state

而不应承诺：

- reopen inside vendor runtime
- write back into private upstream stores
- third-party round-trip fidelity

### Migration

`Migration` 指跨 agent、跨 scope、跨 project、跨机器的可移植与适配流程。

`Migration` 比 `Import` / `Restore` 多一层：

- compatibility
- mapping
- preview
- portability warnings

### Session Backup

`Session Backup` 是 canonical `Session Record` 的 preserved copy。

它的目标是：

- 保留 session evidence
- 允许后续恢复到产品可读状态
- 支持搜索、分析与迁移

它不是：

- transcript export
- raw source store
- project-level bundle

### Source Backup

`Source Backup` 是原始 `Session Source` 或其他原始来源材料的保留副本。

它应保持为：

- opt-in
- copy-only
- source-safe

它适合：

- 法证调试
- 高保真归档
- 未来 parser / adapter 重建

但不应成为首版默认打包语义。

### Project Bundle

`Project Bundle` 是以 project-scoped agent context 为边界的组合型可移植包。

它可以包含：

- sessions
- rules
- memory
- skills
- commands
- metadata

它不应自动等于：

- 全量代码库副本
- 全量 app state snapshot
- 任何第三方 agent runtime 的完整镜像

### Asset Bundle

`Asset Bundle` 目前更适合作为未来子术语，而不是顶层正式术语。

建议语义：

- 一个只包含 reusable context assets 的 bundle
- 通常包含 rules / memory / skills / commands
- 可作为 `Project Bundle` 的轻量子类或 future workflow

它不应取代 `Project Bundle` 作为 project-level package 的正式名称。

---

## 3. 边界关系

推荐关系如下：

- `Export`
  - 面向外部消费的单向表示
- `Backup`
  - 面向 preservation 的保留副本
- `Import`
  - 把外部 package 带回当前产品
- `Restore`
  - 恢复到本产品可读状态
- `Migration`
  - 在 import/restore 之上处理 mapping 与 compatibility

对象层级如下：

- `Session Backup`
  - 单 session 或 session 集合的 canonical backup
- `Project Bundle`
  - project-level 组合容器
- `Source Backup`
  - 某些对象内部的可选 raw-preservation 扩展

因此：

- `Session Backup` 不等于 `Project Bundle`
- `Export` 不等于 `Backup`
- `Import` 不等于 `Restore`
- `Restore` 不等于 vendor reopen
- `Migration` 不应偷换成“导入一个 zip”

---

## 4. Project Bundle 的问题空间

### 4.1 它要解决什么问题

`Project Bundle` 要解决的是 project-scoped agent context 的：

- preservation
- migration
- handoff

这里的“项目上下文”不是抽象概念，而是当前产品已经收敛的一组一等对象：

- sessions
- rules
- memory
- skills
- commands

以及围绕它们的项目级关系：

- provenance
- scope
- in-effect state
- conflict / staleness / compatibility state

### 4.2 它更偏 preservation、migration，还是 handoff

三者兼有，但首版优先级建议是：

1. migration
2. preservation
3. handoff

原因：

- 产品 promise 已明确包含 migration
- `Backup / Migration` 已被定义为 portability layer
- 个人本地场景下，跨机器、跨 agent、跨时间点恢复 project context 的价值最高

`handoff` 仍然重要，但首版不应把 `Project Bundle` 设计成团队协作交接包。
它更适合被理解为：

- 面向未来自己
- 面向另一台机器
- 面向另一套 agent workflow

### 4.3 它与单纯的 Session Backup 的本质区别

区别不只是“对象更多”，而是“边界层级不同”。

`Session Backup` 的核心是：

- preserve session evidence
- 保持 canonical record
- 在失去原始 runtime 时仍可分析

`Project Bundle` 的核心是：

- preserve a project-scoped context set
- 把 evidence 与 reusable assets 一起打包
- 让项目语义在迁移或恢复时保持可解释性

因此：

- `Session Backup` 保的是一个强局部对象
- `Project Bundle` 保的是项目上下文集合及其边界关系

---

## 5. 范围约束

### 5.1 首版应视为 first-class bundle members 的对象

首版推荐纳入：

- sessions
- rules
- memory
- skills
- commands
- package-level metadata
- project-level metadata

### 5.2 首版不应默认纳入的对象

首版不应默认纳入：

- raw source copies
- derived view caches 的全量冻结
- local search indexes
- internal cache / temp state
- UI state
- machine-local tokens / ports / secrets
- repository full copy
- app preferences / global runtime state

### 5.3 关于 raw source copies

raw source copies 不应作为 `Project Bundle` 首版默认语义。

原因与 `Session Backup` 一致：

- 可移植性差
- 不同 agent source 差异大
- 格式耦合重
- 隐私与体积成本更高

如果未来支持，也应作为：

- explicit option
- per-object or per-bundle advanced mode

### 5.4 关于代码库与文档

代码库、README、普通文档不应因为它们“属于项目”就自动进入 bundle。

它们只有在被显式提升为 context objects 时，才应进入 bundle，例如：

- 某个文件被 formalize 为 rule source
- 某个文档被抽取为 memory
- 某个脚本被 formalize 为 command

这个边界很关键，因为产品不是全仓库归档器，也不是代码库迁移工具。

---

## 6. 参考模式

本轮关注的不是“有没有完全对口产品”，而是哪些局部模式可迁移。

### 6.1 Workspace Backup

代表性模式：

- Notion workspace export

可借鉴点：

- 以 workspace / project 作为上位边界
- 允许用户把多个对象一次性打包带走
- 明确这是 preservation / export surface，而不是编辑面

局限：

- 更偏导出，不是强结构化 restore contract
- 对迁移中的 mapping、compatibility 帮助有限

对本项目的意义：

- 可以借“project-scoped whole package”叙事
- 不应照搬其 restore 语义

### 6.2 Project Archive

代表性模式：

- 视频/音频工作流中的 project archive / library package

可借鉴点：

- 一个 project package 可同时包含 project metadata 与关联资产
- 可区分“引用外部资产”与“嵌入副本”
- archive 与 editable working state 可以区分

局限：

- 常常依赖重型媒体语义
- 对 context assets 的 reusable / in-effect / scope 关系覆盖不足

对本项目的意义：

- 很适合借“主包 + 可选嵌入资源”的结构思路
- 特别适合对应 future optional `Source Backup`

### 6.3 Portable Package

代表性模式：

- JetBrains settings archive
- 各类 local tool settings import/export archive

可借鉴点：

- package 中对象类型明确
- 导入时可 selective apply
- schema / component identity 往往清楚

局限：

- 往往偏 settings，不处理复杂 provenance
- 通常不是 evidence + asset 混合包

对本项目的意义：

- 可借 manifest、object inventory、component-wise import

### 6.4 Export / Import Bundle

代表性模式：

- Joplin JEX
- 一些 note / knowledge tools 的 export-import archive

可借鉴点：

- lossless-ish 多对象导出
- markdown / resource / metadata 共存
- import 是正式 workflow，而不是附带功能

局限：

- 往往不处理跨-agent compatibility
- 可解释的 provenance 层通常较薄

对本项目的意义：

- 可借“多对象 package + import workflow”模式

### 6.5 Multi-Asset Backup

代表性模式：

- project package with attachments/resources

可借鉴点：

- 一个包里同时包含不同类型对象
- 通常会有顶层 manifest 与对象清单
- package inspection 是可信度的重要来源

局限：

- 不一定有统一 canonical object contract

对本项目的意义：

- 正适合 `sessions + assets + metadata` 的组合需求

### 6.6 App-State Snapshot

代表性模式：

- IDE/app preferences snapshot
- 桌面应用完整 profile 复制

可借鉴点：

- 少量 machine-local compatibility check 思路

不应直接借鉴的部分：

- 把整个 app state 当作迁移对象
- 把 transient cache / UI state / global prefs 全打包

对本项目的结论：

- 这是最需要主动避免的参照方向
- `Project Bundle` 不应成为 app snapshot

---

## 7. 候选方案

### 7.1 方案 A：Lean Project Context Bundle

定义：

- 以 project-scoped context assets 为边界的轻量组合包

包含：

- sessions
- rules
- memory
- skills
- commands
- metadata

不包含：

- raw source copies
- full source repo copy
- search/cache/index state
- transient UI state

倾向：

- mixed
- 更偏 migration

用户能否编辑：

- 可以
- 推荐 package 与对象文件保持可审计、可读

优点：

- 边界清晰
- 复杂度可控
- 与当前 product promise 最一致
- 最容易复用 `Session Backup`

风险：

- 用户可能误以为它等于“完整项目归档”
- 需要清楚解释 inclusion / exclusion

复杂度：

- 中等

### 7.2 方案 B：Preservation-Oriented Bundle

定义：

- 在方案 A 基础上增加 raw preservation 与更多冻结副本

包含：

- 方案 A 全部内容
- optional raw source copies
- optional derived transcript / markdown snapshots

倾向：

- 更偏 backup / archive

用户能否编辑：

- 理论上可以
- 但随着 checksum 与 integrity 增多，不应鼓励随意手改

优点：

- 归档价值更强
- 更适合 forensic 场景

风险：

- 包体积大
- 隐私风险更高
- source coupling 更强
- 校验与 UX 复杂度显著增加

复杂度：

- 高

### 7.3 方案 C：Transfer-Oriented Asset Bundle

定义：

- 以 reusable assets 为核心，sessions 仅少量附带或不含

包含：

- rules
- memory
- skills
- commands
- metadata

可选包含：

- selected sessions

不包含：

- raw source copies
- full project evidence set

倾向：

- 更偏 migration / handoff

用户能否编辑：

- 可以，且应较友好

优点：

- 轻量
- 易懂
- 易做 selective import

风险：

- 更像 `Asset Bundle` 而不是 `Project Bundle`
- 难以承担 project-level preservation 语义

复杂度：

- 低到中等

---

## 8. 推荐方案

首版推荐采用：

- `Lean Project Context Bundle`

理由：

- 最符合 project-first, local-first 的产品方向
- 与当前 `Backup / Migration` IA 最一致
- 不会把产品拖向 app snapshot
- 可以直接复用 `Session Backup` foundation
- 能覆盖 preservation、migration、handoff 三类问题中的主干部分

### 8.1 首版 bundle 应包含什么

首版推荐包含：

- bundle manifest
- bundle schema version
- project identity / roots summary
- sessions
- rules
- memory
- skills
- commands
- package-level provenance
- timestamps
- validation metadata
- object inventory

### 8.2 哪些内容必须延后

应延后：

- embedded raw source copies 作为默认行为
- repo full copy
- app-state snapshot
- external runtime restore
- vendor-private format round-trip
- cache/index 持久化复制
- machine-local secrets / ports / tokens

### 8.3 是否应复用 Session Backup 作为 session 子格式

应复用，而且应显式复用。

原因：

- `Session Backup` foundation 已明确要求未来 `Project Bundle` 可以直接嵌入 session backup artifacts
- 如果 bundle 重新定义 session payload，会造成 schema 重复与迁移成本
- `Session Backup` 已经拥有 canonical `Session Record` 语义与验证边界

推荐原则：

- `Session Backup` = session-layer canonical package
- `Project Bundle` = project-level container
- `Project Bundle` 中的 `sessions/` = reuse `Session Backup`

### 8.4 是否需要显式 manifest / schema version / validation layer

需要，而且这是首版必须项。

至少应具备：

- bundle-level manifest
- explicit schema family / version
- object inventory
- checksums or equivalent integrity metadata
- provenance metadata
- validation result surface

原因：

- `Import`
- `Restore / Validate`
- `Migration Preview`

这三个 workflow 都依赖 bundle-level 可验证入口。

---

## 9. 推荐格式方向

此处只给方向，不定义最终实现 schema。

推荐 package 结构：

```text
project-bundle/
  manifest.json
  project.json
  sessions/
  assets/
    rules/
    memory/
    skills/
    commands/
```

设计原则：

- `manifest.json`
  - package 级 schema、inventory、integrity、provenance、validation 入口
- `project.json`
  - project identity、roots summary、scope、creation context
- `sessions/`
  - 直接复用 `Session Backup` 子格式
- `assets/`
  - 按对象类型分组，避免一开始设计成统一巨型对象表

未来可扩展但首版不必默认支持：

- `sources/`
  - only when advanced source preservation is enabled
- `views/`
  - only when derived snapshots are intentionally embedded

---

## 10. 导入、导出、恢复与迁移边界

### 10.1 Bundle Export

`Bundle Export` 应理解为：

- 把当前 project-scoped context package 写出为可移植容器

它不应被表述为：

- transcript export
- generic file dump

### 10.2 Bundle Import

`Bundle Import` 应负责：

1. 读取 package
2. 校验 manifest
3. 校验 schema family / version
4. 识别对象类型
5. 暴露冲突、缺失与警告

### 10.3 Restore

`Restore` 应负责：

- 将 bundle 内对象恢复为本产品可浏览、可搜索、可分析状态

它不应负责：

- 重建第三方私有 store
- 在外部 agent app 中 reopen live session
- 无损回写所有原始格式

### 10.4 Migration Preview

`Migration Preview` 应负责：

- 说明哪些对象可直接导入
- 哪些对象需要 remap
- 哪些对象因 provenance 或 scope 不完整而受限

它很可能在 v1 只结束于 preview，而不必直接执行复杂迁移动作。

---

## 11. 与 Session Backup 的依赖关系

`Project Bundle` 与 `Session Backup` 的推荐层级是：

- `Session Backup`
  - 单一 session 或 session 集合的 canonical backup
- `Project Bundle`
  - project 级组合型备份与迁移容器

依赖关系建议固定为：

- `Project Bundle` 不重新定义 canonical session payload
- `Project Bundle` 的 `sessions/` 复用 `Session Backup`
- `Session Record` 仍是 session backup 与 session import 的 canonical contract

这使得：

- session semantics 在 bundle 内外保持一致
- schema evolution 只需在明确的层次上推进
- future import / validate 可以在 bundle-level 与 session-level 分层执行

---

## 12. 是否适合进入新的 OpenSpec change

适合。

建议下一步进入新的 OpenSpec change，范围限定为：

- `project-bundle-foundation`

推荐 change 只覆盖：

- 术语边界
- 首版对象范围
- manifest / schema / validation contract
- import / restore / migration preview 边界
- `Session Backup` 作为 session 子格式的复用关系

不建议在同一 change 中直接承诺：

- default source-preserving bundle
- cloud sync
- team collaboration package
- vendor runtime restore
- full app snapshot

---

## 13. 一句话结论

`Project Bundle` 应被定义为一个面向个人本地工作流、以 project-scoped agent context 为边界、以 migration 为首版优先目标、并复用 `Session Backup` 作为 session 子格式的组合型 portable package，而不是 transcript export，也不是全量 app snapshot。
