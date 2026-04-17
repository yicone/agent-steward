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
5. Implement confirmed `must-fix` and `should-fix` items only. If the fix is large, runtime-dependent, or benefits from independent verification, delegate it to an authorized subagent and fold the result back into this workflow.
6. Run targeted tests, `pnpm build`, and `openspec validate <change-id> --strict` when an OpenSpec change is active.
7. Commit review fixes separately from workflow/process documentation.
8. Push the PR branch and request Copilot re-review with `gh pr edit <number> --add-reviewer copilot-pull-request-reviewer` when available.

## Do Not

- Do not auto-apply suggested changesets for React state, URL/deep-link behavior, backup/migration, parser, source attach, diagnostics, or OpenSpec behavior.
- Do not resolve GitHub conversations unless the user explicitly authorizes it.
- Do not treat Copilot comments as merge-blocking approvals or requested changes.
- Do not mix follow-up feature work into the review-fix commit.
