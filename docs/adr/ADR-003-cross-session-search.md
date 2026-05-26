# ADR-003: Cross-Session Search Technology Selection

- Status: Accepted
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

1. **Phase 1 ✅**: Add `better-sqlite3` dependency. Search index module `src/lib/server/searchIndex.ts`:
   - Opens/creates a SQLite database at `~/.agent-steward/search.db` (overridable via `AGENT_STEWARD_SEARCH_DB_PATH`).
   - Provides `indexSession(id, source, title, cwd, events)` called from the existing session-load API route.
   - Provides `searchSessions(query, limit)` returning `{ sessionId, source, title, cwd, snippet }[]`.
   - Provides `removeSession(id, source)` and `getIndexedSessionIds()`.
2. **Phase 2 ✅**: `/api/search` route and global search overlay UI (`GlobalSearch` component, Cmd+K / Ctrl+K shortcut, keyboard-navigable result list).
3. **Phase 3 (optional)**: Expose a "re-index all" action in the UI for users who want to search sessions they haven't opened since the index was created.

## Chinese Text Handling

### Question

The session content is primarily English (code, tool output, file paths) with a non-trivial minority of Chinese (user messages, assistant responses, session titles). Does the solution need dedicated Chinese word-segmentation support?

### Analysis

**How the trigram tokenizer handles Chinese:**

SQLite FTS5's `trigram` tokenizer works at the Unicode character level: it creates overlapping 3-character sequences from the source text. It is deliberately tokenizer-agnostic (no concept of word boundaries).

For Chinese text, this has important implications:

| Scenario | Example | Trigram result |
|---|---|---|
| 3-char Chinese phrase | `命令行` | exact trigram match ✅ |
| 4-char Chinese phrase | `命令行工具` → trigrams `命令行`, `令行工`, `行工具` | substring match ✅ |
| 2-char Chinese word | `工具`, `会话` | **no match** (trigram minimum = 3 chars) ❌ |
| 1-char Chinese word | `页` | **no match** ❌ |

**Why a dedicated Chinese tokenizer is not needed:**

1. **English-primary content**: The majority of searchable content is English — file paths, command lines, tool names, code snippets. The trigram tokenizer handles all of these perfectly.

2. **Chinese phrase searches work well**: Chinese users typically search for phrases (3+ characters in Chinese), not single characters. Searching for `命令行工具` ("command-line tool"), `会话管理` ("session management"), or `搜索功能` ("search feature") all generate valid trigrams.

3. **Jieba/ICU complexity not justified**: Adding a Chinese word segmenter (jieba, Kuromoji, ICU break iterator) would require native Node.js bindings or a WASM module — adding significant installation complexity for a local-first tool that already requires `better-sqlite3`. The benefit (handling 2-char searches in event body content) is marginal.

4. **2-char Chinese queries are handled by LIKE fallback**: For common 2-character Chinese queries like `会话`, `工具`, `命令`, the implementation falls back to a `LIKE` search on `sessions.title` and `sessions.cwd`. Session titles are the most important metadata for a 2-char "find which session?" query.

**Summary verdict**: Trigram + LIKE fallback is sufficient. No dedicated Chinese tokenizer needed for v1.

**Edge case left to a future iteration**: A user searching for a 2-char Chinese phrase like `工具` in event *body* content (not just titles) will not find results. This is an acceptable v1 limitation; it can be addressed in a future iteration by lowering the trigram minimum token size (SQLite FTS5 trigram `min_token_size` default is 3 and is not directly user-configurable without patching SQLite), or by adding a Chinese segmentation pre-processing step at index time.

## Consequences

- **New native dependency**: `better-sqlite3` requires native compilation (node-gyp). This is acceptable for a local-first Node.js app and is widely used in the ecosystem.
- **Index drift**: Sessions deleted from the LS are not automatically removed from the FTS index. Implement a periodic prune or an "index health" check (Phase 3).
- **Privacy**: The FTS index stores session content on disk at `~/.agent-steward/search.db`. Document this clearly.
- **Performance**: FTS5 with trigram tokenizer is fast for keyword search. Initial population is lazy (index-on-open) so there is no bulk indexing delay.
- **Chinese 2-char query limitation**: Short (1–2 char) Chinese queries match only session titles/cwd via LIKE, not event body content. Acceptable for v1 (see Chinese Text Handling section above).

## Links

- In-session search design: `docs/viewer/search-design.md`
- Language Server RPC decision: `docs/adr/ADR-001-use-language-server-rpc.md`
- QMD project: https://github.com/tobi/qmd
- SQLite FTS5 documentation: https://sqlite.org/fts5.html
- better-sqlite3: https://github.com/WiseLibs/better-sqlite3
- MiniSearch: https://github.com/lucaong/minisearch
