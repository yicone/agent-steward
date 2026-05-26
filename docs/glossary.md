# Glossary

This document defines the canonical terminology for `agent-steward` as the product evolves from a session-first browser into a project-first agent context cockpit.

Its goal is to reduce ambiguity across product discussions, design work, code, and docs.

## Purpose

Use this glossary to standardize:

- product naming
- UI labels
- data-model vocabulary
- backup / export / import / migration language
- viewer semantics

This document is the canonical terminology baseline.
Specialized docs may define narrower behavior, but should reuse these terms instead of inventing parallel names.

Primary related docs:

- [README.md](../README.md)
- [architecture-review-v1.md](./architecture-review-v1.md)
- [trajectory-view.md](./viewer/trajectory-view.md)
- [agent-ui-ux-optimization.md](./viewer/agent-ui-ux-optimization.md)

## Usage Rules

- Prefer the terms in this document in product copy, specs, and design work.
- Reuse existing terms when possible; do not introduce near-synonyms without a clear reason.
- If a term has a UI label and an internal model name, document both.
- If a term becomes obsolete, move it to `Deprecated / Avoided Terms` instead of silently redefining it.
- When a term is intentionally broad, note what it does not include.

## Product Terms

### Agent Context

The information that shapes an agent's behavior for a project or task.

Examples:

- sessions
- rules
- memory
- skills
- commands

Use when describing the overall problem domain.
Do not use as a synonym for only prompts or only memory.

### Project Context

The subset of agent context that is relevant to one project.

This is the preferred top-level product concept for the new direction.

### Project

The primary organizational container for context assets associated with the same local codebase or explicitly defined line of work.

UI meaning:

- top-level navigation object
- home for overview, sessions, rules, memory, skills, commands, analysis, and backup / migration

### Project Overview

The default landing page for a project.

It summarizes what context exists, what is active, what is stale or conflicted, and what needs attention.

Prefer this term over generic labels like `dashboard` or `home`.

### Local-First

A product principle meaning the tool works primarily against local data and local runtime interfaces, without requiring cloud sync for core functionality.

Use this as a product principle, not as a page or feature label.

### Context Cockpit

A historical or strategic product metaphor for the project-level control surface.

Meaning:

- inspect
- search
- analyze
- migrate

Use in product strategy discussions when discussing the broader design space.
Avoid using it as a hard UI label unless design explicitly chooses it.
Current internal working direction uses `Project Agent Context Steward` rather than `Context Cockpit` as the primary framing.

### Context Governance

The act of understanding, organizing, validating, and maintaining context assets over time.

Use this term when discussing analysis, conflict detection, stale assets, lifecycle, and migration.

## Asset Model Terms

### Context Asset

A first-class unit of project context managed by the product.

Canonical asset types:

- Session
- Rule
- Memory
- Skill
- Command

Use this as the umbrella term for product and model discussions.

### Project Context Asset

A context asset associated with a specific project scope.

Use when the project boundary matters.
This is a correct and useful formal term.

### Reusable Context Asset

A context asset intended to be reused across sessions.

Typical examples:

- rules
- memory
- skills
- commands

This term is useful when distinguishing reusable assets from session history.

### Session Asset

A session treated as a first-class context asset.

Unlike rules, memory, skills, and commands, a session is primarily an activity or evidence asset rather than a reusable policy asset.

Use when it is important to distinguish session-like assets from reusable context assets.

### Session

A recorded agent interaction history.

A session may include:

- user messages
- assistant messages
- tool calls
- commands
- statuses
- errors
- execution groups

Use `session` as the canonical user-facing term.
Avoid mixing with `conversation` unless referring to legacy APIs or source-specific storage details.

### Agent Session

A session associated with a specific agent or agent product.

Examples:

- Codex session
- Claude Code session
- Windsurf session

Use when source attribution matters.

### Session Source

The original source carrier from which a session is read.

Possible forms:

- file, such as `.pb` or `jsonl`
- database record, such as `SQLite`
- local app storage
- local runtime / RPC-readable source

Use this term when referring to the raw source of a session.
Do not assume a session source is always a file.

### Session Record

The product's canonical internal representation of a session, used for indexing, analysis, migration, and backup.

Typical contents:

- metadata
- normalized events
- provenance
- source reference

This is the preferred default object for session backup.

### Session View

A rendered or projected representation of a session intended for reading or analysis.

Examples:

- Transcript
- Trajectory
- Compact
- Markdown

This is a presentation-layer concept, not the canonical backup object.

### Rule

A structured instruction or policy that influences agent behavior.

Rules may exist at different scopes and may be rendered into tool-specific formats.

Examples:

- coding rules
- workflow rules
- project conventions
- tool usage rules

### Memory

Persisted contextual knowledge intended to be reused across sessions.

Examples:

- project facts
- preferences
- known decisions
- workflow habits

Do not use `memory` as a synonym for raw session history.

### Skill

A reusable capability package that an agent can invoke.

Examples:

- local skill instructions
- installed workflow helpers
- domain-specific assistant capabilities

### Command

A reusable terminal or tool action derived from or used in sessions.

Examples:

- shell commands
- resume commands
- project-specific command templates

### Scope

The level at which a context asset applies.

Canonical values:

- `global`
- `user`
- `project`

Use `scope` consistently in UI, model, and migration flows.

### Source

Where an asset came from.

Examples:

- Codex
- Claude Code
- Cursor
- Windsurf
- Antigravity
- imported
- generated

Use `source` for provenance, not for scope.

### Status

The current lifecycle or health state of an asset.

Recommended values:

- `active`
- `stale`
- `conflicted`
- `orphaned`
- `archived`

Use `status` for lifecycle or health, not runtime execution state.

### Provenance

Evidence about where an asset originated and how it was derived.

Examples:

- imported from a rule file
- extracted from a session
- generated from a canonical source
- synced to a target tool

Use this term in analysis, migration, and inspector views.

### Canonical Source

The primary source of truth for a reusable asset, especially rules or skills that can be rendered to multiple targets.

Use this term when discussing sync and generation systems.

### Target Mapping

The mapping from one canonical asset to one or more tool-specific output formats or destinations.

Examples:

- one rule to Codex instructions
- one rule to Claude Code settings
- one skill to multiple agent folders

## Root, Library, and Store Terms

### Asset Root

A configured root location under which a class of assets is discovered or managed.

Use this as the broad umbrella term when the asset type varies.

### Source Root

A configured root location under which raw sources are discovered.

Use when the discovery boundary matters but the asset class is implicit from nearby context.

### Session Source Root

A configured root location under which session sources are discovered.

Examples:

- `~/.codex/sessions`
- `~/.claude/projects`
- `~/.cursor/chats`

This is a formal term and should be preferred over vague labels like `session root`.

### Rule Root

A configured root location under which rule sources are discovered or managed.

Use when rules come from a file-system-backed source or sync target.

### Skill Root

A configured root location under which skills are discovered or managed.

Use when skills exist as file-backed assets.

### Memory Root

A configured root location under which memory assets are discovered.

This term is valid only when memory is file-backed or path-backed.
If memory is primarily database-backed or internal to the product, prefer `Memory Store`.

### Library

A user-facing managed collection of reusable assets.

Examples:

- skill library
- rule library
- global memory library

Prefer `library` when the emphasis is organization and reuse.

### Store

A persistence or storage layer for assets or records.

Examples:

- session store
- memory store
- command store

Prefer `store` when the emphasis is persistence or implementation.

## Viewer Terms

These terms align with the existing viewer docs and should remain stable.

### Viewer

The UI surface used to inspect session content.

In the future product shape, Viewer is primarily associated with the `Sessions` page, not the whole app.

### Inspector

The structured detail panel for a selected item.

It may show:

- raw JSON
- payloads
- fields
- outputs
- provenance
- related assets

Use `Inspector` as the canonical name for the right-side detail surface.

### Transcript

A conversation-centric projection of normalized session events.

Canonical meaning:

- optimized for readability
- emphasizes user and assistant turns
- hides lower-value detail behind summaries or foldouts

Do not use as a synonym for raw source logs.

### Trajectory

A process-centric projection of normalized session events.

Canonical meaning:

- event stream view
- diagnostics and audit
- filters, grouping, and execution analysis

### Compact

A source-specific readability view with lower structural density than Transcript or Trajectory.

Use only where the existing viewer semantics require it.
Do not reuse this term for general layout density elsewhere in the product.

### Markdown

A rendered narrative view derived from source-specific data.

Current meaning in the product:

- an alternate reading view, especially for Antigravity-derived content

### Chat (legacy)

A legacy chat-shaped rendering used for compatibility with older source-specific payloads.

Use only when discussing historical or compatibility behavior.

### Actions

A compact foldout in Transcript that summarizes hidden tool, command, status, or thought events.

This remains a viewer-specific term and should not be reused as a generic label elsewhere.

### Hidden Summary

A fallback UI row that summarizes hidden events when they cannot be attached to a nearby assistant turn.

Viewer-specific term.

### Execution Group

A grouping of events by `executionId` or equivalent execution boundary.

Use when discussing grouped process rendering in Trajectory.

### Error Center

A focused view for navigating error-like events in a session.

Use as the preferred product term instead of generic labels like `error list`.

## Backup, Export, Import, and Migration Terms

### Backup

A preserved copy of assets intended for safekeeping and later recovery.

Use `backup` when the primary goal is preservation.

### Export

A one-way extraction of assets into a portable format.

Use `export` when the output leaves the current system or view.

### Import

Bringing previously external assets into the current system.

Use `import` when data enters the product.

### Migration

Moving or adapting assets across tools, agents, scopes, or projects.

Use `migration` when portability and compatibility are central.

### Session Backup

A preserved copy of a session in the product's portable canonical format.

Unless otherwise stated, this refers to backing up a `Session Record`, not a rendered `Session View`.

Current implementation schema family:

- `session-backup/v1`

### Source Backup

A preserved copy of the original `Session Source` or other original source material.

Use when raw-source preservation matters.

### Session Export

A user-facing exported representation of a session.

Examples:

- Transcript Markdown
- Trajectory JSON
- source copy

Export is not automatically the same thing as backup.

### Project Bundle

A portable package containing some or all context assets for a project.

May include:

- sessions
- rules
- memory
- skills
- commands
- metadata

Recommended canonical term for future backup and migration UX.

### Session Record Schema

The versioned schema family used for canonical `Session Record` serialization.

Current implementation schema family:

- `session-record/v1`

### Resume Workflow

A workflow that reconstructs or reopens an actionable session context for continued work.

Use this term when discussing session continuation or command-based reopening.

### Live Cockpit

A real-time operational surface for active agent sessions.

Use only if the product later adds live-session monitoring.
Do not use it as a synonym for Project Overview.

## Analysis Terms

### Analysis

The product area focused on interpreting context assets and surfacing insights.

Examples:

- stale assets
- duplicate memory
- command reuse
- rule conflicts
- context health

### Context Health

A summary signal describing how healthy a project's context inventory is.

Typical inputs:

- stale assets
- duplication
- conflicts
- orphaned items
- recent usage

Use as a product summary metric, not as a low-level technical metric.

## Naming Rules

Preferred terms:

- `Project` instead of workspace home or dashboard
- `Session` instead of conversation, except where API or storage naming forces it
- `Context Asset` instead of item, object, or resource
- `Inspector` instead of details panel or raw panel
- `Analysis` instead of insights dashboard
- `Backup / Migration` instead of export tools

Preferred UI labels:

- `Sessions`
- `Rules`
- `Memory`
- `Skills`
- `Commands`
- `Analysis`
- `Backup / Migration`

When referring to agent relationships, prefer:

- `Agent-Sourced Asset` for an asset originating from a given agent or tool
- `Agent-Compatible Asset` for an asset usable by a given agent or tool
- `In-Effect Asset` for an asset currently applied in a given context

Avoid broad labels like `Agent Asset` unless they are immediately qualified.

## Deprecated / Avoided Terms

### Agent Storage Manager

The current repository or product name, but increasingly misleading for the future direction.

Reason:

- over-emphasizes storage
- under-emphasizes project context, analysis, and migration

Keep only where needed for repository continuity.

### Conversation

Avoid as the primary product term when referring to the core asset.
Use `Session` unless discussing source-specific APIs or legacy docs.

### Dashboard

Too generic for the intended product meaning.
Prefer `Project Overview` or `Analysis` depending on context.

### Insightor

Avoid as a canonical English product term unless branding explicitly requires it.
Prefer `Inspector`, `Insight`, or `Explorer`.

### Agent Context Asset

Avoid as a formal term.
It is ambiguous between:

- assets used by an agent
- assets originating from an agent

Prefer more specific alternatives such as `Agent-Sourced Asset` or `Agent-Compatible Asset`.

### Agent Asset

Avoid as a formal term.
It is too vague to be stable across product, design, and engineering usage.

### Session File

Avoid as a universal term.
Not all session sources are files.
Prefer `Session Source` or `Session Source File` when the file form matters.

### Root

Avoid using `root` without a type qualifier.
Prefer `Session Source Root`, `Rule Root`, `Skill Root`, or `Asset Root`.

## Open Questions

These terms may need later standardization if the product direction hardens further:

- whether `Memory` should be split into facts, preferences, and notes
- whether `Rule` and `Instruction` both need to exist
- whether `Command` should include non-shell tool actions
- whether `Project Bundle` should be the formal export format name
