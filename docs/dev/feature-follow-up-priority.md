# Feature Follow-Up Priority

Updated: 2026-04-17

This document is the control-thread view of follow-up sequencing after the
`Backup / Migration` expansion line (`bulk session backup` → `migration preview`
→ `project bundle foundation`) has shipped and been archived.

It is not a roadmap or implementation spec. It exists to:

- keep intentionally deferred scope visible
- preserve priority order between candidate feature lines
- make the next decision faster once the current line has merged and archived

Execution tracking still belongs in GitHub Issues.

## 1. Current Status

The recent `Backup / Migration` follow-up line is complete:

- `bulk-session-backup`: shipped and archived
- `migration-preview`: shipped and archived
- `project-bundle-foundation`: shipped and archived

The active OpenSpec line is now:

- `backup-migration-validation-result-hardening`: draft PR / validation in progress

## 2. Candidate Feature-Line Priority

The recommended next priority order is now:

1. `backup-migration-hardening`
2. `cross-agent-management / context-governance` research and proposal
3. `privacy-redaction`

Reasoning:

- `backup-migration-hardening` is the most execution-ready follow-up. It can
  tighten validation, routed continuity, result inspection, QA coverage, and
  workflow stability without re-opening product scope.
- `cross-agent-management / context-governance` remains strategically valuable,
  but it is still a research/proposal line rather than a ready implementation
  slice.
- `privacy-redaction` is a legitimate long-term risk area, but current use is
  personal and local-only, so it is not the highest-value next slice.

## 3. Candidate Lines

### P1: Backup / Migration Hardening

- Status: next execution-ready line
- Focus:
  - tighten workflow consistency after the recent expansion sequence
  - improve validation/result inspection where needed
  - improve routed handoff degradation and post-result continuity
  - raise QA confidence on edge cases and failure handling

Why this is next:

- it consolidates recently shipped behavior instead of creating a new product
  area
- it can produce a coherent, bounded slice with relatively low discovery cost

### P2: Cross-Agent Management / Context Governance

- Status: research/proposal line
- Focus:
  - clarify whether the next differentiated surface should be management of
    shared rules/memory/skills/commands across tools and projects
  - identify whether the right next slice is governance, distribution, health,
    or diagnostics

Why this is not immediately next:

- current material is still research-heavy
- it needs a sharper product boundary before implementation starts

### P3: Privacy Redaction

- Issue: `#7 Architecture Review v1: Privacy redaction options`
- Status: open, intentionally deprioritized
- Focus:
  - export/copy safety rails for sensitive diagnostics or raw payloads

Why this is lower priority right now:

- current usage is personal and local-only
- it remains important for future sharing/export flows, but it is not the most
  urgent next slice while the product is not yet used in broader or less-trusted
  contexts

## 4. Recommended Decision Rule

Choose `backup-migration-hardening` next if:

- the immediate goal is to stabilize the newly shipped workflow stack
- the team wants a bounded implementation slice with low discovery cost

Choose `cross-agent-management / context-governance` next if:

- the product conversation is ready to define a new project-level management
  surface beyond `Backup / Migration`
- the next goal is to sharpen long-term differentiation rather than harden
  existing workflow surfaces

Keep `privacy-redaction` deferred unless:

- exports or copied diagnostics begin to leave the local machine more often
- sensitive local paths, tokens, or payloads become a more immediate operational
  risk
