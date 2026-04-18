---
name: pr-review-fix
description: Use when addressing GitHub PR review comments, Copilot review feedback, unresolved review threads, or review-fix follow-up work in this repository.
license: MIT
compatibility: Requires git and gh CLI.
metadata:
  author: yicone
  version: "1.0"
---

# PR Review Fix

Use this repository-specific workflow together with `docs/dev/pr-review-agent-workflow.md`.

## Steps

1. Resolve the PR number and branch.
2. Fetch PR metadata plus review comments. Prefer thread-aware `gh api graphql` when resolution state matters; use the GitHub connector for flat PR/comment context when sufficient.
3. Classify each comment before editing: `must-fix`, `should-fix`, `product-decision`, or `ignore`.
4. Ask the user before changing product names, product scope, placeholder commitments, security/privacy behavior, backup/migration semantics, or any ambiguous `should-fix`.
5. Implement confirmed `must-fix` and in-scope `should-fix` items only. Batch all actionable comments from the same review round into one fix pass instead of pushing one commit per comment. If the fix is large, runtime-dependent, or benefits from independent verification, delegate it to an authorized subagent and fold the result back into this workflow. If the user has granted standing subagent authorization for the control-thread workflow, treat that as sufficient authorization for bounded review-fix delegation.
6. Run targeted tests, `pnpm build`, and `openspec validate <change-id> --strict` when an OpenSpec change is active.
7. Commit review fixes separately from workflow/process documentation.
8. Check unresolved review threads before recommending ready/merge. Resolve only with explicit user authorization, or move non-blocking leftovers to follow-up issues.
9. Push the PR branch and request Copilot re-review with `gh pr edit <number> --add-reviewer copilot-pull-request-reviewer` when available.

## Pre-Review Acceleration

- Before marking OpenSpec or medium/large implementation PRs ready, prefer a bounded pre-review with an OpenSpec reviewer subagent, code-review subagent, or local Copilot CLI dry run.
- Use local Copilot CLI for draft review, testability checks, wording ambiguity, and suggested patch drafts; do not let it resolve conversations, merge PRs, or change product scope without control-thread triage.
- Treat Copilot CLI output as advisory review feedback and classify it with the same `must-fix` / `should-fix` / `product-decision` / `ignore` categories.
- Skip pre-review for tiny mechanical changes unless the change touches process rules, OpenSpec semantics, security/privacy, backup/migration integrity, or local path handling.

## Review Loop Budget

- First Copilot pass: fix all confirmed `must-fix` and in-scope `should-fix` comments.
- Second Copilot pass: fix new correctness, spec, security/privacy, data-loss, accessibility, or low-risk maintainability issues.
- Third and later passes: continue only for `must-fix`, regressions introduced by review fixes, or explicitly accepted `should-fix` comments. Otherwise recommend stopping the loop and moving remaining non-blocking work to follow-up issues.
- Do not chase zero Copilot comments when CI, local validation, and required QA are green and remaining comments are stale, duplicate, cosmetic, low-confidence, or already tracked elsewhere.

## Do Not

- Do not auto-apply suggested changesets for React state, URL/deep-link behavior, backup/migration, parser, source attach, diagnostics, or OpenSpec behavior.
- Do not resolve GitHub conversations unless the user explicitly authorizes it.
- Do not treat Copilot comments as merge-blocking approvals or requested changes.
- Do not mix follow-up feature work into the review-fix commit.
- Do not request repeated Copilot re-reviews after the review loop budget is exhausted unless a `must-fix` or explicitly accepted `should-fix` remains.
