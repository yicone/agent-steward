# Low-Fi Wireframes Phase 1 Detailed

Updated: 2026-04-11

This document deepens the phase-1 low-fi wireframe round for the three page states most likely to drift under real layout pressure:

- `Assets / routed-in from Sessions`
- `Backup / Migration / validation`
- `Backup / Migration / result`

It is constrained by:

- [low-fi-wireframes-phase-1-revised.md](./low-fi-wireframes-phase-1-revised.md)
- [low-fi-wireframes-phase-1-state-walkthrough.md](./low-fi-wireframes-phase-1-state-walkthrough.md)
- [low-fi-page-scenarios-phase-1.md](./low-fi-page-scenarios-phase-1.md)
- [ascii-wireframes-phase-1.md](./ascii-wireframes-phase-1.md)
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
- implementation details
- API design
- new page structure

## 1. Scope

This document is not a new rule layer.

Its purpose is to pressure-test:

- space allocation
- density of primary versus secondary content
- detail hierarchy
- workflow spine behavior
- cue placement
- CTA concentration

The question here is not "what are the modules?" but "can these modules share a single page without breaking the page's role?"

## 2. Shared Detailed Layout Principles

The following layout rules are treated as fixed in this round:

- routed cues should be visible before the main working region but should not displace the primary working surface
- primary columns must own the current task, while secondary columns must support it without becoming alternate task centers
- right detail panels are justified only when they answer object meaning faster than a separate page or inspector
- second-layer detail should always read after object meaning, not in parallel with it
- `Backup / Migration` must keep all workflow-critical state inside the workflow spine
- low-priority history or recent-operations regions may remain visible only if they do not compete with the active workflow body

## 3. Assets / Routed-In From Sessions

### 3.1 Page Goal

- preserve the session-derived route reason
- let the user confirm the correct subtype and selected object
- keep object understanding primary
- place project-specific usage below, not beside, core object understanding

### 3.2 Recommended Layout Direction

Recommended direction:

- wide primary table column
- medium right detail panel
- full-width second-layer usage row

Reason:

- the routed entry is still an asset task, not a session task
- the user must stabilize subtype and object first
- provenance must be visible in the main detail panel
- in-effect / usage must read as downstream interpretation

### 3.3 Detailed Low-Fi Structure

```text
+----------------------------------------------------------------------------------------------------------------+
| GLOBAL TOP BAR                                                                                                 |
| Project: <current project>                   [Overview] [Sessions] [Assets] [Analysis] [Backup/Migration]     |
| Search.................................................................................................. [/]   |
+----------------------------------------------------------------------------------------------------------------+
| HEADER                                                                                                         |
| Assets                                                                                                         |
| [From Sessions: reviewing session-derived asset candidate] [Return to Session]                                 |
+----------------------------------------------------------------------------------------------------------------+
| SUBTYPE + SCOPE HEADER                                                                                         |
| Subtype: [Rules*] [Memory] [Skills] [Commands]      Scope: [Project*] [User] [Global]                         |
| Filters: source=session-derived | status=active | provenance=present                                           |
+----------------------------------------------------------------------------------------------------------------+
| SUMMARY STRIP                                                                                                  |
| Asset Summary: 14 rules in scope | 3 session-derived | 2 stale | 5 in effect                                  |
+----------------------------------------------------------------------------------------------------------------+
| MAIN CONTENT                                                                                                   |
| +------------------------------------------------------------------+  +--------------------------------------+ |
| | PRIMARY COLUMN                                                   |  | RIGHT DETAIL PANEL                   | |
| | Asset Inventory Table                                             |  | Selected Asset                        | |
| | ---------------------------------------------------------------- |  | ------------------------------------ | |
| | > Session backup naming convention                               |  | Name                                 | |
| |   Import validation threshold                                    |  | Subtype                              | |
| |   Provenance retention rule                                      |  | Scope / Source / Status              | |
| |   Source-backup opt-in                                           |  | Provenance summary                   | |
| |                                                                  |  | Session linkage                      | |
| | [Sort] [Filter] [Change selection]                               |  | [Open Source Session] [Open Analysis]| |
| +------------------------------------------------------------------+  +--------------------------------------+ |
+----------------------------------------------------------------------------------------------------------------+
| SECOND-LAYER DETAIL                                                                                             |
| +----------------------------------------------------------------------------------+  +----------------------+ |
| | In-Effect / Usage                                                                |  | Asset Actions        | |
| | -------------------------------------------------------------------------------- |  | -------------------- | |
| | In effect: yes                                                                   |  | [Send to Backup]     | |
| | Applies to: backup and bundle prep workflows                                     |  | [Archive]            | |
| | Used by: current project rule set                                                |  |                      | |
| +----------------------------------------------------------------------------------+  +----------------------+ |
+----------------------------------------------------------------------------------------------------------------+
```

### 3.4 Primary vs Secondary Relationship

Primary order:

1. routed cue
2. subtype and scope
3. table selection
4. object understanding in right detail
5. in-effect / usage in second layer

Secondary order:

- summary strip
- return-to-origin action
- asset actions

The crucial boundary is:

- `Asset Detail Panel` answers "what is this object?"
- `In-Effect / Usage` answers "how does it matter in this project?"

Those answers should not merge into one panel.

### 3.5 Cue Placement

Use:

- compact routed cue in the header
- provenance cue inside the right detail panel
- in-effect cue inside the second-layer usage module

Do not use:

- page-level banner by default
- provenance hidden in a secondary inspector

Reason:

- the routed task is important but object-local
- provenance changes trust in the selected asset and therefore belongs in the object understanding layer

### 3.6 CTA Concentration

Primary CTA zone:

- right detail panel

Reason:

- after a routed entry, the most important actions follow object confirmation

Secondary CTA zone:

- second-layer `Asset Actions`

Reason:

- outbound workflow actions should come after object meaning and usage are understood

### 3.7 Compression / Density Choices

Keep large:

- table column
- right detail panel top region

Keep compact:

- routed cue
- summary strip
- asset actions

Do not compress too far:

- provenance block in detail
- session linkage block

Those two areas are the main reason this state exists.

### 3.8 Likely Remaining Layout Tensions

- whether the right detail panel is wide enough for provenance plus session linkage without becoming vertically dense
- whether `Asset Actions` should live beside or below the second-layer usage block once real copy exists

### 3.9 Recommended Layout Direction

Recommended direction:

- keep `Asset Actions` beside the second-layer usage block only while actions stay short
- if action copy grows, stack `Asset Actions` below the usage block rather than stealing width from object detail

This preserves the page's main reading order.

## 4. Backup / Migration / Validation

### 4.1 Page Goal

- make the active workflow unmistakable
- keep validation as the dominant center of the page
- preserve enough recent-operation visibility without letting history compete with the current workflow

### 4.2 Recommended Layout Direction

Recommended direction:

- two-line sticky workflow bar
- single dominant workflow column
- compact recent-operations strip below

Reason:

- validation is step-heavy and benefits from a clear workflow identity line plus a separate step line
- a single-column workflow body avoids split attention between validation and side utilities
- recent operations should remain visible but clearly peripheral

### 4.3 Detailed Low-Fi Structure

```text
+----------------------------------------------------------------------------------------------------------------+
| GLOBAL TOP BAR                                                                                                 |
| Project: <current project>                   [Overview] [Sessions] [Assets] [Analysis] [Backup/Migration]     |
| Search.................................................................................................. [/]   |
+----------------------------------------------------------------------------------------------------------------+
| HEADER                                                                                                         |
| Backup / Migration                                                                                             |
| [From Assets: continue migration preview for selected asset]                                                   |
+----------------------------------------------------------------------------------------------------------------+
| STICKY WORKFLOW BAR                                                                                            |
| Workflow: [Session Backup] [Import] [Validate Package] [Migration Preview*] [Project Bundle]                  |
| Active workflow: Migration Preview                     Step: Validation                     [Cancel] [Back]     |
+----------------------------------------------------------------------------------------------------------------+
| WORKFLOW COLUMN                                                                                                |
| +------------------------------------------------------------------------------------------------------------+ |
| | Workflow Context Summary                                                                                   | |
| | ---------------------------------------------------------------------------------------------------------- | |
| | Object set: 1 selected rule                                                                               | |
| | Intent: validate portability before preview                                                                | |
| | Origin: Assets / selected asset                                                                            | |
| +------------------------------------------------------------------------------------------------------------+ |
| +------------------------------------------------------------------------------------------------------------+ |
| | Workflow Steps                                                                                             | |
| | Select ---- Configure ---- [Validate] ---- Confirm ---- Run ---- Result                                    | |
| +------------------------------------------------------------------------------------------------------------+ |
| +------------------------------------------------------------------------------------------------------------+ |
| | Validation Panel                                                                                           | |
| | ---------------------------------------------------------------------------------------------------------- | |
| | Validation state: warnings require review                                                                  | |
| |                                                                                                            | |
| | Warnings                                                                                                   | |
| | - incomplete provenance on one derived rule                                                                | |
| |                                                                                                            | |
| | Blocking checks                                                                                            | |
| | - none                                                                                                     | |
| |                                                                                                            | |
| | Follow-up actions                                                                                          | |
| | [Open Asset] [Review in Analysis] [Continue Anyway] [Return to Configure]                                  | |
| +------------------------------------------------------------------------------------------------------------+ |
+----------------------------------------------------------------------------------------------------------------+
| LOW-PRIORITY REGION                                                                                            |
| Recent Operations: migration preview x1 | session backup x3 | import x1                               [Open]  |
+----------------------------------------------------------------------------------------------------------------+
```

### 4.4 One-Line vs Two-Line Sticky Workflow Bar

Two-line is recommended.

Why not one-line:

- one-line makes workflow family, active workflow, step, and secondary controls compete for the same width
- validation state is already dense in the main body; the sticky bar should reduce ambiguity, not add it

Why two-line works better:

- line 1 establishes workflow family
- line 2 establishes active workflow and current step
- this keeps the bar informative without making it visually heavy

### 4.5 Primary vs Secondary Relationship

Primary region:

- workflow column
- especially the `Validation Panel`

Secondary region:

- workflow context summary
- recent operations strip

The page should clearly read:

- current workflow first
- current validation decision second
- past operations last

### 4.6 Cue Placement

Use:

- compact origin cue in the header
- workflow cue in sticky workflow bar
- validation and warning cues inside the validation panel

Do not use:

- floating validation banner detached from the workflow body
- large history/status banner below the fold

Reason:

- validation is part of this workflow, not a global project message

### 4.7 CTA Concentration

Primary CTA zone:

- bottom section of `Validation Panel`

Reason:

- decision actions should live where the warning and validation evidence is visible

Do not distribute primary CTAs to:

- header
- recent operations strip
- workflow selector line

### 4.8 Compression / Density Choices

Keep large:

- validation panel

Keep compact:

- header origin cue
- workflow context summary
- recent operations strip

Do not expand:

- recent operations into a table
- workflow selector into a dashboard-like control bar

### 4.9 Likely Remaining Layout Tensions

- whether the workflow context summary can stay one card without becoming too dense once more copy exists
- whether warning and blocking sections should be stacked or partially tabbed in a later low-fi round

### 4.10 Recommended Layout Direction

Recommended direction:

- keep validation page body single-column
- keep sticky workflow bar two-line
- keep recent operations as a single compact strip, not a card list

This best preserves workflow-first behavior.

## 5. Backup / Migration / Result

### 5.1 Page Goal

- make the produced result clearly dominant
- keep the workflow identity visible long enough to explain what produced the result
- provide return and next-step actions without turning the page into a result dashboard or history browser

### 5.2 Recommended Layout Direction

Recommended direction:

- keep the same two-line sticky workflow bar
- keep a compact header completion cue, but lighter than the result panel
- let the result panel dominate the workflow column
- keep recent operations compact and low

Reason:

- the result should be the center of gravity
- the user still needs a light sense of completion and return path
- the page should remain the endpoint of a workflow, not the start of unrelated browsing

### 5.3 Detailed Low-Fi Structure

```text
+----------------------------------------------------------------------------------------------------------------+
| GLOBAL TOP BAR                                                                                                 |
| Project: <current project>                   [Overview] [Sessions] [Assets] [Analysis] [Backup/Migration]     |
| Search.................................................................................................. [/]   |
+----------------------------------------------------------------------------------------------------------------+
| HEADER                                                                                                         |
| Backup / Migration                                                                                             |
| [Completed: migration preview generated] [Return to Origin]                                                    |
+----------------------------------------------------------------------------------------------------------------+
| STICKY WORKFLOW BAR                                                                                            |
| Workflow: [Session Backup] [Import] [Validate Package] [Migration Preview*] [Project Bundle]                  |
| Active workflow: Migration Preview                     Step: Result                         [Start New Run]     |
+----------------------------------------------------------------------------------------------------------------+
| WORKFLOW COLUMN                                                                                                |
| +------------------------------------------------------------------------------------------------------------+ |
| | Workflow Context Summary                                                                                   | |
| | ---------------------------------------------------------------------------------------------------------- | |
| | Object set: 1 selected rule                                                                               | |
| | Origin: Assets / selected asset                                                                            | |
| +------------------------------------------------------------------------------------------------------------+ |
| +------------------------------------------------------------------------------------------------------------+ |
| | Workflow Steps                                                                                             | |
| | Select ---- Configure ---- Validate ---- Confirm ---- Run ---- [Result]                                    | |
| +------------------------------------------------------------------------------------------------------------+ |
| +------------------------------------------------------------------------------------------------------------+ |
| | Result Panel                                                                                                | |
| | ---------------------------------------------------------------------------------------------------------- | |
| | Output: migration preview created                                                                          | |
| | Summary:                                                                                                   | |
| | - 1 asset mapped cleanly                                                                                   | |
| | - 1 provenance warning retained                                                                            | |
| |                                                                                                            | |
| | Next actions                                                                                               | |
| | [Inspect Preview] [Open Asset] [Return to Origin] [Back to Overview]                                       | |
| +------------------------------------------------------------------------------------------------------------+ |
+----------------------------------------------------------------------------------------------------------------+
| LOW-PRIORITY REGION                                                                                            |
| Recent Operations: migration preview x2 | session backup x3 | import x1                               [Open]  |
+----------------------------------------------------------------------------------------------------------------+
```

### 5.4 Result Panel Dominance

The result panel must dominate the page.

That means:

- it takes the largest body region
- it contains both outcome summary and next-step CTAs
- it makes recent operations visually and structurally secondary

### 5.5 Header Completion Cue

A compact header completion cue is still useful.

Keep it only if:

- it remains lighter than the result panel
- it primarily supports orientation and return

It should not:

- duplicate full result content
- compete with the result panel headline

If later low-fi testing shows redundancy, this cue can be reduced to a smaller completion strip without changing the underlying structure.

### 5.6 Primary vs Secondary Relationship

Primary region:

- result panel

Secondary regions:

- workflow context summary
- recent operations strip

The page should read:

- result now
- workflow provenance second
- history later

### 5.7 Cue Placement

Use:

- completion cue in header
- result cue in result panel
- warning cue inside result panel only if it still affects trust in the output

Do not use:

- large additional banner below the sticky workflow bar
- history-oriented cue that re-centers the page on prior runs

### 5.8 CTA Concentration

Primary CTA zone:

- result panel

Reason:

- the user's next action is determined by what the workflow produced

Secondary CTA zone:

- header `Return to Origin`

Reason:

- return is useful, but should not outrank understanding the result

### 5.9 Compression / Density Choices

Keep large:

- result panel

Keep compact:

- completion cue
- workflow context summary
- recent operations strip

Do not expand:

- recent operations into a list of cards
- completion cue into a second result summary

### 5.10 Likely Remaining Layout Tensions

- whether `Start New Run` belongs in the sticky workflow bar or should move lower once real copy exists
- whether the compact header completion cue remains useful after a denser result panel is tested

### 5.11 Recommended Layout Direction

Recommended direction:

- keep the result panel as the unquestioned center of gravity
- keep completion cue compact
- keep recent operations as a single-line or near-single-line strip

This preserves the page as the endpoint of a workflow rather than a multi-purpose operations hub.

## 6. Structured Conclusions

### 6.1 Stable Enough To Advance

The following now appear stable enough to move into a denser low-fi round:

- `Assets / routed-in from Sessions`
- `Backup / Migration / validation`
- `Backup / Migration / result`

Reasons:

- each state now has a clear primary zone
- cues are attached to the right level of the page
- CTA concentration is no longer ambiguous
- recent/history regions remain subordinate

### 6.2 Still Worth Pressure-Testing

These are the main remaining layout risks:

- `Assets`
  - vertical density of right detail once provenance and session linkage copy grows
- `Backup / Migration / validation`
  - whether context summary plus workflow steps plus validation panel feels too stacked before real content is trimmed
- `Backup / Migration / result`
  - whether the compact completion cue still adds value once the result panel is visually established

### 6.3 Is Another Local Convergence Pass Needed?

One small local convergence pass may still be useful for:

- `Assets / routed-in from Sessions`
  - specifically the detail versus second-layer split
- `Backup / Migration / result`
  - specifically the exact role of header completion cue versus result panel headline

But this is now local refinement, not structural uncertainty.

### 6.4 What Should Happen Next

It is now reasonable to choose one of two next steps:

1. start `Sessions / Analysis` low-fi
2. prepare a Figma-friendly low-fi prompt from the already-stable phase-1 pages

Recommendation:

- do one more light visual-structure pass on `Assets / routed-in from Sessions` and `Backup / Migration / result`
- then move to `Sessions / Analysis`

Reason:

- the current three states are already coherent enough
- `Sessions` and `Analysis` are the next highest-risk pages for phase-1 product coherence
