# Session Backup / Migration UX

Updated: 2026-04-11

This document defines the product semantics, user mental model, workflow structure, page structure, and state semantics for `Backup / Migration`.

It is intentionally limited to:

- terminology
- user mental model
- workflow semantics
- page structure
- routed handoff expectations
- state and message semantics

It does not define:

- high-fidelity visual design
- API design
- third-party runtime restoration guarantees
- implementation details

Primary references:

- [glossary.md](./glossary.md)
- [research-session-backup.md](./research-session-backup.md)
- [research-agent-context-product-landscape.md](./research-agent-context-product-landscape.md)
- [product-positioning-and-ia.md](./product-positioning-and-ia.md)
- [page-block-ia.md](./page-block-ia.md)
- [page-state-ia.md](./page-state-ia.md)
- [task-flow-ia.md](./task-flow-ia.md)
- [routed-context-handoff.md](./routed-context-handoff.md)
- [openspec/changes/archive/2026-04-11-session-backup-foundation/specs/session-backup/spec.md](../openspec/changes/archive/2026-04-11-session-backup-foundation/specs/session-backup/spec.md)
- [openspec/changes/archive/2026-04-11-session-backup-foundation/specs/session-record-model/spec.md](../openspec/changes/archive/2026-04-11-session-backup-foundation/specs/session-record-model/spec.md)

## 1. Purpose

`Backup / Migration` exists to make preservation, portability, and recovery-oriented workflows explicit at the project level.

It should help users:

- preserve canonical session state
- import preserved packages into this product
- validate trust and compatibility before relying on a package
- prepare portability-oriented workflows
- enter future `Project Bundle` workflows from a project-first surface

It should not:

- behave like a generic tools drawer
- act as a hidden admin or maintenance page
- duplicate the role of `Analysis`
- imply restoration into a third-party vendor runtime

## 2. Terminology Calibration

The following terms are canonical for this product surface.

### Session Backup

Default preserved copy of canonical `Session Record` data.

Meaning:

- the primary backup object
- portable inside this product
- suitable for later import, validation, and analysis
- reusable as session packaging inside a future `Project Bundle`

Does not mean:

- transcript export
- raw source copy by default
- guaranteed reopening inside a third-party agent runtime

### Source Backup

Explicit advanced option that preserves a copy of the original `Session Source`.

Meaning:

- optional
- copy-only
- used for higher-fidelity preservation or future source reprocessing

Does not mean:

- default backup mode
- promise of vendor-runtime restoration

### Session Export

Output for reading, sharing, or external consumption.

Examples:

- transcript markdown
- trajectory JSON
- raw source copy as an export artifact

Does not mean:

- canonical backup
- restore-ready product state

### Import

Bring an external package into this product so it becomes readable, searchable, and analyzable here.

Meaning:

- intake into product state
- package/schema validation happens before acceptance
- can target session backup packages now, and other package families later

### Restore

Reconstitute product-readable state from a valid backup package.

For v1, `Restore` should be understood as:

- restore into this product's own readable, searchable, and analyzable state

It must not imply:

- restore into a vendor's private runtime/store
- full runtime continuation inside Claude, Codex, Windsurf, or similar tools

### Migration

Prepare or execute portability-oriented movement between supported context shapes.

For this page, `Migration` should primarily mean:

- previewing how preserved context can move into another product-readable form
- checking compatibility and risk before any future apply step

### Validation

Explicit trust and compatibility checks applied before or after bounded workflow steps.

Includes:

- schema compatibility
- package integrity
- provenance completeness
- object-class recognition
- import or restore readiness

### Project Bundle

Future project-level portable package that may include:

- sessions
- rules
- memory
- skills
- commands
- metadata

It should reuse session backup packaging rather than redefine it.

## 3. User Mental Model

Users need a clean distinction between preservation, sharing, intake, recovery, and portability.

### Backup

User meaning:

- "Keep a dependable copy so I do not lose this."

Product meaning:

- preserve canonical product-readable state

Default expectation:

- safe, structured, recoverable inside this product

### Export

User meaning:

- "Give me something I can read, share, or hand off."

Product meaning:

- produce an outward-facing artifact

Default expectation:

- readable or externally consumable, even if less complete

### Import

User meaning:

- "Bring this package into the product."

Product meaning:

- ingest a package and turn it into local product state if valid

Default expectation:

- intake plus validation

### Restore

User meaning:

- "Rebuild something usable from a backup."

Product meaning:

- restore into this product's own readable, searchable, and analyzable state

Default expectation:

- product-state recovery, not vendor-runtime resurrection

### Migration

User meaning:

- "Move my preserved context into another usable shape."

Product meaning:

- portability planning and compatibility checking

Default expectation:

- preview and risk awareness before action

### Source Copy

User meaning:

- "Keep the original raw thing too."

Product meaning:

- optional raw-source preservation

Default expectation:

- advanced fidelity option, not the default portable object

### Bundle

User meaning:

- "Package the project, not just one session."

Product meaning:

- project-level portability container

Default expectation:

- broader than session backup

### Most Likely Confusion Points

- `backup` vs `export`
  - users often assume any downloadable file is a backup
  - in this product, `backup` preserves canonical state, while `export` produces a readable or shareable artifact
- `import` vs `restore`
  - `Import` is package intake
  - `Restore` is the resulting recovery into product-readable state
  - import is the action, restore is the outcome
- `restore` vs vendor reopen
  - this is the highest-risk misunderstanding
  - the product must never imply that importing a backup will reopen a session inside a third-party runtime
- `source copy` vs `backup`
  - some advanced users will overvalue raw source
  - the product should keep it available, but clearly label it as an optional preservation layer, not the default portable object
- `session backup` vs `project bundle`
  - a session backup preserves one or more sessions
  - a bundle packages broader project context

## 4. `Backup / Migration` Page Semantics

### What This Page Is Not

It is not a generic tools drawer.

Reason:

- utility accumulation would collapse page meaning
- every operation here must belong to a bounded preservation or portability workflow

It is not a hidden admin page.

Reason:

- backup, import, validation, and bundle preparation are user-facing project workflows
- the page should feel intentional, not like "advanced settings"

It is not a second analysis page.

Reason:

- `Analysis` interprets problems
- `Backup / Migration` performs bounded preservation and portability operations

### What This Page Is

`Backup / Migration` is a restricted workflow page for preservation, portability, and recovery-oriented operations.

Its defining traits are:

- workflow-first, not inventory-first
- bounded operations with explicit entry and exit
- explicit validation gates
- explicit risk framing
- clear result states
- clear return-to-origin behavior

The page should answer:

- what am I trying to preserve, import, validate, or prepare
- what object set is in scope
- what risks or incompatibilities exist
- can I proceed safely
- what happened after completion
- where should I go next

## 5. Core Workflows

The core workflows for this page are:

- single session backup
- bulk session backup
- import backup
- validate imported package
- prepare migration preview
- project bundle entry point
- optional source preservation

## 6. Workflow Contracts

### 6.1 Single Session Backup

User goal:

- preserve one important session in canonical form

Start entry:

- `Sessions` page `Session Actions`
- `Analysis` when a finding recommends preservation before change
- direct entry into `Backup / Migration` with a preselected session

Key steps:

- enter `session backup` workflow
- confirm selected session
- optionally enable `Source Backup`
- validate canonical `Session Record` creation and provenance
- confirm and run
- inspect result

Validation gates:

- selected session exists
- canonical record can be materialized
- provenance is present enough to explain origin
- if source preservation is enabled, source copy is readable

Warning / risk points:

- unreadable or partially readable source
- missing provenance
- advanced source preservation increases sensitivity and package weight

Success result:

- valid session backup package created
- package is inspectable
- session remains readable and analyzable in product terms

Failure result:

- backup is blocked or marked invalid with actionable diagnostics
- there is no silent partial success

Recommended next page:

- return to the originating session in `Sessions`
- open result details in `Backup / Migration`
- go to `Project Overview` if the preservation task is complete

### 6.2 Bulk Session Backup

User goal:

- preserve a selected set of sessions together

Start entry:

- `Sessions` page bulk selection
- `Project Overview` quick action for preservation
- direct `Backup / Migration` entry

Key steps:

- choose multiple sessions
- confirm selection scope
- choose whether to preserve sources for none, some, or all
- validate package completeness and portability
- confirm and run
- inspect combined result

Validation gates:

- selection set is explicit
- every selected session can produce a canonical record, or failures are surfaced per item
- package-level integrity is valid

Warning / risk points:

- mixed health across selected sessions
- some sessions may validate while others block
- raw-source preservation can create inconsistent fidelity expectations across items

Success result:

- grouped backup package or grouped backup result exists
- per-session validation status remains inspectable

Failure result:

- blocking items are identified explicitly
- the user can remove invalid items or leave to repair source issues

Recommended next page:

- stay in `Backup / Migration` to inspect result or history
- go to `Sessions` with failed items highlighted
- go to `Analysis` if the failures indicate broader health issues

### 6.3 Import Backup

User goal:

- bring a backup package into this product

Start entry:

- `Backup / Migration` direct entry
- `Project Overview` empty or portability-oriented quick action
- `Sessions` empty state when sessions are expected but absent

Key steps:

- choose package
- inspect package summary
- validate readability and compatibility
- confirm import
- restore product-readable state
- inspect imported sessions or assets

Validation gates:

- package is readable
- schema family is recognized
- schema version is compatible or explicitly unsupported
- object classes are understood
- conflicts are visible before apply

Warning / risk points:

- imported state may be readable here without being usable elsewhere
- import does not imply third-party runtime restoration
- partial compatibility may require the user to inspect warnings before trusting the result

Success result:

- imported content becomes readable, searchable, and analyzable in this product

Failure result:

- malformed, incomplete, invalid, or unsupported packages are rejected or clearly marked invalid
- there is no ambiguous "imported with unknown fidelity" state

Recommended next page:

- `Sessions` if the imported object is session-heavy
- `Assets` if the imported object is asset-heavy
- `Project Overview` if this was project bootstrap

### 6.4 Validate Imported Package

User goal:

- check trust and compatibility before relying on a package

Start entry:

- `Backup / Migration`
- result page after import
- `Analysis` when a portability issue suggests validation

Key steps:

- select package
- run validation
- inspect schema, integrity, provenance, and compatibility results
- decide whether to import, retry, or stop

Validation gates:

- package structure is intact
- schema is recognized
- provenance metadata is present enough for trust
- object expectations match actual contents

Warning / risk points:

- package may be readable but not trustworthy
- provenance can be incomplete even when schema is valid
- warnings should not be phrased as safe-to-ignore by default

Success result:

- package is marked valid, compatible, or valid-with-warnings

Failure result:

- package is marked invalid, unsupported, or blocked with a concrete reason

Recommended next page:

- continue to import
- return to the source provider or prior workflow
- open `Analysis` only if systemic issues appear across multiple packages

### 6.5 Prepare Migration Preview

User goal:

- understand portability before taking action

Start entry:

- `Backup / Migration`
- `Assets` action
- `Analysis` recommended action

Key steps:

- choose workflow type `migration preview`
- establish source context and intended target context
- configure scope
- run preview and compatibility checks
- inspect what is portable, degraded, unsupported, or blocked

Validation gates:

- source context is explicit
- target context is explicit
- canonical source is known when required
- unsupported mappings are surfaced clearly

Warning / risk points:

- preview is not apply
- some preserved data may remain readable here but not portable into another target shape
- missing metadata can make preview inconclusive

Success result:

- the user gets a bounded preview of portability state and risk

Failure result:

- preview is blocked because the source, target, or canonical basis is too incomplete

Recommended next page:

- stay in `Backup / Migration` for a related workflow
- route to `Assets` or `Sessions` to repair missing provenance
- route to `Project Overview` if the preview answered the decision

### 6.6 Project Bundle Entry Point

User goal:

- start project-level portability work from a project surface

Start entry:

- `Project Overview` quick action
- `Backup / Migration` direct workflow selector

Key steps:

- enter `project bundle` workflow
- inspect auto-filled project context summary
- confirm included sessions and reusable assets
- validate scope completeness and portability warnings
- inspect bundle result or preview

Validation gates:

- bundle scope is explicit
- included sessions and assets are known
- missing provenance and portability warnings are visible
- package contents are inspectable after completion

Warning / risk points:

- users may assume a bundle is a full project clone
- bundle should be framed as context portability, not environment reproduction
- incomplete inclusion must be explicit

Success result:

- project bundle result or bundle-ready package preview exists

Failure result:

- the workflow is blocked by missing provenance, incompatible scope assumptions, or unresolved package issues

Recommended next page:

- stay in `Backup / Migration` to inspect bundle contents
- return to `Project Overview`
- route to `Assets` or `Analysis` to resolve blockers

### 6.7 Optional Source Preservation

User goal:

- preserve original raw session material in addition to canonical backup

Start entry:

- session backup configuration step
- bulk backup configuration step

Key steps:

- explicitly enable `Source Backup`
- review what raw source preservation means
- validate source readability
- continue with backup

Validation gates:

- source preservation is explicit, not implied
- raw source can be copied
- package labeling distinguishes canonical backup from source copy

Warning / risk points:

- raw source may contain more sensitive or vendor-shaped data
- raw source preservation is not required for product-readable restore
- source copy should never be described as the primary backup object

Success result:

- package contains canonical session backup plus an explicit source-preservation layer

Failure result:

- source copy cannot be included
- the user can continue with canonical backup only or stop

Recommended next page:

- continue within the backup workflow
- after completion, inspect package contents in result or history

## 7. Page Structure and State Semantics

### 7.1 `Backup / Migration` Top-Level Structure

The first-level structure should stay aligned with [page-block-ia.md](./page-block-ia.md):

- `Workflow Selector`
- `Workflow Context Summary`
- `Workflow Steps`

Conditional modules:

- `Selection Table`
- `Validation Panel`
- `Operation Result / History`

This means the page identity is always:

- choose a bounded workflow
- understand the current scope
- progress through explicit steps
- review the result

It should not start from a generic operation list plus unrelated utility cards.

### 7.2 Backup Entry Inside `Sessions`

`Sessions` should expose backup from `Session Actions`, not from top-level global chrome.

Semantic rule:

- backup begins from selected evidence
- routed handoff should carry `workflow context = session backup`
- it should also carry `object context = selected session`
- optional `return context` should point back to the selected session

If the selected session becomes invalid during handoff:

- keep the workflow type
- fall back to `Selection` state in `Backup / Migration`

### 7.3 Preservation / Portability Quick Action in `Project Overview`

`Project Overview` should expose high-level quick actions such as:

- `Back Up Sessions`
- `Import Backup`
- `Prepare Project Bundle`

This quick action must stay routing-first.

It should not expose:

- package internals
- schema switches
- low-level validation controls

Semantic rule:

- `Project Overview` launches the workflow
- `Backup / Migration` performs the workflow

### 7.4 Completion State and Return to Origin

Completion state should follow [page-state-ia.md](./page-state-ia.md) `Result` semantics and [routed-context-handoff.md](./routed-context-handoff.md) `return context`.

On completion, the page should offer:

- inspect result
- continue with a related workflow
- return to origin
- go to a recommended next page

Return-to-origin should be compact and explicit:

- `Return to Session`
- `Return to Finding`
- `Return to Project Overview`

It should not attempt to replay full navigation history.

### 7.5 Error / Invalid / Unsupported Schema Semantics

These states must remain issue-explicit, not generic-error-explicit.

Recommended semantic classes:

- `Invalid package`
  - structure is malformed, incomplete, or fails integrity checks
- `Unsupported schema`
  - schema family or version is recognized enough to explain, but not supported for acceptance
- `Readable with warnings`
  - package can be inspected, but trust or completeness is reduced
- `Blocked by source issue`
  - source object cannot safely produce canonical backup
- `Blocked by compatibility issue`
  - migration or import target assumptions do not hold

Recommended phrasing direction:

- explain what was checked
- explain what failed
- explain whether the user can continue, inspect only, or must stop
- route to a correction surface when possible

Examples:

- `This backup package is invalid. The file is readable, but required backup metadata is missing, so import cannot continue.`
- `This package uses an unsupported schema version. You can inspect the package summary, but it cannot be restored into product-readable state here.`
- `Validation found warnings. The package is readable, but some provenance details are incomplete. Review before importing.`
- `Source preservation could not be added. You can continue with canonical session backup only, or stop and inspect the source session.`

## 8. Routed Handoff Expectations

`Backup / Migration` should remain consistent with [routed-context-handoff.md](./routed-context-handoff.md).

Required handoff principles:

- preserve workflow context when the destination is `Backup / Migration`
- preserve object context when one session, asset, finding, or package is the focus
- preserve only compact filter context that the target page can interpret
- preserve return context only for the immediate next loop
- degrade safely when handed-off context is stale or invalid

Expected examples:

- `Sessions` -> `Backup / Migration`
  - carry workflow type `session backup`
  - carry selected session id
  - optionally carry issue cue and return context
- `Project Overview` -> `Backup / Migration`
  - carry workflow type such as `project bundle` or `import`
  - optionally carry preselected object set
  - do not carry full overview state
- `Analysis` -> `Backup / Migration`
  - carry workflow type and issue context
  - optionally carry affected object id
  - do not carry the full finding payload

Safe fallback behavior:

- if workflow type is invalid, land in workflow selector idle state
- if preselected objects are invalid, keep workflow type but ask for new selection
- if return context is stale, keep the result state and drop the return shortcut

## 9. Copy Guardrails

The page should avoid claims such as:

- `Restore to Claude`
- `Restore to Codex`
- `Restore to Windsurf`
- `Reopen this session in its original runtime`
- `Full runtime recovery`
- `Exact vendor-state restoration`

The page should prefer language such as:

- `Restore readable, searchable, and analyzable state in this product`
- `Preserve canonical session data`
- `Optionally preserve original source material`
- `Validate compatibility before import`
- `Prepare portability preview`

## 10. Alignment With Future `Project Bundle`

`Project Bundle` should be treated as a future project-level extension of the same preservation and portability model.

The relationship should be:

- `Session Backup` remains the canonical session preservation unit
- `Project Bundle` reuses session backup packaging for its session payloads
- `Backup / Migration` remains the workflow home for both session-level and future project-level portability work

This keeps the semantics stable:

- backup first defines the portable session unit
- import and restore first target product-readable recovery
- bundle later expands scope without redefining session backup meaning
