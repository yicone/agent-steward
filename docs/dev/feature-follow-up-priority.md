# Feature Follow-Up Priority

Updated: 2026-04-15

This document is the control-thread view of follow-up sequencing after the
`Backup / Migration` foundation line.

It is not a roadmap or implementation spec. It exists to:

- keep intentionally deferred scope visible
- preserve priority order between candidate feature lines
- make the next decision faster once the current PR is merged

Execution tracking still belongs in GitHub Issues.

## 1. Current In-Flight Line

### P1: Migration Preview

- Issue: `#54 Track migration preview follow-up`
- Status: active proposal
- Goal:
  - add a preview-only portability workflow under `Backup / Migration`
  - require explicit source, target, and scope context
  - classify selected items as portable, degraded, unsupported, or blocked
  - stop at preview result with no migration apply, project bundle packaging, or
    vendor-runtime restore

This is the current primary line because `bulk-session-backup` has shipped and
been archived, leaving migration preview as the next P1 follow-up.

## 2. Completed or Deferred Follow-Ups

These items were deliberately excluded from `backup-migration-foundation`. Items
listed as shipped are preserved for history, not as active deferred work.

### P1: Bulk Session Backup

- Issue: `#53 Track bulk session backup follow-up`
- Status: shipped and archived
- Why it was deferred:
  - not required to replace the placeholder
  - increases workflow-state complexity sharply
  - needs multi-select, mixed eligibility, and partial-failure semantics

Why it is next-tier priority:

- it extends an already real workflow instead of creating a new product area
- it is valuable once the single-session workflow has stabilized

### P2: Project Bundle Foundation

- Issue: `#52 Track project bundle foundation follow-up`
- Why it was deferred:
  - it needs its own scope boundary and workflow identity
  - it has broader packaging and validation implications
  - it would otherwise over-expand the first `Backup / Migration` change

Why it is lower priority than the other two:

- it is more product-definitional
- it will likely need another proposal / UX convergence pass before
  implementation

## 3. Candidate Feature-Line Priority

Assuming `migration-preview` merges cleanly, the recommended next priority order
is:

1. `project-bundle-foundation`
2. `privacy-redaction`

Reasoning:

- `project-bundle-foundation` becomes the next natural `Backup / Migration`
  expansion after migration preview clarifies portability boundaries.
- `privacy-redaction` cuts across diagnostics, exports, backups, and review
  tooling; it remains important but should not be mixed into migration preview.

## 4. Other Open Work

### Privacy Redaction

- Issue: `#7 Architecture Review v1: Privacy redaction options`
- Priority: separate strategic thread, not next in sequence after
  `backup-migration-foundation`

Reason:

- it cuts across diagnostics, exports, backups, and review tooling
- it should not be mixed into the current workflow-page stabilization cycle

## 5. Recommended Decision Rule

Once the current `migration-preview` PR is merged:

- choose `project-bundle-foundation` next if the product conversation is ready
  to commit to bundle boundaries and packaging promises
- choose `privacy-redaction` next if sensitive diagnostics, exports, or package
  contents become the dominant risk before more portability features
