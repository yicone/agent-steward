## Why

Project Overview, Assets, and Analysis now have coherent governance surfaces, but
their current asset and finding counts are still backed primarily by foundation
seed data. This change connects those surfaces to explicit local project evidence
so the app can answer "what project is this about?" and "are these real local
assets?" without fabricating unavailable context.

## What Changes

- Introduce a bounded local project evidence provider that reads explicit
  agent-facing repository files and normalizes them into provider evidence.
- Derive reusable context assets from repo instruction, skill, workflow, prompt,
  hook, and Copilot/Codex/Windsurf/Antigravity guidance files.
- Replace seed-first behavior in Project Overview, Assets, and Analysis with
  provider-backed data when local evidence is available, while preserving
  explicit unavailable and zero states.
- Keep provider scope read-only and local-only; no cloud lookup, runtime restore,
  asset editing, sync, or privacy-redaction workflow is added.
- Preserve seed data only as a clearly labeled fallback or test fixture, not as
  the default representation of the current project when provider evidence is
  available.

## Capabilities

### New Capabilities
- `project-evidence-provider`: Local provider contract for discovering,
  normalizing, and reporting explicit project evidence used by governance
  surfaces.

### Modified Capabilities
- `context-assets`: Assets SHALL consume provider-backed reusable context assets
  before falling back to labeled seed/test data.
- `project-overview-governance`: Project Overview SHALL label and summarize
  provider-backed local evidence instead of presenting seed counts as project
  evidence.
- `analysis-foundation`: Analysis SHALL distinguish provider-derived findings
  from seed interpretations and keep no-evidence states explicit.

## Impact

- New provider/model helpers under `src/lib/` for project evidence discovery and
  normalization.
- `AssetsFoundation`, `ProjectShellClient` / Project Overview, and
  `AnalysisFoundation` data flow changes to consume provider results.
- Tests for provider discovery, normalization, unavailable evidence, and
  seed-fallback labeling.
- Documentation and QA prompt updates that remove stale "sample data until live
  inventory" assumptions where provider evidence is available.
