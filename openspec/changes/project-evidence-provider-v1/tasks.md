## 1. Provider Model And Discovery

- [x] 1.1 Define project evidence provider types for provider status, evidence item, diagnostics, and normalized result.
- [x] 1.2 Implement repo-local discovery from a recognized path allowlist for explicit agent-facing files: `AGENTS.md`, `.github/copilot-instructions.md`, `.github/instructions/*.md`, `.github/prompts/*`, `.github/skills/*/SKILL.md`, `.codex/skills/*/SKILL.md`, `.codex/agents/*`, `.codex/hooks.json`, `.agents/skills/*/SKILL.md`, `.agent/skills/*/SKILL.md`, and `.windsurf` skills/rules/workflows/hooks.
- [x] 1.3 Keep discovery bounded to recognized paths and file classes; do not keyword-scan arbitrary application source files.
- [x] 1.4 Normalize discovered evidence into `ContextAssetInput` values with stable IDs, project-relative provenance, subtype, scope, source, status, and usage metadata.
- [x] 1.5 Emit provider diagnostics for unreadable, skipped, unsupported, duplicate, or ambiguous evidence without exposing sensitive absolute paths in normal UI fields.

## 2. Surface Integration

- [x] 2.1 Update Assets data flow to consume provider-backed assets when available.
- [x] 2.2 Preserve explicit Assets zero-state behavior when the provider is available but empty.
- [x] 2.3 Preserve labeled fallback behavior when provider evidence is unavailable and seed/test data is intentionally rendered.
- [x] 2.4 Update Project Overview summary inputs so asset counts and evidence labels come from provider-backed local evidence when available.
- [x] 2.5 Update Analysis data flow so provider diagnostics can become bounded findings, while no-diagnostic provider results show an explicit no-current-findings state.
- [x] 2.6 Keep Backup / Migration workflow execution, project bundle generation, imports, restore semantics, and privacy-redaction scope unchanged.

## 3. Tests

- [x] 3.1 Add provider unit tests for known instruction, skill, workflow, prompt, and hook path discovery.
- [x] 3.2 Add provider unit tests for arbitrary source exclusion and ambiguous evidence normalization.
- [x] 3.3 Add provider unit tests proving session transcript files and session parser inputs are not parsed or converted into assets.
- [x] 3.4 Add provider unit tests proving discovery does not read user-global runtime stores, external paths, cloud sources, or paths outside the repository root.
- [x] 3.5 Add provider unit tests for available, empty, partial, and unavailable status behavior.
- [x] 3.6 Add Assets tests for provider-backed inventory, empty provider state, unavailable provider state, and diagnostic visibility.
- [x] 3.7 Add Project Overview tests proving provider-backed counts are not labeled sample data and empty/unavailable evidence does not fabricate counts.
- [x] 3.8 Add Analysis tests proving provider diagnostics are bounded findings and seed findings remain labeled fallback only.

## 4. Documentation And QA

- [x] 4.1 Update README to describe repo-local project evidence provider behavior and remaining boundaries.
- [x] 4.2 Update relevant QA prompt(s) under `docs/viewer/` to verify provider-backed evidence, zero-state behavior, and seed fallback labeling.
- [ ] 4.3 Add or update a QA report only after browser/runtime verification is performed for the implemented UI wiring.
- [x] 4.4 Run `pnpm test`, `pnpm lint`, `pnpm build`, and `OPENSPEC_TELEMETRY=0 openspec validate project-evidence-provider-v1 --strict`.
