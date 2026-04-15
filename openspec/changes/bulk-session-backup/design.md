## Context

`Backup / Migration` now has a real workflow-first foundation surface with
single-session backup, import backup, validate package, routed handoff, and
recent operations. Bulk session backup was explicitly deferred because it adds
multi-select intake, mixed eligibility, source-copy variance, and partial
failure semantics.

This change builds on the existing session-backup API and backup-migration
workflow model. It should expand the workflow surface incrementally without
creating a new package format, a batch backend API, or a project bundle.

## Goals / Non-Goals

**Goals:**

- Add a `bulk-session-backup` workflow to the existing `Backup / Migration`
  workflow selector and state spine.
- Let users select multiple sessions explicitly before validation and
  confirmation.
- Validate every selected session independently and surface blocking items
  before execution.
- Support opt-in source preservation while making per-session source-copy
  eligibility visible.
- Execute bulk backup through repeated use of the existing single-session
  backup behavior.
- Show aggregate and per-session result detail, including partial failure.
- Keep recent operations compact while preserving a route to batch result
  detail.

**Non-Goals:**

- No new backend batch backup endpoint.
- No new grouped package format.
- No project bundle packaging.
- No migration preview or migration apply behavior.
- No vendor-runtime restore behavior.
- No cloud sync, team sharing, or background scheduled backup.
- No replacement of the existing direct single-session backup action in
  `Sessions`.

## Decisions

### Decision 1: Model bulk backup as a workflow type, not a separate page

Add `bulk-session-backup` to the existing backup-migration workflow model so it
uses the same workflow selector, workflow state labels, validation panel,
confirmation gate, result panel, and recent operations.

Alternative considered: add a separate bulk action surface inside `Sessions`.
Rejected because it would duplicate the project-level preservation workflow and
weaken the role of `Backup / Migration` as the workflow-first surface.

### Decision 2: Execute by fan-out over existing single-session backup behavior

Bulk execution should call the same single-session backup behavior once per
eligible selected session and aggregate the results. The workflow layer owns
batch orchestration, per-item status, and aggregate result semantics.

Alternative considered: add a backend batch endpoint immediately. Rejected for
foundation because it would require a separate API contract, batch persistence
semantics, and more rollback behavior than the current product need requires.

### Decision 3: Block execution when validation has blocking items

The workflow can show warnings for mixed health, missing optional source-copy
readiness, or fidelity differences, but it must not proceed while selected
items have blocking validation failures. Users must remove blocked items or
leave the workflow to repair source issues.

Alternative considered: allow execution of eligible items while skipping
blocked items. Rejected for confirmation because it makes the selected batch
ambiguous. Partial failure remains possible during execution and is reported in
the result.

### Decision 4: Keep source-copy configuration explicit and item-aware

Source backup remains opt-in. Bulk configuration may offer batch-level choices
such as none, all eligible, or selected items, but validation must explain which
selected sessions can actually support source-copy preservation.

Alternative considered: a single global source-copy checkbox. Rejected because
it hides mixed eligibility and creates false expectations for sessions whose
source is unreadable or unavailable.

### Decision 5: Use aggregate result plus per-session rows

The result model should include one aggregate status (`success`,
`success-with-warnings`, or `failed`) plus per-session results with backup IDs,
warnings, or errors. Recent operations should show only the compact aggregate
entry and route to full result detail.

Alternative considered: create one recent operation per session. Rejected
because it would turn recent operations into a noisy history list and obscure
that the user ran one batch workflow.

### Decision 6: Keep routed handoff bounded

`Sessions` may route a current multi-selection into the bulk workflow when such
selection exists. `Project Overview` may open the bulk workflow as a preservation
quick action without requiring preselected sessions. Other surfaces should keep
using single-session or preservation handoff unless they can provide a concrete
session set.

Alternative considered: infer session sets from analysis findings or asset
context. Rejected because implicit selection would be hard to validate and could
surprise users.

## Risks / Trade-offs

- Partial failure complexity -> Keep validation blocking strict, use explicit
  aggregate status, and show per-session result rows.
- UI density -> Use count summaries in the workflow spine and expandable or
  compact rows in result detail rather than putting every detail in the header.
- Source-copy ambiguity -> Keep source-copy opt-in and validate eligibility per
  selected session before confirmation.
- API efficiency -> Fan-out over single-session backup is simpler but less
  efficient than a batch endpoint. This is acceptable for foundation and can be
  replaced later without changing workflow semantics.
- Selection-source ambiguity -> Require explicit selected sessions; routed
  overview entry starts at selection instead of inventing a batch.

## Migration Plan

- Add the new workflow type and helper types without removing existing
  workflows.
- Keep existing single-session backup behavior and tests intact.
- Add bulk workflow UI paths behind the existing `Backup / Migration` page.
- If implementation needs rollback, remove `bulk-session-backup` from the
  workflow descriptor list and keep the rest of the foundation surface
  unchanged.

## Open Questions

None for foundation. A future change can decide whether to add a backend batch
endpoint or grouped package format if user data size makes fan-out execution too
slow.
