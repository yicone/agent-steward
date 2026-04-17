# QA Report — `backup-migration-validation-result-hardening`

## Verdict

**Pass**

The semantics-hardening behavior in PR #64 was verified in a real browser using
`agent-browser` against a local production server. The earlier Playwright wrapper
attempt is preserved below as a tooling blocker, not a product blocker.

## Environment

- Branch: `feat/backup-migration-validation-result-hardening`
- PR: `#64`
- Server: `pnpm start` at `http://localhost:3000`
- Browser automation: `agent-browser`
- Date: 2026-04-17

## Validation Summary

- App shell loaded successfully.
- `Backup / Migration` workflow surface was reachable.
- `Validate Package` invalid terminal semantics were verified.
- Recent Operations preserved the failed terminal state when reopened.
- `Migration Preview` landed in an input-adjacent `Selection` state.
- `Project Bundle` landed in `Selection` and did not skip composition.
- No browser-console errors were observed during the `agent-browser` run.

## Direct Browser Checks

### App Load

- Opened `http://localhost:3000`.
- Confirmed top navigation rendered:
  - `Project Overview`
  - `Sessions`
  - `Assets`
  - `Analysis`
  - `Backup / Migration`
- Confirmed Backup / Migration quick routes were available from Project Overview:
  - `Validate backup package`
  - `Open migration preview`
  - `Open project bundle`

### Validate Package Invalid Result

Steps:

1. Opened `Validate Package`.
2. Entered `bad-package-id`.
3. Ran validation.
4. Completed the validation-only workflow.

Observed:

- Validation panel showed `VALIDATION invalid`.
- Validation item showed `Backup not found` as a blocking issue.
- Terminal header showed `Failed`, not an OK result header.
- Operation result badge showed `invalid`.
- Result summary showed `Package validation completed: invalid.`

This verifies that invalid validate-package completion preserves workflow-specific
terminal vocabulary while mapping the surrounding workflow state to `failed`.

### Recent Operations Reopen

Steps:

1. After the invalid validation result, selected the recent-operation entry:
   `invalid Validate Package`.

Observed:

- Reopened detail still showed terminal header `Failed`.
- Reopened detail still showed operation result `invalid`.

This verifies failed recent operations do not reopen as generic `Result`.

### Migration Preview Routed/Input State

Steps:

1. Started `Migration Preview`.

Observed:

- Workflow landed in `Selection`.
- Source, target, and scope remained explicitly required.
- No validation or result state was fabricated.

### Project Bundle Routed/Input State

Steps:

1. Started `Project Bundle`.

Observed:

- Workflow landed in `Selection`.
- Composition controls were visible.
- The workflow did not skip selection, configuration, or validation.

## Playwright Wrapper Attempt

The first QA attempt used `/Users/tr/.agents/skills/playwright/scripts/playwright_cli.sh`
as requested.

Result:

- `open http://localhost:3000 --headed` succeeded.
- Initial app load was visible.
- Subsequent wrapper commands such as `snapshot` and `click` hung.
- The attempt was stopped to avoid indefinite execution.

This was treated as a tooling blocker. Browser QA was retried successfully with
`agent-browser`.

## Blocking Issues

None.

## Non-blocking Concerns

None from the successful `agent-browser` run.

## Suggested Follow-up Tests

- Add a future true browser automation path for validating Recent Operations
  reopen behavior without relying on manual DOM inspection.
- Re-run the same flow after PR merge if the Playwright wrapper hang is fixed.
