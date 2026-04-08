import "server-only";

import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import type { Dir } from "node:fs";
import path from "node:path";
import readline from "node:readline";

import type { AppConfig, RootConfig, SourcesStatus, TrajectoryEvent, TrajectorySummary } from "@/lib/types";
import { expandHome } from "@/lib/server/paths";
import {
  extractCodexSessionMeta,
  extractCodexTitle,
  normalizeCodexEventsToTrajectoryEvents,
  parseCodexJsonl,
  parseCodexJsonlLine,
  sanitizeSqliteCodexTitle
} from "@/lib/parse/codexLog";

const MAX_CODEX_RAW_LINES = 5000;
const MAX_CODEX_SESSION_BYTES = 5 * 1024 * 1024; // 5 MiB cap for UI conversation loading
const MAX_CODEX_CONVERSATION_LINES = 5000;

/* ---------- helpers ---------- */

/**
 * Standardize root ID validation across all API routes.
 * Returns undefined for null, empty, or whitespace-only strings.
 */
export function validateRootId(rawRootId: string | null): string | undefined {
  if (rawRootId === null) return undefined;
  const trimmed = rawRootId.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Stat a path and return a discriminated result so callers can distinguish
 * "path does not exist / is not a directory" (ENOENT, ENOTDIR) from
 * "permission denied" (EACCES, EPERM).
 *
 * - `stat` is non-null on success.
 * - `errorCode` carries the Node.js `errno` code string on failure (e.g.
 *   `"ENOENT"`, `"EACCES"`).  Callers that only care about existence can
 *   ignore `errorCode`; callers that need to emit a diagnostic for permission
 *   failures should check whether `errorCode` is `"EACCES"` or `"EPERM"`.
 */
async function statPath(p: string): Promise<{ stat: Awaited<ReturnType<typeof fs.stat>> | null; errorCode?: string }> {
  try {
    return { stat: await fs.stat(p) };
  } catch (err) {
    let errorCode: string | undefined;
    if (err != null && typeof err === "object" && "code" in err) {
      const codeRaw = (err as NodeJS.ErrnoException).code;
      if (typeof codeRaw === "string") {
        errorCode = codeRaw;
      }
    }
    return { stat: null, errorCode };
  }
}

/** Silently return null for any stat error (used for per-file stat inside collectJsonlFiles). */
async function safeStat(p: string) {
  const { stat } = await statPath(p);
  return stat;
}

/**
 * Recursively collect all `.jsonl` files under `dir`.
 * Depth-limited to avoid runaway traversal. The expected Codex directory
 * layout is `YYYY/MM/DD/rollout-*.jsonl` (depth 3), so a limit of 5 is
 * generous while guarding against unusual configurations.
 *
 * When `strict: true`, a `readdir` error on `dir` itself (e.g. EPERM) is
 * re-thrown — callers like `probeRootHealth` use this to detect an unreadable
 * root and return `status: "unreadable"`. `strict` is intentionally **not**
 * propagated to recursive calls; nested subdirectory errors are always
 * handled best-effort (continue scanning siblings).
 *
 * When `partialErrors` is provided, any `readdir` failures on nested
 * subdirectories are recorded in that array instead of being silently
 * ignored, letting callers surface partial-permission diagnostics.
 *
 * Exported for use by the conversations scanner (`conversations.ts`).
 */
export async function collectJsonlFiles(
  dir: string,
  maxDepth = 5,
  opts?: { strict?: boolean; partialErrors?: string[] }
): Promise<Array<{ path: string; mtimeMs: number; sizeBytes: number }>> {
  if (maxDepth <= 0) return [];

  // Simple per-call concurrency helper so we can avoid serializing filesystem IO.
  async function mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = [];
    let index = 0;

    async function worker() {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const current = index++;
        if (current >= items.length) break;
        results[current] = await fn(items[current], current);
      }
    }

    const concurrency = Math.min(limit, items.length || 1);
    const workers: Array<Promise<void>> = [];
    for (let i = 0; i < concurrency; i++) {
      workers.push(worker());
    }
    await Promise.all(workers);
    return results;
  }

  async function forEachWithConcurrency<T>(
    items: T[],
    limit: number,
    fn: (item: T, index: number) => Promise<void>
  ): Promise<void> {
    await mapWithConcurrency(items, limit, async (item, index) => {
      await fn(item, index);
      return 0;
    });
  }

  let dirents: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }> = [];
  try {
    dirents = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (opts?.strict) throw err;
    // Not strict: record only actionable, non-transient errors if a collector was provided, then skip.
    const code = (err as NodeJS.ErrnoException | undefined)?.code;
    if (code !== "ENOENT" && code !== "ENOTDIR") {
      opts?.partialErrors?.push(`${dir}: ${err instanceof Error ? err.message : String(err)}`);
    }
    return [];
  }

  const results: Array<{ path: string; mtimeMs: number; sizeBytes: number }> = [];
  const fileEntries: string[] = [];
  const dirEntries: string[] = [];

  for (const d of dirents) {
    const fullPath = path.join(dir, d.name);
    if (d.isFile() && d.name.endsWith(".jsonl")) {
      fileEntries.push(fullPath);
    } else if (d.isDirectory()) {
      dirEntries.push(fullPath);
    }
  }

  const FILE_STAT_CONCURRENCY = 8;
  const DIR_TRAVERSE_CONCURRENCY = 4;

  await forEachWithConcurrency(fileEntries, FILE_STAT_CONCURRENCY, async (fullPath) => {
    const st = await safeStat(fullPath);
    if (st) {
      results.push({ path: fullPath, mtimeMs: st.mtimeMs, sizeBytes: st.size });
    }
  });

  const nestedArrays = await mapWithConcurrency(
    dirEntries,
    DIR_TRAVERSE_CONCURRENCY,
    async (fullPath) => {
      // Nested calls are always best-effort (no `strict`), but errors are
      // forwarded to the same `partialErrors` array so the caller can report them.
      const nested = await collectJsonlFiles(
        fullPath,
        maxDepth - 1,
        opts?.partialErrors ? { partialErrors: opts.partialErrors } : undefined
      );
      return nested;
    }
  );

  for (const nested of nestedArrays) {
    if (nested && nested.length) {
      results.push(...nested);
    }
  }

  // Ensure deterministic ordering regardless of concurrent traversal timing.
  // Primary sort: modification time (newest first). Tiebreaker: path.
  results.sort((a, b) => {
    if (a.mtimeMs !== b.mtimeMs) {
      return b.mtimeMs - a.mtimeMs;
    }
    return a.path.localeCompare(b.path);
  });

  return results;
}

/* ---------- session id → path cache ---------- */

type SessionPathCacheEntry = {
  /** map from session id to absolute file path */
  idToPath: Map<string, string>;
  /** timestamp when cache was populated */
  cachedAtMs: number;
  /** expanded root path this index was built from; used to detect path changes */
  rootPath: string;
};

/** TTL for the id→path index (ms). Aligned with dir-cache TTL in conversations.ts. */
const SESSION_PATH_CACHE_TTL_MS = 10_000;

/** Module-level cache, keyed by root id. */
const _sessionPathCache = new Map<string, SessionPathCacheEntry>();

/** Simple mutex for cache operations to prevent race conditions */
const _cacheMutex = {
  locked: false,
  waiters: [] as Array<() => void>,
  
  async lock(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.waiters.push(resolve);
      }
    });
  },
  
  unlock(): void {
    if (this.waiters.length > 0) {
      const next = this.waiters.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }
};

function invalidateCachedSessionId(rootId: string | undefined, sessionId: string): void {
  // Perform cache invalidation atomically to prevent race conditions
  if (!rootId) {
    // Invalidate from all roots - create a snapshot to avoid concurrent modification
    const entries = Array.from(_sessionPathCache.entries());
    for (const [, entry] of entries) {
      entry.idToPath.delete(sessionId);
    }
    return;
  }
  const entry = _sessionPathCache.get(rootId);
  entry?.idToPath.delete(sessionId);
}

async function ensureCodexSessionFileExists(
  rootId: string | undefined,
  sessionId: string,
  filePath: string
): Promise<"ok" | "missing"> {
  const { stat, errorCode } = await statPath(filePath);
  if (stat?.isFile()) {
    return "ok";
  }
  if (errorCode === "ENOENT" || errorCode === "ENOTDIR" || stat?.isFile() === false || (!errorCode && stat == null)) {
    invalidateCachedSessionId(rootId, sessionId);
    return "missing";
  }
  const err = new Error(`Cannot read Codex session file ${filePath}: ${errorCode ?? "unknown error"}`) as
    Error & { code?: string };
  err.code = errorCode;
  throw err;
}

async function resolveCodexSessionFile(
  id: string,
  roots: RootConfig[],
  preferredRootId?: string
): Promise<{ filePath: string; rootId?: string } | null> {
  const first = await findCodexSessionFile(id, roots, preferredRootId);
  if (!first) return null;
  if ((await ensureCodexSessionFileExists(first.rootId, id, first.filePath)) === "ok") {
    return first;
  }
  return findCodexSessionFile(id, roots, preferredRootId);
}

function toCodexSessionReadError(err: unknown, id: string, rootId?: string): Error {
  const e = err as NodeJS.ErrnoException;
  if (e?.code === "ENOENT" || e?.code === "ENOTDIR") {
    invalidateCachedSessionId(rootId, id);
    return new Error(`Codex session not found: ${id}. The file may have been deleted or moved.`);
  }
  if (e?.code === "EACCES" || e?.code === "EPERM") {
    return new Error(`Permission denied reading Codex session: ${id}. Check filesystem permissions for the selected root.`);
  }
  return err instanceof Error ? err : new Error(String(err));
}

/**
 * Find the full path for a Codex session file across all enabled Codex roots.
 * The session ID is the filename without `.jsonl`.
 *
 * Uses a TTL-based per-root id→path cache so repeated calls (e.g. load
 * conversation + diagnostic export) avoid a full O(N) traversal each time.
 */
async function findCodexSessionFile(
  id: string,
  roots: RootConfig[],
  preferredRootId?: string
): Promise<{ filePath: string; rootId?: string } | null> {
  const now = Date.now();
  // Collect per-root scan errors to surface when the session isn't found.
  // A single unreadable root must not block other valid roots.
  const scanErrors: string[] = [];

  const orderedRoots =
    preferredRootId == null
      ? roots
      : [
          ...roots.filter((root) => root.id === preferredRootId),
          ...roots.filter((root) => root.id !== preferredRootId)
        ];

  for (const root of orderedRoots) {
    if (!root.enabled || root.source !== "codex") continue;
    const rootPath = expandHome(root.path);

    // Try cached index first (only if root path hasn't changed)
    const cached = _sessionPathCache.get(root.id);
    if (cached && cached.rootPath === rootPath && now - cached.cachedAtMs < SESSION_PATH_CACHE_TTL_MS) {
      const hit = cached.idToPath.get(id);
      if (hit) {
        if ((await ensureCodexSessionFileExists(root.id, id, hit)) === "ok") {
          return { filePath: hit, rootId: root.id };
        }
        // Remove stale cache entry atomically
        await _cacheMutex.lock();
        try {
          _sessionPathCache.delete(root.id);
        } finally {
          _cacheMutex.unlock();
        }
      } else {
        // Not in this root's current index — continue to the next root without scanning.
        continue;
      }
    }

    // Cache miss (or stale / root path changed): build id→path index for this root.
    // First verify the root exists and is a directory:
    //   - ENOENT / ENOTDIR → root is missing or misconfigured; silently skip.
    //   - EACCES / EPERM  → root exists but can't be read; record for diagnostics.
    const { stat: rootStat, errorCode: statError } = await statPath(rootPath);
    if (!rootStat) {
      if (statError === "EACCES" || statError === "EPERM") {
        scanErrors.push(`${rootPath}: Permission denied (${statError})`);
      }
      // ENOENT / ENOTDIR / other → silently skip (misconfigured or deleted root)
      continue;
    }
    if (!rootStat.isDirectory()) {
      // Path exists but is not a directory — skip silently
      continue;
    }

    // Best-effort traversal: a single unreadable nested subdirectory must not
    // abort indexing for the whole root. EPERM/EACCES errors are collected and
    // only surfaced in the final "session not found" message.
    const rootErrors: string[] = [];
    const files = await collectJsonlFiles(rootPath, 5, { partialErrors: rootErrors });
    if (rootErrors.length > 0) {
      scanErrors.push(...rootErrors);
    }
    const idToPath = new Map<string, string>();
    for (const f of files) {
      const sessionId = path.basename(f.path, ".jsonl");
      if (!idToPath.has(sessionId)) {
        idToPath.set(sessionId, f.path);
      }
    }
    // Update cache atomically
    await _cacheMutex.lock();
    try {
      _sessionPathCache.set(root.id, { idToPath, cachedAtMs: now, rootPath });
    } finally {
      _cacheMutex.unlock();
    }

    const hit = idToPath.get(id);
    if (hit) {
      if ((await ensureCodexSessionFileExists(root.id, id, hit)) === "ok") {
        return { filePath: hit, rootId: root.id };
      }
      // Remove stale cache entry
      await _cacheMutex.lock();
      try {
        _sessionPathCache.delete(root.id);
      } finally {
        _cacheMutex.unlock();
      }
    }
  }

  // Session not found; if some roots were unreadable, surface those errors so
  // callers can distinguish "missing file" from "permission denied".
  if (scanErrors.length > 0) {
    throw new Error(
      `Codex session '${id}' not found. The following roots could not be read:\n${scanErrors.join("\n")}`
    );
  }
  return null;
}

/* ---------- public API ---------- */

/**
 * Get status for the Codex source. Unlike Antigravity/Windsurf, Codex requires
 * no running process — it reads session files directly from disk.
 *
 * Checks all enabled roots and reports `sessionsFound: true` if any root
 * contains at least one `.jsonl` file.
 */
async function hasAnyJsonlFile(
  dir: string,
  maxDepth: number,
  opts: { partialErrors?: string[]; strict?: boolean } = {}
): Promise<boolean> {
  const { partialErrors, strict } = opts;

  async function walk(currentDir: string, depth: number): Promise<boolean> {
    let handle: Dir | null = null;
    try {
      handle = await fs.opendir(currentDir);
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException;
      const code = e?.code;
      const message = e && e.message ? e.message : String(err);
      if (strict && depth === 0) {
        // Surface failures to read the root directory when in strict mode.
        throw err;
      }
      // Ignore transient nested ENOENT/ENOTDIR while preserving actionable
      // permission/readability failures.
      if (partialErrors && !(depth > 0 && (code === "ENOENT" || code === "ENOTDIR"))) {
        partialErrors.push(`Error reading ${currentDir}: ${message}`);
      }
      return false;
    }

    try {
      for await (const dirent of handle) {
        if (dirent.isFile()) {
          if (path.extname(dirent.name) === ".jsonl") {
            return true;
          }
        } else if (dirent.isDirectory() && depth < maxDepth - 1) {
          const childDir = path.join(currentDir, dirent.name);
          if (await walk(childDir, depth + 1)) {
            return true;
          }
        }
      }
    } finally {
      if (handle) {
        await handle.close().catch(() => {});
      }
    }

    return false;
  }

  return walk(dir, 0);
}

export async function getCodexStatus(config: AppConfig): Promise<SourcesStatus["codex"]> {
  const codexRoots = config.roots.filter((r) => r.source === "codex");
  const enabledRoots = codexRoots.filter((r) => r.enabled);
  if (enabledRoots.length === 0) {
    return {
      sessionsFound: false,
      error:
        codexRoots.length === 0
          ? "No Codex roots configured. Add a root pointing to ~/.codex/sessions in Settings."
          : "No Codex roots are enabled. Enable a Codex root in Settings."
    };
  }

  // Track the first directory we check for reporting purposes
  const firstDir = expandHome(enabledRoots[0]!.path);
  let lastError: string | undefined;

  for (const root of enabledRoots) {
    const sessionsDir = expandHome(root.path);
    const { stat: st, errorCode: statError } = await statPath(sessionsDir);

    if (!st) {
      lastError =
        statError === "EACCES" || statError === "EPERM"
          ? `Permission denied reading Codex sessions directory: ${sessionsDir}`
          : `Codex sessions directory not found: ${sessionsDir}. Install and run Codex CLI to create sessions.`;
      continue;
    }
    if (!st.isDirectory()) {
      lastError = `Path exists but is not a directory: ${sessionsDir}`;
      continue;
    }

    // Best-effort traversal: a single unreadable nested subdirectory must not
    // hide sessions that exist in other readable subdirectories.
    // Errors from inaccessible paths are collected for diagnostics.
    const partialErrors: string[] = [];
    let hasSessions = false;
    try {
      // Use strict mode for the top-level scan so that failures to read the
      // root sessions directory itself are surfaced as root-level errors,
      // while still collecting nested permission errors via `partialErrors`.
      hasSessions = await hasAnyJsonlFile(sessionsDir, 5, { partialErrors, strict: true });
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException;
      if (e && (e.code === "EACCES" || e.code === "EPERM")) {
        lastError = `Permission denied reading Codex sessions directory: ${sessionsDir}`;
      } else {
        const message = e && e.message ? e.message : String(err);
        lastError = `Error reading Codex sessions directory ${sessionsDir}: ${message}`;
      }
      continue;
    }
    if (hasSessions) {
      return { sessionsFound: true, sessionsDir };
    }
    if (partialErrors.length > 0) {
      lastError = `Cannot read some subdirectories in ${sessionsDir}: ${partialErrors.join("; ")}`;
      continue;
    }
    lastError = `No session files found in ${sessionsDir}. Run Codex CLI to create sessions.`;
  }

  return {
    sessionsFound: false,
    sessionsDir: firstDir,
    error: lastError
  };
}

/**
 * Load and parse a Codex session by ID, searching all enabled Codex roots.
 */
export async function getCodexConversation(
  id: string,
  config: AppConfig,
  opts?: { preferredRootId?: string }
): Promise<{ events: TrajectoryEvent[]; summary: TrajectorySummary; rootId?: string }> {
  let resolved: { filePath: string; rootId?: string } | null;
  try {
    resolved = await resolveCodexSessionFile(id, config.roots, opts?.preferredRootId);
  } catch (err) {
    throw toCodexSessionReadError(err, id, opts?.preferredRootId);
  }
  if (!resolved) {
    throw new Error(`Codex session not found: ${id}. The file may have been deleted or is not in any configured root.`);
  }
  const { filePath, rootId } = resolved;

  let stats;
  try {
    stats = await fs.stat(filePath);
  } catch (err) {
    throw toCodexSessionReadError(err, id, rootId);
  }
  if (stats.size > MAX_CODEX_SESSION_BYTES) {
    throw new Error(
      `Codex session file is too large to load in the UI (size: ${stats.size} bytes, limit: ${MAX_CODEX_SESSION_BYTES} bytes).`
    );
  }

  const stream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  const contentParts: string[] = [];
  
  try {
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      contentParts.push(line);
      lineCount++;

      if (lineCount >= MAX_CODEX_CONVERSATION_LINES) {
        // We've reached the cap of lines to parse for the UI conversation.
        break;
      }
    }
  } catch (err) {
    throw toCodexSessionReadError(err, id, rootId);
  } finally {
    try {
      rl.close();
    } catch (rlErr) {
      console.warn(`[codex] Failed to close readline interface for ${id}:`, rlErr instanceof Error ? rlErr.message : String(rlErr));
    }
    try {
      stream.destroy();
    } catch (streamErr) {
      console.warn(`[codex] Failed to destroy stream for ${id}:`, streamErr instanceof Error ? streamErr.message : String(streamErr));
    }
  }

  const content = contentParts.join("\n");
  const rawEvents = parseCodexJsonl(content);
  return {
    ...normalizeCodexEventsToTrajectoryEvents(rawEvents),
    ...(rootId ? { rootId } : {})
  };
}

/**
 * Load the raw JSONL content for a Codex session (used in diagnostic export).
 * Streams the file and caps the number of returned lines to avoid large responses.
 */
export async function getCodexRawContent(
  id: string,
  config: AppConfig,
  opts?: { preferredRootId?: string }
): Promise<{
  filePath: string;
  rawLines: unknown[];
  truncated: boolean;
  totalLines?: number;
  returnedLines: number;
}> {
  let resolved: { filePath: string; rootId?: string } | null;
  try {
    resolved = await resolveCodexSessionFile(id, config.roots, opts?.preferredRootId);
  } catch (err) {
    throw toCodexSessionReadError(err, id, opts?.preferredRootId);
  }
  if (!resolved) {
    throw new Error(`Codex session not found: ${id}`);
  }
  const { filePath } = resolved;

  const rawLines: unknown[] = [];
  let totalLines = 0;
  let totalNonEmptyLines = 0;
  let truncated = false;

  const stream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  try {
    for await (const line of rl) {
      totalLines += 1;

      // Skip empty/whitespace-only lines for the payload, but still count them.
      if (!line.trim()) {
        continue;
      }

      totalNonEmptyLines += 1;

      if (rawLines.length < MAX_CODEX_RAW_LINES) {
        // We have not yet hit the cap; parse and store this line.
        try {
          rawLines.push(JSON.parse(line));
        } catch (parseErr) {
          // Store parsing error metadata instead of raw invalid JSON
          rawLines.push({
            _error: "json_parse_failed",
            _originalLine: line,
            _parseError: parseErr instanceof Error ? parseErr.message : String(parseErr)
          });
        }
      } else {
        // We've reached the cap of lines to return. Mark as truncated and stop reading
        // further lines so that I/O remains bounded for very large sessions.
        truncated = true;
        break;
      }
    }
  } catch (err) {
    throw toCodexSessionReadError(err, id, resolved.rootId);
  } finally {
    try {
      rl.close();
    } catch (rlErr) {
      console.warn(`[codex] Failed to close readline interface for ${id}:`, rlErr instanceof Error ? rlErr.message : String(rlErr));
    }
    try {
      stream.destroy();
    } catch (streamErr) {
      console.warn(`[codex] Failed to destroy stream for ${id}:`, streamErr instanceof Error ? streamErr.message : String(streamErr));
    }
  }

  const returnedLines = rawLines.length;
  if (!truncated) {
    // Fallback: detect truncation based on counts if we never hit the hard cap in the loop.
    truncated = returnedLines < totalNonEmptyLines;
  }

  return {
    filePath,
    rawLines,
    truncated,
    ...(truncated ? {} : { totalLines }),
    returnedLines
  };
}

/** Path to the Codex state SQLite database written by the CLI and App. */
const CODEX_STATE_DB = "~/.codex/state_5.sqlite";

/**
 * Read title and cwd for all known threads from the Codex state SQLite database.
 * Returns a map keyed by session ID (basename of rollout_path without .jsonl extension).
 * Returns an empty map if the database does not exist or cannot be read.
 */
function getCodexTitlesFromSqlite(): Map<string, { title: string; cwd?: string }> {
  const result = new Map<string, { title: string; cwd?: string }>();
  const dbPath = expandHome(CODEX_STATE_DB);
  try {
    // node:sqlite is available on Node ≥ 22.5 (stable in Node 24).
    // Dynamic require keeps this compatible when running under older Node or test shims.
    const { DatabaseSync } = require("node:sqlite") as {
      DatabaseSync: new (path: string, opts?: { open?: boolean }) => {
        prepare: (sql: string) => { all: () => unknown[] };
        close: () => void;
      };
    };
    const db = new DatabaseSync(dbPath, { open: true });
    const rows = db.prepare(
      "SELECT rollout_path, title, cwd FROM threads WHERE title IS NOT NULL AND title != '' AND rollout_path IS NOT NULL"
    ).all() as Array<{ rollout_path: string; title: string; cwd: string | null }>;
    db.close();
    for (const row of rows) {
      const sessionId = path.basename(row.rollout_path, ".jsonl");
      const title = sanitizeSqliteCodexTitle(row.title) ?? row.title;
      result.set(sessionId, {
        title,
        ...(row.cwd ? { cwd: row.cwd } : {})
      });
    }
  } catch {
    // DB missing, locked, or node:sqlite unavailable — caller falls back to JSONL scan.
  }
  return result;
}

/**
 * Maximum bytes to read per session file when extracting title/cwd metadata.
 * Codex App sessions embed large base_instructions and injected context blocks
 * before the first real user message; 256 KB covers >95% of sessions while
 * keeping memory usage bounded during bulk scans.
 */
const META_READ_BUDGET_BYTES = 256 * 1024;

/**
 * Extract title and cwd from a Codex session file by streaming line-by-line up
 * to META_READ_BUDGET_BYTES. Stops early as soon as both values are found.
 * Line-based streaming avoids the half-parsed-line problem of a raw buffer read.
 */
async function extractCodexFileMeta(
  filePath: string
): Promise<{ title?: string; cwd?: string }> {
  return new Promise((resolve) => {
    let bytesRead = 0;
    let resolved = false;
    let title: string | undefined;
    let cwd: string | undefined;

    const stream = createReadStream(filePath, { encoding: "utf-8" });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    const finish = () => {
      if (resolved) return;
      resolved = true;
      rl.close();
      stream.destroy();
      resolve({ title, cwd });
    };

    stream.on("data", (chunk) => {
      bytesRead += (chunk as string).length;
      if (bytesRead > META_READ_BUDGET_BYTES) {
        finish();
      }
    });

    rl.on("line", (line) => {
      if (resolved) return;
      const event = parseCodexJsonlLine(line);
      if (!event) return;

      // Update cwd from any session_meta event
      if (!cwd) {
        const meta = extractCodexSessionMeta([event]);
        if (meta.cwd) cwd = meta.cwd;
      }
      // Update title from any user_message event (skip injected context)
      if (!title) {
        title = extractCodexTitle([event]);
      }

      if (title && cwd) finish();
    });

    rl.on("close", finish);
    stream.on("error", finish);
  });
}

/**
 * Build a title/cwd metadata map for all Codex sessions across enabled roots.
 *
 * Strategy (in priority order):
 *  1. ~/.codex/state_5.sqlite — primary source of truth; contains the title
 *     shown in the Codex App (auto-generated after first turn, and editable by
 *     the user). Read once up-front for all sessions.
 *  2. JSONL stream reader (extractCodexFileMeta) — fallback for sessions not
 *     yet recorded in the SQLite db (e.g. very new or CLI-only sessions).
 */
export async function getCodexTrajectoryMetaMap(
  config: AppConfig
): Promise<Record<string, { title?: string; cwd?: string }>> {
  const enabledRoots = config.roots.filter((r) => r.source === "codex" && r.enabled);
  const result: Record<string, { title?: string; cwd?: string }> = {};

  // Primary: load all known titles from SQLite in one synchronous read.
  const sqliteTitles = getCodexTitlesFromSqlite();

  for (const root of enabledRoots) {
    const rootPath = expandHome(root.path);
    const files = await collectJsonlFiles(rootPath);

    for (const file of files) {
      const id = path.basename(file.path, ".jsonl");
      const existing = result[id];
      if (existing?.title && existing?.cwd) continue; // already complete from a previous root

      // Check SQLite first
      const sqliteMeta = sqliteTitles.get(id);
      if (sqliteMeta) {
        result[id] = {
          ...(existing ?? {}),
          ...(!existing?.title && sqliteMeta.title ? { title: sqliteMeta.title } : {}),
          ...(!existing?.cwd && sqliteMeta.cwd ? { cwd: sqliteMeta.cwd } : {})
        };
        // If cwd is still missing after SQLite, fall through to JSONL scan below
        if (result[id]?.title && result[id]?.cwd) continue;
      }

      // Fallback: stream the JSONL file for sessions absent from SQLite
      try {
        const meta = await extractCodexFileMeta(file.path);
        const base = result[id] ?? existing ?? {};
        result[id] = {
          ...base,
          ...(!base.title && meta.title ? { title: meta.title } : {}),
          ...(!base.cwd && meta.cwd ? { cwd: meta.cwd } : {})
        };
      } catch {
        // Best-effort; skip files that can't be read
      }
    }
  }

  return result;
}
