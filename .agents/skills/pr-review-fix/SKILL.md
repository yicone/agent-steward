---
name: pr-review-fix
description: Use when preparing a pull request, checking merge readiness, or addressing review comments, automated review feedback, or unresolved review threads.
license: MIT
metadata:
  author: yicone
  version: "1.0"
---

# PR Review Fix

Use this workflow for a pull request or proposed change. Read the repository's `AGENTS.md`,
contribution guide, and active specification before applying project-specific validation or
product rules. This skill supplies the review-fix policy; the repository supplies commands,
required QA, and scope-specific decision rules.

## Steps

1. Resolve the PR number and branch, or identify the branch that is about to become a PR.
2. Before marking ready or recommending merge, run a preflight check covering CI/local validation,
   active specification validation, required independent pre-review, required browser/runtime QA,
   and unresolved review-thread state. Use only checks required by the repository or task.
3. Fetch PR metadata plus review comments when a PR exists. Prefer thread-aware `gh api graphql` when resolution state matters; use the GitHub connector for flat PR/comment context when sufficient.
4. Classify each comment before editing: `must-fix`, `should-fix`, `product-decision`, or `ignore`.
5. Ask the user before changing product names, product scope, placeholder commitments, security/privacy behavior, backup/migration semantics, or any ambiguous `should-fix`.
6. Implement confirmed `must-fix` and in-scope `should-fix` items only. Batch all actionable comments from the same review round into one fix pass instead of pushing one commit per comment. If the fix is large, runtime-dependent, or benefits from independent verification, delegate it to an authorized subagent and fold the result back into this workflow. If the user has granted standing subagent authorization for the control-thread workflow, treat that as sufficient authorization for bounded review-fix delegation; see `AGENTS.md` for the standing authorization definition and limits.
7. Run the repository's targeted tests, build, specification validation, and required QA commands.
   Do not assume `pnpm`, OpenSpec, or a browser runner unless the repository requires them.
8. Commit review fixes separately from workflow/process documentation.
9. Check unresolved review threads before recommending ready/merge. Resolve only with explicit user authorization, or move non-blocking leftovers to follow-up issues.
10. Push the PR branch and request an appropriate re-review only when the repository workflow
    and the user authorize it. Do not assume Copilot or a specific reviewer is available.

## Pre-Review Acceleration

- Before marking a medium/large implementation PR ready, prefer a bounded independent pre-review
  when the repository workflow or user requests one.
- Treat draft PR creation as allowed before pre-review/QA, but do not mark the PR ready or recommend merge until required preflight evidence exists or is explicitly waived.
- For UI/runtime implementation PRs, follow the repository's browser/runtime QA policy.
- Treat automated review output as advisory feedback and classify it with the same `must-fix` /
  `should-fix` / `product-decision` / `ignore` categories.
- Skip pre-review for tiny mechanical changes unless the change touches process rules, OpenSpec semantics, security/privacy, backup/migration integrity, or local path handling.

## Review Loop Budget

- First Copilot pass: fix all confirmed `must-fix` and in-scope `should-fix` comments.
- Second Copilot pass: fix new correctness, spec, security/privacy, data-loss, accessibility, or low-risk maintainability issues.
- Third and later passes: continue only for `must-fix`, regressions introduced by review fixes, or explicitly accepted `should-fix` comments. Otherwise recommend stopping the loop and moving remaining non-blocking work to follow-up issues.
- Do not chase zero Copilot comments when CI, local validation, and required QA are green and remaining comments are stale, duplicate, cosmetic, low-confidence, or already tracked elsewhere.

## Do Not

- Do not auto-apply suggested changesets for state, URL/deep-link behavior, backup/migration,
  parsers, source attachment, diagnostics, specifications, or other high-risk behavior.
- Do not resolve GitHub conversations unless the user explicitly authorizes it.
- Do not treat Copilot comments as merge-blocking approvals or requested changes.
- Do not mix follow-up feature work into the review-fix commit.
- Do not request repeated Copilot re-reviews after the review loop budget is exhausted unless a `must-fix` or explicitly accepted `should-fix` remains.
