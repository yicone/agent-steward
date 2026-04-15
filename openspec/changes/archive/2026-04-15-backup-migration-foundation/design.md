## Context

The project shell now has real `Sessions`, `Assets`, and `Analysis` surfaces.
`Backup / Migration` is the last top-level page still using a static
placeholder. The UX architecture documents (`session-backup-migration-ux`,
`page-state-ia`, `task-flow-ia`, `routed-context-handoff`,
`content-contract-draft`) already define the workflow selector, workflow spine,
validation panel, operation result / history, and routed handoff expectations
for this page.

The existing session-backup API (`POST /api/session-backups`,
`POST /api/session-backups/import`, `GET /api/session-backups/[backupId]`)
already supports single-session backup creation, import, and verification.
This foundation should surface those capabilities through the workflow-first
page model without reimplementing backend logic.

This foundation follows the same local-first, bounded-behavior pattern
established by `assets-foundation` and `analysis-foundation`. Unlike those
surfaces, this page should favor real executable workflows over representative
seed-only workflow shells.

## Goals / Non-Goals

**Goals:**

- Provide a real `Backup / Migration` foundation surface with workflow
  selector, context summary, selection/intake affordances, validation panel,
  workflow steps, and operation result / recent operations.
- Support three bounded workflows plus recent operations: single session
  backup, import backup, validate package, and recent operations.
- Preserve workflow framing when routed in from `Project Overview`, `Sessions`,
  `Assets`, and `Analysis`.
- Make preservation and destructive-risk warnings explicit at every validation
  gate.
- Reuse existing session-backup API endpoints for backup creation and import.

**Non-Goals:**

- No bulk session backup in this change.
- No migration preview in this change.
- No project bundle entry workflow in this change.
- No full project bundle execution or bundle packaging engine.
- No full migration apply engine.
- No vendor-runtime restore claims or restore-into-third-party behavior.
- No cloud sync, team collaboration, or external service dependency.
- No high-fidelity redesign or design-system overhaul.
- No modification to the existing direct session backup action inside Sessions.

## Decisions

### Decision 1: Introduce a local backup-migration workflow model

Use a bounded model for workflows with fields such as workflow type, workflow
state, selected objects, configuration options, validation results, operation
result, and recent operations history.

Alternative considered: derive workflow state entirely from URL params. That
would make multi-step workflows brittle and harder to test. A small local model
with explicit state transitions is more predictable and testable.

### Decision 2: Keep workflows bounded with explicit state paths

Each workflow follows the state path defined in `page-state-ia.md`:
Idle → Selection → Configuration → Validation → Confirmation → Execution →
Result. Validate package terminates at Result without Execution.

Alternative considered: a generic wizard component. That would add abstraction
before the workflows are mature enough to generalize. Per-workflow state paths
are more explicit in foundation.

### Decision 3: Reuse existing session-backup API for backup and import workflows

The foundation surface calls the same API endpoints that the Sessions viewer
already uses. No new backend routes are needed for foundation-level backup
and import.

Alternative considered: new dedicated API routes. Unnecessary for foundation —
the existing endpoints already support the required operations.

### Decision 4: Keep the foundation limited to real executable workflows

This change includes only workflows that already have meaningful executable
behavior or real trust-check semantics: single session backup, import backup,
and validate package. Migration preview, project bundle, and bulk backup remain
follow-up changes because, at this stage, they would overstate workflow
completeness.

Alternative considered: include preview-only migration and project bundle
entries plus bulk session backup. Rejected because they would make the page look
broader than the real capability surface and would increase the risk of
fake-authority UX and implementation sprawl.

### Decision 5: Routed handoff uses the same context types as other surfaces

Handoff into `Backup / Migration` uses workflow context, object context, issue
context, and return context as defined in `routed-context-handoff.md`. The page
consumes handoff to open the correct workflow and prefill selections.

Alternative considered: a separate handoff model. That would diverge from the
established pattern and increase maintenance cost.

### Decision 6: Recent operations as a compact result history

Recent operations shows completed workflow runs as a compact list with result
identity, workflow type, timestamp, completion status, and route to result
detail. It is not a full audit log or persistent history store.

Alternative considered: persist operations to disk. That is a future concern —
foundation uses in-memory recent operations that reset on page remount.

## Risks / Trade-offs

- Fake-authority risk → Use bounded copy and avoid claiming complete migration
  or bundle capability.
- Page-role drift → Keep all workflows bounded with selection, validation, and
  result. Do not add generic browsing or editing.
- Duplicate Sessions behavior → Session backup in this page uses the same API
  but enters through the workflow selector, not the session viewer action.
- Routing complexity → Keep handoff payloads minimal and test route helpers
  separately from UI rendering.
- Scope creep → Bulk backup, migration preview, and project bundle remain
  explicitly outside this change.
