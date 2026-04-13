# Feature Follow-Up Priority

Updated: 2026-04-13

This document is the control-thread view of what should happen after the current
`backup-migration-foundation` implementation line.

It is not a roadmap or implementation spec. It exists to:

- keep intentionally deferred scope visible
- preserve priority order between candidate feature lines
- make the next decision faster once the current PR is merged

Execution tracking still belongs in GitHub Issues.

## 1. Current In-Flight Line

### P0: Backup / Migration Foundation

- Issue: `#50 Track backup / migration foundation`
- Status: active
- Goal:
  - replace the `Backup / Migration` placeholder with a bounded workflow-first
    foundation
  - support:
    - `session-backup`
    - `import-backup`
    - `validate-package`
    - routed handoff
    - recent operations

This is the current primary line because it closes the last top-level
placeholder in the project shell.

## 2. Explicitly Deferred Follow-Ups

These items were deliberately excluded from `backup-migration-foundation`.

### P1: Bulk Session Backup

- Issue: `#53 Track bulk session backup follow-up`
- Why it was deferred:
  - not required to replace the placeholder
  - increases workflow-state complexity sharply
  - needs multi-select, mixed eligibility, and partial-failure semantics

Why it is next-tier priority:

- it extends an already real workflow instead of creating a new product area
- it is valuable once the single-session workflow has stabilized

### P1: Migration Preview

- Issue: `#54 Track migration preview follow-up`
- Why it was deferred:
  - preview-only behavior risks fake-authority UX
  - needs clearer portability semantics before implementation
  - should not ship as a seed-only shell mixed into the first workflow page

Why it is next-tier priority:

- it naturally belongs under `Backup / Migration`
- it can reuse the workflow spine once foundation is stable

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

Assuming `backup-migration-foundation` merges cleanly, the recommended priority
order is:

1. `bulk-session-backup`
2. `migration-preview`
3. `project-bundle-foundation`

Reasoning:

- `bulk-session-backup` is the most direct extension of already-real workflow
  behavior and has the least product ambiguity.
- `migration-preview` fits the same page and model family, but still needs more
  semantic precision than bulk backup.
- `project-bundle-foundation` is strategically important, but it deserves a
  narrower dedicated line rather than being rushed in immediately after the
  current workflow page lands.

## 4. Other Open Work

### Privacy Redaction

- Issue: `#7 Architecture Review v1: Privacy redaction options`
- Priority: separate strategic thread, not next in sequence after
  `backup-migration-foundation`

Reason:

- it cuts across diagnostics, exports, backups, and review tooling
- it should not be mixed into the current workflow-page stabilization cycle

## 5. Recommended Decision Rule

Once the current `backup-migration-foundation` PR is merged:

- choose `bulk-session-backup` next if the current workflow page is functionally
  stable and the team wants the fastest incremental expansion
- choose `migration-preview` next if portability / compatibility semantics have
  become the dominant product question
- choose `project-bundle-foundation` next only if the product conversation is
  ready to commit to bundle boundaries and packaging promises
