# AGENTS.md

Repository guidance for coding agents working in `agent-switch`.

## Scope

- This file applies to the whole repository.
- Keep edits focused. Do not mix unrelated cleanup into feature or bugfix work.

## Agent terminology

This file is read by multiple coding agents. To avoid ambiguity:

| Product | Agent name | Notes |
|---------|-----------|-------|
| Windsurf IDE | **Cascade** | The agentic AI inside Windsurf |
| GitHub Copilot | **Copilot** | Family: Local Agent (VS Code / CLI), Cloud Agent (coding agent), Code Review, Chat |
| OpenAI Codex | **Codex** | CLI and App; **Codex Web** is the cloud agent variant |
| Google Antigravity | **Antigravity** | IDE; also shares skills ecosystem with Gemini CLI |

When this file says "Windsurf", it means the Cascade agent running inside the Windsurf IDE.

## Source of truth

- `README.md`: current product scope, user-facing setup, and runtime prerequisites
- `CHANGELOG.md`: shipped / merged work only
- GitHub Issues: active work tracking (short-term, 0-2 weeks)
- `openspec/specs/` and `openspec/changes/`: normative requirements and active change artifacts when the current work is being tracked in OpenSpec
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

## Validation

- Run targeted tests for the code you change when feasible.
- If you touch parsing, attach, normalization, or diagnostics logic, prefer adding or updating unit tests in the same area.

## Agent orchestration

- When the user designates a conversation as the control thread, use it to coordinate scope, PR state, validation status, and next-step prompts.
- Suggest a new conversation when an execution line becomes large, requires a separate context window, or can proceed independently with a focused prompt.
- Use subagents only when explicitly authorized by the user. Authorization may be one-off or standing for the current project/control-thread workflow; when standing authorization is granted, the active agent may delegate within this framework without asking again unless the user revokes or narrows it.
- Prefer reusing an existing suitable subagent; when spawning a new one, do not fork the full conversation context unless the task requires it.
- In a control-thread workflow, keep the control thread focused on orchestration: scope convergence, artifact acceptance, PR state, validation synthesis, and final decisions. Delegate bounded execution to suitable authorized subagents instead of absorbing every task locally.
- Prefer subagents for: OpenSpec artifact review, large OpenSpec implementation, browser QA / Playwright runtime verification, broad codebase audits, and parallel research that can report back as evidence.
- Keep in the control thread: product decisions, ambiguous scope tradeoffs, review-comment classification, final integration judgment, merge readiness, and any action that changes GitHub issue / PR state.
- When delegating, give each subagent a bounded objective, explicit source-of-truth files, allowed write scope, required validation commands, and expected final report format. Fold the result back into the control thread before PR or issue state changes.
- Prefer the agent's native branch/worktree handling. Do not use third-party worktree helpers unless the user explicitly asks.

## Branching workflow

- Formal PR branches should use project-semantic prefixes rather than agent-identity prefixes:
  - `feat/<change>` for feature or OpenSpec implementation/proposal lines
  - `spec/<change>` for spec-only or OpenSpec archive work when it will be reviewed as a standalone PR
  - `docs/<change>` for documentation/process-only changes
  - `fix/<change>` for bugfix or hardening-only changes
- Reserve `codex/<change>` for temporary Codex-local branches, experiments, or short-lived work that will not be the durable PR branch unless the user explicitly accepts that naming.
- Open a draft PR for each coherent, validated feature slice.
- If follow-up work depends on an unmerged PR, either wait for merge and branch from updated `main`, or explicitly create stacked work from the PR branch.
- If follow-up work does not depend on an unmerged PR, it may proceed in parallel from updated `main`.
- Research, QA, prompts, and OpenSpec proposals may proceed in parallel without waiting for implementation PRs to merge, as long as dependencies are stated.

## Documentation rules

**Two-layer source of truth**:

| Layer | Scope | Tool | When to update |
|-------|-------|------|----------------|
| **Execution** (0-2 weeks) | Concrete tasks in progress | GitHub Issues | Create Issue when starting work |
| **History** (shipped) | Completed milestones | CHANGELOG.md | Record on every user-facing ship |

- Follow SSoT / DRY.
- Treat GitHub Issues as execution coordination, not durable planning. Close Issues when done.
- If an OpenSpec change exists for the work, treat its artifacts and affected specs as the normative source for that change's intended behavior.
- When shipping: Close Issue → Record in CHANGELOG.md.
- If work changes current behavior or prerequisites, update `README.md`.
- If work changes long-lived architectural direction, update the relevant ADR.
- Mid-term planning (2 weeks-3 months) lives in GitHub Issues with appropriate labels/milestones, or in your personal notes — not in a separate ROADMAP file.

## PR Review Workflow

- For PR review triage and agent-assisted fixes, follow `docs/dev/pr-review-agent-workflow.md`.
- Before opening a PR, marking it ready, or recommending merge, run the applicable PR preflight checks even if no Copilot review exists yet:
  - If the PR is a medium/large implementation slice, OpenSpec implementation, backup/migration change, parser/diagnostics/local-path-sensitive change, or shell/navigation change, perform or delegate an independent pre-review before marking ready.
  - If the PR changes UI/runtime behavior, record browser QA evidence or explicitly state why browser QA is not required; keep the PR draft until that evidence exists or is explicitly waived.
  - If the PR is spec-only or docs-only, skip browser QA unless the docs change tooling behavior; still run OpenSpec validation for OpenSpec artifacts.
  - Once a PR exists, fetch unresolved review threads before recommending ready or merge, even when CI is green.
- Treat Copilot review comments as advisory input, not merge-blocking approval or requested changes.
- Classify review feedback before editing: `must-fix`, `should-fix`, `product-decision`, or `ignore`.
- Batch review comments from the same review round; do not push one fix per comment unless the issue is urgent or blocking.
- Treat Copilot re-review as a finite quality gate. After two review/fix passes, continue only for `must-fix`, introduced regressions, or explicitly accepted `should-fix` comments; otherwise move non-blocking leftovers to GitHub Issues.
- Do not automatically change product names, scope boundaries, or placeholder commitments without user confirmation.
- After pushing review fixes, request Copilot re-review manually or with `gh pr edit <number> --add-reviewer copilot-pull-request-reviewer` when available; do not assume Copilot re-reviews automatically after new commits.
- Before marking a PR ready or recommending merge, check unresolved review threads and either resolve handled/stale threads with explicit authorization or move remaining valid follow-up work to an Issue.
- Keep review-fix commits separate from process/documentation workflow changes when practical.
- External QA reports should preserve original findings. If a blocker is fixed and retested, add a clear re-test result instead of deleting the original failure record.

## Available automations

| Action | Cascade / Codex / Copilot | Location |
|--------|---------------------------|----------|
| Release version | `release` skill | `.agents/skills/release/` |
| Session wrap-up | `wrap-up` skill | `.agents/skills/wrap-up/` |
| PR review fix | `pr-review-fix` skill | `.agents/skills/pr-review-fix/` |
| External QA triage | `external-qa-triage` skill | `.agents/skills/external-qa-triage/` |

OpenSpec lifecycle skills (`explore`, `propose`, `apply`, `archive`, `backfill`) are managed separately — see `openspec/` and agent-specific skill/workflow directories.

## Skill and instruction directories

Cross-platform skills live in `.agents/skills/` — the canonical location for project-level skills.

| Directory | Purpose | Discovered by |
|-----------|---------|---------------|
| `.agents/skills/` | Cross-platform project skills | Cascade, Codex, Copilot (VS Code / CLI / Cloud Agent), Gemini CLI |
| `.agent/skills/` | Antigravity-compatible alias (singular) | Antigravity |
| `.windsurf/skills/` | Cascade-only skills and OpenSpec integrations | Cascade |
| `.windsurf/workflows/` | Cascade slash-command workflows | Cascade |
| `.windsurf/rules/` | Always-on Cascade project rules | Cascade |
| `.windsurf/hooks.json` | Cascade policy hooks (pre/post actions) | Cascade |
| `.github/copilot-instructions.md` | Always-on Copilot review and chat guidance | Copilot (all variants) |
| `.github/instructions/` | Path-scoped Copilot instructions | Copilot (all variants) |
| `.github/agents/` | Copilot custom agent personas | Copilot Local Agent + Cloud Agent |
| `.github/hooks/` | Copilot policy hooks | Copilot Cloud Agent + CLI |
| `.codex/agents/` | Codex custom agent personas | Codex CLI + Codex Web |
| `.codex/hooks.json` | Codex policy hooks (experimental) | Codex CLI |

Do not duplicate a skill across directories unless it must differ per agent. Prefer `.agents/skills/` for new cross-platform skills.

**Antigravity symlink strategy**: Antigravity reads from `.agent/skills/` (singular), not `.agents/skills/`. Cross-platform skills are symlinked into `.agent/skills/` pointing to their canonical source in `.agents/skills/`. When adding a new cross-platform skill, create a matching symlink: `ln -s ../../.agents/skills/<name> .agent/skills/<name>`.

## Before Ending a Session

When wrapping up work, verify documentation is current.

**How to trigger**:
- **Cascade (Windsurf)**: Invoke `wrap-up` skill (e.g., "/wrap-up" or "执行 wrap-up")
- **Codex**: Invoke `wrap-up` skill (e.g., "执行 wrap-up skill")
- **Copilot**: Invoke `/wrap-up` in agent mode or chat
- **Manual**: Run through the checklist below

**Note**: Agent cannot detect session end automatically. You must explicitly request wrap-up.

Checklist:

- [ ] **CHANGELOG.md**: User-facing changes recorded under `## Unreleased`
  - Skip: internal refactors, tests-only changes, documentation typo fixes
  - Include: new features, bug fixes, UI changes, performance improvements
- [ ] **GitHub Issues**: Close completed Issues, create new Issues for upcoming work
- [ ] **OpenSpec**: If `openspec/` artifacts changed, keep proposal/design/specs/tasks aligned and run `openspec validate <change-id> --strict`
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
