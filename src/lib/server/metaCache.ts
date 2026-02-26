import "server-only";

import type { AppConfig, ConversationMeta, Source } from "@/lib/types";
import { getAntigravityTrajectoryMetaMap } from "@/lib/server/antigravity";
import { getWindsurfTrajectoryMetaMap } from "@/lib/server/windsurf";

type CacheEntry = {
  expiresAtMs: number;
  inflight?: Promise<Record<string, ConversationMeta>>;
  value?: Record<string, ConversationMeta>;
};

const CACHE_TTL_MS = 5_000;

const cache: Record<Source, CacheEntry> = {
  antigravity: { expiresAtMs: 0 },
  windsurf: { expiresAtMs: 0 }
};

export async function getTrajectoryMetaMapCached(params: {
  source: Source;
  config: AppConfig;
}): Promise<Record<string, ConversationMeta>> {
  const now = Date.now();
  const entry = cache[params.source];
  if (entry.value && entry.expiresAtMs > now) return entry.value;
  if (entry.inflight) return entry.inflight;

  entry.inflight = (async () => {
    try {
      const value =
        params.source === "antigravity"
          ? await getAntigravityTrajectoryMetaMap()
          : await getWindsurfTrajectoryMetaMap(params.config);
      entry.value = value;
      entry.expiresAtMs = Date.now() + CACHE_TTL_MS;
      return value;
    } finally {
      entry.inflight = undefined;
    }
  })();

  return entry.inflight;
}

