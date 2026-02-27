import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import { normalizeAntigravityTrajectoryToEvents } from "@/lib/parse/antigravitySteps";
import type { SourcesStatus } from "@/lib/types";
import { expandHome } from "@/lib/server/paths";
import { connectUnaryJson } from "@/lib/server/connect";
import { buildMetaMapFromTrajectorySummaries } from "@/lib/server/trajectoryMeta";
import { getAntigravityTrajectoryMetaMapFromVscdb } from "@/lib/server/antigravityGlobalState";

const SERVICE = "exa.language_server_pb.LanguageServerService";

export type AntigravityDiscovery = {
  pid: number;
  httpsPort: number;
  httpPort: number;
  lspPort?: number;
  lsVersion?: string;
  csrfToken: string;
};

export async function findLatestAntigravityDiscovery(): Promise<{
  discoveryPath: string;
  discovery: AntigravityDiscovery;
} | null> {
  const dir = expandHome("~/.gemini/antigravity/daemon");
  let dirents: Array<{ name: string; isFile(): boolean }> = [];
  try {
    dirents = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return null;
  }

  const candidates = dirents
    .filter((d) => d.isFile() && d.name.startsWith("ls_") && d.name.endsWith(".json"))
    .map((d) => path.join(dir, d.name));

  if (candidates.length === 0) return null;

  let best: { p: string; mtimeMs: number } | null = null;
  for (const p of candidates) {
    try {
      const st = await fs.stat(p);
      if (!best || st.mtimeMs > best.mtimeMs) best = { p, mtimeMs: st.mtimeMs };
    } catch {
      // ignore
    }
  }
  if (!best) return null;

  try {
    const raw = await fs.readFile(best.p, "utf-8");
    const parsed = JSON.parse(raw) as AntigravityDiscovery;
    if (!parsed?.httpPort || !parsed?.csrfToken) return null;
    return { discoveryPath: best.p, discovery: parsed };
  } catch {
    return null;
  }
}

export async function getAntigravityStatus(): Promise<SourcesStatus["antigravity"]> {
  const found = await findLatestAntigravityDiscovery();
  if (!found) {
    return { discovered: false, error: "No Antigravity discovery file found." };
  }

  const { discoveryPath, discovery } = found;
  const httpBaseUrl = `http://127.0.0.1:${discovery.httpPort}`;
  let reachable = false;
  try {
    await connectUnaryJson({
      baseUrl: httpBaseUrl,
      serviceTypeName: SERVICE,
      methodName: "Heartbeat",
      csrfToken: discovery.csrfToken,
      body: { metadata: {} },
      timeoutMs: 2500
    });
    reachable = true;
  } catch {
    reachable = false;
  }

  return {
    discovered: true,
    discoveryPath,
    httpPort: discovery.httpPort,
    httpsPort: discovery.httpsPort,
    csrfTokenPresent: Boolean(discovery.csrfToken),
    reachable
  };
}

export async function getAntigravityMarkdown(cascadeId: string): Promise<string> {
  const { markdown } = await getAntigravityConversation(cascadeId);
  return markdown;
}

export async function getAntigravityConversation(cascadeId: string): Promise<{
  markdown: string;
  events: ReturnType<typeof normalizeAntigravityTrajectoryToEvents>["events"];
  summary: ReturnType<typeof normalizeAntigravityTrajectoryToEvents>["summary"];
}> {
  const found = await findLatestAntigravityDiscovery();
  if (!found) throw new Error("Antigravity discovery file not found. Open Antigravity to start the daemon.");

  const { discovery } = found;
  const baseUrl = `http://127.0.0.1:${discovery.httpPort}`;
  const trajRes = await connectUnaryJson<any>({
    baseUrl,
    serviceTypeName: SERVICE,
    methodName: "GetCascadeTrajectory",
    csrfToken: discovery.csrfToken,
    body: {
      cascadeId,
      verbosity: "CLIENT_TRAJECTORY_VERBOSITY_PROD_UI"
    }
  });
  const trajectory = trajRes?.trajectory;
  if (!trajectory) throw new Error("Trajectory not found for this cascadeId (may be deleted from the LS database).");

  const mdRes = await connectUnaryJson<any>({
    baseUrl,
    serviceTypeName: SERVICE,
    methodName: "ConvertTrajectoryToMarkdown",
    csrfToken: discovery.csrfToken,
    body: { trajectory }
  });

  const markdown = mdRes?.markdown;
  if (typeof markdown !== "string") throw new Error("ConvertTrajectoryToMarkdown returned no markdown.");

  const normalized = normalizeAntigravityTrajectoryToEvents({ trajectory });
  return { markdown, events: normalized.events, summary: normalized.summary };
}

export async function getAntigravityTrajectoryMetaMap(): Promise<Record<string, { title?: string; cwd?: string }>> {
  const vscdbMap = await getAntigravityTrajectoryMetaMapFromVscdb().catch(() => ({}));

  // The LS often returns only a subset (e.g. scoped to the running workspace). Merge both.
  const found = await findLatestAntigravityDiscovery();
  if (!found) return vscdbMap;

  try {
    const { discovery } = found;
    const baseUrl = `http://127.0.0.1:${discovery.httpPort}`;

    const res = await connectUnaryJson<any>({
      baseUrl,
      serviceTypeName: SERVICE,
      methodName: "GetAllCascadeTrajectories",
      csrfToken: discovery.csrfToken,
      body: {}
    });

    const mapObj = res?.trajectorySummaries ?? res?.trajectory_summaries;
    if (!mapObj || typeof mapObj !== "object") return vscdbMap;

    const lsMap = buildMetaMapFromTrajectorySummaries(mapObj as Record<string, any>);
    return { ...vscdbMap, ...lsMap };
  } catch {
    return vscdbMap;
  }
}
