import "server-only";

import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import readline from "node:readline";

import type { AppConfig, RootConfig, SourcesStatus, TrajectoryEvent, TrajectorySummary } from "@/lib/types";
import { expandHome } from "@/lib/server/paths";
import {
  extractCodexSessionMeta,
  extractCodexTitle,
  normalizeCodexEventsToTrajectoryEvents,
  parseCodexJsonl
} from "@/lib/parse/codexLog";

const MAX_CODEX_RAW_LINES = 5000;
const MAX_CODEX_SESSION_BYTES = 5 * 1024 * 1024; // 5 MiB cap for UI conversation loading

/* ---------- helpers ---------- */

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

  await mapWithConcurrency(fileEntries, FILE_STAT_CONCURRENCY, async (fullPath) => {
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

/**
 * Find the full path for a Codex session file across all enabled Codex roots.
 * The session ID is the filename without `.jsonl`.
 *
 * Uses a TTL-based per-root id→path cache so repeated calls (e.g. load
 * conversation + diagnostic export) avoid a full O(N) traversal each time.
 */
async function findCodexSessionFile(id: string, roots: RootConfig[]): Promise<string | null> {
  const now = Date.now();
  // Collect per-root scan errors to surface when the session isn't found.
  // A single unreadable root must not block other valid roots.
  const scanErrors: string[] = [];

  for (const root of roots) {
    if (!root.enabled || root.source !== "codex") continue;
    const rootPath = expandHome(root.path);

    // Try cached index first (only if root path hasn't changed)
    const cached = _sessionPathCache.get(root.id);
    if (cached && cached.rootPath === rootPath && now - cached.cachedAtMs <= SESSION_PATH_CACHE_TTL_MS) {
      const hit = cached.idToPath.get(id);
      if (hit) return hit;
      // Not in this root's index — continue to next root without scanning
      continue;
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
      idToPath.set(path.basename(f.path, ".jsonl"), f.path);
    }
    _sessionPathCache.set(root.id, { idToPath, cachedAtMs: now, rootPath });

    const hit = idToPath.get(id);
    if (hit) return hit;
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
    let handle: fs.Dir | undefined;
    try {
      handle = await fs.opendir(currentDir);
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException;
      const message = e && e.message ? e.message : String(err);
      if (strict && depth === 0) {
        // Surface failures to read the root directory when in strict mode.
        throw err;
      }
      if (partialErrors) {
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
      await handle.close();
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
  config: AppConfig
): Promise<{ events: TrajectoryEvent[]; summary: TrajectorySummary }> {
  const filePath = await findCodexSessionFile(id, config.roots);
  if (!filePath) {
    throw new Error(`Codex session not found: ${id}. The file may have been deleted or is not in any configured root.`);
  }

  const stats = await fs.stat(filePath);
  if (stats.size > MAX_CODEX_SESSION_BYTES) {
    throw new Error(
      `Codex session file is too large to load in the UI (size: ${stats.size} bytes, limit: ${MAX_CODEX_SESSION_BYTES} bytes).`
    );
  }

  const content = await fs.readFile(filePath, "utf-8");
  const rawEvents = parseCodexJsonl(content);
  return normalizeCodexEventsToTrajectoryEvents(rawEvents);
}

/**
 * Load the raw JSONL content for a Codex session (used in diagnostic export).
 * Streams the file and caps the number of returned lines to avoid large responses.
 */
export async function getCodexRawContent(
  id: string,
  config: AppConfig
): Promise<{
  filePath: string;
  rawLines: unknown[];
  truncated: boolean;
  totalLines: number;
  returnedLines: number;
}> {
  const filePath = await findCodexSessionFile(id, config.roots);
  if (!filePath) {
    throw new Error(`Codex session not found: ${id}`);
  }

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
        } catch {
          rawLines.push(line);
        }
      } else {
        // We've reached the cap of lines to return. Mark as truncated but keep reading
        // to compute accurate total line counts without storing additional payload.
        truncated = true;
        // Do not store further lines.
      }
    }
  } finally {
    rl.close();
    stream.destroy();
  }

  const returnedLines = rawLines.length;
  if (!truncated) {
    // Fallback: detect truncation based on counts if we never hit the hard cap in the loop.
    truncated = returnedLines < totalNonEmptyLines;
  }

  return { filePath, rawLines, truncated, totalLines, returnedLines };
}

/**
 * Build a title/cwd metadata map for all Codex sessions across enabled roots.
 * Only reads the first few lines of each file for performance.
 */
export async function getCodexTrajectoryMetaMap(
  config: AppConfig
): Promise<Record<string, { title?: string; cwd?: string }>> {
  const enabledRoots = config.roots.filter((r) => r.source === "codex" && r.enabled);
  const result: Record<string, { title?: string; cwd?: string }> = {};

  for (const root of enabledRoots) {
    const rootPath = expandHome(root.path);
    const files = await collectJsonlFiles(rootPath);

    for (const file of files) {
      const id = path.basename(file.path, ".jsonl");
      const existing = result[id];
      if (existing && (existing.title || existing.cwd)) continue; // already have metadata from a previous root

      let fd: fs.FileHandle | undefined;
      try {
        // Read only the first 8 KB to extract metadata without loading the full file.
        fd = await fs.open(file.path, "r");
        const buf = Buffer.alloc(8192);
        const { bytesRead } = await fd.read(buf, 0, 8192, 0);
        const head = buf.subarray(0, bytesRead).toString("utf-8");
        const rawEvents = parseCodexJsonl(head);
        const meta = extractCodexSessionMeta(rawEvents);
        const title = extractCodexTitle(rawEvents);
        result[id] = {
          ...(title ? { title } : {}),
          ...(meta.cwd ? { cwd: meta.cwd } : {})
        };
      } catch {
        // Best-effort; skip files that can't be read
      } finally {
        await fd?.close().catch(() => {});
      }
    }
  }

  return result;
}
