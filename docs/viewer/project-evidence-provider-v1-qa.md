# QA Report — `project-evidence-provider-v1`

## Verdict
Pass with minor concerns.

The provider-backed UI wiring is working in the local app. `Project Overview`,
`Assets`, and `Analysis` all reflect repo-local provider evidence instead of
defaulting to foundation sample data when allowlisted evidence exists.

## Environment

- Date: 2026-06-20
- App URL: `http://localhost:3000`
- Browser runner: `agent-browser`
- Branch under inspection: `main`

## What I Verified

### Project Overview

- `Project Overview` opened as the default surface.
- The page showed `Repo-local project evidence` rather than a `sample data`
  badge.
- The snapshot showed provider-backed counts:
  - `44 assets`
  - `0 findings`
- The copy said `DERIVED FROM EXPLICIT LOCAL PROJECT EVIDENCE`.
- Quick action and scope-boundary copy remained bounded and did not imply new
  workflow execution inside Overview.

### Assets

- `Assets` rendered a provider-backed evidence cue:
  - `Repo-local evidence: This Assets inventory is derived from explicit repo-local agent-facing files on the provider allowlist.`
- The inventory did not present sample-data wording.
- The visible provider diagnostics used project-relative paths only:
  - `.github/workflows/ci.yml`
  - `.codex/hooks/guard-main-specs.py`
  - `.agent/workflows/opsx-apply.md`
  - `.agent/workflows/opsx-archive.md`
  - `.agent/workflows/opsx-explore.md`
  - `.agent/workflows/opsx-propose.md`
- No absolute checkout paths appeared in normal UI copy.
- The page preserved bounded inspection language and did not expose inline
  edit/sync/restore/workflow execution controls.

### Analysis

- `Analysis` rendered as a bounded interpretation-and-routing surface.
- In the current checkout, the provider had no warning diagnostics promoted to
  findings, and the page correctly showed:
  - `no current provider findings`
  - `The repo-local project evidence provider reported no warning diagnostics, so Analysis will not fabricate seed findings for the current project.`
- The page did not fall back to seed findings as if they were live project
  issues.

## Minor Concerns

- I confirmed top-level provider-backed rendering and bounded copy, but I did
  not complete a deep routed-continuity sweep for every Overview -> Assets /
  Analysis entry because browser refs became stale during some route-button
  interactions. This does not block acceptance of task `4.3`, but a later
  broader surface regression pass could still be useful.

## Conclusion

This QA pass is sufficient to mark `project-evidence-provider-v1` task `4.3`
complete:

- provider-backed Overview counts are live and not sample data
- provider-backed Assets inventory and diagnostics are live and display-safe
- Analysis shows explicit provider-clean state instead of fabricating seed
  findings
