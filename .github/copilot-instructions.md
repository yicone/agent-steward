# Copilot Review Instructions

This repository is a local-first agent session and context management app.

When reviewing pull requests, prioritize concrete regressions over style-only feedback:

- Preserve the local-first model. Do not suggest cloud dependencies for core session reading, backup, or migration behavior.
- Preserve existing session viewer behavior unless an active OpenSpec change explicitly changes it.
- Treat `openspec/changes/` artifacts as normative for active changes and `openspec/specs/` as normative for accepted behavior.
- For app shell or navigation work, verify URL deep links, global search session selection, source diagnostics, viewer modes, inspector/error center, and session backup behavior remain intact.
- For session backup work, distinguish session source files, trajectories, transcripts, backup records, and backup bundles. Do not conflate these terms.
- Do not ask placeholders to implement full future behavior unless the active spec requires it.
- Treat product names and exploratory marketing terms as intentional unless they are inconsistent within the same pull request.
- Call out state races, data-loss risk, security/privacy risk, missing tests, broken user flows, and stale documentation.
- Prefer actionable comments with a specific failure mode, expected behavior, and suggested validation.
