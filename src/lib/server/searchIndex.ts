import "server-only";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

import type { SearchResult, Source, TrajectoryEvent } from "@/lib/types";

// ---------------------------------------------------------------------------
// Database path
// ---------------------------------------------------------------------------

function dbPath(): string {
  const override = process.env.AGENT_STORAGE_MANAGER_SEARCH_DB_PATH;
  if (override && override.trim().length) {
    const p = override.trim();
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return p;
  }
  const dir = path.join(os.homedir(), ".agent-storage-manager");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "search.db");
}

// ---------------------------------------------------------------------------
// Singleton DB connection
// ---------------------------------------------------------------------------

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(dbPath());
  _db.pragma("journal_mode = WAL");
  _db.pragma("synchronous = NORMAL");
  initSchema(_db);
  return _db;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

function createSchemaTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id  TEXT NOT NULL,
      source      TEXT NOT NULL,
      root_id     TEXT NOT NULL DEFAULT '',
      title       TEXT NOT NULL DEFAULT '',
      cwd         TEXT NOT NULL DEFAULT '',
      indexed_at  INTEGER NOT NULL,
      PRIMARY KEY (session_id, source, root_id)
    );

    -- FTS5 virtual table with trigram tokenizer.
    --
    -- Trigram tokenizer notes:
    --   • Works on Unicode character-level n-grams (window of 3 chars).
    --   • Supports substring search for both Latin and CJK text.
    --   • Minimum query length: 3 characters.
    --   • For 1-2 character queries (common with Chinese 2-character words like
    --     "会话", "命令"), we fall back to a LIKE search on the sessions table
    --     (title + cwd only, not event body). See searchSessions().
    --   • Chinese event body content (3+ char phrases) is fully covered by
    --     trigram. The Latin tokenizer (unicode61) would not help because it
    --     splits on whitespace/punctuation and Chinese has no such delimiters.
    CREATE VIRTUAL TABLE IF NOT EXISTS sessions_fts USING fts5(
      session_id UNINDEXED,
      source     UNINDEXED,
      root_id    UNINDEXED,
      title,
      cwd,
      body,
      tokenize   = 'trigram case_sensitive 0'
    );
  `);
}

function initSchema(db: Database.Database): void {
  createSchemaTables(db);

  const sessionColumns = db.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
  const ftsColumns = db.prepare("PRAGMA table_info(sessions_fts)").all() as Array<{ name: string }>;
  const needsRebuild =
    !sessionColumns.some((column) => column.name === "root_id") ||
    !ftsColumns.some((column) => column.name === "root_id");

  if (needsRebuild) {
    db.exec("DROP TABLE IF EXISTS sessions_fts;");
    db.exec("DROP TABLE IF EXISTS sessions;");
    createSchemaTables(db);
  }
}

// ---------------------------------------------------------------------------
// Index helpers
// ---------------------------------------------------------------------------

/** Maximum characters of event.text / event.output to include per event. */
const MAX_TEXT_PER_EVENT = 500;
const MAX_OUTPUT_PER_EVENT = 200;

/**
 * Escape a user-provided string for safe use with FTS5 MATCH.
 *
 * FTS5 interprets characters like double-quotes, colons, hyphens, and stars as
 * query syntax. To treat the entire input as a literal substring search
 * (which works well with the trigram tokenizer), wrap the whole string in
 * double-quotes and escape any internal double-quotes by doubling them.
 *
 * Examples:
 *   foo"bar  →  "foo""bar"
 *   a:b      →  "a:b"
 *   -hello   →  "-hello"
 */
function escapeFts5Query(q: string): string {
  return `"${q.replace(/"/g, '""')}"`;
}

/** Build the searchable body string from a session's events. */
function buildBody(events: TrajectoryEvent[]): string {
  const parts: string[] = [];
  for (const ev of events) {
    if (ev.title) parts.push(ev.title);
    if (ev.commandLine) parts.push(ev.commandLine);
    if (ev.text) parts.push(ev.text.slice(0, MAX_TEXT_PER_EVENT));
    if (ev.output) parts.push(ev.output.slice(0, MAX_OUTPUT_PER_EVENT));
    if (ev.toolCalls) {
      for (const tc of ev.toolCalls) {
        if (tc.name) parts.push(tc.name);
      }
    }
  }
  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Index (or re-index) a session. Safe to call on every session open; it
 * performs an upsert so repeated calls are idempotent.
 */
export function indexSession(
  sessionId: string,
  source: Source,
  title: string,
  cwd: string,
  events: TrajectoryEvent[],
  opts?: { rootId?: string }
): void {
  const db = getDb();
  const body = buildBody(events);
  const now = Date.now();
  const rootId = opts?.rootId ?? "";

  const upsert = db.transaction(() => {
    // Delete old FTS row first if session already indexed
    const existing = db
      .prepare("SELECT rowid FROM sessions WHERE session_id = ? AND source = ? AND root_id = ?")
      .get(sessionId, source, rootId) as { rowid: number } | undefined;
    if (existing) {
      // For a standalone FTS5 table (no content= backing table), use a regular
      // SQL DELETE to remove the old row from the FTS index. The FTS5 'delete'
      // command (`INSERT INTO t(t, rowid, ...) VALUES ('delete', ...)`) is only
      // for content-backed FTS5 tables; it requires passing the original column
      // values, which we don't store separately and would need to retrieve first.
      // A direct DELETE is simpler and correct for our schema.
      db.prepare("DELETE FROM sessions_fts WHERE rowid = ?").run(existing.rowid);
    }

    db.prepare(`
      INSERT OR REPLACE INTO sessions (session_id, source, root_id, title, cwd, indexed_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(sessionId, source, rootId, title, cwd, now);

    const row = db
      .prepare("SELECT rowid FROM sessions WHERE session_id = ? AND source = ? AND root_id = ?")
      .get(sessionId, source, rootId) as { rowid: number };

    db.prepare(`
      INSERT INTO sessions_fts(rowid, session_id, source, root_id, title, cwd, body)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(row.rowid, sessionId, source, rootId, title, cwd, body);
  });

  upsert();
}

/**
 * Remove a session from the index (e.g., when it is deleted or stale).
 */
export function removeSession(sessionId: string, source: Source, opts?: { rootId?: string }): void {
  const db = getDb();
  const rootId = opts?.rootId ?? "";
  const row = db
    .prepare("SELECT rowid FROM sessions WHERE session_id = ? AND source = ? AND root_id = ?")
    .get(sessionId, source, rootId) as { rowid: number } | undefined;
  if (!row) return;
  db.transaction(() => {
    db.prepare("DELETE FROM sessions_fts WHERE rowid = ?").run(row.rowid);
    db.prepare("DELETE FROM sessions WHERE session_id = ? AND source = ? AND root_id = ?").run(
      sessionId,
      source,
      rootId
    );
  })();
}

/**
 * Search indexed sessions.
 *
 * Strategy:
 *  - query.trim().length >= 3  → FTS5 MATCH (trigram, covers all CJK 3-char+
 *    phrases and Latin substrings)
 *  - query.trim().length 1–2   → LIKE fallback on sessions.title + sessions.cwd
 *    (event body is not searched for very short queries; acceptable trade-off
 *    since short CJK queries like "会话" most usefully match session titles)
 *
 * Returns at most `limit` results (default 20).
 */
export function searchSessions(query: string, limit = 20): SearchResult[] {
  const db = getDb();
  const q = query.trim();
  if (!q) return [];

  if (q.length >= 3) {
    // FTS5 trigram path.
    // The user query is escaped to prevent FTS5 syntax errors (e.g. from
    // special characters like quotes, colons, or hyphens).
    // snippet() parameters: (table, column_index, open_tag, close_tag, ellipsis, num_tokens)
    // column_index 5 = body (0-indexed: session_id=0, source=1, root_id=2, title=3, cwd=4, body=5)
    type FtsRow = {
      session_id: string;
      source: string;
      root_id: string;
      title: string;
      cwd: string;
      snippet: string;
    };
    const rows = db
      .prepare<[string, number]>(`
        SELECT
          f.session_id,
          f.source,
          f.root_id,
          s.title,
          s.cwd,
          snippet(sessions_fts, 5, '<mark>', '</mark>', '…', 12) AS snippet
        FROM sessions_fts f
        JOIN sessions s ON s.session_id = f.session_id AND s.source = f.source AND s.root_id = f.root_id
        WHERE sessions_fts MATCH ?
        ORDER BY bm25(sessions_fts)
        LIMIT ?
      `)
      .all(escapeFts5Query(q), limit) as FtsRow[];

    return rows.map((r) => ({
      sessionId: r.session_id,
      source: r.source as Source,
      title: r.title,
      cwd: r.cwd,
      snippet: r.snippet ?? "",
      ...(r.root_id ? { rootId: r.root_id } : {})
    }));
  }

  // LIKE fallback for 1–2 character queries
  const like = `%${q}%`;
  type LikeRow = { session_id: string; source: string; root_id: string; title: string; cwd: string };
  const rows = db
    .prepare<[string, string, number]>(`
      SELECT session_id, source, root_id, title, cwd
      FROM sessions
      WHERE title LIKE ? OR cwd LIKE ?
      ORDER BY indexed_at DESC
      LIMIT ?
    `)
    .all(like, like, limit) as LikeRow[];

  return rows.map((r) => ({
    sessionId: r.session_id,
    source: r.source as Source,
    title: r.title,
    cwd: r.cwd,
    snippet: "",
    ...(r.root_id ? { rootId: r.root_id } : {})
  }));
}

/**
 * Return the set of (sessionId, source) pairs currently in the index.
 * Useful for detecting stale entries.
 */
export function getIndexedSessionIds(): Array<{ sessionId: string; source: Source; rootId?: string }> {
  const db = getDb();
  const rows = db.prepare("SELECT session_id, source, root_id FROM sessions").all() as Array<{
    session_id: string;
    source: string;
    root_id: string;
  }>;
  return rows.map((r) => ({
    sessionId: r.session_id,
    source: r.source as Source,
    ...(r.root_id ? { rootId: r.root_id } : {})
  }));
}

/**
 * Return true if the given session already has an entry in the search index.
 * Used to skip redundant background trajectory fetches (e.g. when opening a
 * session in chat/compact mode that was previously indexed via trajectory view).
 */
export function isSessionIndexed(sessionId: string, source: Source, opts?: { rootId?: string }): boolean {
  const db = getDb();
  const rootId = opts?.rootId ?? "";
  const row = db
    .prepare("SELECT 1 FROM sessions WHERE session_id = ? AND source = ? AND root_id = ?")
    .get(sessionId, source, rootId);
  return row !== undefined;
}

/** Close the database connection (useful in tests). */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
