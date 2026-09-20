# Agent Work Continuity Design

**Date:** 2026-09-19  
**Status:** Approved design  
**Scope:** Product positioning and experience redesign

## 1. Decision

AgentSteward is repositioned from a project context governance tool to a **local-first continuity layer for agent work**.

The first target user is an individual developer who works across multiple local agents. The first core scenario is handing work from one agent to another. The product must eventually produce a verifiable work package, rather than only a generated prompt or a transcript export.

Working product promise:

> AgentSteward helps individual developers understand, preserve, recover, and hand off agent work across projects and agents.

The product subject is **agent work**. Projects define the boundary, sessions provide evidence, context assets explain what influenced the work, and recovery packages preserve and transfer the work state.

## 2. Problem

The existing product foundations are strong at reading local session history, normalizing trajectories, diagnosing sources, and exposing project-local context. However, a page taxonomy of `Project Overview`, `Sessions`, `Assets`, `Analysis`, and `Backup / Migration` does not by itself form a user task loop.

The user does not primarily need another inventory of sessions or assets. The high-value questions are:

- What was the agent trying to do?
- Where did the work stop?
- What did the agent actually change or decide?
- Which context affected the result?
- Can another agent continue without starting over?
- What is verified, inferred, stale, missing, or unknown?

The product must therefore organize evidence and context around a recoverable unit of work.

## 3. Target user and first scenario

### Target user

The first user is an individual developer who switches between local agents such as Codex, Cursor, Windsurf/Devin, and related tools. The user values local-first behavior, transparent provenance, and the ability to recover from interruptions without re-explaining the entire task.

Team audit, shared cloud memory, and enterprise workflow governance are future possibilities, not first-release requirements.

### First scenario

The first scenario is **cross-agent handoff**:

1. A developer starts work in one agent.
2. The work becomes interrupted, blocked, or better suited to another agent.
3. AgentSteward identifies or opens the relevant Work Item.
4. The developer reviews current progress and evidence.
5. AgentSteward runs a handoff preflight.
6. AgentSteward creates a canonical Work Package and a target-agent projection.
7. The developer continues in the target agent.
8. The handoff result is recorded for later recovery and auditing.

Interruption recovery, explanation, long-term preservation, and migration are supporting scenarios.

## 4. Core product model

### 4.1 Work Item

A `Work Item` is a goal-oriented unit of agent work. It is not merely a session collection.

```text
Work Item
├── Goal
├── Project
├── Status
├── Sessions
├── Context Snapshot
├── Repository State
├── Decisions
├── Artifacts
├── Open Questions
└── Handoff History
```

A Work Item may represent a bug fix, feature, investigation, document, migration, or refactor. It may include multiple sessions from different agents.

### 4.2 Session

A Session is evidence about work performed by an agent. It remains a first-class diagnostic and reading surface, but it is subordinate to the Work Item in the product narrative.

A Session may be associated with an existing Work Item, or it may be the source from which a new Work Item is proposed.

### 4.3 Context Snapshot

The Context Snapshot records what was observable about a Work Item's context at a given point in time. It may include rules, memory, skills, commands, project-local files, and relevant environment facts when they were observed as available, explicitly referenced, or attached by the user. It must not state that an unobservable global asset actually influenced the work.

The system must preserve source, scope, timestamp, and confidence. A context asset discovered in the repository is not automatically treated as active or influential.

### 4.4 Work Package

A `Work Package` is a versioned snapshot of a Work Item prepared for handoff, preservation, or recovery. It is a projection of the canonical Work Item and evidence, not a second session archive format.

```text
Work Package
├── Work Item metadata
├── Current goal and status
├── Completed and pending work
├── Context snapshot
├── Decisions and constraints
├── Repository state reference
├── Relevant session evidence
├── Artifacts and file references
├── Unresolved risks
├── Target-agent profile
└── Validation manifest
```

The package must retain references to its sources and indicate what is embedded, copied, or unresolved.

## 5. Work Item lifecycle

```text
captured → organized → active → ready-to-handoff
                              ↓
                         handoff event
                              ↓
                   active (target agent)
                              ├── blocked
                              ├── completed
                              └── archived
```

- `captured`: a potential unit of work was discovered from a Session or created by the user.
- `organized`: the user confirmed its project and goal boundary.
- `active`: work is in progress.
- `blocked`: progress requires a decision, environment change, or external input.
- `ready-to-handoff`: the current state is sufficiently described to run handoff preflight.
- A handoff is an event and an immutable record, rather than a terminal Work Item state. After a package is created or accepted, the Work Item may return to `active` under the target agent. A Work Item can have many handoff events.
- `completed`: the user confirmed the goal is complete.
- `archived`: the Work Item remains available for history and recovery but is no longer current.

The system may suggest a state from evidence, but Session termination alone must never mark a Work Item complete. A blocked Work Item may return to `active` after its blocker is resolved; an active Work Item may return to `ready-to-handoff` after its state is refreshed.

Failed, cancelled, expired, and superseded handoffs remain in Handoff History and do not hide the Work Item. A later handoff may supersede an earlier package without deleting it.

## 6. Handoff trust model

### 6.1 Three content layers

Every Work Package contains three conceptual layers:

1. **Work summary**
   - goal
   - current progress
   - completed work
   - next step
   - constraints
   - unresolved questions
   - user decisions

2. **Context**
   - project and work directory
   - branch, commit, and worktree state
   - effective rules and other context assets
   - relevant files
   - environment limitations
   - prior agent decisions

3. **Evidence**
   - associated sessions
   - key user and agent messages
   - tool calls and command results
   - file changes
   - tests
   - failures
   - raw-source or backup references

The summary is the entry point for a target agent, but it cannot replace context or evidence.

### 6.2 Field-level confidence

Important fields carry one of these states:

- `verified`: supported by a current source or explicit validation.
- `observed`: found locally but not independently validated.
- `inferred`: derived from multiple pieces of evidence.
- `stale`: sourced from data that may no longer reflect the current state.
- `missing`: expected but not found.
- `unknown`: not currently determinable.

The UI must expose these distinctions at the point where a user decides whether to hand off.

### 6.3 Handoff preflight

Before package creation, the system checks:

- Work Item goal and project boundary
- at least one valid associated Session for an evidence-bearing handoff; a manual Work Item without a Session may still create a package, but it receives a `missing` evidence warning and cannot claim verified continuation
- current project and worktree identity
- validity of key file references
- unresolved errors or blocked state
- sensitive sources and redaction choices
- target-agent format support
- missing fields that may prevent continuation

The result is `ready`, `ready with warnings`, or `blocked`. A warning package may be exported with explicit warnings. A blocked package cannot be presented as a complete successful handoff.

### 6.4 Package creation versus handoff confirmation

These are separate outcomes:

- `Package Created`: the local package was generated and its manifest was recorded.
- `Handoff Confirmed`: the target agent consumed the package and the user or system confirmed that continuation was possible.

Each handoff record contains at least:

- handoff ID and Work Item ID
- package ID, schema version, and content hash
- source provider/session and target provider/session when known
- project/worktree identity and package creation time
- confirmation actor, time, and method (`manual`, `observed`, or `automated`)
- result (`created`, `confirmed`, `failed`, `cancelled`, `expired`, or `superseded`)
- failure reason or missing-information list

The first release may implement Package Created and record manual handoff outcomes. It must not infer Handoff Confirmed from file generation alone.

### 6.5 Canonical package and projections

The canonical Work Package is provider-neutral. Target-agent adapters produce projections for specific agents:

```text
Canonical Work Package
├── Generic Markdown projection
├── Structured JSON projection
├── Codex projection
├── Cursor projection
└── Windsurf / Devin projection
```

The first dedicated projection is **Codex CLI** because its local session source is directly readable without a running process. Its consumption contract is explicit: generate a human-readable handoff entry plus a JSON sidecar that the developer can open or provide to a new Codex session. No direct session injection is assumed. Generic Markdown and JSON remain available for all providers. Adapters may change format and entry instructions, but may not change facts or suppress confidence and warning metadata.

### 6.6 Provenance and integrity contract

The validation manifest reuses the existing session-backup and project-bundle concepts and is versioned as `work-package/v1`. It includes:

- package ID, schema version, creation time, and content hash
- source record IDs and source fingerprints when available
- project root identity, repository identity, branch, commit, and dirty/untracked summary
- each referenced file's path, existence-at-creation status, and embedded/copied/unresolved mode
- confidence and stale markers for every derived field
- validation checks and their results

Validation is offline and read-only. A package may remain portable when files are unresolved, but unresolved references must remain visible and cannot be treated as embedded evidence. A later validation run may mark repository and file references stale when fingerprints no longer match.

### 6.7 Sensitive data

Handoff preparation must show likely sensitive sources, including paths, commands, environment references, local service addresses, prompts, code, and tool output. The user must be able to exclude sources, redact paths, truncate raw content, and choose summary-only output.

The default package is summary-only for raw prompts, command output, and source content. Evidence inclusion is opt-in per source. Baseline redaction detects common secret-shaped values (API keys, bearer tokens, private-key blocks, passwords, and credential assignments), replaces them with stable redaction markers, and records the redaction count and source in a redaction manifest. Redaction also applies to manifest metadata such as paths, command arguments, environment names, and source references; normalized redaction markers must be applied before hashing. Paths and local service addresses may also be shortened or excluded. Privacy is part of the handoff flow, not a detached settings feature.

## 7. Information architecture

### 7.1 Continue

`Continue` is the default landing surface. It shows:

- unfinished Work Items
- ready-to-handoff work
- blocked work awaiting decisions
- recent failures
- newly captured but unorganized work
- recently used projects

Cards focus on the next action, current agent, recency, and handoff confidence.

### 7.2 Projects

`Projects` defines project and workspace boundaries. It shows Work Items, agent sources, effective context, and project-level risks. It is a boundary and navigation view, not the primary task inbox.

### 7.3 Work Item workspace

The Work Item detail surface contains:

- goal, status, project, current agent, latest handoff, confidence, and warnings
- completed work, current work, next step, open questions, decisions, and artifacts
- effective context and provenance
- associated sessions, files, worktree state, and evidence
- actions to continue, prepare handoff, inspect evidence, mark blocked, or complete

### 7.4 Sessions

Sessions remain the evidence workbench with Transcript, Trajectory, diagnostics, search, and raw-source inspection. It gains actions to associate a Session with a Work Item or propose a new Work Item.

### 7.5 Context

Context replaces the asset-first mental model with an influence view. It answers which rules, memories, skills, commands, and project-local files were observed as available or referenced during a Work Item, their provenance and status, conflicts, staleness, and whether they will be included in a Work Package. The UI must distinguish `observed available`, `explicitly referenced`, `user attached`, and `unknown influence`; local repository providers cannot claim to observe every global runtime asset.

### 7.6 Recovery

Recovery groups preservation, backup, migration, import, and validation around three user questions:

- Is this work saved?
- Can it be restored?
- Can it be handed to another agent?

The former Backup / Migration workflows remain implementation concepts inside this recovery surface.

### 7.7 Compatibility and rollout

The redesign is additive. Existing routes remain valid during migration:

| Current surface | Continuity model | Compatibility rule |
|---|---|---|
| Project Overview | Projects + Continue entry points | Preserve the route and add links into relevant Work Items. |
| Sessions | Sessions evidence workbench | Preserve deep links and add association/create-Work-Item actions. |
| Assets | Context influence view | Keep asset filters and detail URLs; present them as context evidence where a Work Item exists. |
| Analysis | Work Item and Project risk panels | Preserve finding detail URLs; route to the owning Work Item or project risk view. |
| Backup / Migration | Recovery | Preserve workflow URLs and package formats; add Work Package references rather than replacing existing backups. |

Old surfaces remain usable as evidence and recovery subviews while `Continue` and Work Item routes are introduced. Existing deep links must continue to resolve, even when they render inside the new shell.

## 8. MVP

The MVP validates the following loop:

```text
Discover work → organize Work Item → inspect state and evidence
→ create Work Package → continue in another agent → record result
```

### Required capabilities

1. Create a Work Item manually or from one Session.
2. Persist it in the local `work-item/v1` store with a stable ID and schema version.
3. Edit goal, status, next step, project, decisions, and open questions.
4. Associate one or more Sessions and local project/worktree references.
5. Extract only bounded candidate progress, errors, files, branch, commit, and command evidence with confidence labels.
6. Run handoff preflight and produce a validation manifest.
7. Generate a canonical deterministic `work-package/v1` package in Markdown and JSON projections.
8. Generate the Codex CLI projection.
9. Record immutable Package Created and manual handoff outcome records.
10. Preserve source references, hashes, redaction results, and validation warnings.

The thin vertical slice is one Work Item, one source Session, one local project/worktree reference, one Codex projection, and manual confirmation. Multi-session aggregation and richer provider adapters follow only after this slice is usable.

### Deferred capabilities

The MVP does not include:

- automatic control or injection into every agent
- automatic code modification
- automatic conflict resolution
- cloud sync or team collaboration
- a complete semantic project knowledge graph
- a full asset editing or marketplace experience
- every provider-specific adapter
- automatic completion claims
- broad repository retrieval or indexing

## 9. Success criteria

The product is successful when an individual developer can:

- find unfinished work in under one minute
- turn a Session into a useful Work Item in a few minutes
- create a handoff without rereading the full transcript
- start the next agent with enough information to perform the next step
- distinguish verified facts from inference, stale data, and missing evidence
- understand and recover from a failed handoff

The product has not yet proven its new positioning if users primarily use it as a history viewer, log search tool, or transcript exporter and rarely create or reuse Work Items.

The first validation protocol is local and evidence-based: use five representative cross-agent tasks, record time to find a Work Item, time to create a package, the number of missing or incorrect handoff fields, whether the target agent can begin the stated next step without a full re-explanation, and the recorded handoff result. The MVP goal is at least four of five tasks reaching `Package Created` without an undisclosed missing required field, and at least three of five reaching manual `Handoff Confirmed`. The protocol must preserve the task inputs and package manifests so results can be reviewed rather than inferred from usage alone.

## 10. Architectural implications

Existing local source adapters, unified trajectory normalization, diagnostics, project-local evidence providers, and backup primitives remain valuable. Their role changes:

- normalized events become evidence for Work Items
- session diagnostics support trust and recovery
- context assets become snapshots of influence
- backup packages become Work Package building blocks
- analysis becomes a state and risk explanation attached to work

The architecture should avoid creating a separate archive format for Work Packages. A Work Package should reference or reuse canonical Session Records and existing backup representations where appropriate.

Canonical Work Items live in an app-managed local store outside the repository by default, with stable IDs and explicit schema migrations. A Work Item record is `work-item/v1`; packages are `work-package/v1`; handoff outcomes are append-only records associated with package IDs. Repository paths are references unless the user explicitly chooses to embed or copy content. Canonical JSON uses deterministic key ordering, normalized UTC timestamps, normalized relative source paths, and SHA-256 over the canonical JSON bytes before hashing so the same snapshot has a reproducible content hash. The hash covers the canonical package representation and manifest, not provider-specific Markdown projections; each projection records the canonical package hash it represents.

The product must remain local-first. Core reading and handoff preparation must not require a cloud service.

## 11. Risks and unresolved questions

- Inferring Work Item boundaries from raw Sessions may be unreliable; user confirmation must remain available.
- Repository state can change after package creation; packages need timestamps and explicit stale markers.
- Cross-agent projections may support different capabilities; unsupported features must be declared.
- Large evidence payloads may expose sensitive information and create unwieldy packages; exclusion and truncation are required.
- Manual handoff confirmation should be instrumented before attempting automatic confirmation.
- The local store and package schemas need migration tests before multi-session aggregation is enabled.

## 12. Product language

Preferred product language:

- `Continue work`
- `Work Item`
- `Work Package`
- `handoff`
- `recovery`
- `evidence`
- `confidence`
- `verified / observed / inferred / stale / missing / unknown`

Avoid making these the primary product promise:

- strongest session browser
- generic context manager
- complete project knowledge base
- universal agent control plane
- cloud team memory
