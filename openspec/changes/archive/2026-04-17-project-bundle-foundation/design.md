## Context

`Backup / Migration` is a bounded workflow page for preservation, portability,
and recovery-oriented operations. It already hosts single session backup, bulk
session backup, import backup, validate package, and migration preview. These
workflows operate at the session or package level.

`Project Bundle` is the first project-scoped packaging workflow. It compiles a
validated, portable, local bundle file from the current project's agent context
set — sessions, rules, memory, skills, commands, and metadata — without
requiring the user to export each member individually.

The user-facing promise is: **a validated, project-scoped portable package**.
Preservation is a secondary value, not the headline promise. The bundle is not
a full app snapshot, not a migration-preview apply version, not a session-backup
wrapper, and not a repository copy.

## Relationship to Existing Workflows

### Relationship to Session Backup

`Session Backup` remains the canonical preserved copy for session evidence.

`Project Bundle` reuses existing `session backup package` semantics for session
members. It does not redefine canonical session payload, invent a second
session archive format, or generate ad hoc session backup payloads as part of
bundle execution.

The layering is:

- `Session Backup` = canonical session preserved copy
- `Project Bundle` = project-scoped composition container

### Relationship to Migration Preview

`Migration Preview` remains a preview-only compatibility workflow.

`Project Bundle` is not a migration-preview apply step and should not inherit
apply semantics from preview terminology. Its responsibility is bounded package
generation after explicit composition and validation, not portability preview
classification or migration execution.

### Relationship to Import / Restore

Foundation v1 may produce a package that a future workflow can import or
inspect, but this change does not promise restore semantics, import-ready
guarantees across every environment, or vendor-runtime continuation.

## Goals / Non-Goals

**Goals:**

- Add `project-bundle` to the existing `Backup / Migration` workflow model.
- Define default bundle member categories: sessions, rules, memory, skills,
  commands, package-level metadata, and project-level metadata.
- Require explicit composition (selection and configuration) and validation
  before bundle generation.
- Generate a real local bundle package file on the filesystem.
- Include in the bundle file: bundle manifest, package metadata, project
  metadata, member inventory, member references, validation summary, and
  lightweight metadata snapshots for each member.
- Reuse `session backup package` semantics for session members instead of
  redefining canonical session payload.
- Apply permissive validation severity: structural impossibilities are blockers;
  provenance gaps, uncertain classification, stale state, and non-critical
  reference gaps are warnings.
- Support routed entry from `Project Overview`, `Assets`, `Analysis`, and
  `Backup / Migration` with bounded prefill authority.
- Record completed bundle workflows as compact recent-operation entries.

**Non-Goals:**

- No restore or apply.
- No vendor-runtime reopen or continuation.
- No cloud sync.
- No team collaboration handoff semantics.
- No full app state snapshot.
- No full repository copy.
- No privacy-redaction in this change.
- No raw source copies in v1.
- No machine-local tokens, ports, or secrets in the bundle.
- No global app preferences in the bundle.

## Decisions

### Decision 1: Add project bundle as a workflow type, not a separate page

`project-bundle` should use the same workflow selector, workflow spine,
validation panel, result panel, and recent operations model as other
`Backup / Migration` workflows.

Alternative considered: add a standalone bundle page. Rejected because the
product defines `Backup / Migration` as the workflow home for preservation and
portability work, and project bundle is a portability workflow.

### Decision 2: Use a full workflow spine including generation

The project bundle state path should be:
Idle → Selection → Configuration → Validation → Confirmation → Execution → Result.

Unlike migration preview which stops at result, project bundle generates a real
file. Therefore confirmation and execution are required workflow steps.

Alternative considered: skip confirmation and go directly from validation to
generation. Rejected because the design requires explicit user inspection of
composition, warnings, and blockers before any package file is written.

### Decision 3: Default bundle members are project-scoped context objects

The default member categories are: sessions, rules, memory, skills, commands,
package-level metadata, and project-level metadata. These align with the
product's project-scoped context model.

Sessions, rules, memory, skills, and commands are the selectable composition
categories. Package-level metadata and project-level metadata remain mandatory
foundation metadata in v1: they are always included in the generated bundle and
should be shown as fixed sections rather than removable toggles.

Items explicitly excluded from v1 membership: raw source copies, derived view
caches, search indexes, internal cache / temp state, UI state, machine-local
tokens / ports / secrets, repository full copy, and app preferences / global
runtime state. Foundation v1 should not expose inclusion toggles for these
objects.

Alternative considered: start with sessions only. Rejected because project
bundle is explicitly a project-level composition container, not a session-only
backup.

### Decision 4: Sessions reuse session backup package semantics

Sessions included in a project bundle reference existing session backup package
objects. The bundle does not redefine canonical session payload, create a second
session archive format, or embed raw session sources by default.

Alternative considered: define an independent session representation for
bundles. Rejected to avoid schema duplication and divergent migration pathways.

When a selected session lacks an existing backup package, bundle validation
should surface a warning and preserve the user's composition intent by writing
an unresolved session member reference plus metadata snapshot. It must not
silently omit the session and must not generate an ad hoc session backup
payload during bundle execution.

### Decision 5: Validation severity is permissive by default

Warning-level issues (proceed allowed):
- Missing or incomplete provenance summary.
- Uncertain subtype classification for a member.
- Stale member state.
- Missing member reference that does not break bundle structural validity.

Blocker-level issues (proceed denied):
- Bundle manifest cannot be formed legally.
- Required package identity or required metadata is missing to the point that
  no valid bundle can be generated.
- No valid bundle output can be written.
- Workflow input is invalid to the point that no legal bundle can be created.

Alternative considered: strict validation that blocks on provenance gaps.
Rejected because v1 should be usable across imperfect real projects, with
severity tuning informed by real usage later.

### Decision 6: Bundle file includes lightweight metadata snapshots

Each member in the bundle file should carry a lightweight metadata snapshot —
enough to preserve interpretability when the bundle leaves the original machine
or workspace.

This is not a full payload embed for every member. The snapshot preserves
identity, provenance summary, scope, subtype, timestamps, and status — not the
full object content.

Alternative considered: pure reference list only. Rejected because references
without metadata are too fragile for offline or cross-machine interpretability.

Alternative considered: full payload embed for all members. Rejected because
v1 should remain lightweight and avoid the archive-weight and privacy risks of
embedding full member content.

### Decision 7: Routed handoff is assistive, not compositional authority

Routed handoff from `Project Overview`, `Assets`, `Analysis`, or
`Backup / Migration` may prefill:
- Workflow identity (`project-bundle`).
- Origin cue or issue cue.
- Compact scope hint.
- Compact filter hint.
- Explicitly provided object references.

Routed handoff must not:
- Invent a bundle member set implicitly.
- Auto-decide final composition from a single asset, finding, or issue.
- Skip explicit selection or configuration.
- Proceed directly to generation.

All routed entries may accelerate composition, but none may replace explicit
composition decisions.

Alternative considered: allow routed entry to skip selection when coming from
overview with a "full project" cue. Rejected because implicit full-scope
composition without user inspection violates the design's composition-before-
generation requirement.

### Decision 8: Recent operations records bundle results

Completed project bundle workflows should appear as compact recent-operation
entries with workflow type, timestamp, aggregate status, bundle identity, and
route to bundle result detail.

Alternative considered: do not record bundle runs. Rejected because users need
to return to inspect bundle results within the same page session.

## Risks / Trade-offs

- Composition complexity → Keep default member set well-defined; allow
  deselection but do not force deep configuration in the first step.
- Session reference fragility → Sessions lacking an existing backup package
  should produce a validation warning, not silently skip the session or fail the
  entire bundle.
- Snapshot depth ambiguity → Define a clear enumeration of snapshot fields in
  implementation to prevent scope creep from "metadata snapshot" to "full
  content embed".
- Bundle file format evolution → Use a schema version field in the manifest from
  day one so import / validate can gate on version later.
- Routed entry confusion → Clearly separate prefill (assistive) from
  composition (authoritative) in UX copy and workflow behavior.
- User expectation mismatch → Users may expect the bundle to mean "full project
  clone" or "everything". UX copy must frame the bundle as a portable context
  package, not a complete archive.

## Migration Plan

- Add the new workflow type and bundle helper types without changing existing
  backup / import / validate / bulk / migration-preview behavior.
- Add bundle composition, validation, and generation UI states behind
  `Backup / Migration`.
- Add route builders for explicit bundle entry from `Project Overview`, `Assets`,
  and `Analysis`.
- If rollback is needed, remove `project-bundle` from the workflow descriptor
  list while leaving existing workflows untouched.

## Open Questions

None for foundation. Future changes may define restore/apply semantics for
bundle packages, richer member categories, privacy-redaction integration, or
team collaboration bundle semantics, but those are out of scope here.
