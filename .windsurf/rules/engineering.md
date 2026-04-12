---
trigger: always
---

# Engineering Rules

These rules apply to all work in this repository.

## Local-first model

- Do not introduce cloud dependencies for core session reading, backup, or migration behavior.
- Prefer LS/runtime interfaces over reverse-engineering `.pb` storage unless the task explicitly requires storage analysis.

## Sensitive data

- Treat tokens, CSRF values, local ports, file paths containing usernames, and exported diagnostics as sensitive data.
- Never log or expose sensitive values without redaction.

## Diagnostics

- Keep diagnostics concrete: show exact source, failure mode, and actionable remediation.

## Testing

- Run targeted tests for the code you change when feasible.
- If you touch parsing, attach, normalization, or diagnostics logic, prefer adding or updating unit tests in the same area.
- Do not delete or weaken existing test assertions without explicit direction.

## Documentation updates

- When changing Antigravity / Windsurf attach logic, update `docs/storage/local-storage-notes.md` with version-scoped facts and validation commands.
- If work changes current behavior or prerequisites, update `README.md`.
- If work changes long-lived architectural direction, update the relevant ADR in `docs/adr/`.
- Follow SSoT / DRY. Prefer linking over restating.
