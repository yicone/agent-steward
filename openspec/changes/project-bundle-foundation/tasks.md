## 1. Workflow Model

- [ ] 1.1 Add `project-bundle` to backup workflow types, labels, descriptors,
  and step definitions.
- [ ] 1.2 Define bundle member category types: sessions, rules, memory, skills,
  commands, package-level metadata, project-level metadata.
- [ ] 1.3 Define bundle composition context: member selection state,
  configuration options, scope summary.
- [ ] 1.4 Define bundle validation result types: warning-level items,
  blocker-level items, validation summary.
- [ ] 1.5 Define bundle generation result types: package identity, file
  location, member inventory, generation timestamp, aggregate status.
- [ ] 1.6 Define lightweight member metadata snapshot shape: identity,
  provenance summary, scope, subtype, timestamps, status.
- [ ] 1.7 Define bundle manifest structure: schema version, package metadata,
  project metadata, member inventory, member references, validation summary.
- [ ] 1.8 Add helper functions for composition validation, severity
  classification, generation result creation, and recent-operation creation.
- [ ] 1.9 Ensure existing backup/import/validate/bulk/migration-preview workflow
  helpers remain backward compatible.

## 2. Selection and Composition

- [ ] 2.1 Add project bundle selection state to `BackupMigrationFoundation`.
- [ ] 2.2 Present default member categories (sessions, rules, memory, skills,
  commands, package-level metadata, project-level metadata) at selection.
- [ ] 2.3 Allow member deselection and inclusion adjustment.
- [ ] 2.4 Keep non-core objects (raw sources, caches, indexes, tokens, UI
  state, repo copies, app preferences) explicitly out of scope for v1, and do
  not build inclusion toggles for them.
- [ ] 2.5 Add configuration step for bundle-level options (bundle name, optional
  notes).
- [ ] 2.6 Ensure selection cannot be bypassed by routed entry or direct
  generation.

## 3. Validation

- [ ] 3.1 Validate composition completeness: at least one member selected,
  bundle identity derivable, manifest formable.
- [ ] 3.2 Classify warning-level issues: missing provenance, uncertain subtype,
  stale member state, non-critical missing references.
- [ ] 3.3 Classify blocker-level issues: unformable manifest, missing required
  metadata/identity, unwritable output, invalid workflow input.
- [ ] 3.4 Produce per-member validation status with issue classification.
- [ ] 3.5 Produce aggregate validation summary with warning count, blocker
  count, and member eligibility.
- [ ] 3.6 Surface sessions without existing backup packages as validation
  warnings.
- [ ] 3.7 Ensure warnings remain visible through confirmation state.
- [ ] 3.8 Define unresolved session-reference status for selected sessions that
  lack existing backup packages, without auto-generating session payloads.

## 4. Confirmation and Execution

- [ ] 4.1 Add confirmation state showing bundle scope, included members,
  excluded members, warning count, and blocker state.
- [ ] 4.2 Block confirmation when blockers exist.
- [ ] 4.3 Add execution state that generates the bundle file on the local
  filesystem.
- [ ] 4.4 Write bundle file with minimum structure: manifest, package metadata,
  project metadata, member inventory, member references, validation summary,
  and lightweight metadata snapshots.
- [ ] 4.5 Include schema version in bundle manifest.
- [ ] 4.6 When generation proceeds with a session-without-backup warning, write
  an unresolved session member reference plus metadata snapshot instead of
  silently omitting the session or generating an ad hoc session backup payload.

## 5. Result

- [ ] 5.1 Add result state showing package identity, file location, generation
  timestamp, member count, warning count, and validation summary.
- [ ] 5.2 Add bundle content inspection from result state.
- [ ] 5.3 Add failure result with actionable diagnostics and repair routes.
- [ ] 5.4 Update idle-state description copy in `BackupMigrationFoundation` to
  include project bundle.

## 6. Routed Handoff

- [ ] 6.1 Extend backup-migration handoff types to carry project bundle
  workflow identity, origin cue, scope hints, filter hints, and explicit object
  references.
- [ ] 6.2 Add `Project Overview → Project Bundle` route that opens bundle
  selection without invented member sets.
- [ ] 6.3 Add `Assets → Project Bundle` route that may prefill explicit asset
  references only.
- [ ] 6.4 Add `Analysis → Project Bundle` route that preserves issue context
  but does not infer composition.
- [ ] 6.5 Ensure stale or incomplete bundle handoff degrades to selection
  instead of broken workflow state.

## 7. Recent Operations

- [ ] 7.1 Record completed project bundle workflows as compact recent-operation
  entries.
- [ ] 7.2 Include workflow type, timestamp, aggregate status, and bundle
  identity in recent operations.
- [ ] 7.3 Route from a project bundle recent operation back to bundle result
  detail.
- [ ] 7.4 Ensure recent-operation copy does not claim restore, apply, or sync.

## 8. Tests and QA

- [ ] 8.1 Add model tests for project bundle workflow descriptors, member
  types, composition validation, severity classification, generation result,
  and recent-operation summary.
- [ ] 8.2 Add component tests for selection, configuration, validation
  (warnings and blockers), confirmation, execution, result (success and
  failure), and session-without-backup warning states.
- [ ] 8.3 Add shell routing tests for overview, assets, and analysis handoff
  into project bundle.
- [ ] 8.4 Add regression tests proving existing backup/import/validate/bulk/
  migration-preview workflows still work.
- [ ] 8.5 Prepare an external QA prompt covering composition-before-generation
  boundary, validation severity, session reuse, routed handoff prefill limits,
  bundle file structure, and recent operations.

## 9. Documentation and Validation

- [ ] 9.1 Update `README.md` if user-facing Backup / Migration behavior
  changes.
- [ ] 9.2 Update `CHANGELOG.md` under `## Unreleased` when implementation
  ships.
- [ ] 9.3 Run targeted tests for backup-migration model helpers,
  `BackupMigrationFoundation`, and shell routing.
- [ ] 9.4 Run `pnpm test`, `pnpm build`, and
  `OPENSPEC_TELEMETRY=0 openspec validate project-bundle-foundation --strict`.
- [ ] 9.5 Update external QA prompt to include project bundle smoke checks.
