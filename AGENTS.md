# AGENTS.md

Repository guidance for coding agents working in `agent-storage-manager`.

## Scope

- This file applies to the whole repository.
- Keep edits focused. Do not mix unrelated cleanup into feature or bugfix work.

## Source of truth

- `README.md`: current product scope, user-facing setup, and runtime prerequisites
- `ROADMAP.md`: future work only
- `CHANGELOG.md`: shipped / merged work only
- `docs/adr/ADR-001-use-language-server-rpc.md`: canonical decision for session retrieval strategy
- `docs/storage/local-storage-notes.md`: version-scoped Antigravity / Windsurf storage, attach, and token facts

Do not duplicate the same fact across these files unless each copy serves a different purpose. Prefer linking over restating.

## Project shape

- App stack: Next.js 14 + React 18 + TypeScript
- Styling: Tailwind CSS v4 + shadcn/ui, with some legacy global CSS still present
- Tests: Vitest
- Package manager: `pnpm`

## Common commands

- Install: `pnpm install`
- Dev server: `pnpm dev`
- Build: `pnpm build`
- Start prod build: `pnpm start`
- Tests: `pnpm test`
- Lint: `pnpm lint`

## Engineering expectations

- Preserve the local-first model. Do not introduce cloud dependencies for core session reading.
- Prefer LS/runtime interfaces over reverse-engineering `.pb` storage unless the task explicitly requires storage analysis.
- When changing Antigravity / Windsurf attach logic, update `docs/storage/local-storage-notes.md` with version-scoped facts and validation commands.
- Keep diagnostics concrete: show exact source, failure mode, and actionable remediation.
- Treat tokens, local ports, paths, and exported diagnostics as sensitive data.

## Documentation rules

- Follow SSoT / DRY.
- Treat GitHub Issues / PRs as optional coordination artifacts, not as the only record of scope or completion.
- Keep `ROADMAP.md` theme-first: organize entries by product / engineering topic, not by issue number.
- In `ROADMAP.md`, use GitHub references only as secondary metadata (for example `refs: #8`), not as the primary structure.
- Do not turn `ROADMAP.md` into a live GitHub status snapshot; record durable planning themes there and move shipped items to `CHANGELOG.md`.
- If work is shipped/completed, update `CHANGELOG.md` instead of leaving it in `ROADMAP.md`.
- If work changes current behavior or prerequisites, update `README.md`.
- If work changes long-lived architectural direction, update the relevant ADR instead of inventing a parallel explanation elsewhere.

## Validation

- Run targeted tests for the code you change when feasible.
- If you touch parsing, attach, normalization, or diagnostics logic, prefer adding or updating unit tests in the same area.

## Before Ending a Session

When wrapping up work, verify documentation is current.

**How to trigger**:
- **Windsurf**: Invoke `wrap-up` skill (e.g., "/wrap-up" or "执行 wrap-up")
- **Codex**: Invoke `wrap-up` skill (e.g., "执行 wrap-up skill")
- **Manual**: Run through the checklist below

**Note**: Agent cannot detect session end automatically. You must explicitly request wrap-up.

Checklist:

- [ ] **CHANGELOG.md**: User-facing changes recorded under `## Unreleased`
  - Skip: internal refactors, tests-only changes, documentation typo fixes
  - Include: new features, bug fixes, UI changes, performance improvements
- [ ] **ROADMAP.md**: Move completed items to CHANGELOG (don't duplicate)
- [ ] **README.md**: Update if behavior or prerequisites changed
- [ ] **ADR**: Create/update if architectural direction changed

**Quick check**: Run `git diff --stat` to see what files changed, then decide what needs documenting.

## Release Process

When a release is needed (significant milestone, bug fixes, or explicit request):

1. **Pre-release checks** (all must pass):
   - Working directory clean (`git status`)
   - Tests pass (`pnpm test`)
   - Build succeeds (`pnpm build`)
   - CHANGELOG.md updated with `## Unreleased` entries

2. **Version bump** (invoke `release` skill or manually):
   - `pnpm version:patch` — bug fixes (0.1.0 → 0.1.1)
   - `pnpm version:minor` — new features (0.1.0 → 0.2.0)
   - `pnpm version:major` — breaking changes (0.1.0 → 1.0.0)

3. **Post-bump**:
   - Move CHANGELOG entries from `## Unreleased` to new version section
   - Commit: `docs(changelog): update for vx.x.x`
   - Push the commit (tag already pushed by `postversion` hook)

4. **Source of truth for versioning**:
   - `docs/dev/versioning-strategy.md` — when to use manual vs automated releases
   - `package.json` `version` — single source of current version
