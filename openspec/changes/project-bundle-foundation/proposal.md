## Why

`Backup / Migration` now supports single session backup, bulk session backup,
import, validate, and migration preview workflows. The missing piece is
project-level packaging: users still cannot compile their project-scoped agent
context — sessions, rules, memory, skills, commands, and metadata — into a
validated portable bundle file.

`Project Bundle` fills this gap as the first real project-level packaging
workflow. It should produce a bounded local bundle file that makes the project
context set explicit, inspectable, and portable, without overpromising restore,
vendor-runtime continuation, or cloud sync.

## What Changes

- Add a `project-bundle` workflow to `Backup / Migration`.
- Define default bundle members: sessions, rules, memory, skills, commands,
  package-level metadata, and project-level metadata.
- Require explicit composition (selection + configuration) and validation before
  any bundle file is generated.
- Generate a real local bundle package file with manifest, metadata, member
  inventory, member references, validation summary, and lightweight metadata
  snapshots for each member.
- Reuse existing `session backup package` semantics for sessions included in the
  bundle — do not redefine canonical session payload or create a second session
  archive format.
- Apply a permissive validation severity strategy: structural impossibilities
  are blockers; provenance gaps, stale state, and uncertain classification are
  warnings.
- Support routed entry from `Project Overview`, `Assets`, `Analysis`, and
  `Backup / Migration` with bounded prefill rules: handoff may provide workflow
  identity, origin/issue cue, compact scope/filter hints, and explicit object
  references, but must not invent member sets, auto-decide composition, skip
  explicit selection, or proceed directly to generation.
- Record completed project bundle workflows as compact recent-operation entries.
- Do not add restore, apply, vendor-runtime reopen, cloud sync, team
  collaboration handoff, app snapshot, or privacy-redaction behavior in this
  change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `backup-migration`: Adds a project-bundle generation workflow with
  composition, validation, generation steps, member inventory types, bundle
  manifest structure, routed bundle entry, and recent-operation summary.

## Impact

- Affected UI: `src/components/BackupMigrationFoundation.tsx` workflow selector,
  workflow body, composition panel, validation panel, result panel, and recent
  operations.
- Affected model code: `src/lib/backupMigration.ts` workflow descriptors, bundle
  member types, composition context types, validation helpers, generation result
  types, and handoff mapping.
- Affected shell code: `ProjectShellClient` route builders for overview, assets,
  and analysis project-bundle entry.
- Affected tests: model tests, component tests for bundle workflow states, and
  shell routing tests for bundle handoff.
- Affected docs: `README.md`, `CHANGELOG.md`, and external QA prompt when the
  implementation ships.
