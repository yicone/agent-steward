# Product Positioning and IA

Updated: 2026-04-11

This document records the current product-positioning and information-architecture decisions for the next phase of `agent-steward`.

It is intentionally about UX architecture and product scope, not high-fidelity UI or visual design.

Primary references:

- [glossary.md](./glossary.md)
- [research-agent-context-product-landscape.md](./research-agent-context-product-landscape.md)
- [research-cross-agent-management-tools.md](./research-cross-agent-management-tools.md)
- [research-session-backup.md](./research-session-backup.md)
- [architecture-review-v1.md](./architecture-review-v1.md)

## 1. Status

The current shipped product is still best described as a local-first session viewer and diagnostics tool.

For the next phase, the working direction is no longer:

- session-first viewer

The current internal working name is:

- `Project Agent Context Steward`

This is an internal product-direction label, not a final public brand name.

## 2. Core Product Decision

### 2.1 Product Subject

The primary subject is:

- `Project`

The product should not be led by:

- `Session`
- `Asset`
- `Backup`

`Sessions` remain important, but they are a strong project sub-area rather than the overall product subject.

### 2.2 Product Promise

The current product promise is:

- understanding
- governance
- migration

Working product definition:

> A local-first product for understanding, governing, and migrating project-scoped agent context.

### 2.3 Why `Steward`, not `Cockpit`

`Cockpit` implies a broad control surface or total operational console.
That wording suggests a heavier product that may be expected to manage the full agent workflow or runtime control plane.

`Steward` is intentionally lighter.
It emphasizes:

- visibility
- maintenance
- lifecycle clarity
- provenance
- portability

It does not promise a full agent operations console.

## 3. Scope Boundary

### 3.1 What `Project-Scoped Agent Context` Means

`Project-scoped agent context` is the subset of project information that directly shapes, explains, or preserves agent work in that project.

It includes first-class context assets such as:

- sessions
- rules
- memory
- skills
- commands

It also includes the project-level states and relationships around those assets, such as:

- in-effect status
- provenance
- scope
- conflicts
- staleness
- migration state

### 3.2 What It Does Not Mean

The full codebase is not automatically a first-class context asset.

Code, docs, and repository files are part of the project environment or substrate.
They become first-class context assets only when they are explicitly turned into agent-relevant objects, for example:

- a repository file is used as a rule source
- a document is extracted into reusable memory
- a project command template is formalized as a command asset

This boundary is important because the product is not trying to become:

- a full repository knowledge manager
- a generic retrieval platform
- a code search system
- a runtime orchestration platform

## 4. Strategic Positioning

### 4.1 Recommended Position

The recommended position is:

- project-first
- local-first
- multi-agent
- focused on agent context governance

### 4.2 What It Should Not Compete As

The product should not define itself primarily as:

- the strongest session browser
- the strongest rules sync tool
- the strongest retrieval infrastructure
- a general cloud team memory platform

### 4.3 Why This Direction

This direction preserves the current session-reading and diagnostics strengths while creating room for:

- reusable context assets
- project-level analysis
- backup and migration

It also avoids making `Sessions` the whole product identity.

## 5. IA Decisions

### 5.1 Default Landing Page

The default landing page is:

- `Project Overview`

The product homepage should not directly reuse the current viewer layout of:

- session list
- transcript center
- inspector panel

That structure belongs to `Sessions`, not to the whole product.

### 5.2 Top-Level Navigation

The current top-level IA is:

- `Project Overview`
- `Sessions`
- `Assets`
- `Analysis`
- `Backup / Migration`

### 5.3 Why `Assets` Stays Aggregated

`Assets` remains a single top-level page for now.

Its four fixed sub-areas are:

- `Rules`
- `Memory`
- `Skills`
- `Commands`

This keeps the navigation lighter and acknowledges that these four object types share a common asset model:

- scope
- source
- status
- provenance
- in-effect usage

They can be separated later if one category becomes meaningfully larger or more behaviorally distinct.

### 5.4 Layering of Key Objects

Recommended hierarchy:

- `Project Overview`
  - project summary and routing
- `Sessions`
  - evidence and activity history
- `Assets`
  - reusable context assets
  - `Rules`
  - `Memory`
  - `Skills`
  - `Commands`
- `Analysis`
  - interpretation and health
- `Backup / Migration`
  - preservation, portability, and restore-oriented workflows

### 5.5 `Global Assets`

`Global Assets` should not exist as a separate top-level navigation item.

It should exist inside `Assets` as a scope view or filter, aligned with the glossary's canonical scope values:

- `global`
- `user`
- `project`

### 5.6 Search

`Search` should be a global entry point.

Reason:

- users will search across sessions and reusable assets
- a page-local search model would fragment the product
- local filters still belong inside each page, but search itself should be global

## 6. Page-Level IA Draft

### 6.0 Project Overview Must Answer

`Project Overview` is the product's default landing page, so it must answer a small set of high-value project questions quickly.

It should answer:

- what agent-relevant context exists in this project right now
- what is currently in effect
- what changed recently
- what needs attention
- where the user should go next

It should not try to answer:

- the full readable content of a session
- the full editable surface for every asset
- all migration and restore operations

If `Project Overview` fails to answer those first five questions, it will collapse back into either:

- a weak dashboard shell
- a disguised session homepage

### 6.1 Project Overview

Goal:

- answer the current state of the project's agent context
- route the user to the right next page

Suggested structure:

- Context Snapshot
- In-Effect Assets
- Recent Sessions
- Attention Needed
- Quick Actions

Recommended page pattern:

- overview

Primary entry conditions:

- the user opens a project
- the user wants a project-level summary before drilling down
- the user needs triage rather than full detail

Primary next routes:

- to `Sessions` when recent activity or evidence needs inspection
- to `Assets` when reusable context needs review or cleanup
- to `Analysis` when health, conflict, or staleness is the question
- to `Backup / Migration` when preservation or portability is the task

### 6.2 Sessions

Goal:

- browse, understand, and diagnose session evidence

Suggested structure:

- All Sessions
- Recent / Active
- Chains / Continuations
- Session Detail

Recommended page pattern:

- three-column workbench

Suggested workbench layout:

- left: session list, chains, filters
- center: transcript, trajectory, reading modes
- right: inspector, error center, provenance

Primary entry conditions:

- the user is investigating what happened
- the user needs readable session detail
- the user needs trajectory, errors, or execution evidence
- the user wants to compare or resume session history

Primary next routes:

- to `Analysis` when the question becomes cross-session or health-oriented
- to `Assets` when session evidence should become a reusable asset
- to `Backup / Migration` when a session should be preserved or exported

### 6.3 Assets

Goal:

- manage reusable context assets and understand how they apply to the project

Second-level pages:

- Rules
- Memory
- Skills
- Commands

Suggested per-page structure:

- Inventory
- Detail
- Usage / In-Effect
- Provenance / Scope

Recommended page pattern:

- overview plus table/detail

Primary entry conditions:

- the user wants to inspect reusable context assets
- the user wants to understand scope, provenance, or in-effect status
- the user wants to clean up stale, duplicate, or conflicting assets
- the user wants to prepare assets for migration

Primary next routes:

- to `Project Overview` when the user needs the broader project picture
- to `Analysis` when the question becomes systemic rather than object-level
- to `Backup / Migration` when preservation, packaging, or transfer is needed

### 6.4 Analysis

Goal:

- explain issues and health signals across the project's agent context

Suggested structure:

- Context Health
- Conflicts
- Stale / Orphaned
- Duplicates / Reuse
- Provenance / Coverage

Recommended page pattern:

- overview plus table

Primary entry conditions:

- the user asks "what is wrong" rather than "what is this"
- the user needs health signals across multiple sessions or asset types
- the user needs to triage conflicts, staleness, duplication, or weak coverage

Primary next routes:

- to `Sessions` for evidence review
- to `Assets` for object-level correction
- to `Backup / Migration` if the next step is portability or preservation work

### 6.5 Backup / Migration

Goal:

- preserve, package, import, validate, and migrate project-scoped agent context

Suggested structure:

- Session Backup
- Project Bundle
- Import
- Migration Preview
- Restore / Validate

Recommended page pattern:

- wizard plus table

Primary entry conditions:

- the user wants to preserve important sessions
- the user wants to package or move project-scoped agent context
- the user wants to import prior backups or external assets
- the user wants restore validation before trusting a backup or bundle

Primary next routes:

- to `Project Overview` after the operation completes
- to `Sessions` when the operation is session-specific
- to `Assets` when the operation targets reusable assets
- to `Analysis` when verification reveals health or compatibility issues

## 7. UX Architecture Rules

For the current phase:

- prioritize UX architecture over visual design
- do not start from the existing viewer as the homepage template
- do not let the product scope expand to the entire codebase by default
- treat `Sessions` as a strong first-class page, not the whole product identity
- treat `Assets` as the reusable context layer
- treat `Analysis` as the interpretation layer
- treat `Backup / Migration` as the portability layer

## 8. Global Routing Logic

The top-level pages should feel like different answers to different user questions.

Recommended mapping:

- `Project Overview`
  - "What is the state of this project's agent context?"
- `Sessions`
  - "What happened?"
- `Assets`
  - "What reusable context exists here, and how does it apply?"
- `Analysis`
  - "What is wrong, risky, stale, duplicated, or missing?"
- `Backup / Migration`
  - "How do I preserve, move, import, or validate this context?"

This distinction matters because it prevents top-level pages from collapsing into one another.
In particular:

- `Project Overview` should route, not replace
- `Sessions` should evidence, not summarize the whole product
- `Assets` should organize, not impersonate analysis
- `Analysis` should interpret, not become a second inventory
- `Backup / Migration` should execute bounded workflows, not become a generic tools drawer

## 9. Open Follow-Ups

The following questions remain open for later design work:

- whether `Projects` needs its own project-switching home in a future multi-project experience
- whether `Memory` should later be split into narrower subtypes
- whether any asset class should graduate from `Assets` into a top-level page
- whether `Project Bundle` should become the formal cross-asset package name in user-facing UX
- how much editing and syncing capability belongs in `Assets` v1 versus later iterations
