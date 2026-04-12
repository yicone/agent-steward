# Assets Foundation QA Report

**Branch**: `feat/assets-foundation`  
**Date**: 2026-04-11  
**QA Method**: `agent-browser` (Playwright CLI) on local dev server  
**Overall Status**: ❌ **FAIL** — 存在阻塞问题需修复后方可转 ready-for-review

> Resolution note (2026-04-12): The blocking `Sessions -> Assets` URL state leak was fixed after this QA run by clearing session-local query parameters when leaving the Sessions surface. Targeted tests, production build, and `openspec validate assets-foundation --strict` passed after the fix. The original report below is retained as the QA finding record.

---

## Scope

验证 `assets-foundation` OpenSpec 变更的实现是否符合规范与 IA 边界：

- Project shell 五大导航入口完整性
- `Sessions` 既有 viewer/search/deep-link 行为保留
- `Assets` foundation 页面（header/summary/inventory/detail/usage）
- Assets filters（subtype/scope/source/status）及 active filter 可见性
- Selected asset detail 信息完整性
- Unknown 值显式展示（非静默推断）
- Empty / Issue states 边界
- Routed handoff 路径与 cue 生命周期
- Bounded actions（route-only，非 workflow 执行）

---

## Environment

| Item | Status | Details |
|------|--------|---------|
| Branch | ✅ | `feat/assets-foundation` |
| Dev server | ✅ | `http://localhost:3001` (fresh instance after :3000 stability issues) |
| Browser automation | ✅ | Playwright CLI via `agent-browser` skill |
| Console noise | ⚠️ | Observed `kiro-cli` runtime panics and `_rsc=... 500` during deep-link; verified actual page behavior independently |

---

## Results

### 1. Project Shell Navigation

| Check | Status | Evidence |
|-------|--------|----------|
| 五个入口均存在 | ✅ | `Project Overview`, `Sessions`, `Assets`, `Analysis`, `Backup / Migration` 全部可见 |
| 当前 surface 标签正确 | ✅ | 导航按钮显示 `govern/evidence/context/insight/workflow` eyebrow |

### 2. Sessions 既有行为

| Check | Status | Evidence |
|-------|--------|----------|
| Viewer 仍在 | ✅ | 左侧 conversations list，右侧 viewer 区域保留 |
| Session actions 存在 | ✅ | `Inspect in Assets`, `Back Up Session` 按钮可见 |
| Deep-link 优先落 Sessions | ✅ | URL 带 `source/id/rootId` 时 shell 优先渲染 Sessions 面 |
| Search 输入框 | ✅ | "Search by title or path…" 输入框存在 |

### 3. Assets Foundation 页面结构

| Check | Status | Evidence |
|-------|--------|----------|
| 不再是 placeholder | ✅ | 替换为完整 `AssetsFoundation` 组件 |
| Header | ✅ | "reusable context assets" + bounded 说明文案 |
| Summary | ✅ | Asset Summary 区域展示 matching/in-effect/needs-review 计数 |
| Inventory | ✅ | Asset Inventory 列表，可见 subtype/scope/source/status/provenance |
| Detail | ✅ | Asset Detail 面板展示 identity + provenance + bounded routes |
| In-Effect / Usage | ✅ | 独立区块展示 applicability，unknown 时显式提示 "unavailable" |

### 4. Assets Filters

| Check | Status | Evidence |
|-------|--------|----------|
| Subtype | ✅ | All/Rule/Memory/Skill/Command/Unknown |
| Scope | ✅ | All/Global/User/Project/Unknown |
| Source | ✅ | All/Antigravity/Windsurf/Codex/Imported/Generated/Unknown |
| Status | ✅ | All/Active/Stale/Conflicted/Orphaned/Archived/Unknown |
| Active filters 始终可见 | ✅ | 四个 combobox 始终展示当前选中值 |

### 5. Selected Asset Detail

| Check | Status | Evidence |
|-------|--------|----------|
| Identity | ✅ | Title 明确展示 |
| Subtype | ✅ | Badge 展示（Rule/Memory/etc.） |
| Scope | ✅ | Project/User/Global 展示 |
| Source | ✅ | Codex/Antigravity/etc. 展示 |
| Status | ✅ | Active/Stale/etc. 展示 |
| Provenance | ✅ | 文本摘要 + "Source session evidence" 按钮 |
| Body summary | ✅ | 有则展示，无则显式提示 "No body summary is available" |
| Bounded evidence routes | ✅ | "Review related session", "Review in Analysis" 按钮存在 |

### 6. Unknown 值显式展示

| Check | Status | Evidence |
|-------|--------|----------|
| Unknown subtype 不静默推断 | ✅ | Seed 数据中 "Imported context package fragment" 明确显示 `Unknown` subtype |
| Unknown status 不静默推断 | ✅ | Seed 数据中明确显示 `Unknown` status |
| Unknown scope 选项存在 | ✅ | Filter dropdown 包含 "Unknown" 选项 |
| Unknown source 选项存在 | ✅ | Filter dropdown 包含 "Unknown" 选项 |

**注**：本次 QA 未在 seed 数据中稳定命中展示 `Unknown` scope/source 的具体对象，但 filter 选项与显式 label 逻辑已验证。

### 7. Empty State

| Check | Status | Evidence |
|-------|--------|----------|
| 无 fake rows | ✅ | 显示 "No reusable assets match..." 文本 |
| Filter context 保留 | ✅ | 四个 filter combobox 保持用户选择值 |
| Bounded guidance | ✅ | 提供 "Clear scope filter"、"Prepare import" 等 route CTA |

### 8. Issue State

| Check | Status | Evidence |
|-------|--------|----------|
| Stale/Conflicted/Orphaned 突出 | ✅ | Stale Memory inventory 显示 issue state badge |
| 不变成 Analysis 页面 | ✅ | 页面仍是 `Assets`，URL/surface 标签保持 Assets |
| 提供 Analysis route | ✅ | "Open Analysis" 按钮存在，正确 route 到 Analysis placeholder |

### 9. Routed Handoff — Project Overview → Assets

| Check | Status | Evidence |
|-------|--------|----------|
| Routed cue 出现 | ✅ | Cue strip 显示 "from overview" + subtitle |
| Subtype/scope/object 应用 | ✅ | 点击 "Review In-Effect Rules" 后，filter 自动设为 Rule/Project |
| Origin cue 保留至手动切换 | ✅ | Cue 保持可见，直到用户主动改变 filter 或选择 |

### 10. Routed Handoff — Sessions → Assets ⚠️

| Check | Status | Evidence |
|-------|--------|----------|
| Handoff 发生 | ✅ | 点击 "Inspect in Assets" 后进入 Assets 面 |
| 只带 subtype/session context | ❌ **FAIL** | URL 仍保留 `source/id/rootId/expanded` 等 session-local state |
| 不携带 transcript/trajectory | ⚠️ | UI 层面未展示，但 URL state 泄露 |

**阻塞问题**：`Sessions -> Assets` handoff 未清除 session deep-link 参数，违反了 bounded handoff 的上下文隔离要求。

### 11. Routed Handoff — Assets → Analysis/Backup

| Check | Status | Evidence |
|-------|--------|----------|
| Analysis routed cue | ✅ | 进入 Analysis 后显示 "Routed from Assets" cue |
| Backup routed cue | ✅ | 进入 Backup 后显示 "Routed from Assets" cue |
| 仅 route 不执行 workflow | ✅ | Assets 内按钮仅触发 `onOpenAnalysis`/`onOpenBackup`，无 workflow 内部逻辑 |

### 12. Stale Routed Cue 清理

| Check | Status | Evidence |
|-------|--------|----------|
| Normal nav 后无 stale cue | ✅ | 从 Overview 正常点击进入 Analysis，无 "Routed from Assets" cue |
| Normal nav 后无 stale cue | ✅ | 从 Overview 正常点击进入 Backup，无 "Routed from Assets" cue |

### 13. Quick Filter Switching

| Check | Status | Evidence |
|-------|--------|----------|
| 无 stuck loading | ✅ | 快速切换 subtype/scope/source/status，loading 状态正常收敛 |
| 无 stale UI | ✅ | Summary 计数与 inventory 列表同步更新 |

---

## 问题汇总

### 阻塞问题（必须修复）

| ID | 问题 | 复现步骤 | 预期行为 | 实际行为 |
|----|------|----------|----------|----------|
| P0 | Sessions → Assets handoff 泄露 URL state | 1. 进入 Sessions<br>2. 选择任意 session<br>3. 点击 "Inspect in Assets" | URL 应仅保留 Assets 相关参数（或最小化），不包含 `source/id/rootId/expanded` | URL 仍保留完整 session deep-link 参数 |

### 非阻塞问题（建议记录或低优处理）

| ID | 问题 | 说明 | 建议 |
|----|------|------|------|
| P2 | Deep-link 偶发 500 | 新 dev server 上 deep-link 直开时出现 `_rsc=... 500`，但页面最终恢复 | 监控 production build；dev 模式稳定性问题可暂缓 |
| P3 | Unknown scope/source 对象未覆盖 | Seed 数据未包含展示 `Unknown` scope/source 的具体对象 | 如需完整覆盖，可补充 seed 数据或文档记录该路径已逻辑验证 |
| P4 | Search 全链路未完整验证 | 仅确认搜索框存在，未执行完整 "输入关键词 → 选择结果 → 跳转" 流程 | 如有疑虑可补充验证；当前 scope 聚焦 Assets foundation |

---

## OpenSpec 要求覆盖情况

| OpenSpec 要点 | 状态 | 备注 |
|---------------|------|------|
| Assets 不再是 placeholder | ✅ | 已实现完整 foundation 页面 |
| 页面 states（empty/loading/normal/selected/issue） | ✅ | 全部验证 |
| Filters（subtype/scope/source/status） | ✅ | 全部验证 |
| Active filters 可见 | ✅ | 已验证 |
| Selected detail 信息完整 | ✅ | 已验证 |
| Unknown 显式处理 | ⚠️ | 逻辑已验证，具体对象展示未完全覆盖 |
| Routed handoff（Overview/Sessions/Analysis） | ⚠️ | Overview/Analysis 已验证；Sessions → Assets 存在泄露问题 |
| Bounded actions（route-only） | ✅ | 已验证 |
| 不携带 transcript/trajectory | ❌ | URL state 泄露违反此要求 |
| Stale handoff degrade | ✅ | 已验证 |

---

## 建议

### 关于 ready-for-review

**不建议**从 draft 直接转 `ready-for-review`。

**原因**：存在 **P0 阻塞问题**（Sessions → Assets handoff URL state 泄露）。该问题直接违反 OpenSpec 对 bounded handoff 的明确要求，会导致：
- URL 语义混乱（Assets 页面携带 Sessions deep-link 参数）
- 刷新/分享链接时 shell 可能错误优先落到 Sessions
- 上下文隔离边界被破坏

### 下一步行动

1. **修复 P0**：在 `handleOpenAssetsFromSession` 或对应路由逻辑中，清除 `source/id/rootId/expanded` 等 session-local URL 参数，仅保留 Assets handoff 所需的最小上下文（如 `subtype`, `sessionId` 等）。
2. **修复后验证**：重新执行 QA 验证 Sessions → Assets 路径，确认 URL 干净且功能正常。
3. **可选优化**：如需完整覆盖 Unknown scope/source 展示，可补充 seed 数据。
4. **转 RFR**：P0 修复并验证通过后，即可考虑转 `ready-for-review`。

---

## 附录：已验证文件

- `src/components/ProjectShellClient.tsx` — shell 导航与 handoff 逻辑
- `src/components/AssetsFoundation.tsx` — Assets 页面实现
- `src/components/HomeClient.tsx` — Sessions viewer 与 "Inspect in Assets" 入口
- `src/lib/contextAssets.ts` — 模型与 filter 逻辑（通过 UI 行为间接验证）

---

*Report generated by agent-browser QA on 2026-04-11*
