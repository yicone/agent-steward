import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import type { ConversationFile, RootConfig, RootHealth, RootHealthStatus, Source } from "@/lib/types";
import { expandHome } from "@/lib/server/paths";

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

/* ---------- concurrency helpers ---------- */

/** Total concurrent stat() calls allowed across all roots. */
const STAT_CONCURRENCY = 16;

/** Simple counting semaphore to cap cross-root stat() concurrency. */
class Semaphore {
  private readonly _waiters: Array<() => void> = [];
  private _available: number;

  constructor(limit: number) {
    this._available = limit;
  }

  acquire(): Promise<() => void> {
    if (this._available > 0) {
      this._available--;
      return Promise.resolve(() => this._release());
    }
    return new Promise((resolve) => {
      this._waiters.push(() => resolve(() => this._release()));
    });
  }

  private _release(): void {
    if (this._waiters.length > 0) {
      this._waiters.shift()!();
    } else {
      this._available++;
    }
  }
}

/** Shared semaphore: limits total concurrent stat() calls across all root scans. */
const statSemaphore = new Semaphore(STAT_CONCURRENCY);

/**
 * Applies `worker` to every item with at most `concurrency` simultaneous
 * workers and returns results in the **same order** as `items`.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<Array<R>> {
  if (items.length === 0) return [];

  const results: Array<R> = new Array(items.length);
  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        const i = nextIndex++;
        if (i >= items.length) return;
        results[i] = await worker(items[i]);
      }
    })
  );

  return results;
}

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

/* ---------- single-root scan ---------- */

async function scanRoot(root: RootConfig, source: Source): Promise<ConversationFile[]> {
  const rootPath = expandHome(root.path);

  const rootStat = await safeStat(rootPath);
  if (!rootStat || !rootStat.isDirectory()) return [];

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

  const pbFiles = dirents.filter((dirent) => dirent.isFile() && dirent.name.endsWith(".pb"));

  const results = await mapWithConcurrency<(typeof pbFiles)[number], ConversationFile | null>(
    pbFiles,
    pbFiles.length,
    async (dirent) => {
      const fullPath = path.join(rootPath, dirent.name);
      const release = await statSemaphore.acquire();
      try {
        const st = await safeStat(fullPath);
        if (!st) return null;
        return {
          id: dirent.name.slice(0, -3),
          source,
          rootId: root.id,
          path: fullPath,
          sizeBytes: st.size,
          mtimeMs: st.mtimeMs
        } satisfies ConversationFile;
      } finally {
        release();
      }
    }
  );

  const entries = results.filter((e): e is ConversationFile => e !== null);

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
      pbCount: 0,
      scanMs: Date.now() - start,
      error: "Path does not exist"
    };
  }

  if (!rootStat.isDirectory()) {
    return {
      rootId: root.id,
      path: rootPath,
      status: "missing",
      pbCount: 0,
      scanMs: Date.now() - start,
      error: "Path is not a directory"
    };
  }

  let dirents: Array<{ name: string; isFile(): boolean }> = [];
  try {
    dirents = await fs.readdir(rootPath, { withFileTypes: true });
  } catch (err) {
    return {
      rootId: root.id,
      path: rootPath,
      status: "unreadable",
      pbCount: 0,
      scanMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err)
    };
  }

  const pbCount = dirents.filter((d) => d.isFile() && d.name.endsWith(".pb")).length;
  const scanMs = Date.now() - start;
  const status: RootHealthStatus = scanMs > SLOW_SCAN_MS ? "slow" : "healthy";

  return { rootId: root.id, path: rootPath, status, pbCount, scanMs };
}

export async function probeAllRootsHealth(roots: RootConfig[]): Promise<RootHealth[]> {
  return Promise.all(roots.map((r) => probeRootHealth(r)));
}
