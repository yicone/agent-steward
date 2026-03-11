# ADR-003: Cross-Session Search Technology Selection

- Status: Proposed
- Date: 2026-03-11

## Context

The current in-session search (see `docs/viewer/search-design.md`) supports full-text keyword search and structured filtering over `TrajectoryEvent[]` loaded into browser memory for a single active session.

A natural next step is **cross-session search**: "find which sessions mention X" without the user having to open each session individually. This requires pre-built or on-demand indexing of session content across potentially hundreds of sessions.

The project has a specific architecture constraint: session content is not available as plain files — it is accessed via local Language Server (LS) RPC (see ADR-001). Any indexing strategy must account for this.

## Decision drivers

- Stay local-first: no cloud service, no external process dependencies beyond what the user already has running.
- Prefer solutions that fit the existing Next.js + Node.js stack without introducing native binary compilation complexity.
- Avoid heavy dependencies that significantly grow the install footprint or require an internet connection at use time.
- Simple keyword search over session content is the core requirement; semantic/vector search is not needed for v1.
- Operational simplicity: users should not have to manage a separate daemon or index rebuild step.
- Must handle the data source correctly: sessions come from LS RPC, not from plain files at rest.

## Considered options

### Option A: QMD (`@tobilu/qmd`)

**What it is:** An on-device search engine combining BM25 full-text search, vector semantic search, and LLM re-ranking. Uses `node-llama-cpp` with GGUF models for embeddings and reranking. Also exposes an MCP server.

**Assessment:**

| Dimension | Finding |
|---|---|
| Architecture fit | ❌ QMD indexes markdown/text files at rest in local directories. Our session content comes from LS RPC — there are no indexable files. |
| Dependency weight | ❌ Requires downloading GGUF LLM models (~1–4 GB) for vector search. BM25-only mode (`searchLex`) avoids models but negates QMD's differentiating value. |
| Runtime requirements | ❌ Requires a separate CLI daemon or an in-process Node.js module. Adds an operational surface alongside the already-required Antigravity/Windsurf LS. |
| Feature fit | ⚠️ QMD's strengths (semantic search, LLM re-ranking) solve problems we don't have. We need keyword search, not "natural language" retrieval over personal notes. |
| OSS health | ✅ Actively developed (2024–2025), permissive license. |

**Verdict:** Not appropriate. The architecture mismatch (files vs. RPC) and the heavy dependency on LLM models make QMD a poor fit. Even the BM25-only path would add complexity without benefit over a native SQLite FTS5 solution.

### Option B: SQLite FTS5 via `better-sqlite3` (chosen)

**What it is:** A server-side search index built with SQLite's built-in FTS5 extension, accessed from the Next.js API layer using `better-sqlite3`. The index is populated incrementally as sessions are fetched via RPC.

**Schema sketch:**

```sql
-- Sessions metadata (already partially indexed as conversation list metadata)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  source TEXT,
  title TEXT,
  cwd TEXT
);

-- Per-event content indexed for full-text search
CREATE VIRTUAL TABLE session_events_fts USING fts5(
  session_id UNINDEXED,
  title, text, output, command_line,
  tokenize='trigram'  -- enables substring match, not just word-boundary
);
```

**Integration:**
- On first load of a session via RPC, extract searchable fields and insert into FTS5 (one-time cost per session, persisted to disk).
- A new API route `/api/search?q=...` queries the FTS5 table and returns `(session_id, title, snippet[])` results.
- A global search panel (e.g., `Cmd+Shift+F` overlay) calls this API and lets users jump to matching sessions.
- `better-sqlite3` is synchronous and zero-copy — ideal for Next.js server runtime; no worker thread needed.

**Assessment:**

| Dimension | Finding |
|---|---|
| Architecture fit | ✅ Index populated from RPC responses, not from files. Perfect fit. |
| Dependency weight | ✅ `better-sqlite3` is a small native Node.js binding (~100 KB). SQLite FTS5 is compiled in by default. |
| Runtime requirements | ✅ No additional daemon. Runs inside the existing Next.js server process. |
| Feature fit | ✅ BM25 ranking, `snippet()` excerpts, trigram tokenizer for substring search — exactly what we need. |
| Operational simplicity | ✅ Index file persists between restarts; auto-populated as users browse sessions. Users never run a manual index command. |

### Option C: MiniSearch (in-browser, metadata only)

**What it is:** A lightweight in-memory full-text search library (~40 KB) that runs entirely in the browser. Can index session list metadata (`id`, `title`, `cwd`) on the client side.

**Assessment:**

| Dimension | Finding |
|---|---|
| Architecture fit | ✅ Metadata (title, cwd) is already loaded into the session list; MiniSearch can index it directly. |
| Content coverage | ❌ Cannot index event content (`text`, `output`) without loading every session via RPC first — which is too slow and memory-expensive for hundreds of sessions. |
| Scope | This is a good complement to Option B for metadata-only session-list filtering, but not a replacement for content search. |

**Verdict:** Suitable for metadata search only. Not a solution for event content search.

### Option D: Brute-force load all sessions

Load all sessions via RPC on demand for global search. Immediately rejected:
- Extremely slow for large session collections (hundreds of sessions, each requiring an RPC call).
- 50–100 MB of memory per session means loading 10 sessions would exceed browser limits.

### Option E: Fuse.js / FlexSearch / Lunr.js

Lightweight client-side full-text search libraries. Similar limitations to Option C — suitable only for small in-memory datasets (metadata), not for event content at scale.

## Decision

**Adopt SQLite FTS5 via `better-sqlite3` (Option B) for cross-session event content search.**
Use **MiniSearch (Option C) as an optional enhancement** to the existing session-list metadata filter — the current substring filter already works well enough that MiniSearch can wait until the list grows large enough to need it.

### Implementation roadmap

1. **Phase 1 (not yet started)**: Add `better-sqlite3` dependency. Create a server-side search index module (`src/lib/server/searchIndex.ts`) that:
   - Opens/creates a SQLite database at a configurable path (e.g., `~/.local/share/agent-storage-manager/search.db`).
   - Provides `indexSession(id, source, events)` called from the existing session-load API route.
   - Provides `searchSessions(query)` returning `{ sessionId, source, title, snippets[] }[]`.
2. **Phase 2**: Add `/api/search` route and a global search overlay UI component (keyboard shortcut `Cmd+K` or `Cmd+Shift+F`).
3. **Phase 3 (optional)**: Expose a "re-index all" action in the UI for users who want to search sessions they haven't opened since the index was created.

## Consequences

- **New native dependency**: `better-sqlite3` requires native compilation. This is already common in Node.js apps of this type and does not add deployment complexity for the local-only use case.
- **Index drift**: Sessions deleted from the LS are not automatically removed from the FTS index. Implement a periodic prune or an "index health" check.
- **Privacy**: The FTS index stores session content snippets on disk. Document this clearly; the index path should be in the same user-local directory as the rest of the app's data.
- **Performance**: FTS5 with trigram tokenizer is fast for keyword search. For very large collections (1000+ sessions × 2000+ events), initial index population may be slow — it should be done lazily (index-on-open) rather than eagerly.

## Links

- In-session search design: `docs/viewer/search-design.md`
- Language Server RPC decision: `docs/adr/ADR-001-use-language-server-rpc.md`
- QMD project: https://github.com/tobi/qmd
- SQLite FTS5 documentation: https://sqlite.org/fts5.html
- better-sqlite3: https://github.com/WiseLibs/better-sqlite3
- MiniSearch: https://github.com/lucaong/minisearch
