# Low-Fi Wireframes Phase 2: Sessions and Analysis

Updated: 2026-04-11

This document advances the remaining two high-risk top-level pages to roughly the same low-fi maturity reached in phase 1:

- `Sessions`
- `Analysis`

It is constrained by:

- [glossary.md](./glossary.md)
- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [page-block-ia.md](./page-block-ia.md)
- [page-state-ia.md](./page-state-ia.md)
- [task-flow-ia.md](./task-flow-ia.md)
- [routed-context-handoff.md](./routed-context-handoff.md)
- [content-contract-draft.md](./content-contract-draft.md)
- [module-interaction-rules.md](./module-interaction-rules.md)
- [cue-lifecycle-rules.md](./cue-lifecycle-rules.md)
- [session-backup-migration-ux.md](./session-backup-migration-ux.md)
- [research-project-bundle.md](./research-project-bundle.md)
- [low-fi-wireframes-phase-1-revised.md](./low-fi-wireframes-phase-1-revised.md)
- [low-fi-wireframes-phase-1-state-walkthrough.md](./low-fi-wireframes-phase-1-state-walkthrough.md)
- [low-fi-page-scenarios-phase-1.md](./low-fi-page-scenarios-phase-1.md)
- [ascii-wireframes-phase-1.md](./ascii-wireframes-phase-1.md)
- [low-fi-wireframes-phase-1-detailed.md](./low-fi-wireframes-phase-1-detailed.md)

It does not define:

- high-fidelity UI
- visual design
- design system
- API design
- implementation strategy
- Figma prompts

## 1. Scope Confirmation

This round only covers:

- `Sessions` low-fi
- `Analysis` low-fi

This round does not reopen:

- the project-first IA
- the phase-1 page-role decisions for `Project Overview`, `Assets`, or `Backup / Migration`
- any new IA layer beyond the documents listed above

## 2. Page Roles

### 2.1 Sessions

`Sessions` remains a workbench, not the homepage subject.

It inherits the product's strongest current capability:

- readable session evidence
- source-aware browsing
- error-oriented inspection
- continuation-chain understanding

But it must not silently reassert:

- session-first product identity
- transcript-center-as-default-home
- generic cross-project triage

`Sessions` must answer:

- what happened in this session
- what evidence matters most right now
- where the important failure or execution point is
- what session-specific next action is available

### 2.2 Analysis

`Analysis` is the interpretation and routing page, not a second inventory.

It must not become:

- a second `Assets` page for stale/conflicted object browsing
- a second `Backup / Migration` page for workflow execution
- a passive findings warehouse with no clear action

`Analysis` must answer:

- what is wrong in the project context
- why it matters now
- what object or area is affected
- where the user should go next to act

## 3. Block-Level Low-Fi Skeleton

### 3.1 Sessions

### Page Goal

- browse, understand, and diagnose session evidence
- preserve session-reading as a strongest capability
- support bounded outbound actions without becoming a workflow hub

### Page Mode

- workbench

### Top Region

- `Session Source Bar`
- compact route / issue strip only when entered from `Analysis` or workflow validation
- active filter summary stays visible in empty, routed, and issue states

### Main Content Regions

- left driving column: `Session List`
- primary reading surface: `Session View`
- optional top-of-view `Chain / Continuation Strip` when chain context exists

### Secondary Regions

- `Error Center` as a secondary-but-prominent evidence surface below or beside the main reading region when the selected session is failure-heavy
- `Session Actions` near the selected-session surface, but clearly downstream from reading

### Right Detail / Inspector

- yes, but conditional only
- `Session Inspector` appears when an event or message is selected
- it must never become the only place where route reason, issue context, or next-step guidance lives

### Default Visible Modules

- `Session Source Bar`
- `Session List`
- `Session View` in prompt state or selected state

### State-Conditional Modules

- `Chain / Continuation Strip` when relationship metadata exists
- `Error Center` when selected session has meaningful failures
- `Session Inspector` when a sub-object inside the session is selected
- `Session Actions` when a session is selected

### Key CTA and Page Routing

- select a session
- jump to error/event location
- open related asset creation flow in `Assets`
- preserve or export in `Backup / Migration`
- escalate grouped issue interpretation to `Analysis`

### 3.2 Analysis

### Page Goal

- interpret project context health
- explain one problem clearly enough to act
- route the user into corrective work without hosting that work itself

### Page Mode

- overview plus table

### Top Region

- `Analysis Header`
- `Context Health Summary`
- compact return / continue-task cue only when re-entered from a correction surface

### Main Content Regions

- driving inventory: `Findings Table`
- selected-problem explanation: `Finding Detail`

### Secondary Regions

- `Recommended Actions` as a bounded action region attached to the selected finding or selected issue class
- compact severity / object-class cues may stay in summary surfaces

### Right Detail / Inspector

- no extra inspector by default
- `Finding Detail` is itself the main detail surface
- if a future inspector exists, it may only hold deeper evidence, not the page's primary explanation or next step

### Default Visible Modules

- `Analysis Header`
- `Context Health Summary`
- `Findings Table`

### State-Conditional Modules

- `Finding Detail` when a finding is selected
- `Recommended Actions` when there is at least one clear correction route
- compact preservation warning when the recommended route touches risky migration or destructive cleanup

### Key CTA and Page Routing

- select a finding
- open affected session in `Sessions`
- open affected asset in `Assets`
- open preservation or migration workflow in `Backup / Migration`
- return to the selected finding after correction if it still exists

## 4. Key State Walkthroughs

### 4.1 Sessions / normal

### Page Goal

- help the user orient the current session inventory and begin evidence review

### Page Skeleton

- `Session Source Bar`
- `Session List`
- `Session View` in prompt or unselected state

### Main vs Secondary Regions

- main: list + view
- secondary: none expanded by default

### Must-Appear Cues

- active filter cues
- compact source, time, status, and chain hints in the list

### CTA and Executable Actions

- select session
- refine filters
- clear filters

### Modules That Compress or Downgrade

- `Session View` stays prompt-like rather than fully empty
- no `Error Center`
- no `Session Inspector`
- no expanded action area

### Why The Page Still Holds Its Role

- it is clearly a session workbench, not a project summary page and not a cross-object issue page

### 4.2 Sessions / selected session

### Page Goal

- let the user read one session deeply enough to understand key events and decide a bounded next action

### Page Skeleton

- `Session Source Bar`
- `Session List`
- selected `Session View`
- `Session Actions`
- conditional `Chain / Continuation Strip`
- conditional `Error Center`
- conditional `Session Inspector`

### Main vs Secondary Regions

- main: selected `Session View`
- secondary: `Error Center` and `Session Actions`
- tertiary: right-side `Session Inspector`

### Must-Appear Cues

- selected-session identity
- projection mode cue
- execution-group / trajectory orientation cue
- provenance cue if selected event needs structured explanation

### CTA and Executable Actions

- switch projection
- jump to event
- inspect selected event/message
- promote useful material to `Assets`
- preserve/export in `Backup / Migration`

### Modules That Compress or Downgrade

- `Session List` stays compact and stable rather than competing with detail
- `Session Actions` stays bounded; no workflow steps inline
- `Session Inspector` shows structured object detail only

### Why The Page Still Holds Its Role

- the main surface is still readable session evidence, and outbound actions remain attached to that evidence instead of replacing it

### 4.3 Sessions / routed-in from Overview or Analysis

### Page Goal

- preserve route reason long enough for corrective review without turning the page into a triage dashboard

### Page Skeleton

- `Session Source Bar` with route-applied filter context if valid
- `Session List`
- preselected `Session View` when object context is known
- compact origin / issue strip near the main session area
- optional `Error Center`
- `Session Actions`

### Main vs Secondary Regions

- main: selected session evidence plus visible route reason
- secondary: `Error Center` if the route is corrective
- tertiary: inspector if the user drills into an event

### Must-Appear Cues

- origin cue from `Overview`, `Analysis`, or workflow validation
- issue cue if the route is corrective
- return-to-origin cue while bounce-back still matters

### CTA and Executable Actions

- inspect routed session
- jump to routed error/event
- return to finding or workflow result when still relevant
- route onward to `Assets` or `Backup / Migration`

### Modules That Compress or Downgrade

- route cue stays compact, not a banner, unless the whole page state is route-critical
- `Session Source Bar` absorbs valid filter context instead of adding a new route-only control layer
- `Session Inspector` must not own the route explanation

### Why The Page Still Holds Its Role

- the user is still reading a session; routed context only preserves why this session matters now

### 4.4 Sessions / error-heavy

### Page Goal

- concentrate failure evidence enough to diagnose and act, while keeping the session readable

### Page Skeleton

- selected-session backbone
- `Error Center` visibly prioritized near the session reading surface
- `Session Actions`
- optional `Session Inspector`

### Main vs Secondary Regions

- main: `Session View` plus visible failure anchors
- secondary: `Error Center` with navigable failure entries
- tertiary: inspector for selected failing event payload

### Must-Appear Cues

- issue cue
- compact failure identity
- severity cue
- route-to-action cue when preservation or grouped analysis is advisable

### CTA and Executable Actions

- jump to failing event
- inspect payload
- open grouped interpretation in `Analysis`
- preserve before risky cleanup in `Backup / Migration`

### Modules That Compress or Downgrade

- chain strip may compress if it is less important than current failures
- list metadata stays compact
- actions stay short and reason-linked

### Why The Page Still Holds Its Role

- even in corrective mode, the page is still about evidence inside one session, not grouped multi-object interpretation

### 4.5 Analysis / normal

### Page Goal

- make current health legible and let the user enter issue triage cleanly

### Page Skeleton

- `Analysis Header`
- `Context Health Summary`
- `Findings Table`

### Main vs Secondary Regions

- main: summary plus findings inventory
- secondary: none expanded until a finding is selected

### Must-Appear Cues

- issue-class cue
- severity / priority cue
- compact object-class hints

### CTA and Executable Actions

- change issue class
- select a finding
- refine filters

### Modules That Compress or Downgrade

- no `Finding Detail`
- no `Recommended Actions`
- summary remains compact and non-explanatory

### Why The Page Still Holds Its Role

- it stays an interpretation surface with selectable issues, not a report deck and not an object browser

### 4.6 Analysis / issue-heavy

### Page Goal

- concentrate the highest-risk issue class and make next-step routing obvious

### Page Skeleton

- `Analysis Header`
- `Context Health Summary` with issue emphasis
- `Findings Table`
- selected `Finding Detail` when one item is focused
- emphasized `Recommended Actions`

### Main vs Secondary Regions

- main: selected problem explanation
- supporting main region: findings inventory
- secondary: `Recommended Actions`

### Must-Appear Cues

- issue cue
- route-to-action cue
- severity / priority cue
- compact preservation warning when action may be risky

### CTA and Executable Actions

- open affected session
- open affected asset
- preserve before change
- start migration / backup route when appropriate

### Modules That Compress or Downgrade

- `Context Health Summary` stays summary-first, not a second table
- `Findings Table` may compress to preserve room for selected detail
- recommended actions remain bounded, not a workflow body

### Why The Page Still Holds Its Role

- the page still explains and routes; it does not execute remediation and it does not become a full inventory of assets or sessions

### 4.7 Analysis / routed-in from Overview

### Page Goal

- preserve the overview's issue framing while handing the user into a real triage surface

### Page Skeleton

- `Analysis Header` with carried issue-class filter when valid
- `Context Health Summary`
- `Findings Table`
- optional preselected `Finding Detail`
- compact origin or route-reason cue

### Main vs Secondary Regions

- main: findings and selected explanation
- secondary: action region only after selection

### Must-Appear Cues

- issue cue
- origin cue from overview issue triage
- route-to-action cue once a finding is selected

### CTA and Executable Actions

- continue triage on the relevant issue class
- select affected finding
- route to object review

### Modules That Compress or Downgrade

- origin cue stays compact and should expire once the user intentionally changes issue class
- summary does not restate overview-level project framing

### Why The Page Still Holds Its Role

- the page becomes the interpretation owner immediately; overview only hands off urgency and issue class

### 4.8 Analysis / routed-out to Sessions, Assets, or Backup

### Page Goal

- let the user move out to corrective work without losing the problem they are working on

### Page Skeleton

- selected `Finding Detail`
- `Recommended Actions` with clear route targets
- retained selected row in `Findings Table`

### Main vs Secondary Regions

- main: finding explanation and route target
- secondary: summary remains visible but subordinate

### Must-Appear Cues

- selected finding cue
- route-to-action cue
- return context for later re-entry
- warning cue when preservation should happen before action

### CTA and Executable Actions

- `Open in Sessions`
- `Open in Assets`
- `Preserve / Migrate in Backup / Migration`
- `Return to finding` after correction if still relevant

### Modules That Compress or Downgrade

- `Context Health Summary` compresses
- action reasons stay short
- no destination-page preview body appears inline

### Why The Page Still Holds Its Role

- the page remains the place that frames the problem and dispatches the next move, not the place that performs the move

### 4.9 Analysis / return from correction

### Page Goal

- restore the user's triage position after object review or preservation work

### Page Skeleton

- `Analysis Header`
- `Context Health Summary`
- `Findings Table`
- restored `Finding Detail` if still valid
- `Recommended Actions`

### Main vs Secondary Regions

- main: previously selected finding
- secondary: compact completion or continue-task cue if the correction route just finished

### Must-Appear Cues

- selected finding cue
- continue-task cue
- completion cue only if it still changes the user's next action

### CTA and Executable Actions

- continue triage
- verify whether the issue still stands
- move to next finding

### Modules That Compress or Downgrade

- completion cue downgrades quickly
- stale origin cue should disappear once the user changes finding or issue class

### Why The Page Still Holds Its Role

- the page resumes triage rather than becoming a result page for the correction workflow

## 5. ASCII Wireframes

ASCII is useful here because `Sessions` and `Analysis` are the two pages most likely to drift when main reading/detail surfaces and route cues compete for space.

The goal is not visual polish.
The goal is to pressure-test:

- where the current task sits
- whether detail becomes inspector-only
- whether routed cues stay compact
- whether action regions remain bounded

### 5.1 Sessions / selected session

```text
+--------------------------------------------------------------------------------------------------+
| GLOBAL TOP BAR                                                                                   |
| Project: <current project>            [Overview] [Sessions] [Assets] [Analysis] [Backup/Mig]   |
| Search.................................................................................... [/]   |
+--------------------------------------------------------------------------------------------------+
| PAGE HEADER                                                                                      |
| Sessions                                                                                         |
| Filters: source=all   time=7d   status=all   chain=any                                           |
+--------------------------------------------------------------------------------------------------+
| MAIN WORKBENCH                                                                                   |
| +--------------------------------+  +--------------------------------------------------------+   |
| | Session List                   |  | Session View                                           |   |
| | ------------------------------ |  | ------------------------------------------------------ |   |
| | > Codex session A              |  | Session A   [Transcript] [Trajectory] [Markdown]       |   |
| |   Claude session B             |  | cwd=/repo/app     2h ago                               |   |
| |   Windsurf session C           |  |                                                        |   |
| |                                |  | [Chain / Continuation Strip when relevant]             |   |
| | compact source/status/cwd cues |  |                                                        |   |
| +--------------------------------+  | readable session evidence                               |   |
|                                     |                                                        |   |
|                                     |                                                        |   |
|                                     +--------------------------------------------------------+   |
+--------------------------------------------------------------------------------------------------+
| SECONDARY ROW                                                                                     |
| +--------------------------------------------------------------+  +----------------------------+ |
| | Error Center                                                 |  | Session Actions            | |
| | ------------------------------------------------------------ |  | -------------------------- | |
| | command failed: backup validation                            |  | [Promote to Asset]         | |
| | schema mismatch at import step                               |  | [Preserve / Export]        | |
| | [Jump to event]                                              |  | [Open Diagnostics]         | |
| +--------------------------------------------------------------+  +----------------------------+ |
+--------------------------------------------------------------------------------------------------+
| RIGHT DETAIL                                                                                     |
| +----------------------------------------------------------------------------------------------+ |
| | Session Inspector                                                                            | |
| | selected event identity / structured detail / provenance / copyable ref                      | |
| +----------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```

### Notes

- reading order is stable: list -> session evidence -> error/action follow-up -> inspector
- `Session Inspector` is clearly tertiary
- `Error Center` is visible but does not replace the readable session body

### 5.2 Sessions / routed-in from Analysis

```text
+--------------------------------------------------------------------------------------------------+
| GLOBAL TOP BAR                                                                                   |
| Project: <current project>            [Overview] [Sessions] [Assets] [Analysis] [Backup/Mig]   |
+--------------------------------------------------------------------------------------------------+
| PAGE HEADER                                                                                      |
| Sessions                                                                                         |
| [From Analysis: inspect failed backup-related session] [Return to Finding]                       |
+--------------------------------------------------------------------------------------------------+
| MAIN WORKBENCH                                                                                   |
| +--------------------------------+  +--------------------------------------------------------+   |
| | Session List                   |  | Session View                                           |   |
| | ------------------------------ |  | ------------------------------------------------------ |   |
| | > Routed session A             |  | Session A                                              |   |
| |   matching sessions            |  | [Issue cue: failure affects backup trust]              |   |
| |                                |  |                                                        |   |
| +--------------------------------+  | readable evidence with routed error anchors             |   |
|                                     |                                                        |   |
|                                     +--------------------------------------------------------+   |
+--------------------------------------------------------------------------------------------------+
| LOWER ROW                                                                                         |
| +--------------------------------------------------------------+  +----------------------------+ |
| | Error Center                                                 |  | Session Actions            | |
| | routed failures remain visible                               |  | [Preserve in Backup]       | |
| | [Jump to event]                                              |  | [Promote to Asset]         | |
| +--------------------------------------------------------------+  +----------------------------+ |
+--------------------------------------------------------------------------------------------------+
```

### Notes

- the routed cue is compact and sits before the working surface
- issue context remains in main content, not in the inspector
- the page still reads as session-first workbench, not finding-first triage

### 5.3 Analysis / issue-heavy

```text
+--------------------------------------------------------------------------------------------------+
| GLOBAL TOP BAR                                                                                   |
| Project: <current project>            [Overview] [Sessions] [Assets] [Analysis] [Backup/Mig]   |
| Search.................................................................................... [/]   |
+--------------------------------------------------------------------------------------------------+
| PAGE HEADER                                                                                      |
| Analysis                                                                                         |
| Issue class: [Provenance] [Stale] [Conflict] [Risk*]     Object type: [All v]                   |
+--------------------------------------------------------------------------------------------------+
| SUMMARY STRIP                                                                                    |
| +----------------------------------------------------------------------------------------------+ |
| | Context Health Summary                                                                       | |
| | High risk: 6 findings   Affects: sessions + assets   Priority route: preserve before change | |
| +----------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
| MAIN CONTENT                                                                                     |
| +------------------------------------------------------+  +------------------------------------+ |
| | Findings Table                                       |  | Finding Detail                     | |
| | ---------------------------------------------------- |  | ---------------------------------- | |
| | > Missing provenance blocks migration preview        |  | Finding: Missing provenance        | |
| |   Stale rule referenced by active project            |  | Why it matters: portability risk   | |
| |   Duplicate command with conflicting scope           |  | Affected area: session backup set  | |
| |                                                      |  | Evidence: 2 sessions, 1 rule       | |
| | severity / object-class / route hint                 |  | Next route: Backup / Migration     | |
| +------------------------------------------------------+  +------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
| ACTION ROW                                                                                        |
| +----------------------------------------------------------------------------------------------+ |
| | Recommended Actions                                                                          | |
| | [Preserve in Backup] [Open Affected Session] [Open Affected Asset]                           | |
| | Route reason: preserve first, then resolve source issue                                      | |
| +----------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```

### Notes

- `Finding Detail` and `Recommended Actions` carry the page's main answer
- the summary stays compact and non-duplicative
- actions are clearly outbound, not embedded workflow steps

### 5.4 Analysis / routed-out posture

```text
+--------------------------------------------------------------------------------------------------+
| PAGE HEADER                                                                                      |
| Analysis                                                                                         |
| [Continue triage after correction if finding remains]                                            |
+--------------------------------------------------------------------------------------------------+
| MAIN CONTENT                                                                                     |
| +------------------------------------------------------+  +------------------------------------+ |
| | Findings Table                                       |  | Finding Detail                     | |
| | ---------------------------------------------------- |  | ---------------------------------- | |
| | > Selected finding                                   |  | Selected finding explanation       | |
| | other findings                                       |  | Next route: Sessions              | |
| +------------------------------------------------------+  | [Open in Sessions]                | |
|                                                           | [Open in Assets]                  | |
|                                                           | [Preserve in Backup]              | |
|                                                           +------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```

### Notes

- outbound routes stay attached to the selected finding
- the page does not preview destination-page bodies
- return continuity is possible without making `Analysis` itself sticky or workflow-like

## 6. Structured Conclusion

### 6.1 Maturity Assessment

`Sessions` and `Analysis` now reach roughly the same low-fi maturity as the phase-1 three pages in these dimensions:

- page role is explicit
- fixed backbone versus conditional modules is stable
- cues are assigned by state
- routed handoff behavior is consistent with phase-1 language
- CTA concentration is clear
- ASCII structure is sufficient to pressure-test space allocation

They are not yet high-fidelity-ready in a visual sense, but they are ready for cross-page low-fi review.

### 6.2 Most Likely Remaining Layout Disagreements

The most likely points of future disagreement are:

- whether `Sessions` gives too much room to `Error Center`, causing the page to feel like a diagnostics console instead of a session reader
- whether `Sessions` should place `Session Actions` beside the view or below it once copy length becomes real
- whether `Analysis` should favor a wider `Finding Detail` region or keep more width in the `Findings Table`
- whether `Recommended Actions` belongs as a full-width lower row or as a shorter right-column extension in dense selected states
- how long routed cues persist after the user changes selection or issue class

### 6.3 Readiness For Global Low-Fi Review

Yes.

These two pages are now coherent enough to enter the next full low-fi review together with:

- `Project Overview`
- `Assets`
- `Backup / Migration`

The review question should now shift from "what are these pages?" to:

- do they share one product language
- do routed cues degrade consistently
- do outbound actions stay bounded
- does any page still collapse into another page's job under stress

### 6.4 High-Fi / Figma Readiness

Still not recommended.

The remaining uncertainty is structural, not visual:

- exact weight of session reading versus error concentration
- exact split between findings inventory and finding explanation
- persistence rules for routed / completion cues
- action-row placement under denser real content

Those are low-fi review questions first, not high-fidelity questions.
