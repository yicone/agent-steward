## Context

The project shell now has mature governance surfaces: Project Overview summarizes
the project, Assets explains reusable context objects, and Analysis groups
findings and routes to owning surfaces. The remaining trust gap is evidence
fidelity. These surfaces can currently fall back to `createContextAssetSeeds()`
and `createAnalysisFindingSeeds()`, which are useful for shape validation but
confusing when users ask whether counts and issues describe the current project.

The first live evidence slice should stay narrow. The repository already
contains explicit agent-facing files (`AGENTS.md`, `.github/copilot-*`,
`.codex/`, `.agents/skills/`, `.windsurf/`, hooks, prompts, and workflows). These
files are local, inspectable, and directly aligned with the product's rules,
skills, commands, and governance concepts.

## Goals / Non-Goals

**Goals:**

- Add a local-only project evidence provider for explicit repo instruction and
  agent configuration files.
- Normalize discovered files into reusable context assets with provenance,
  source, subtype, scope, status, and usage metadata.
- Let Project Overview, Assets, and Analysis consume provider-backed evidence
  before using seed/test fallbacks.
- Keep missing, unreadable, or unsupported evidence explicit and visible.
- Preserve the route-first and bounded governance page roles already accepted in
  OpenSpec.

**Non-Goals:**

- No broad source-code scan or semantic interpretation of arbitrary application
  files.
- No session transcript parsing, session-to-asset extraction, or session parser
  rewrite.
- No asset editing, repair, sync, deploy, runtime restore, cloud lookup, or
  privacy-redaction workflow.
- No claim that every local runtime, user-global config, or hidden agent store
  has been completely scanned.
- No replacement for Backup / Migration package generation or import semantics.

## Decisions

### Decision 1: Provider reads explicit repo-local agent-facing files only

The provider SHALL discover known local paths and file classes that are already
agent-facing: repository instruction files, Copilot/Codex/Windsurf/Antigravity
skills or workflows, prompts, hooks, and project-level agent rules. It SHALL NOT
recursively classify arbitrary source files.

Rationale: this gives real project evidence without over-promising analysis or
turning Assets into a general repository browser.

Alternative considered: scan the entire repository for keywords like "agent",
"skill", or "memory". Rejected because it creates false positives and makes
counts hard to trust.

### Decision 2: Provider output is normalized evidence, not UI state

The provider should return a small model containing:

- project identity/root metadata
- provider status (`available`, `empty`, `partial`, `unavailable`)
- normalized reusable context assets
- provider diagnostics for skipped, unreadable, unsupported, or ambiguous files

Surfaces consume this model and decide how to render it. The provider does not
own routing, selection state, or workflow execution.

### Decision 3: Mapping is conservative and explainable

Known mappings:

- `AGENTS.md`, `.github/copilot-instructions.md`, `.github/instructions/*.md`,
  and `.windsurf/rules/*.md` map to `rule`.
- `.agents/skills/*/SKILL.md`, `.agent/skills/*/SKILL.md`,
  `.codex/skills/*/SKILL.md`, `.windsurf/skills/*/SKILL.md`, and
  `.github/skills/*/SKILL.md` map to `skill`.
- workflow, prompt, hook, and command-like files map to `command` unless their
  path clearly indicates a skill or rule.
- Ambiguous or unsupported files remain `unknown`.

This mapping should be data-driven enough to test without needing a real user's
home directory.

### Decision 4: Seed data remains available but not silently default

Seed data remains useful for tests and demonstration fallback, but provider
availability changes the default path:

- provider available with assets: render provider-backed assets and evidence cue
- provider available but empty: render explicit zero-state, not seed rows
- provider unavailable: render unavailable cue and optionally labeled seed/test
  fallback only when the surface is intentionally in fallback/demo mode

### Decision 5: Analysis v1 derives only bounded provider diagnostics/findings

Analysis may show findings for concrete provider diagnostics such as unreadable
files, ambiguous asset class, duplicate/conflicting files, or stale provider
metadata if known. It SHALL NOT infer deep semantic conflicts or risky migration
findings from file content in this slice.

## Risks / Trade-offs

- [Risk] Provider counts can still feel incomplete because user-global runtime
  stores are out of scope. -> Mitigation: label evidence source as repo-local and
  keep unavailable/unsupported counts visible.
- [Risk] Large skill directories could be noisy. -> Mitigation: normalize each
  discovered skill by directory/file identity and cap UI summaries while keeping
  Assets as the inventory owner.
- [Risk] Mapping file paths to subtype may be wrong for custom repo layouts. ->
  Mitigation: unknown subtype is acceptable and testable; do not force a default.
- [Risk] Reading local files may expose sensitive absolute paths in UI. ->
  Mitigation: display project-relative paths by default and keep absolute paths
  out of copied summaries unless a diagnostic explicitly requires them.

## Migration Plan

1. Add provider model and normalization helpers with fixture-based tests.
2. Wire provider output into Project Overview, Assets, and Analysis using
   explicit available/empty/unavailable states.
3. Keep seed helpers for tests and fallback, but rename/cue usage so seed data is
   never mistaken for live project evidence.
4. Update README and QA prompt to describe provider-backed behavior and remaining
   boundaries.
5. If provider wiring causes runtime issues, rollback by passing `assetsAvailable:
   false` / `analysisAvailable: false` or labeled seed fallback into the affected
   surfaces while preserving the provider library behind tests.

## Open Questions

- Should provider discovery run synchronously from the server layer and pass data
  into the client shell, or should v1 keep provider helpers pure until a later API
  integration step? The implementation should choose the smallest path that keeps
  `pnpm build` and browser QA stable.
