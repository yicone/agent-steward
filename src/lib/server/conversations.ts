import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import type { ConversationFile, RootConfig, Source } from "@/lib/types";
import { expandHome } from "@/lib/server/paths";

async function safeStat(p: string) {
  try {
    return await fs.stat(p);
  } catch {
    return null;
  }
}

export async function listConversationFiles(params: {
  roots: RootConfig[];
  source: Source;
  limit: number;
  offset: number;
}): Promise<ConversationFile[]> {
  const { roots, source, limit, offset } = params;
  const enabledRoots = roots.filter((r) => r.enabled && r.source === source);

  const entries: ConversationFile[] = [];
  for (const root of enabledRoots) {
    const rootPath = expandHome(root.path);
    const rootStat = await safeStat(rootPath);
    if (!rootStat || !rootStat.isDirectory()) continue;

    let dirents: Array<{ name: string; isFile(): boolean }> = [];
    try {
      dirents = await fs.readdir(rootPath, { withFileTypes: true });
    } catch {
      continue;
    }

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
  }

  entries.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return entries.slice(offset, offset + limit);
}

