# ASCII Wireframes Phase 1

Updated: 2026-04-11

This document converts the current phase-1 low-fi structures into single-screen ASCII wireframes for four priority page states:

- `Project Overview / issue-heavy`
- `Assets / routed-in from Sessions`
- `Backup / Migration / validation`
- `Backup / Migration / result`

It is constrained by:

- [low-fi-wireframes-phase-1-revised.md](./low-fi-wireframes-phase-1-revised.md)
- [low-fi-wireframes-phase-1-state-walkthrough.md](./low-fi-wireframes-phase-1-state-walkthrough.md)
- [low-fi-page-scenarios-phase-1.md](./low-fi-page-scenarios-phase-1.md)
- [session-backup-migration-ux.md](./session-backup-migration-ux.md)
- [research-project-bundle.md](./research-project-bundle.md)
- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [page-block-ia.md](./page-block-ia.md)
- [page-state-ia.md](./page-state-ia.md)
- [routed-context-handoff.md](./routed-context-handoff.md)
- [module-interaction-rules.md](./module-interaction-rules.md)
- [cue-lifecycle-rules.md](./cue-lifecycle-rules.md)
- [glossary.md](./glossary.md)

It does not define:

- high-fidelity UI
- visual style
- design tokens
- component styling
- implementation details
- API design

## 1. Scope

This document only tests:

- spatial hierarchy
- primary versus secondary regions
- cue placement
- CTA concentration
- whether the page still reads like itself under important states

It does not reopen page IA or module decisions.

## 2. Project Overview / Issue-Heavy

```text
+--------------------------------------------------------------------------------------------------+
| GLOBAL TOP BAR                                                                                   |
| Project: <current project>            [Overview] [Sessions] [Assets] [Analysis] [Backup/Mig]   |
| Search.................................................................................... [/]   |
+--------------------------------------------------------------------------------------------------+
| PAGE HEADER                                                                                      |
| Project Overview                                                                                 |
| Scope: project-scoped agent context      Sources: sessions + assets + backups                    |
+--------------------------------------------------------------------------------------------------+
| TOP SUMMARY ROW                                                                                  |
| +--------------------------------------+  +----------------------------------------------------+ |
| | Context Snapshot                     |  | In-Effect Assets                                   | |
| | Sessions: 128   Assets: 42           |  | 7 currently in effect                              | |
| | Findings: 9    Backups: 12           |  | rules / memory / skills / commands summary         | |
| | [Open Sessions] [Open Assets]        |  | [View Assets]                                      | |
| +--------------------------------------+  +----------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
| MAIN FOCUS ROW                                                                                   |
| +------------------------------------------------------------------+  +------------------------+ |
| | Attention Needed                                                 |  | Quick Actions          | |
| | ---------------------------------------------------------------- |  | ---------------------- | |
| | High priority                                                    |  | [Review Analysis]      | |
| | - 3 stale assets affecting current project                       |  | [Open Assets]          | |
| | - 1 backup validation risk                                       |  | [Start Bundle]         | |
| | - 2 provenance gaps                                              |  | [Import Package]       | |
| |                                                                  |  |                        | |
| | [Review in Analysis] [Inspect in Assets] [Preserve in Backup]    |  | compact routing only   | |
| +------------------------------------------------------------------+  +------------------------+ |
+--------------------------------------------------------------------------------------------------+
| SECONDARY ROW                                                                                    |
| +----------------------------------------------------------------------------------------------+ |
| | Recent Sessions                                                                              | |
| | -------------------------------------------------------------------------------------------- | |
| | Session A     failed normalization     2h ago     [Open]                                     | |
| | Session B     imported                 5h ago     [Open]                                     | |
| | Session C     active                   1d ago     [Open]                                     | |
| |                                                                      [View All Sessions]     | |
| +----------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```

### Notes

- 主区域是 `Attention Needed`，它已经明显成为页面中心块。
- `Quick Actions` 被压成窄侧栏，只保留 compact routing，不承载 setup、filters 或 workflow body。
- `Recent Sessions` 放到底部整行，仍可达，但明显次级。
- cue 只放在 `Attention Needed` 和 `In-Effect Assets` 内，不引入额外 page-level banner。
- 主要 CTA 集中在 `Attention Needed`，而不是平均分散到所有模块。
- 这个状态下页面仍守住 `Project Overview`，因为它只做风险摘要与分流，不做 finding inventory，也不做 session reading。

## 3. Assets / Routed-In From Sessions

```text
+--------------------------------------------------------------------------------------------------+
| GLOBAL TOP BAR                                                                                   |
| Project: <current project>            [Overview] [Sessions] [Assets] [Analysis] [Backup/Mig]   |
| Search.................................................................................... [/]   |
+--------------------------------------------------------------------------------------------------+
| PAGE HEADER                                                                                      |
| Assets                                                                                           |
| [From Sessions: continue reviewing session-derived asset candidate] [Return to Session]          |
+--------------------------------------------------------------------------------------------------+
| SUBTYPE + SCOPE HEADER                                                                           |
| Subtype: [Rules v] [Memory] [Skills] [Commands]     Scope: [Project v] [User] [Global]         |
| Filters: source=session-derived  status=active  provenance=present                               |
+--------------------------------------------------------------------------------------------------+
| TOP SUMMARY ROW                                                                                  |
| +----------------------------------------------------------------------------------------------+ |
| | Asset Summary                                                                                | |
| | 14 rules in scope   3 session-derived   2 stale   5 in effect                               | |
| +----------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
| MAIN CONTENT ROW                                                                                 |
| +----------------------------------------------------------+  +--------------------------------+ |
| | Asset Inventory Table                                    |  | Asset Detail Panel            | |
| | -------------------------------------------------------- |  | ------------------------------ | |
| | > Rule: session backup naming convention                 |  | Name: session backup naming    | |
| |   Rule: import validation threshold                      |  | Subtype: Rule                  | |
| |   Rule: provenance retention                             |  | Scope: Project                 | |
| |   Rule: source-backup opt-in                             |  | Source: Derived from Session X | |
| |                                                          |  | Status: Active                 | |
| | [Sort] [Filter] [Select]                                 |  | Provenance: session-derived    | |
| |                                                          |  | [Open Source Session]          | |
| +----------------------------------------------------------+  +--------------------------------+ |
+--------------------------------------------------------------------------------------------------+
| SECOND-LAYER DETAIL ROW                                                                          |
| +----------------------------------------------------------+  +--------------------------------+ |
| | In-Effect / Usage                                        |  | Asset Actions                  | |
| | -------------------------------------------------------- |  | ------------------------------ | |
| | In effect: Yes                                           |  | [Open in Analysis]             | |
| | Applies to: current project backup flows                 |  | [Send to Backup/Migration]     | |
| | Used by: bundle prep / validation rules                  |  | [Archive]                      | |
| +----------------------------------------------------------+  +--------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```

### Notes

- 阅读顺序是清楚的：顶部 routed cue -> subtype/scope -> inventory -> object detail -> usage/actions。
- routed continuity cue 可见，但只是一条 compact strip，没有升级成 banner，也没有抢走页面主语。
- `table + right detail + second-layer In-Effect/Usage` 已形成稳定顺序：
  - table 负责选择
  - right detail 负责 object understanding
  - second layer 负责 project usage
- `Asset Actions` 被放到 second layer，避免它压过 object understanding。
- CTA 主要落在 right detail 和 second layer，不让表格本身承担过多动作。
- 这个状态下页面仍守住 `Assets`，因为 session-origin 只是上下文，不是页面主模型。

## 4. Backup / Migration / Validation

```text
+--------------------------------------------------------------------------------------------------+
| GLOBAL TOP BAR                                                                                   |
| Project: <current project>            [Overview] [Sessions] [Assets] [Analysis] [Backup/Mig]   |
| Search.................................................................................... [/]   |
+--------------------------------------------------------------------------------------------------+
| PAGE HEADER                                                                                      |
| Backup / Migration                                                                               |
| [From Assets: continue migration preview for selected project rule]                              |
+--------------------------------------------------------------------------------------------------+
| STICKY WORKFLOW BAR                                                                              |
| Workflow: [Session Backup] [Import] [Validate Package] [Migration Preview*] [Project Bundle]    |
| Active: Migration Preview      Step: Validation      [Back to Selection] [Cancel]                |
+--------------------------------------------------------------------------------------------------+
| MAIN WORKFLOW COLUMN                                                                             |
| +----------------------------------------------------------------------------------------------+ |
| | Workflow Context Summary                                                                     | |
| | -------------------------------------------------------------------------------------------- | |
| | Object set: 1 selected rule                                                                  | |
| | Intent: validate portability and project compatibility before preview                        | |
| | Origin: Assets / selected asset                                                              | |
| +----------------------------------------------------------------------------------------------+ |
| +----------------------------------------------------------------------------------------------+ |
| | Workflow Steps                                                                               | |
| | Select ---- Configure ---- [Validate] ---- Confirm ---- Run ---- Result                      | |
| +----------------------------------------------------------------------------------------------+ |
| +----------------------------------------------------------------------------------------------+ |
| | Validation Panel                                                                             | |
| | -------------------------------------------------------------------------------------------- | |
| | Status: warnings require review                                                              | |
| |                                                                                              | |
| | Warning                                                                                      | |
| | - provenance is incomplete for one derived rule                                              | |
| |                                                                                              | |
| | Blocking checks                                                                              | |
| | - none                                                                                       | |
| |                                                                                              | |
| | Suggested fix paths                                                                          | |
| | [Open Asset] [Review in Analysis] [Continue Anyway] [Go Back]                                | |
| +----------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
| LOW-PRIORITY LOWER SECTION                                                                      |
| +----------------------------------------------------------------------------------------------+ |
| | Recent Operations                                                                            | |
| | session backup x3   import x1   migration preview x1                               [Open]    | |
| +----------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```

### Notes

- `sticky workflow bar` 是必要的，因为它把“当前是什么 workflow、在哪一步”固定下来，避免页面看起来像一堆操作工具。
- validation 区自然成为主列中心，因为 `Validation Panel` 占据 workflow body 的主空间。
- `Recent Operations` 仍然次级，只保留一条紧凑底区，不进入主 workflow column。
- cue 落位清楚：
  - compact origin cue 在 header
  - workflow cue 在 sticky workflow bar
  - validation / warning cue 在主列 `Validation Panel`
- 主要 CTA 全部留在 `Validation Panel` 内，不散落到 header 或 history 区。
- 这个状态下页面仍守住 `Backup / Migration`，因为所有可执行动作都服务于当前 workflow，而不是一般浏览或分析。

## 5. Backup / Migration / Result

```text
+--------------------------------------------------------------------------------------------------+
| GLOBAL TOP BAR                                                                                   |
| Project: <current project>            [Overview] [Sessions] [Assets] [Analysis] [Backup/Mig]   |
| Search.................................................................................... [/]   |
+--------------------------------------------------------------------------------------------------+
| PAGE HEADER                                                                                      |
| Backup / Migration                                                                               |
| [Completed: migration preview generated] [Return to Origin]                                      |
+--------------------------------------------------------------------------------------------------+
| STICKY WORKFLOW BAR                                                                              |
| Workflow: [Session Backup] [Import] [Validate Package] [Migration Preview*] [Project Bundle]    |
| Active: Migration Preview      Step: Result                                         [New Run]    |
+--------------------------------------------------------------------------------------------------+
| MAIN WORKFLOW COLUMN                                                                             |
| +----------------------------------------------------------------------------------------------+ |
| | Workflow Context Summary                                                                     | |
| | -------------------------------------------------------------------------------------------- | |
| | Object set: 1 selected rule                                                                  | |
| | Completed from: Assets                                                                       | |
| +----------------------------------------------------------------------------------------------+ |
| +----------------------------------------------------------------------------------------------+ |
| | Workflow Steps                                                                               | |
| | Select ---- Configure ---- Validate ---- Confirm ---- Run ---- [Result]                      | |
| +----------------------------------------------------------------------------------------------+ |
| +----------------------------------------------------------------------------------------------+ |
| | Result Panel / Operation Result                                                              | |
| | -------------------------------------------------------------------------------------------- | |
| | Output: migration preview created                                                            | |
| | Summary:                                                                                     | |
| | - 1 asset mapped cleanly                                                                     | |
| | - 1 provenance warning retained                                                              | |
| |                                                                                              | |
| | [Inspect Preview] [Open Asset] [Return to Origin] [Back to Overview]                         | |
| +----------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
| LOW-PRIORITY LOWER SECTION                                                                      |
| +----------------------------------------------------------------------------------------------+ |
| | Recent Operations                                                                            | |
| | migration preview x2   session backup x3   import x1                                [Open]   | |
| +----------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```

### Notes

- result 主区域是清楚的，`Result Panel / Operation Result` 已成为主 workflow body。
- hybrid recent operations 没有反客为主，因为它仍然是底部紧凑条，不进入主列。
- completion / return cues 足够明确：
  - compact completion cue 在 header
  - return 行为也在 header 和 result panel 内重复一次
- `Workflow Context Summary` 仍保留，但降级为 continuity context，不和 result body 抢中心。
- 主要 CTA 落在 `Result Panel`，不是 `Recent Operations`。
- 这个状态下页面仍守住 `Backup / Migration`，因为 result 仍然被框定为当前 workflow 的终点，而不是历史浏览器。

## 6. Structured Conclusions

### 6.1 States That Already Look Stable

- `Project Overview / issue-heavy`
- `Assets / routed-in from Sessions`
- `Backup / Migration / validation`
- `Backup / Migration / result`

These four states already have:

- stable page skeletons
- clear primary versus secondary zones
- consistent cue placement
- CTA concentration in the right working area

### 6.2 Places That May Still Trigger Layout Disagreement

- `Project Overview`
  - whether `Quick Actions` should be even narrower once actual copy is introduced
- `Assets`
  - whether the right detail column has enough width to carry provenance cleanly without crowding
- `Backup / Migration / validation`
  - whether the sticky workflow bar should be one-row or two-row in low-fi
- `Backup / Migration / result`
  - whether the header-level completion cue is still necessary once the result panel is in view

### 6.3 Best Next Step If Work Continues

If phase 1 continues, the next best target is:

1. `Assets / routed-in from Sessions`
2. `Backup / Migration / validation`

Reason:

- these two states carry the most handoff and continuity risk
- they are also the easiest places for the page to drift out of role if spacing is wrong

### 6.4 Readiness For Next Low-Fi Round

The current state is sufficient to move into a more complete low-fi wireframe round.

The strongest candidates for that next round are:

- `Assets / routed-in from Sessions`
- `Backup / Migration / validation`
- `Backup / Migration / result`

Reason:

- they now have enough structural clarity to test denser multi-row low-fi layouts without reopening IA decisions
