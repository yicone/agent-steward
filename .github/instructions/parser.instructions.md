---
applyTo: "src/lib/parse/**"
---

# Parser Instructions

When working on files in `src/lib/parse/`:

- Each parser handles a specific agent data source (Antigravity, Windsurf/Cascade, Codex CLI).
- Parsers normalize heterogeneous formats into the unified session record model defined in `src/lib/sessionRecord.ts`.
- Always add or update Vitest tests in `tests/` for parsing changes. Test file naming: `<parserName>.test.ts`.
- Treat tokens, CSRF values, local ports, and file paths containing usernames as sensitive — never log or include in error messages without redaction.
- When changing attach logic, update `docs/storage/local-storage-notes.md` with version-scoped facts.
- Cross-reference `openspec/specs/session-record-model/` for the normative session record spec.
- Do not weaken existing test assertions without explicit direction from the user.
