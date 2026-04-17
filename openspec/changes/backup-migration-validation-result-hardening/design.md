## Context

The shipped `Backup / Migration` page is now a workflow-first surface, not a
placeholder. It already supports executable preservation and packaging work plus
preview-only portability work. That foundation is good enough to use, but the
behavior has been extended in multiple slices:

- `session backup`
- `bulk session backup`
- `import backup`
- `validate package`
- `migration preview`
- `project bundle`

The next change should consolidate semantics, not expand scope. This means
making validation, result, recent-operations, and routed-degrade behavior more
coherent across the existing workflows.

## Goals / Non-Goals

**Goals**

- Define a more coherent validation/result model across all six workflows.
- Make warning vs blocker boundaries easier to explain.
- Ensure stale or partial routed context degrades into safe workflow states.
- Align `Recent Operations` with primary result semantics.
- Produce testable expectations for QA and regression work.

**Non-Goals**

- No new workflow types.
- No migration apply.
- No restore/runtime continuation expansion.
- No project bundle member/scope expansion.
- No broad shell redesign.
- No generic UI polish disconnected from validation/result semantics.
- No privacy-redaction work in this change.

## Decisions

### Decision 1: Treat this as a semantics-hardening slice, not a feature expansion

The change should stay inside the existing workflow stack. It does not create
new workflow primitives or new product promises. It only hardens the meaning of
states that already exist.

Alternative considered: bundle this work with another workflow addition.
Rejected because it would blur whether a behavior change is hardening or new
scope.

### Decision 2: Use one validation mental model across all six workflows

The workflows do not need identical UI, but they should be explainable through
one stable model:

- when the workflow may continue
- when a condition is warning rather than blocker
- when the workflow must remain in input/validation-adjacent state
- what a terminal result means

Alternative considered: leave each workflow with mostly local semantics.
Rejected because it increases QA ambiguity and makes routed continuity harder to
trust.

### Decision 3: Prefer safe degrade over misleading continuity

When routed context is stale, partial, or unresolved, the workflow should land
in:

- selection
- configuration
- validation/input-adjacent state

It should not preserve a deeper state if doing so creates false confidence about
what is selected, valid, or completed.

Alternative considered: preserve more continuity to reduce user interruption.
Rejected because misleading continuity is worse than a small amount of extra
user input on a workflow page that already depends on explicit state.

### Decision 4: Result semantics and recent operations must share the same truth

`Recent Operations` is a compact memory of completed workflow runs. It should
not invent a parallel status language that disagrees with the primary result
surface.

This means hardening:

- terminal status wording
- summary wording
- reopen behavior
- interpretation of warning vs failure vs preview-only outcomes

Alternative considered: let recent operations stay as a looser secondary
summary. Rejected because it undermines trust in result states.

### Decision 5: QA expectations should become more explicit

This slice is only successful if QA can verify the hardened rules as concrete
state expectations, not as a subjective feeling that the page seems more
consistent.

Alternative considered: rely on implementation tests only. Rejected because the
hardening targets are workflow semantics, and workflow semantics need runtime QA
language too.

## Risks / Trade-offs

- Over-normalization risk -> workflows still have different jobs; hardening
  should align semantics without forcing artificial uniformity.
- UI churn risk -> wording and state transitions may change in visible ways;
  keep the work focused on semantics, not visual redesign.
- Scope creep risk -> `hardening` can turn into vague maintenance; keep this
  change anchored on validation/result/recent-operations/routed-degrade only.
- Incomplete remainder risk -> after this slice lands, decide explicitly
  whether another coherent remainder exists instead of silently carrying hardening
  work forward.

## Migration Plan

- Tighten shared model helpers in `src/lib/backupMigration.ts`
- Update `BackupMigrationFoundation` to consume those helpers consistently
- Tighten shell handoff/degrade behavior in `ProjectShellClient`
- Update tests and QA guidance

## Open Questions

None for this slice. Any meaningful remainder after this hardening pass should
be framed as a new follow-up slice rather than left implicit.
