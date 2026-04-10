# Page Block IA

Updated: 2026-04-11

This document defines the block-level IA for the current top-level product structure of `Project Agent Context Steward`.

It is limited to:

- page goals
- page modes
- core modules
- module responsibilities
- routing relationships

It does not define:

- visual design
- high-fidelity UI
- implementation details
- component library choices

Primary references:

- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [glossary.md](./glossary.md)
- [research-agent-context-product-landscape.md](./research-agent-context-product-landscape.md)
- [research-session-backup.md](./research-session-backup.md)

## 1. Scope and Usage

This document is the next layer below [product-positioning-and-ia.md](./product-positioning-and-ia.md).

It assumes the current top-level IA is already fixed as:

- `Project Overview`
- `Sessions`
- `Assets`
- `Analysis`
- `Backup / Migration`

This document should be used to:

- define page-level module structure before wireframes
- keep page responsibilities distinct
- avoid falling back into a session-first homepage
- keep `Assets` aggregated
- keep `Backup / Migration` workflow-oriented

## 2. Cross-Page Modules

### 2.1 Global Search Entry

- Goal: search across sessions and reusable assets from any page.
- Type: navigation
- Input data: indexed sessions, rules, memory, skills, commands.
- Main actions: open search, narrow by page or asset type, jump to result.
- Default visibility: always visible.
- Routing: can open `Sessions`, `Assets`, `Analysis`, or `Backup / Migration` result targets.

### 2.2 Global Project Switch / Project Identity

- Goal: keep the current project boundary explicit.
- Type: navigation
- Input data: current project metadata, roots, source summary.
- Main actions: switch project, inspect project identity, open project overview.
- Default visibility: always visible.
- Routing: routes back to `Project Overview`.

### 2.3 Shared Filter Bar

- Goal: provide consistent filtering semantics across inventory-style pages.
- Type: navigation
- Input data: scope, source, status, time, asset type.
- Main actions: filter, clear filters, save filter state.
- Default visibility: visible on `Sessions`, `Assets`, `Analysis`, and only inside workflow-scoped tables in `Backup / Migration`.
- Routing: local state only; may open search.

For `Backup / Migration`, this bar is not a page-global browsing control.
It may only appear inside workflow-scoped selection or history tables.

### 2.4 Inspector

- Goal: show structured detail for a selected object without changing pages.
- Type: detail
- Input data: selected session, asset, finding, or backup item.
- Main actions: inspect raw fields, copy IDs, inspect provenance, jump to source page.
- Default visibility: contextual, not global.
- Routing: often links to `Sessions`, `Assets`, or `Backup / Migration`.

### 2.5 Provenance Panel

- Goal: explain where an object came from and how it was derived.
- Type: detail
- Input data: source, scope, derivation, sync origin, extraction origin.
- Main actions: inspect origin, open related session or asset, inspect in-effect relationship.
- Default visibility: contextual.
- Routing: usually links between `Sessions`, `Assets`, and `Analysis`.

### 2.6 Validation State

- Goal: expose health or validity status for risky actions and derived objects.
- Type: summary
- Input data: validation results, compatibility checks, import checks, backup verification.
- Main actions: inspect problems, retry validation, route to fix location.
- Default visibility: contextual.
- Routing: often routes to `Analysis`, `Assets`, or `Backup / Migration`.

### 2.7 Quick Actions

- Goal: provide high-value next steps from the current page or object.
- Type: workflow
- Input data: current selection and page context.
- Main actions: inspect, review, back up, import, migrate, promote to asset.
- Default visibility: contextual.
- Routing: routes between all top-level pages.

## 3. Project Overview

### 3.1 Page Definition

- Page goal: summarize the current state of project-scoped agent context and route the user to the right next page.
- Page mode: overview.

### 3.2 Core Modules

#### Project Header

- Goal: establish project identity and current scope.
- Type: navigation
- Input data: project name, roots, sources, last updated state.
- Main actions: open project settings, inspect roots, switch project.
- Default visibility: always visible.
- Routing: project-level actions; can open `Backup / Migration` for project bundle work.

#### Context Snapshot

- Goal: answer what context exists now.
- Type: summary
- Input data: counts and health summaries for sessions and assets.
- Main actions: open the relevant page for the clicked category.
- Default visibility: always visible.
- Routing: to `Sessions`, `Assets`, `Analysis`.

#### In-Effect Assets

- Goal: show which reusable context assets currently matter for this project.
- Type: summary
- Input data: rules, memory, skills, commands currently in effect.
- Main actions: inspect asset, open asset type page, inspect provenance.
- Default visibility: always visible.
- Routing: to `Assets` and inspector/provenance.

#### Recent Sessions

- Goal: show recent activity without turning the page into a session browser.
- Type: summary
- Input data: recent sessions, recent source activity, recent execution chains.
- Main actions: open session detail, open sessions page, inspect error state.
- Default visibility: always visible.
- Routing: to `Sessions`.

#### Attention Needed

- Goal: surface the highest-priority issues.
- Type: summary
- Input data: stale assets, conflicts, missing provenance, failed validation, backup risk.
- Main actions: inspect issue, route to fix page.
- Default visibility: always visible.
- Routing: to `Analysis`, `Assets`, `Backup / Migration`.

#### Quick Actions

- Goal: support common next steps from project-level triage.
- Type: workflow
- Input data: project context and current health state.
- Main actions: review sessions, clean up assets, run backup, inspect findings.
- Default visibility: always visible.
- Routing: to all major pages.

## 4. Sessions

### 4.1 Page Definition

- Page goal: browse, understand, and diagnose session evidence.
- Page mode: workbench.

### 4.2 Core Modules

#### Session Source Bar

- Goal: scope the session workspace by source, time, status, and chain state.
- Type: navigation
- Input data: session index metadata.
- Main actions: filter by source, time, health, active/recent, continuation chain.
- Default visibility: always visible.
- Routing: local state only.

#### Session List

- Goal: inventory sessions within the current filters.
- Type: inventory
- Input data: session metadata, source, status, title, cwd, timestamps.
- Main actions: select session, pin, compare, open chain.
- Default visibility: always visible.
- Routing: drives detail modules on the same page.

#### Chain / Continuation Strip

- Goal: show relationships between related sessions.
- Type: detail
- Input data: continuation chain or execution relationship metadata.
- Main actions: move across chain, open adjacent session.
- Default visibility: conditional when chain data exists.
- Routing: same page session switching.

#### Session View

- Goal: provide the main readable session surface.
- Type: detail
- Input data: transcript, trajectory, compact or markdown views.
- Main actions: switch view, inspect event, jump to execution group, open search in session.
- Default visibility: always visible when a session is selected.
- Routing: can route to inspector and provenance.

#### Error Center

- Goal: concentrate error-like events into a navigable surface.
- Type: detail
- Input data: normalized error events, status failures, command failures.
- Main actions: jump to event, inspect payload, route to backup if preservation is needed.
- Default visibility: conditional when a session is selected.
- Routing: within page; may route to `Backup / Migration`.

#### Session Inspector

- Goal: inspect selected session event or message.
- Type: detail
- Input data: selected event/message plus raw normalized structure.
- Main actions: inspect raw fields, copy IDs, inspect provenance.
- Default visibility: conditional on selection.
- Routing: to provenance panel, `Assets`, or `Analysis`.

#### Session Actions

- Goal: expose session-specific workflows.
- Type: workflow
- Input data: selected session and current view state.
- Main actions: back up session, export session, inspect diagnostic data, promote useful material to assets.
- Default visibility: visible when a session is selected.
- Routing: to `Backup / Migration` and `Assets`.

## 5. Assets

### 5.1 Page Definition

- Page goal: manage reusable context assets and understand how they apply to the current project.
- Page mode: overview plus table.

### 5.2 Core Modules

#### Asset Scope Header

- Goal: make the aggregation model explicit across Rules, Memory, Skills, and Commands.
- Type: navigation
- Input data: current asset subtype, scope, source, status.
- Main actions: switch subtype, switch scope, filter by source/status.
- Default visibility: always visible.
- Routing: local state only.

When the page is entered from `Sessions` through a routed promote-to-asset flow, `Asset Scope Header` is the first landing owner of subtype handoff.
It is responsible for making the routed subtype explicit before `Asset Detail Panel` takes over object confirmation.

#### Asset Summary

- Goal: summarize inventory and health before deep inspection.
- Type: summary
- Input data: counts by type, scope, status, in-effect, stale/conflicted.
- Main actions: open filtered inventory state, inspect problematic class.
- Default visibility: always visible.
- Routing: same page filtered states; may route to `Analysis`.

#### Asset Inventory Table

- Goal: list reusable assets in the current subtype and filters.
- Type: inventory
- Input data: rules, memory, skills, or commands metadata.
- Main actions: sort, filter, select row, compare entries.
- Default visibility: always visible.
- Routing: drives detail panel.

#### Asset Detail Panel

- Goal: explain a selected asset clearly.
- Type: detail
- Input data: selected asset body, metadata, scope, status, linked usage.
- Main actions: inspect body, inspect applicability, inspect provenance, open linked session.
- Default visibility: visible when an asset is selected.
- Routing: to `Sessions`, `Analysis`, provenance panel.

#### In-Effect / Usage Module

- Goal: show where and how an asset matters in this project.
- Type: detail
- Input data: in-effect mappings, linked sessions, project references, target compatibility.
- Main actions: inspect usage, route to related session, inspect conflict.
- Default visibility: conditional on asset selection.
- Routing: to `Sessions` and `Analysis`.

#### Asset Actions

- Goal: support bounded asset workflows without turning the page into a generic editor.
- Type: workflow
- Input data: current asset and scope.
- Main actions: import, prepare migration, inspect canonical source, archive, back up.
- Default visibility: contextual.
- Routing: to `Backup / Migration`.

## 6. Analysis

### 6.1 Page Definition

- Page goal: interpret project context health and route the user to corrective action.
- Page mode: overview plus table.

### 6.2 Core Modules

#### Analysis Header

- Goal: scope the analysis view by issue class and object type.
- Type: navigation
- Input data: findings index and current filters.
- Main actions: switch issue class, filter by source/scope/status/object type.
- Default visibility: always visible.
- Routing: local state only.

#### Context Health Summary

- Goal: answer how healthy the project's agent context is.
- Type: summary
- Input data: stale/conflicted/orphaned/duplicate/incomplete signals.
- Main actions: drill into issue class, inspect affected area.
- Default visibility: always visible.
- Routing: to Findings Table.

#### Findings Table

- Goal: provide the working inventory of issues.
- Type: inventory
- Input data: findings across sessions and assets.
- Main actions: sort, filter, select finding, group by issue type or object type.
- Default visibility: always visible.
- Routing: drives finding detail.

#### Finding Detail

- Goal: explain one problem and its evidence.
- Type: detail
- Input data: selected finding, affected object, evidence links, severity, validation state.
- Main actions: inspect evidence, jump to session, jump to asset, open migration or backup flow if relevant.
- Default visibility: visible when a finding is selected.
- Routing: to `Sessions`, `Assets`, `Backup / Migration`.

#### Recommended Actions

- Goal: convert interpretation into next-step work.
- Type: workflow
- Input data: selected finding or current filtered issue set.
- Main actions: review object, archive stale item, resolve via migration, preserve before risky change.
- Default visibility: contextual.
- Routing: to `Assets`, `Sessions`, `Backup / Migration`.

## 7. Backup / Migration

### 7.1 Page Definition

- Page goal: preserve, package, import, validate, and migrate project-scoped agent context.
- Page mode: wizard plus table.

### 7.2 Core Modules

#### Workflow Selector

- Goal: make the page feel like a bounded workflow surface rather than a tools drawer.
- Type: navigation
- Input data: supported operations such as session backup, project bundle, import, migration preview, restore validation.
- Main actions: choose workflow.
- Default visibility: always visible.
- Routing: switches workflow state within the page.

#### Workflow Context Summary

- Goal: explain the current operation, selected objects, and current risk/validation state.
- Type: summary
- Input data: current workflow state, selected sessions/assets, compatibility state.
- Main actions: edit selection, inspect validation, open source object.
- Default visibility: always visible once a workflow starts.
- Routing: to `Sessions`, `Assets`, `Analysis`.

#### Selection Table

- Goal: choose the sessions or assets included in the current workflow.
- Type: inventory
- Input data: session records, reusable assets, existing backups, import candidates.
- Main actions: select rows, filter rows, compare candidates.
- Default visibility: visible in selection-driven workflows.
- Routing: local to workflow.

#### Workflow Steps

- Goal: guide the user through bounded multi-step operations.
- Type: workflow
- Input data: workflow type, selected objects, validation state.
- Main actions: configure options, run validation, confirm operation, inspect result.
- Default visibility: always visible during active workflow.
- Routing: may open detail drawers and result states.

#### Validation Panel

- Goal: make trust and compatibility explicit before destructive or portability-related actions.
- Type: detail
- Input data: schema validity, compatibility checks, missing provenance, source backup options, restore checks.
- Main actions: inspect problem, retry validation, route to fix source issue.
- Default visibility: conditional but prominent during risky workflows.
- Routing: to `Analysis`, `Sessions`, `Assets`.

#### Operation Result / History

- Goal: show completed workflow outcomes and enable follow-up inspection.
- Type: detail
- Input data: backup records, import results, migration previews, restore validations.
- Main actions: inspect package contents, open backed-up session, inspect imported asset, rerun validation.
- Default visibility: visible after workflow completion and in history mode.
- Routing: to all relevant source pages.

## 8. Fixed Skeleton vs Conditional Blocks

### 8.1 Fixed Top-Level Skeleton

These should exist as the default page backbone:

- `Project Overview`: Project Header, Context Snapshot, In-Effect Assets, Recent Sessions, Attention Needed, Quick Actions
- `Sessions`: Session Source Bar, Session List, Session View
- `Assets`: Asset Scope Header, Asset Summary, Asset Inventory Table
- `Analysis`: Analysis Header, Context Health Summary, Findings Table
- `Backup / Migration`: Workflow Selector, Workflow Context Summary, Workflow Steps

### 8.2 Conditional Blocks

These should appear only in specific states:

- Chain / Continuation Strip when chain relationships exist
- Error Center when session detail is active
- Session Inspector when an event is selected
- Asset Detail Panel when an asset is selected
- In-Effect / Usage Module when asset applicability data exists
- Finding Detail when a finding is selected
- Selection Table when the current workflow requires explicit object selection
- Validation Panel during validation-heavy workflows
- Operation Result / History after a workflow runs or when viewing past operations

### 8.3 Deferred Extensions

These are valid later additions, not required for the first block-level IA baseline:

- saved cross-page views
- comparative session diffing
- asset-to-target adapter preview
- deeper citation trails for memory and rule derivation
- richer restore simulation for project bundles
- bulk remediation flows from analysis findings
