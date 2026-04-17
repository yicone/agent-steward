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
| Codex control thread | Triage comments, cluster actionable work, coordinate delegated fixes or QA, synthesize validation, and update PR status. |
| QA agent | Performs browser QA for UI flows that need real runtime verification. |
| GitHub PR | Serves as the execution boundary for the current change. |

## Control Thread Coordination

When the user designates a conversation as the control thread, keep it responsible for:

- PR status, validation state, and merge readiness.
- Deciding whether work should continue in the current thread, a focused new conversation, a subagent, or an external coding agent.
- Producing concise prompts for external agents and folding their reports back into the PR workflow.

The control thread should not become the default executor for every task once the user has authorized subagents. Keep it focused on coordination and use bounded delegated work when that reduces context risk or enables independent verification.

Good delegation targets:

- OpenSpec artifact review before implementation.
- Large OpenSpec implementation slices with clear write scope.
- Browser QA / Playwright runtime verification.
- Broad codebase audits or parallel research.
- Retests that should be independent from the implementation thread.

Keep local to the control thread:

- Product decisions and ambiguous scope tradeoffs.
- Review-comment classification and final accept/reject judgment.
- PR, issue, and merge-readiness state changes.
- Small review fixes where delegating would add more coordination cost than risk reduction.

Do not treat "control thread" as a permanent repository role. It is active only when the user explicitly chooses that coordination style.

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
6. Codex implements approved fixes only, with changes traceable to review comments. Batch all actionable comments from the same review round into one fix pass instead of pushing one commit per comment.
7. Codex runs targeted tests, `pnpm exec tsc --noEmit`, `pnpm build`, and OpenSpec validation when an OpenSpec change is active.
8. Codex pushes the fix commit to the PR branch.
9. Human or Codex requests Copilot re-review manually.
10. Merge only after local/CI validation, QA evidence when needed, and human acceptance.

Keep commits easy to review:

- Use review-fix commits for code and tests that address review threads.
- Use separate process/documentation commits for workflow changes such as `AGENTS.md`, skills, or review playbooks.
- Do not combine follow-up feature scope with review-fix scope.

## Review Loop Budget

Copilot review is useful, but every re-review triggers another CI/review loop. Treat re-review as a finite quality gate, not an open-ended goal to reach zero comments.

Default policy:

- First Copilot pass: fix all confirmed `must-fix` and in-scope `should-fix` comments.
- Second Copilot pass: fix new correctness, spec, security/privacy, data-loss, accessibility, or low-risk maintainability issues.
- Third and later passes: continue only for `must-fix` comments, clear regressions introduced by review fixes, or explicitly accepted `should-fix` items. Otherwise stop the loop and either merge, resolve as stale/handled, or open a follow-up issue.

Stop conditions:

- CI is green, required local validation has passed, QA evidence is recorded when needed, and remaining comments are stale, duplicate, low-confidence, or out of scope.
- Remaining comments are valid but non-blocking follow-up work and have been moved to a GitHub Issue.
- Further re-review would only chase cosmetic or preference comments with no meaningful change to product correctness.

Do not stop when comments involve:

- security, privacy, local path/token leakage, data loss, backup/migration integrity, parser correctness, source attach, or failed CI;
- active OpenSpec violations;
- browser QA blockers for the changed flow.

## Ready Checklist

Before marking a PR ready for review or recommending merge:

- CI is green.
- Local validation relevant to the change has passed.
- Active OpenSpec changes validate with `openspec validate <change-id> --strict`.
- Browser QA is recorded for UI/runtime flows when required.
- Unresolved review threads are triaged: fixed and resolved, stale/duplicate and resolved with evidence, or moved to a follow-up issue.
- The PR body or control-thread summary states any remaining accepted follow-up issues.

## Re-Review Trigger

GitHub currently does not automatically request a Copilot re-review after new commits are pushed to a PR that Copilot already reviewed.

Preferred trigger:

- Use the GitHub UI: open the Reviewers menu and request Copilot again.

CLI fallback:

- Try `gh pr edit <number> --add-reviewer copilot-pull-request-reviewer`.
- If GitHub rejects the bot reviewer name, use the UI.

Codex should not mark GitHub conversations resolved or submit replies unless explicitly asked.

## Resolving Conversations

`Resolve conversation` marks a GitHub review thread as handled. It does not change code, approve a pull request, or prove that validation passed. It is a collaboration-state update that changes what reviewers see as still needing attention.

Codex may recommend resolving a thread when:

- the comment was classified as `must-fix` or `should-fix`, the fix was pushed, and relevant validation passed;
- the comment is stale or false positive, with a concrete explanation;
- the comment is a duplicate of another handled thread.

Codex must not resolve a thread when:

- it is a `product-decision` and the human maintainer has not confirmed the decision;
- the response is only an opinion without validation or evidence;
- the comment concerns security, privacy, data loss, local paths, tokens, backups, or migration integrity and no concrete fix has been verified.

Default policy:

- Codex should list the threads it recommends resolving and wait for explicit human authorization before calling GitHub's resolve mutation.

## Suggested Changesets

GitHub review comments may include a suggested changeset with a `Commit suggestion` button. That button applies the reviewer-provided patch directly to the PR branch as a commit.

Use it only for small, mechanical, low-risk changes:

- typos;
- markdown table formatting;
- comment wording;
- obvious import cleanup;
- single-line documentation fixes.

Do not use it for:

- React state or effect changes;
- URL/deep-link behavior;
- session backup, migration, parser, source attach, or diagnostics logic;
- OpenSpec behavior changes;
- any change requiring new tests or multi-file edits.

Preferred policy:

- Let Codex implement logic changes locally, run validation, and push a normal commit.
- If a human uses `Commit suggestion` for a trivial fix, Codex should pull the branch afterward and run at least the relevant lightweight validation before merge.

## Automation Level

Recommended automation is semi-automatic:

| Step | Automation level |
| ---- | ---------------- |
| Fetch review comments and thread state | Automatic via `gh pr view` and `gh api graphql` |
| Classify comments | Codex-assisted, human confirmation for ambiguous items |
| Apply fixes | Codex-assisted after scope confirmation |
| Run validation | Automatic/local |
| Push fix commit | Automatic after validation |
| Request Copilot re-review | Automatic via `gh pr edit <number> --add-reviewer copilot-pull-request-reviewer` when supported |
| Resolve conversations | Manual authorization, then automatic via GitHub GraphQL |
| Merge PR | Human decision |

Do not implement this with Git hooks. Hooks run on local commit/push boundaries, while review state lives in GitHub and requires network access, permissions, PR context, and product-scope judgment.

## External QA Reports

Use external QA agents for UI/runtime flows that local unit tests cannot fully cover.

QA report handling:

- Store reports under `docs/viewer/` or another feature-appropriate docs folder when they are relevant to PR acceptance.
- Preserve the original finding record, including FAIL results.
- If a blocker is fixed, add a dated re-test result or resolution note at the top instead of rewriting history.
- Treat QA blockers like review comments: classify, fix, validate, push, and request re-review when appropriate.
- Do not commit browser runner artifacts such as `.playwright-cli/` unless they are intentionally part of the product documentation or test fixtures.

## Suggested Codex Prompt

Use this prompt in the control thread or a focused PR-fix thread:

```text
Please triage PR review feedback for PR #<number>.

Use the repository workflow in docs/dev/pr-review-agent-workflow.md.

Tasks:
1. Fetch review comments and unresolved review threads.
2. Cluster comments into must-fix / should-fix / product-decision / ignore.
3. Batch comments from the current review round; do not push one fix per comment.
4. Do not modify code until product-decision or ambiguous items are called out.
5. Fix all confirmed must-fix and in-scope should-fix items.
6. Run targeted tests, pnpm exec tsc --noEmit, pnpm build, and OpenSpec validation if applicable.
7. Push the fix commit.
8. Check unresolved review threads before recommending ready/merge.
9. Tell me whether Copilot re-review should be requested manually or whether you were able to request it via gh.
10. If this is the third or later Copilot pass, recommend whether to stop the loop and move remaining non-blocking work to follow-up issues.
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
