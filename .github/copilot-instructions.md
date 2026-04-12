# Copilot Review Instructions

This repository is a local-first agent session and context management app.
Stack: Next.js 14 + React 18 + TypeScript, Tailwind CSS v4 + shadcn/ui, Vitest, pnpm.

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

Testing expectations:

- Changes to `src/lib/parse/`, `src/lib/server/`, or normalization logic should include or update Vitest tests.
- Do not suggest removing or weakening existing test assertions without a concrete reason.

Sensitive data:

- Treat tokens, CSRF values, local ports, file paths containing usernames, and exported diagnostics as sensitive.
- Flag any code that logs or exposes these values without redaction.

Common false positives to avoid:

- Do not suggest renaming Antigravity/Windsurf/Codex product terms unless inconsistent within the same PR.
- Do not flag bounded placeholder surfaces as incomplete — they are intentionally scoped.
- Do not request full error boundary implementations for development-only diagnostics views.
