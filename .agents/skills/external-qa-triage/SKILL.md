---
name: external-qa-triage
description: Use when an external QA agent, Agent Browser run, Playwright run, or manual QA report is provided for this repository.
license: MIT
compatibility: Requires git.
metadata:
  author: yicone
  version: "1.0"
---

# External QA Triage

Use this for QA reports that affect PR readiness.

## Steps

1. Read the QA report and identify the tested branch, environment, scope, and overall status.
2. Classify findings:
   - `blocker`: violates spec, breaks core flow, corrupts state, leaks sensitive context, or blocks ready-for-review.
   - `non-blocker`: worth tracking but not required before merge.
   - `needs-confirmation`: unclear, environment-specific, or product-scope dependent.
3. Fix confirmed blockers in the PR branch when they are in scope.
4. Preserve the original QA result. If fixed, add a dated re-test or resolution note rather than deleting the failure.
5. Run targeted tests, `pnpm build`, and OpenSpec validation when applicable.
6. Commit QA fixes separately from unrelated process docs or follow-up features.
7. Do not commit browser runner artifacts such as `.playwright-cli/` unless intentionally requested.

## Output

Summarize:

- blocker status;
- fixes made;
- validation commands and results;
- whether PR re-review or external re-test is still needed.
