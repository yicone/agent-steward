## Context

`Backup / Migration` now supports executable preservation workflows: single
session backup, bulk session backup, import backup, validate package, routed
handoff, and recent operations. Migration preview was deliberately deferred
because a preview-only workflow can easily overstate portability if it looks
like an apply-capable migration engine.

This change adds a bounded preview workflow. It should help users understand
what would be portable, degraded, unsupported, or blocked before taking action,
while explicitly avoiding migration apply, package generation, runtime restore,
or cross-machine transfer.

## Goals / Non-Goals

**Goals:**

- Add `migration-preview` to the existing `Backup / Migration` workflow model.
- Require explicit source context and target context before preview.
- Support a bounded preview scope covering sessions, reusable context assets,
  or a project-context subset.
- Produce preview results with exact classifications:
  `portable`, `degraded`, `unsupported`, and `blocked`.
- Show warnings and blocking reasons without applying any migration.
- Support routed entry from `Assets`, `Analysis`, and `Project Overview` when
  context is explicit enough.
- Record completed migration previews as compact recent operations.

**Non-Goals:**

- No migration apply.
- No writing migrated objects.
- No project bundle packaging.
- No export/import package generation.
- No vendor-runtime restore or continuation.
- No cloud sync, team sharing, or cross-machine transfer.
- No automatic inference of source/target context from vague summary text.
- No guarantee that preview results are exhaustive beyond the selected source,
  target, and scope.

## Decisions

### Decision 1: Add preview as a workflow type, not a separate page

`migration-preview` should use the same workflow selector, workflow spine,
validation panel, result panel, and recent operations model as other
`Backup / Migration` workflows.

Alternative considered: add a standalone migration page. Rejected because the
product already defines `Backup / Migration` as the workflow home for
preservation and portability work.

### Decision 2: Stop at result; do not include confirmation or execution

The preview state path should be:
Idle -> Selection -> Configuration -> Validation -> Result.

Validation and preview generation are one bounded operation. There is no
confirmation step because no state-changing apply occurs, and no execution step
because preview does not write migrated output.

Alternative considered: reuse the full confirmation/execution path. Rejected
because that would imply migration apply readiness.

### Decision 3: Use explicit source, target, and scope context

The preview should require explicit source context, target context, and preview
scope. Routed handoff can prefill these fields only when the originating
surface supplies concrete context.

Alternative considered: infer target from asset subtype or finding category.
Rejected because implicit mapping would create fake authority and surprise
users.

### Decision 4: Use preview classifications instead of success/failure only

Each preview item should be classified as `portable`, `degraded`,
`unsupported`, or `blocked`. The aggregate preview result can summarize counts,
but it should preserve item-level detail.

An item is `degraded` when the target can accept the object but with measurably
reduced fidelity. An item is `unsupported` when the target has no recognized
mapping for that object class, regardless of source quality. If multiple
classifications could apply, the precedence is `blocked` -> `unsupported` ->
`degraded` -> `portable`.

Aggregate preview status uses preview-specific values rather than backup
operation success values:

- `preview-clear`: all previewed items are portable
- `preview-with-concerns`: one or more items are degraded and none are
  unsupported or blocked
- `preview-with-blockers`: one or more items are unsupported or blocked

Alternative considered: only show valid/invalid. Rejected because migration
preview needs to distinguish reduced fidelity from complete incompatibility.

### Decision 5: Keep preview rules local and representative in foundation

Foundation can use deterministic local compatibility rules derived from the
selected source, target, object type, provenance, and metadata completeness. It
does not need a full adapter engine or remote runtime inspection.

Alternative considered: create a generalized migration mapping engine now.
Rejected because this first slice exists to define safe UX semantics and avoid
overcommitting to migration capability.

### Decision 6: Recent operations records previews as preview results

Completed migration previews should appear as compact recent-operation entries
with workflow type, timestamp, aggregate preview status, scope, and route to
preview detail.

Alternative considered: do not record previews because no state changed.
Rejected because users still need to return to the compatibility result during
the same page session.

## Risks / Trade-offs

- Fake-authority risk -> Use preview-only copy, explicit source/target/scope,
  and no apply or package actions.
- Inconclusive previews -> Represent uncertainty as `degraded` or `blocked`
  with actionable reasons instead of pretending complete compatibility.
- UI density -> Summarize counts in the result header and keep item detail in a
  preview table/list.
- Target taxonomy churn -> Keep target choices bounded and local to foundation;
  future adapter work can expand options without changing the preview-only
  workflow contract.
- Routed context ambiguity -> Degrade to selection/configuration instead of
  silently filling missing source or target fields.

## Migration Plan

- Add the new workflow type and preview helper types without changing existing
  backup/import/validate behavior.
- Add preview UI states behind `Backup / Migration`.
- Add route builders for explicit preview entry from `Project Overview`,
  `Assets`, and `Analysis`.
- If rollback is needed, remove `migration-preview` from the workflow
  descriptor list while leaving existing workflows untouched.

## Open Questions

None for foundation. Future changes may define richer adapter-specific target
profiles or turn preview results into migration apply inputs, but those are out
of scope here.
