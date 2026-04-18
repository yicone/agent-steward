# Feature Follow-Up Priority

Updated: 2026-04-18

This document is the control-thread view of follow-up sequencing after the
`Backup / Migration` expansion and hardening line has shipped and been
archived.

It is not a roadmap or implementation spec. It exists to:

- keep intentionally deferred scope visible
- preserve priority order between candidate feature lines
- make the next decision faster once the current line has merged and archived

Execution tracking still belongs in GitHub Issues.

## 1. Current Status

The recent `Backup / Migration` follow-up line is complete and archived:

- `bulk-session-backup`: shipped and archived
- `migration-preview`: shipped and archived
- `project-bundle-foundation`: shipped and archived
- `project-bundle-hardening`: shipped and archived

The `Project Overview` governance line is also complete and archived:

- `project-overview-governance-foundation`: shipped and archived

The broad `cross-agent-management / context-governance` exploration issue has
been closed after converging into the Project Overview governance slice. There
is no active OpenSpec change at the time of this update.

## 2. Candidate Feature-Line Priority

The recommended next priority order is now:

1. `context-assets-governance-hardening` proposal line
2. `session / search / viewer hardening` proposal line
3. `privacy-redaction`

Reasoning:

- `context-assets-governance-hardening` is the most natural next proposal line
  because Project Overview now routes attention into Assets, and the product
  direction depends on rules/memory/skills/commands becoming a stronger
  governance surface without turning into sync or editing infrastructure.
- `session / search / viewer hardening` remains valuable because Sessions is
  still the evidence backbone, but it should not become the product's primary
  identity again.
- `privacy-redaction` is a legitimate long-term risk area, but current use is
  personal and local-only, so it is not the highest-value next slice.

## 3. Candidate Lines

### P1: Context Assets Governance Hardening

- Status: recommended next proposal line
- Focus:
  - make `Assets` a stronger governance surface for rules, memory, skills, and
    commands
  - tighten asset health, in-effect explanation, stale/conflict/orphan
    semantics, and Analysis/Overview routing continuity
  - improve asset detail and inspection without building full editing,
    cross-agent sync, or deployment controls

Why this is next:

- it continues the project-first governance direction already shipped in
  `Project Overview`
- it deepens an existing top-level surface instead of adding another workflow
- it can remain local-first and bounded if it focuses on explanation,
  classification, and routing rather than sync

### P2: Session / Search / Viewer Hardening

- Status: candidate proposal line
- Focus:
  - improve evidence navigation and search affordances for sessions
  - tighten links from sessions into assets, analysis, and preservation
  - keep Sessions strong as a supporting page without reverting the whole
    product to session-first positioning

Why this is not immediately next:

- Sessions already has substantial shipped functionality
- the immediate product differentiation now depends more on context asset
  governance than on becoming a stronger session browser

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

Choose `context-assets-governance-hardening` next if:

- the immediate goal is to deepen the project-first governance surface
- the team wants Assets to better explain what is in effect, stale, conflicted,
  orphaned, or actionable

Choose `session / search / viewer hardening` next if:

- the immediate pain is evidence navigation, search, or session-to-asset
  continuity
- the team wants to improve core inspection confidence before deepening Assets

Keep `privacy-redaction` deferred unless:

- exports or copied diagnostics begin to leave the local machine more often
- sensitive local paths, tokens, or payloads become a more immediate operational
  risk
