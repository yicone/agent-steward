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

  return { ...(title ? { title } : {}), ...(cwd ? { cwd } : {}) };
}

export function extractTrajectoryIdFromTrajectorySummary(summary: any): string | undefined {
  const id =
    (typeof summary?.trajectoryId === "string" ? summary.trajectoryId : undefined) ??
    (typeof summary?.trajectory_id === "string" ? summary.trajectory_id : undefined);
  return id && id.trim().length ? id.trim() : undefined;
}
