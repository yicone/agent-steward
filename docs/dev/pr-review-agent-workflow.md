# PR Review Agent Workflow

This document defines the recommended human + agent workflow for pull request review in this repository.

## Goals

- Keep Copilot useful without turning it into a merge blocker.
- Let Codex triage and fix actionable review feedback with low manual overhead.
- Preserve the repository's OpenSpec, local-first, and documentation discipline.
- Avoid noisy automation that pushes code or resolves comments without human intent.

## Roles

| Role | Responsibility |
| ---- | -------------- |
| Human maintainer | Owns scope decisions, product naming, merge timing, and final acceptance. |
| Copilot code review | Provides automatic review comments and low-cost second-pass feedback. |
| Codex control thread | Triage comments, cluster actionable work, implement approved fixes, run validation, and update PR status. |
| QA agent | Performs browser QA for UI flows that need real runtime verification. |
| GitHub PR | Serves as the execution boundary for the current change. |

## Copilot Setup

Recommended repository setup:

- Keep automatic Copilot review enabled for new pull requests, including draft PRs if available.
- Do not treat Copilot as a required approval gate. Copilot code review submits comment reviews, not approvals or requested changes.
- Keep `.github/copilot-instructions.md` short and repository-specific. Copilot PR review only reads the first 4,000 characters of each instruction file.
- Use `.github/instructions/**/*.instructions.md` later only when a path-specific rule is consistently needed.
- Do not rely on Copilot instructions added in the current PR to affect that same PR. Copilot uses instructions from the base branch.

Not recommended:

- Do not use Git hooks to call GitHub review APIs. Hooks run at the wrong layer, can block local commits/pushes on network failures, and cannot reliably understand PR state.
- Do not require Copilot review as a branch protection approval.
- Do not auto-apply Copilot suggestions without triage.

## Standard Flow

1. Open a draft PR once the local branch has a coherent, validated slice.
2. Let automatic Copilot review run, or manually request Copilot review if automation did not trigger.
3. Codex reads PR review comments with thread-aware GitHub access.
4. Codex classifies each comment:
   - `must-fix`: correctness, data-loss, security, privacy, build, or spec violation.
   - `should-fix`: real UX/performance/maintainability issue with low regression risk.
   - `product-decision`: naming, scope, visual taste, or roadmap choice requiring human confirmation.
   - `ignore`: stale, duplicate, low-confidence, or contrary to the active spec.
5. Human confirms any `product-decision` or ambiguous `should-fix` item.
6. Codex implements approved fixes only, with changes traceable to review comments.
7. Codex runs targeted tests, `pnpm exec tsc --noEmit`, `pnpm build`, and OpenSpec validation when an OpenSpec change is active.
8. Codex pushes the fix commit to the PR branch.
9. Human or Codex requests Copilot re-review manually.
10. Merge only after local/CI validation, QA evidence when needed, and human acceptance.

## Re-Review Trigger

GitHub currently does not automatically request a Copilot re-review after new commits are pushed to a PR that Copilot already reviewed.

Preferred trigger:

- Use the GitHub UI: open the Reviewers menu and request Copilot again.

CLI fallback:

- Try `gh pr edit <number> --add-reviewer copilot-pull-request-reviewer`.
- If GitHub rejects the bot reviewer name, use the UI.

Codex should not mark GitHub conversations resolved or submit replies unless explicitly asked.

## Suggested Codex Prompt

Use this prompt in the control thread or a focused PR-fix thread:

```text
Please triage PR review feedback for PR #<number>.

Use the repository workflow in docs/dev/pr-review-agent-workflow.md.

Tasks:
1. Fetch review comments and unresolved review threads.
2. Cluster comments into must-fix / should-fix / product-decision / ignore.
3. Do not modify code until product-decision or ambiguous items are called out.
4. Fix all confirmed must-fix and should-fix items.
5. Run targeted tests, pnpm exec tsc --noEmit, pnpm build, and OpenSpec validation if applicable.
6. Push the fix commit.
7. Tell me whether Copilot re-review should be requested manually or whether you were able to request it via gh.
```

## Scope Rules

- Review fixes should stay within the PR's active scope.
- Naming comments about experimental product/marketing terms are product decisions, not automatic fixes.
- Placeholder surfaces should remain bounded unless the active spec requires full implementation.
- For shell/navigation changes, preserve session URL deep links, global search selection, diagnostics, viewer modes, inspector/error center, and direct session backup.
- For local storage/session changes, treat tokens, paths, ports, and exported diagnostics as sensitive.

## When To Use A New Branch

- If the fix directly addresses comments on the current PR, commit to the PR branch.
- If the work is a follow-up feature or redesign beyond the PR scope, open a new branch after the current PR merges.
- If the follow-up depends on the unmerged PR, branch from the PR branch and treat it as stacked work.
