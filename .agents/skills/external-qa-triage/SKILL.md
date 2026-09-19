---
name: external-qa-triage
description: Use when an external QA agent, browser run, automated test report, or manual QA report is provided and its findings may affect change readiness.
license: MIT
metadata:
  author: yicone
  version: "1.0"
---

# External QA Triage

Use this for an external QA result that may affect a change, release, or merge decision.
Treat the repository's `AGENTS.md`, contribution guide, or task instructions as the
source of truth for the applicable test, build, specification, and browser commands.

## Steps

1. Read the QA report and identify the tested branch, environment, scope, and overall status.
2. Classify findings:
   - `blocker`: violates spec, breaks core flow, corrupts state, leaks sensitive context, or blocks ready-for-review.
   - `non-blocker`: worth tracking but not required before merge.
   - `needs-confirmation`: unclear, environment-specific, or product-scope dependent.
3. If runtime verification or browser retest is needed, follow the repository's authorization
   rules. Delegate only when delegation is explicitly authorized; otherwise run the retest in
   the current thread or session.
4. Fix confirmed blockers in the change branch when they are in scope and the required VCS
   tooling is available; otherwise report the blocker and the missing execution prerequisite.
5. Preserve the original QA result. If fixed, add a dated re-test or resolution note rather than deleting the failure.
6. Run the repository's targeted tests, build, specification, and browser checks when applicable.
   Do not invent commands or assume a particular package manager.
7. If fixes are made, commit them separately from unrelated process docs or follow-up features
   when the repository uses version control; otherwise report the uncommitted validation state.
8. Do not commit browser-runner artifacts, temporary reports, credentials, or recordings unless
   the task explicitly requires them.

## Output

Summarize:

- blocker status;
- fixes made;
- validation commands and results;
- whether PR re-review or external re-test is still needed.
