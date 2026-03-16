import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import type { ConversationFile, RootConfig, RootHealth, RootHealthStatus, Source } from "@/lib/types";
import { expandHome } from "@/lib/server/paths";
import { collectJsonlFiles, countJsonlFiles } from "@/lib/server/codex";

/* ---------- helpers ---------- */

async function safeStat(p: string) {
  try {
    return await fs.stat(p);
  } catch {
    return null;
  }
}

/** Threshold (ms) above which a root scan is considered "slow". */
const SLOW_SCAN_MS = 3_000;

/* ---------- per-root directory listing cache ---------- */

type DirCacheEntry = {
  /** Resolved absolute root path. */
  rootPath: string;
  /** mtime of the root directory when the cache was populated. */
  dirMtimeMs: number;
  /** Cached conversation file entries for this root. */
  entries: ConversationFile[];
  /** Timestamp (Date.now()) when the cache was populated. */
  cachedAtMs: number;
};

/** TTL for cached directory listings (milliseconds). */
const DIR_CACHE_TTL_MS = 10_000;

/**
 * In-memory cache keyed by root id.
 * Exported only for tests; production code should use {@link scanRoot}.
 */
export const _dirCache = new Map<string, DirCacheEntry>();

function isCacheValid(entry: DirCacheEntry, dirMtimeMs: number): boolean {
  if (Date.now() - entry.cachedAtMs > DIR_CACHE_TTL_MS) return false;
  if (entry.dirMtimeMs !== dirMtimeMs) return false;
  return true;
}

/* ---------- codex root scan (recursive, .jsonl files) ---------- */

async function scanCodexRoot(root: RootConfig, rootPath: string, rootMtimeMs: number): Promise<ConversationFile[]> {
  /* TTL-only cache for Codex roots: the root dir mtime doesn't reflect changes
     inside nested YYYY/MM/DD subdirectories, so we skip the mtime check and
     rely solely on the 10-second TTL to bound staleness. */
  const cached = _dirCache.get(root.id);
  if (cached && cached.rootPath === rootPath && Date.now() - cached.cachedAtMs <= DIR_CACHE_TTL_MS) {
    return cached.entries;
  }

  // collectJsonlFiles now returns sizeBytes too — no second stat pass needed.
  const files = await collectJsonlFiles(rootPath);
  const entries: ConversationFile[] = files.map((f) => ({
    id: path.basename(f.path, ".jsonl"),
    source: "codex",
    rootId: root.id,
    path: f.path,
    sizeBytes: f.sizeBytes ?? 0,
    mtimeMs: f.mtimeMs ?? 0
  }));

  _dirCache.set(root.id, {
    rootPath,
    dirMtimeMs: rootMtimeMs,
    entries,
    cachedAtMs: Date.now()
  });

  return entries;
}

/* ---------- single-root scan ---------- */

async function scanRoot(root: RootConfig, source: Source): Promise<ConversationFile[]> {
  const rootPath = expandHome(root.path);

  const rootStat = await safeStat(rootPath);
  if (!rootStat || !rootStat.isDirectory()) return [];

  /* Codex sessions are .jsonl files nested in date subdirectories */
  if (source === "codex") {
    return scanCodexRoot(root, rootPath, rootStat.mtimeMs);
  }

  /* check cache */
  const cached = _dirCache.get(root.id);
  if (cached && cached.rootPath === rootPath && isCacheValid(cached, rootStat.mtimeMs)) {
    return cached.entries;
  }

  let dirents: Array<{ name: string; isFile(): boolean }> = [];
  try {
    dirents = await fs.readdir(rootPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const entries: ConversationFile[] = [];
  for (const dirent of dirents) {
    if (!dirent.isFile()) continue;
    if (!dirent.name.endsWith(".pb")) continue;
    const fullPath = path.join(rootPath, dirent.name);
    const st = await safeStat(fullPath);
    if (!st) continue;

    entries.push({
      id: dirent.name.slice(0, -3),
      source,
      rootId: root.id,
      path: fullPath,
      sizeBytes: st.size,
      mtimeMs: st.mtimeMs
    });
  }

  _dirCache.set(root.id, {
    rootPath,
    dirMtimeMs: rootStat.mtimeMs,
    entries,
    cachedAtMs: Date.now()
  });

  return entries;
}

/* ---------- public: list conversation files ---------- */

export async function listConversationFiles(params: {
  roots: RootConfig[];
  source: Source;
  limit: number;
  offset: number;
}): Promise<ConversationFile[]> {
  const { roots, source, limit, offset } = params;
  const enabledRoots = roots.filter((r) => r.enabled && r.source === source);

  const nested = await Promise.all(enabledRoots.map((root) => scanRoot(root, source)));
  const entries = nested.flat();

  entries.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return entries.slice(offset, offset + limit);
}

/* ---------- public: detect duplicates ---------- */

/**
 * Finds conversation IDs that appear in more than one root.
 * Returns a map from conversation id → array of rootIds that contain it.
 * Only entries with 2+ roots are included.
 */
export function detectDuplicates(items: ConversationFile[]): Record<string, string[]> {
  const idToRoots = new Map<string, Set<string>>();
  for (const item of items) {
    let roots = idToRoots.get(item.id);
    if (!roots) {
      roots = new Set();
      idToRoots.set(item.id, roots);
    }
    roots.add(item.rootId);
  }

  const result: Record<string, string[]> = {};
  for (const [id, roots] of idToRoots) {
    if (roots.size > 1) {
      result[id] = Array.from(roots);
    }
  }
  return result;
}

/* ---------- public: per-root health probing ---------- */

export async function probeRootHealth(root: RootConfig): Promise<RootHealth> {
  const rootPath = expandHome(root.path);
  const start = Date.now();

  const rootStat = await safeStat(rootPath);
  if (!rootStat) {
    return {
      rootId: root.id,
      path: rootPath,
      status: "missing",
      fileCount: 0,
      scanMs: Date.now() - start,
      error: "Path does not exist"
    };
  }

  if (!rootStat.isDirectory()) {
    return {
      rootId: root.id,
      path: rootPath,
      status: "missing",
      fileCount: 0,
      scanMs: Date.now() - start,
      error: "Path is not a directory"
    };
  }

  // For Codex, count .jsonl files recursively in date subdirectories.
  // Use strict mode so readdir permission errors surface as "unreadable".
  let fileCount: number;
  if (root.source === "codex") {
    try {
      fileCount = await countJsonlFiles(rootPath, 5, { strict: true });
    } catch (err) {
      return {
        rootId: root.id,
        path: rootPath,
        status: "unreadable",
        fileCount: 0,
        scanMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  } else {
    let dirents: Array<{ name: string; isFile(): boolean }> = [];
    try {
      dirents = await fs.readdir(rootPath, { withFileTypes: true });
    } catch (err) {
      return {
        rootId: root.id,
        path: rootPath,
        status: "unreadable",
        fileCount: 0,
        scanMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err)
      };
    }
    fileCount = dirents.filter((d) => d.isFile() && d.name.endsWith(".pb")).length;
  }

  const scanMs = Date.now() - start;
  const status: RootHealthStatus = scanMs > SLOW_SCAN_MS ? "slow" : "healthy";

  return { rootId: root.id, path: rootPath, status, fileCount, scanMs };
}

export async function probeAllRootsHealth(roots: RootConfig[]): Promise<RootHealth[]> {
  return Promise.all(roots.map((r) => probeRootHealth(r)));
}

