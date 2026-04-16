# Project Bundle Foundation Design

Date: 2026-04-16

Status: draft for user review

## Purpose

This document captures the converged design baseline for
`project-bundle-foundation`.

It is intentionally narrower than an OpenSpec proposal. Its job is to fix the
product boundary before proposal and implementation work begin.

This design should serve as the upstream input for:

- a future OpenSpec change for `project-bundle-foundation`
- external-agent proposal drafting
- workflow and QA prompt design for the `Backup / Migration` surface

## References

- [research-project-bundle.md](/docs/research-project-bundle.md)
- [session-backup-migration-ux.md](/docs/session-backup-migration-ux.md)
- [page-state-ia.md](/docs/page-state-ia.md)
- [task-flow-ia.md](/docs/task-flow-ia.md)
- [routed-context-handoff.md](/docs/routed-context-handoff.md)
- [feature-follow-up-priority.md](/docs/dev/feature-follow-up-priority.md)
- [session-backup/spec.md](/openspec/specs/session-backup/spec.md)
- [backup-migration/spec.md](/openspec/specs/backup-migration/spec.md)

## Product Intent

`Project Bundle` is a project-scoped portable package under `Backup / Migration`.

Its first responsibility is not cloud sync, app snapshotting, or third-party
runtime restoration. Its first responsibility is to generate a bounded local
bundle package that makes the current project context set explicit, inspectable,
and portable.

The bundle should preserve:

- what was selected for packaging
- why it was eligible
- what was excluded
- what warnings were present at generation time
- how project-scoped context members relate to one another

## Foundation Commitment

Foundation v1 should:

- provide a real `Project Bundle` workflow inside `Backup / Migration`
- generate a real local bundle package file
- require composition and validation before generation
- expose a result state with package identity and generation outcome

Foundation v1 should not:

- promise restore or apply
- promise vendor-runtime reopen
- become cloud sync
- become a full app snapshot
- silently infer full project composition from a routed entry

## Product Positioning

The user-facing promise should be:

- a validated, project-scoped portable package

The bundle also has preservation value, but preservation is a secondary value,
not the primary headline promise.

This avoids overstating completeness while still acknowledging that a generated
bundle is useful for later safekeeping and handoff.

## Relationship to Existing Workflows

`Project Bundle` is not a replacement for existing workflows.

### Session Backup

`Session Backup` remains the canonical preserved copy for session evidence.

`Project Bundle` should reuse `Session Backup` packaging rather than redefine
session packaging inside the bundle workflow.

### Migration Preview

`Migration Preview` remains the preview-only compatibility workflow.

`Project Bundle` is not the apply-version of migration preview. It is a package
generation workflow with explicit composition and validation.

### Import / Restore

Foundation v1 may generate a package that is importable later, but it does not
promise restore semantics in this change.

## Default Bundle Members

Foundation v1 should treat the following as the default project-scoped bundle
member set:

- sessions
- rules
- memory
- skills
- commands
- package-level metadata
- project-level metadata

This keeps the bundle aligned with the product's project-scoped context model
rather than collapsing into an asset-only package.

## Session Packaging Rule

Sessions included in `Project Bundle` should default to reuse existing
`session backup package` objects.

Foundation v1 should therefore:

- reference existing session backup packages
- not redefine canonical session payload structure
- not create a second session archive format inside the bundle workflow

This keeps `Session Backup` and `Project Bundle` cleanly layered:

- `Session Backup` = canonical session preserved copy
- `Project Bundle` = project-level composition container

## Workflow Shape

The workflow should be:

1. selection
2. configuration
3. validation
4. confirmation
5. generation
6. result

The workflow must not jump directly to generation.

Before any package file is written, the user must be able to inspect:

- intended bundle scope
- included members
- excluded members
- warning state
- blocker state
- validation summary

In practice, this means composition and validation are first-class workflow
steps, not secondary details.

## Validation Severity Strategy

Foundation v1 should be permissive by default.

The following member-quality problems should default to warnings rather than
blockers:

- missing provenance summary
- incomplete or uncertain subtype classification
- stale member state
- missing member reference that still leaves the bundle structurally valid

Blockers should be reserved for structural impossibility, for example:

- the bundle manifest cannot be formed legally
- required package identity or required metadata is missing
- no valid bundle output can be written
- workflow input is invalid to the point that no legal bundle can be created

This keeps v1 usable and allows severity tuning later based on real usage.

## Bundle File Minimum Structure

The generated bundle file should include, at minimum:

- bundle manifest
- package metadata
- project metadata
- member inventory
- member references
- validation summary
- lightweight metadata snapshots for each member

The metadata snapshot requirement matters because a pure reference list is too
fragile once the bundle leaves the original machine or workspace.

At the same time, v1 should stop short of embedding full payloads for every
member. The snapshot exists to preserve interpretability, not to create a full
second archive of all object contents.

## Routed Entry Rules

`Project Bundle` may be entered from:

- `Project Overview`
- `Assets`
- `Analysis`
- `Backup / Migration`

Routed handoff may prefill only:

- workflow identity
- origin cue or issue cue
- compact scope hint
- compact filter hint
- explicitly provided object references

Routed handoff must not:

- invent a bundle member set implicitly
- auto-decide final composition from a single asset, finding, or issue
- skip explicit selection or configuration
- proceed directly to generation

All routed entries may accelerate composition, but none may replace explicit
composition decisions.

## User-Facing Interpretation

The user should understand the workflow as:

- "Package this project's context set into a portable local bundle."

The workflow should not imply:

- "Clone the whole app state."
- "Rebuild this project automatically elsewhere."
- "Reopen my work inside another vendor runtime."

## Non-Goals

Foundation v1 does not include:

- cloud sync
- team collaboration bundle semantics
- full repository copy
- raw source copies by default
- machine-local tokens, ports, or secrets
- global app preferences
- restore or apply
- vendor-runtime continuation

## OpenSpec Implications

The future `project-bundle-foundation` OpenSpec change should reflect these
decisions directly:

- `Project Bundle` is a real workflow, not a placeholder entry
- the workflow generates a real local file
- generation is gated by explicit composition and validation
- sessions reuse the session-backup sub-format
- warnings are broad; blockers are structural
- the bundle file includes lightweight metadata snapshots
- routed handoff is assistive, not compositional authority

## Ready State

This design is ready to be used as the basis for:

- an external-agent prompt to draft OpenSpec artifacts
- a proposal/design/spec/tasks convergence pass
- later implementation planning after the proposal is reviewed
