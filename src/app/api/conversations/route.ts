import { NextResponse } from "next/server";

import type { ConversationListItem, Source } from "@/lib/types";
import { readConfig } from "@/lib/server/config";
import { detectDuplicates, listConversationFiles } from "@/lib/server/conversations";
import { getTrajectoryMetaMapCached } from "@/lib/server/metaCache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cache duplicate detection results per (source, roots) to avoid
// re-listing all conversation files with `limit: Infinity` on every request.
const duplicatesCache = new Map<string, ReturnType<typeof detectDuplicates>>();

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
  const items = await listConversationFiles({ roots: config.roots, source: sourceParam, limit, offset });

  /* duplicate detection across roots */
  const cacheKey = JSON.stringify({ source: sourceParam, roots: config.roots });
  let duplicates = duplicatesCache.get(cacheKey);
  if (!duplicates) {
    const allItems = await listConversationFiles({ roots: config.roots, source: sourceParam, limit: Infinity, offset: 0 });
    duplicates = detectDuplicates(allItems);
    duplicatesCache.set(cacheKey, duplicates);
  }

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

  return NextResponse.json({ items: withMeta, limit, offset, duplicates });
}
