import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import type { AppConfig, RootConfig, SourcesStatus, TrajectoryEvent, TrajectorySummary } from "@/lib/types";
import { expandHome } from "@/lib/server/paths";
import {
  extractCodexSessionMeta,
  extractCodexTitle,
  normalizeCodexEventsToTrajectoryEvents,
  parseCodexJsonl
} from "@/lib/parse/codexLog";

/* ---------- helpers ---------- */

async function safeStat(p: string) {
  try {
    return await fs.stat(p);
  } catch {
    return null;
  }
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

  let dirents: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }> = [];
  try {
    dirents = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (opts?.strict) throw err;
    // Not strict: record the error if a collector was provided, then skip.
    opts?.partialErrors?.push(`${dir}: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }

  const results: Array<{ path: string; mtimeMs: number; sizeBytes: number }> = [];

  for (const d of dirents) {
    const fullPath = path.join(dir, d.name);
    if (d.isFile() && d.name.endsWith(".jsonl")) {
      const st = await safeStat(fullPath);
      if (st) results.push({ path: fullPath, mtimeMs: st.mtimeMs, sizeBytes: st.size });
    } else if (d.isDirectory()) {
      // Nested calls are always best-effort (no `strict`), but errors are
      // forwarded to the same `partialErrors` array so the caller can report them.
      const nested = await collectJsonlFiles(
        fullPath,
        maxDepth - 1,
        opts?.partialErrors ? { partialErrors: opts.partialErrors } : undefined
      );
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
    // Best-effort traversal: a single unreadable nested subdirectory must not
    // abort indexing for the whole root. Errors are collected and only surfaced
    // in the final "session not found" message when no path was found at all.
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
    const st = await safeStat(sessionsDir);

    if (!st) {
      lastError = `Codex sessions directory not found: ${sessionsDir}. Install and run Codex CLI to create sessions.`;
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
    const files = await collectJsonlFiles(sessionsDir, 5, { partialErrors });
    if (files.length > 0) {
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

  const content = await fs.readFile(filePath, "utf-8");
  const rawEvents = parseCodexJsonl(content);
  return normalizeCodexEventsToTrajectoryEvents(rawEvents);
}

/**
 * Load the raw JSONL content for a Codex session (used in diagnostic export).
 */
export async function getCodexRawContent(id: string, config: AppConfig): Promise<{ filePath: string; rawLines: unknown[] }> {
  const filePath = await findCodexSessionFile(id, config.roots);
  if (!filePath) {
    throw new Error(`Codex session not found: ${id}`);
  }
  const content = await fs.readFile(filePath, "utf-8");
  const rawLines = content
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return l;
      }
    });
  return { filePath, rawLines };
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
      if (result[id]) continue; // already seen from a previous root

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
