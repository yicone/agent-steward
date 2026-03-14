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
 * Exported for use by the conversations scanner (`conversations.ts`).
 */
export async function collectJsonlFiles(dir: string, maxDepth = 5): Promise<Array<{ path: string; mtimeMs: number }>> {
  if (maxDepth <= 0) return [];

  let dirents: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }> = [];
  try {
    dirents = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: Array<{ path: string; mtimeMs: number }> = [];

  for (const d of dirents) {
    const fullPath = path.join(dir, d.name);
    if (d.isFile() && d.name.endsWith(".jsonl")) {
      const st = await safeStat(fullPath);
      if (st) results.push({ path: fullPath, mtimeMs: st.mtimeMs });
    } else if (d.isDirectory()) {
      const nested = await collectJsonlFiles(fullPath, maxDepth - 1);
      results.push(...nested);
    }
  }

  return results;
}

/**
 * Find the full path for a Codex session file across all enabled Codex roots.
 * The session ID is the filename without `.jsonl`.
 */
async function findCodexSessionFile(id: string, roots: RootConfig[]): Promise<string | null> {
  for (const root of roots) {
    if (!root.enabled || root.source !== "codex") continue;
    const rootPath = expandHome(root.path);
    const files = await collectJsonlFiles(rootPath);
    const match = files.find((f) => path.basename(f.path, ".jsonl") === id);
    if (match) return match.path;
  }
  return null;
}

/* ---------- public API ---------- */

/**
 * Get status for the Codex source. Unlike Antigravity/Windsurf, Codex requires
 * no running process — it reads session files directly from disk.
 */
export async function getCodexStatus(config: AppConfig): Promise<SourcesStatus["codex"]> {
  const enabledRoots = config.roots.filter((r) => r.source === "codex" && r.enabled);
  if (enabledRoots.length === 0) {
    return {
      sessionsFound: false,
      error: "No Codex roots configured. Add a root pointing to ~/.codex/sessions in Settings."
    };
  }

  const first = enabledRoots[0]!;
  const sessionsDir = expandHome(first.path);
  const st = await safeStat(sessionsDir);

  if (!st) {
    return {
      sessionsFound: false,
      sessionsDir,
      error: `Codex sessions directory not found: ${sessionsDir}. Install and run Codex CLI to create sessions.`
    };
  }
  if (!st.isDirectory()) {
    return {
      sessionsFound: false,
      sessionsDir,
      error: `Path exists but is not a directory: ${sessionsDir}`
    };
  }

  const files = await collectJsonlFiles(sessionsDir);
  return {
    sessionsFound: files.length > 0,
    sessionsDir,
    ...(files.length === 0
      ? { error: `No session files found in ${sessionsDir}. Run Codex CLI to create sessions.` }
      : {})
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

      try {
        // Read only the first 8 KB to extract metadata without loading the full file.
        const fd = await fs.open(file.path, "r");
        const buf = Buffer.alloc(8192);
        const { bytesRead } = await fd.read(buf, 0, 8192, 0);
        await fd.close();
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
      }
    }
  }

  return result;
}
