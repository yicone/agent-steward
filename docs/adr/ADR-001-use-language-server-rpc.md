# ADR-001: Use Language Server RPC instead of offline `.pb` parsing

- Status: Accepted
- Date: 2026-02-26

## Context

Agent UIs like Antigravity and Windsurf persist conversation sessions locally as `.pb` files. A straightforward idea is to decode those protobuf blobs offline and reconstruct the conversation.

In practice, the `.pb` format is not a stable, documented public interface and tends to contain:

- Internal/implementation details rather than a clean “chat transcript” model
- Nested message types and references that are difficult to reverse without schema knowledge
- Data that changes across versions

String-scraping a binary protobuf (e.g., extracting embedded UTF-8 strings) can be useful for rough diagnostics, but it is insufficient to reliably reconstruct a conversation timeline or “what the UI showed”.

Separately, both products already expose a *local* Language Server (LS) interface used by their own UI. That LS provides RPCs for retrieving session trajectories and, in Antigravity’s case, converting a trajectory to Markdown.

## Decision drivers

- Prefer correctness and stability over “offline purity”
- Minimize reliance on undocumented, version-volatile storage formats
- Keep everything local (no external network dependency)
- Produce render-ready outputs (Markdown or steps suitable for a chat view)

## Considered options

1. **Offline decode `.pb`** (reverse-engineer protobuf schema or best-effort parsing)
   - Pros: Works without the app/daemon running; no tokens/ports
   - Cons: High maintenance; brittle across versions; hard to get faithful rendering

2. **Use local LS RPC (Connect/JSON)** (chosen)
   - Pros: Uses the same interface as the official UI; more stable; returns structured/semantic data
   - Cons: Requires the local LS to be running; must handle local ports and CSRF tokens

3. **Integrate with the vendor UI/extension internals**
   - Pros: Potentially richer metadata
   - Cons: Tightly coupled; harder to distribute; more breakage risk

## Decision

Use the local Language Server RPC as the source of truth for rendering conversations.

Implementation outline:

- **Connect (JSON) client** from the Next.js server runtime to call unary RPC methods.
- **Antigravity**
  - Attach to a running LS by parsing Antigravity logs for pid/ports (newer builds may use random ports and not rewrite legacy discovery files).
  - Fallback to legacy discovery files written under `~/.gemini/antigravity/daemon/ls_*.json` when available.
  - Fetch a trajectory via the LS and normalize steps into a structured event stream for process-oriented rendering.
  - Also convert trajectory to Markdown via the LS as an alternate reading mode.
- **Windsurf**
  - Attach to a running LS by parsing log output for a port and process ID.
  - Extract CSRF token from process arguments (with an explicit manual override only as a fallback).
  - Fetch steps and normalize them into renderable chat messages.

## Consequences

- **Operational dependency:** users must have Antigravity/Windsurf running (or the relevant daemon) to render session contents.
- **Security posture:** the app must treat CSRF tokens and local ports as sensitive; keep all requests local-only.
- **Better resilience:** trajectory/steps are expected to remain compatible longer than internal `.pb` schemas, because they are part of the product’s runtime interface.
- **Testing focus:** parsing logic (logs, argv) and “steps → messages” normalization should be covered by unit tests.
- **Viewer tradeoff:** trajectory-first rendering exposes richer process data (thought/tool/command/status), while Markdown mode remains useful for concise reading.

## Links

- Roadmap: `ROADMAP.md`
