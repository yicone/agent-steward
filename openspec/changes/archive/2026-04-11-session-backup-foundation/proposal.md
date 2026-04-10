## Why

The project has strong local-first session discovery and viewing, but it does not yet define a portable, product-level backup model for sessions. As upstream agent tools evolve their private storage layouts and runtime interfaces, the product needs a stable canonical layer that preserves session meaning without treating transcripts or raw source stores as the default backup object.

## What Changes

- Define a backup-ready canonical `Session Record` contract for normalized sessions.
- Introduce `Session Backup` v1 semantics as a portable package built from `Session Record` data.
- Define `Source Backup` as an explicit advanced option instead of the default backup behavior.
- Define v1 restore/import scope as recovery into this product's readable, searchable, analyzable state only.
- Reserve `Project Bundle` as a future project-level container that can reuse the session backup sub-format.

## Capabilities

### New Capabilities
- `session-record-model`: Defines the canonical session record contract required for indexing, analysis, migration, and backup.
- `session-backup`: Defines the portable backup, import, validation, and optional source-preservation behavior for sessions.

### Modified Capabilities
- None.

## Impact

- Affected docs and product semantics:
  - `docs/glossary.md`
  - `docs/research-agent-context-product-landscape.md`
  - `docs/research-session-backup.md`
- Affected code areas likely include normalized trajectory/event types, conversation serialization paths, diagnostic/export surfaces, backup/import APIs, and future backup UI entry points.
- No new external dependency is required by this proposal.
