## 1. Provider Model And Discovery

- [ ] 1.1 Define project evidence provider types for provider status, evidence item, diagnostics, and normalized result.
- [ ] 1.2 Implement repo-local discovery for explicit agent-facing files: `AGENTS.md`, `.github` Copilot instructions/prompts/skills, `.codex`, `.agents` / `.agent`, and `.windsurf` skills/rules/workflows/hooks.
- [ ] 1.3 Keep discovery bounded to recognized paths and file classes; do not keyword-scan arbitrary application source files.
- [ ] 1.4 Normalize discovered evidence into `ContextAssetInput` values with stable IDs, project-relative provenance, subtype, scope, source, status, and usage metadata.
- [ ] 1.5 Emit provider diagnostics for unreadable, skipped, unsupported, duplicate, or ambiguous evidence without exposing sensitive absolute paths in normal UI fields.

## 2. Surface Integration

- [ ] 2.1 Update Assets data flow to consume provider-backed assets when available.
- [ ] 2.2 Preserve explicit Assets zero-state behavior when the provider is available but empty.
- [ ] 2.3 Preserve labeled fallback behavior when provider evidence is unavailable and seed/test data is intentionally rendered.
- [ ] 2.4 Update Project Overview summary inputs so asset counts and evidence labels come from provider-backed local evidence when available.
- [ ] 2.5 Update Analysis data flow so provider diagnostics can become bounded findings, while no-diagnostic provider results show an explicit no-current-findings state.
- [ ] 2.6 Keep Backup / Migration workflow execution, project bundle generation, imports, restore semantics, and privacy-redaction scope unchanged.

## 3. Tests

- [ ] 3.1 Add provider unit tests for known instruction, skill, workflow, prompt, and hook path discovery.
- [ ] 3.2 Add provider unit tests for arbitrary source exclusion and ambiguous evidence normalization.
- [ ] 3.3 Add provider unit tests for available, empty, partial, and unavailable status behavior.
- [ ] 3.4 Add Assets tests for provider-backed inventory, empty provider state, unavailable provider state, and diagnostic visibility.
- [ ] 3.5 Add Project Overview tests proving provider-backed counts are not labeled sample data and empty/unavailable evidence does not fabricate counts.
- [ ] 3.6 Add Analysis tests proving provider diagnostics are bounded findings and seed findings remain labeled fallback only.

## 4. Documentation And QA

- [ ] 4.1 Update README to describe repo-local project evidence provider behavior and remaining boundaries.
- [ ] 4.2 Update relevant QA prompt(s) under `docs/viewer/` to verify provider-backed evidence, zero-state behavior, and seed fallback labeling.
- [ ] 4.3 Add or update a QA report only after browser/runtime verification is performed for the implemented UI wiring.
- [ ] 4.4 Run `pnpm test`, `pnpm build`, and `OPENSPEC_TELEMETRY=0 openspec validate project-evidence-provider-v1 --strict`.
