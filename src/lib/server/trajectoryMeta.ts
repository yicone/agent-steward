import "server-only";

import os from "node:os";

import type { ConversationMeta } from "@/lib/types";

export function fileUriToPath(uri: string): string | null {
  try {
    if (!uri.startsWith("file://")) return null;
    const u = new URL(uri);
    return decodeURIComponent(u.pathname);
  } catch {
    return null;
  }
}

export function abbreviateHome(p: string): string {
  const home = os.homedir();
  if (p === home) return "~";
  if (p.startsWith(`${home}/`)) return `~/${p.slice(home.length + 1)}`;
  return p;
}

export function extractMetaFromTrajectorySummary(summary: any): ConversationMeta {
  const title =
    typeof summary?.summary === "string" && summary.summary.trim().length
      ? summary.summary.trim()
      : undefined;

  const workspaces: any[] = Array.isArray(summary?.workspaces) ? summary.workspaces : [];
  const firstWs = workspaces[0];
  const uri =
    typeof firstWs?.workspaceFolderAbsoluteUri === "string"
      ? firstWs.workspaceFolderAbsoluteUri
      : typeof firstWs?.workspace_folder_absolute_uri === "string"
        ? firstWs.workspace_folder_absolute_uri
        : undefined;
  const p = uri ? fileUriToPath(uri) : null;
  const cwd = p ? abbreviateHome(p) : undefined;

  // Extract timestamp from trajectory summary for proper session ordering
  // Try multiple possible timestamp field names
  let timestampMs: number | undefined;
  
  if (typeof summary?.startTimestampMs === "number") {
    timestampMs = summary.startTimestampMs;
  } else if (typeof summary?.start_timestamp_ms === "number") {
    timestampMs = summary.start_timestamp_ms;
  } else if (typeof summary?.createdMs === "number") {
    timestampMs = summary.createdMs;
  } else if (typeof summary?.created_ms === "number") {
    timestampMs = summary.created_ms;
  } else if (typeof summary?.timestampMs === "number") {
    timestampMs = summary.timestampMs;
  } else if (typeof summary?.timestamp_ms === "number") {
    timestampMs = summary.timestamp_ms;
  } else if (typeof summary?.startTimeMs === "number") {
    timestampMs = summary.startTimeMs;
  } else if (typeof summary?.start_time_ms === "number") {
    timestampMs = summary.start_time_ms;
  } else if (typeof summary?.creationTimeMs === "number") {
    timestampMs = summary.creationTimeMs;
  } else if (typeof summary?.creation_time_ms === "number") {
    timestampMs = summary.creation_time_ms;
  }

  return { 
    ...(title ? { title } : {}), 
    ...(cwd ? { cwd } : {}),
    ...(typeof timestampMs === "number" ? { timestampMs } : {})
  };
}

export function buildMetaMapFromTrajectorySummaries(
  trajectorySummaries: Record<string, any>
): Record<string, ConversationMeta> {
  const out: Record<string, ConversationMeta> = {};

  for (const [cascadeId, summary] of Object.entries(trajectorySummaries ?? {})) {
    const meta = extractMetaFromTrajectorySummary(summary);
    out[cascadeId] = meta;
  }

  return out;
}
