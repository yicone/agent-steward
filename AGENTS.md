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
