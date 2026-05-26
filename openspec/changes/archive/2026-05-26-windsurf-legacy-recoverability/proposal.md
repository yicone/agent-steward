# Windsurf Legacy Recoverability

## Why

Windsurf legacy sessions discovered from local `~/.codeium/cascade/*.pb` roots can appear in the Sessions list even when the running Windsurf language server no longer has the corresponding trajectory. Today this creates a confusing user experience: the product can discover a legacy session, but the viewer fails at read time unless the user manually inspects diagnostics and interprets low-level LS behavior.

We also confirmed that newer Windsurf builds expose the live LS CSRF token through process environment rather than only through historical command-line flags. The product needs a clearer contract for recoverability evidence and a version-aware attach/token strategy so diagnostics and session access remain trustworthy.

## What Changes

- Introduce a bounded Windsurf session recoverability capability that distinguishes between LS-readable sessions, partially recoverable legacy sessions with sidecar evidence, and unavailable sessions that only have opaque local source artifacts.
- Define how the Sessions surface and Viewer present recoverability state, diagnostics, and next-step guidance when a session is discoverable locally but not readable from the live Windsurf LS.
- Define how Backup / Migration consumes recoverability context for Windsurf sessions so routed workflows can preserve evidence without implying vendor-runtime restoration.
- Define version-aware Windsurf attach/token expectations for environments where the live LS CSRF token is sourced from process environment rather than only from command-line args or Settings override.
- Preserve the existing local-first model and the ADR decision that LS RPC remains the source of truth for readable Windsurf session content.

## Capabilities

### New Capabilities

- `windsurf-session-recoverability`: Recoverability states, evidence collection, and user-facing diagnostics for Windsurf sessions that are locally discovered but not fully readable from the live language server.

### Modified Capabilities

- `project-shell`: The Sessions surface needs explicit recoverability messaging and diagnostics behavior for Windsurf sessions that cannot be opened normally.
- `backup-migration`: Backup / Migration needs bounded workflow behavior for routed Windsurf legacy sessions whose readable content is unavailable but whose recovery evidence can still be inspected or preserved.

## Impact

- Affected code likely includes `src/lib/server/windsurf.ts`, diagnostic export paths, Sessions/Viewer rendering in `src/components/HomeClient.tsx`, and Backup / Migration routing/state in the shell foundation.
- Affected documentation includes `docs/storage/local-storage-notes.md` and any viewer UX guidance that documents legacy Windsurf session behavior.
- No new cloud dependency is introduced; the change remains local-first and continues to treat LS RPC as authoritative for readable Windsurf content.
