import { NextResponse } from "next/server";

import type { ConversationListItem, Source } from "@/lib/types";
import { readConfig } from "@/lib/server/config";
import { detectDuplicates, listConversationFiles } from "@/lib/server/conversations";
import { getTrajectoryMetaMapCached } from "@/lib/server/metaCache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cache duplicate detection results per (source, roots) to avoid
// re-listing all conversation files with `limit: Infinity` on every request.
const duplicatesCache = new Map<
  string,
  {
    value: ReturnType<typeof detectDuplicates>;
    expiresAt: number;
  }
>();
const MAX_DUPLICATES_CACHE_ENTRIES = 100;

function isSource(value: string | null): value is Source {
  return value === "antigravity" || value === "windsurf";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sourceParam = url.searchParams.get("source");
  if (!isSource(sourceParam)) {
    return NextResponse.json({ error: "Missing/invalid source. Use ?source=antigravity|windsurf" }, { status: 400 });
  }

  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "200"), 1), 1000);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? "0"), 0);

  const { config } = await readConfig();

  /* duplicate detection across roots */
  const rootCacheKeyParts = config.roots.map((root) => root.id).sort();
  const cacheKey = JSON.stringify({ source: sourceParam, roots: rootCacheKeyParts });
  const cacheEntry = duplicatesCache.get(cacheKey);
  let duplicates: ReturnType<typeof detectDuplicates>;
  const now = Date.now();
  let allItems: ConversationListItem[] | null = null;
  if (cacheEntry && cacheEntry.expiresAt > now) {
    duplicates = cacheEntry.value;
  } else {
    allItems = await listConversationFiles({
      roots: config.roots,
      source: sourceParam,
      limit: Infinity,
      offset: 0
    });
    duplicates = detectDuplicates(allItems);

    // First, evict any entries that have already expired by TTL.
    for (const [key, entry] of duplicatesCache) {
      if (entry.expiresAt <= now) {
        duplicatesCache.delete(key);
      }
    }

    // If we're still at or above capacity, evict the oldest remaining entry.
    if (duplicatesCache.size >= MAX_DUPLICATES_CACHE_ENTRIES) {
      const oldestKey = duplicatesCache.keys().next().value as string | undefined;
      if (oldestKey !== undefined) {
        duplicatesCache.delete(oldestKey);
      }
    }

    duplicatesCache.set(cacheKey, {
      value: duplicates,
      expiresAt: now + 10_000 // 10s TTL, aligned with _dirCache behavior
    });
  }

  const items: ConversationListItem[] =
    allItems !== null
      ? allItems.slice(offset, offset + limit)
      : await listConversationFiles({ roots: config.roots, source: sourceParam, limit, offset });

  let metaMap: Record<string, { title?: string; cwd?: string }> = {};
  try {
    metaMap = await getTrajectoryMetaMapCached({ source: sourceParam, config });
  } catch {
    metaMap = {};
  }

  const withMeta: ConversationListItem[] = items.map((it) => {
    const meta = metaMap[it.id] ?? {};
    const dupRoots = duplicates[it.id];
    const duplicateRootIds = dupRoots ? dupRoots.filter((rid) => rid !== it.rootId) : undefined;
    return {
      ...it,
      ...meta,
      ...(duplicateRootIds && duplicateRootIds.length > 0 ? { duplicateRootIds } : {})
    };
  });

  return NextResponse.json({ items: withMeta, limit, offset });
}
