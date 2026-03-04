import "server-only";

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { extractCsrfTokenFromCommand } from "@/lib/parse/commandLine";
import { classifyCsrfTokenSource } from "@/lib/parse/tokenSource";
import { extractLatestAntigravityStartInfoFromLog } from "@/lib/parse/antigravityLog";
import { normalizeAntigravityTrajectoryToEvents } from "@/lib/parse/antigravitySteps";
import type { SourcesStatus } from "@/lib/types";
import { expandHome } from "@/lib/server/paths";
import { connectUnaryJson } from "@/lib/server/connect";
import { buildMetaMapFromTrajectorySummaries } from "@/lib/server/trajectoryMeta";
import { getAntigravityTrajectoryMetaMapFromVscdb } from "@/lib/server/antigravityGlobalState";

const execFileAsync = promisify(execFile);
const SERVICE = "exa.language_server_pb.LanguageServerService";

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

let insecureDispatcherPromise: Promise<unknown | null> | null = null;
async function getInsecureLocalhostDispatcher(): Promise<unknown | null> {
  if (!insecureDispatcherPromise) {
    insecureDispatcherPromise = (async () => {
      try {
        const mod: any = await import("undici");
        const Agent = mod?.Agent;
        if (!Agent) return null;
        return new Agent({ connect: { rejectUnauthorized: false } });
      } catch {
        return null;
      }
    })();
  }
  return insecureDispatcherPromise;
}

export type AntigravityDiscovery = {
  pid: number;
  httpsPort: number;
  httpPort: number;
  lspPort?: number;
  lsVersion?: string;
  csrfToken: string;
};

async function probeAntigravityHeartbeat(params: { baseUrl: string; csrfToken?: string; dispatcher?: unknown }): Promise<boolean> {
  try {
    await connectUnaryJson({
      baseUrl: params.baseUrl,
      serviceTypeName: SERVICE,
      methodName: "Heartbeat",
      csrfToken: params.csrfToken,
      dispatcher: params.dispatcher,
      body: { metadata: {} },
      timeoutMs: 1200
    });
    return true;
  } catch {
    return false;
  }
}

async function listAntigravityLogsDirsByMtime(): Promise<string[]> {
  const logsRoot = path.join(os.homedir(), "Library", "Application Support", "Antigravity", "logs");
  let dirents: Array<{ name: string; isDirectory(): boolean }> = [];
  try {
    dirents = await fs.readdir(logsRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const dirs = dirents
    .filter((d) => d.isDirectory())
    .map((d) => path.join(logsRoot, d.name));

  const withMtime: Array<{ p: string; mtimeMs: number }> = [];
  for (const p of dirs) {
    try {
      const st = await fs.stat(p);
      withMtime.push({ p, mtimeMs: st.mtimeMs });
    } catch {
      // ignore
    }
  }
  withMtime.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return withMtime.map((x) => x.p);
}

async function listCandidateAntigravityLogFiles(): Promise<Array<{ p: string; mtimeMs: number }>> {
  const logDirs = await listAntigravityLogsDirsByMtime();
  const candidates: Array<{ p: string; mtimeMs: number }> = [];

  for (const logsDir of logDirs) {
    let windowDirents: Array<{ name: string; isDirectory(): boolean }> = [];
    try {
      windowDirents = await fs.readdir(logsDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const d of windowDirents) {
      if (!d.isDirectory()) continue;
      if (!d.name.startsWith("window")) continue;
      const p = path.join(logsDir, d.name, "exthost", "google.antigravity", "Antigravity.log");
      try {
        const st = await fs.stat(p);
        if (st.isFile()) candidates.push({ p, mtimeMs: st.mtimeMs });
      } catch {
        // ignore
      }
    }
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates;
}

async function readProcessCommandLine(pid: number): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("ps", ["-o", "args=", "-ww", "-p", String(pid)], { timeout: 2500 });
    const cmd = stdout?.trim();
    return cmd && cmd.length ? cmd : null;
  } catch {
    return null;
  }
}

async function tryResolveAntigravityFromLogFile(logPath: string): Promise<{
  logPath: string;
  pid: number;
  httpPort?: number;
  httpsPort?: number;
  csrfToken: string;
  csrfTokenSource: "ps_args" | "none";
  tokenRequired: boolean;
  baseUrl: string;
  dispatcher?: unknown;
  heartbeatOk: boolean;
}> {
  const logText = await fs.readFile(logPath, "utf-8").catch(() => "");
  const startInfo = extractLatestAntigravityStartInfoFromLog(logText);
  if (!startInfo) throw new Error("Failed to parse pid/ports from Antigravity.log.");
  if (!isProcessAlive(startInfo.pid)) throw new Error("Antigravity language server pid from log is not running.");

  const cmd = await readProcessCommandLine(startInfo.pid);
  const tokenFromPs = cmd ? extractCsrfTokenFromCommand(cmd) : null;
  const tokenInfo = classifyCsrfTokenSource({ tokenFromPs });
  const csrfToken = tokenInfo.token ?? "";

  const httpBaseUrl = startInfo.httpPort ? `http://127.0.0.1:${startInfo.httpPort}` : null;
  const httpsBaseUrl = startInfo.httpsPort ? `https://127.0.0.1:${startInfo.httpsPort}` : null;

  // Prefer HTTP to avoid TLS complexity.
  if (httpBaseUrl) {
    const okWithToken = csrfToken ? await probeAntigravityHeartbeat({ baseUrl: httpBaseUrl, csrfToken }) : false;
    const okWithoutToken = await probeAntigravityHeartbeat({ baseUrl: httpBaseUrl });
    const heartbeatOk = okWithToken || okWithoutToken;
    return {
      logPath,
      pid: startInfo.pid,
      httpPort: startInfo.httpPort,
      httpsPort: startInfo.httpsPort,
      csrfToken,
      csrfTokenSource: tokenInfo.source === "ps_args" ? "ps_args" : "none",
      tokenRequired: heartbeatOk ? !okWithoutToken : !csrfToken,
      baseUrl: httpBaseUrl,
      heartbeatOk
    };
  }

  if (httpsBaseUrl) {
    const dispatcher = await getInsecureLocalhostDispatcher();
    const okWithToken = csrfToken
      ? await probeAntigravityHeartbeat({ baseUrl: httpsBaseUrl, csrfToken, dispatcher: dispatcher ?? undefined })
      : false;
    const okWithoutToken = await probeAntigravityHeartbeat({ baseUrl: httpsBaseUrl, dispatcher: dispatcher ?? undefined });
    const heartbeatOk = okWithToken || okWithoutToken;
    return {
      logPath,
      pid: startInfo.pid,
      httpPort: startInfo.httpPort,
      httpsPort: startInfo.httpsPort,
      csrfToken,
      csrfTokenSource: tokenInfo.source === "ps_args" ? "ps_args" : "none",
      tokenRequired: heartbeatOk ? !okWithoutToken : !csrfToken,
      baseUrl: httpsBaseUrl,
      dispatcher: dispatcher ?? undefined,
      heartbeatOk
    };
  }

  throw new Error("Antigravity.log contains no HTTP/HTTPS port.");
}

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

  const withMtime: Array<{ p: string; mtimeMs: number }> = [];
  for (const p of candidates) {
    try {
      const st = await fs.stat(p);
      if (st.isFile()) withMtime.push({ p, mtimeMs: st.mtimeMs });
    } catch {
      // ignore
    }
  }
  withMtime.sort((a, b) => b.mtimeMs - a.mtimeMs);

  let bestParseable: { discoveryPath: string; discovery: AntigravityDiscovery } | null = null;

  for (const c of withMtime) {
    const raw = await fs.readFile(c.p, "utf-8").catch(() => "");
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as Partial<AntigravityDiscovery>;
      if (!parsed?.csrfToken) continue;
      if (!parsed.httpPort && !parsed.httpsPort) continue;
      if (typeof parsed.pid !== "number") continue;
      const discovery = parsed as AntigravityDiscovery;

      if (!bestParseable) bestParseable = { discoveryPath: c.p, discovery };
      if (isProcessAlive(discovery.pid)) return { discoveryPath: c.p, discovery };
    } catch {
      // ignore
    }
  }

  return bestParseable;
}

export async function getAntigravityStatus(): Promise<SourcesStatus["antigravity"]> {
  // Prefer log-based attach for newer Antigravity builds (random port + no discovery rewrite).
  const logCandidates = await listCandidateAntigravityLogFiles();
  let bestLogResult:
    | Awaited<ReturnType<typeof tryResolveAntigravityFromLogFile>>
    | null = null;
  let bestLogError: string | undefined;
  let bestLogPid: number | undefined;
  let bestLogPidAlive = false;

  for (const c of logCandidates) {
    try {
      const logText = await fs.readFile(c.p, "utf-8").catch(() => "");
      const startInfo = extractLatestAntigravityStartInfoFromLog(logText);
      if (startInfo) {
        bestLogPid = startInfo.pid;
        bestLogPidAlive = isProcessAlive(startInfo.pid);
      }
      const res = await tryResolveAntigravityFromLogFile(c.p);
      if (!bestLogResult) bestLogResult = res;
      if (res.heartbeatOk) {
        return {
          discovered: true,
          attachMethod: "log",
          discoveryPath: res.logPath,
          pid: res.pid,
          pidAlive: true,
          httpPort: res.httpPort,
          httpsPort: res.httpsPort,
          csrfTokenPresent: Boolean(res.csrfToken),
          csrfTokenSource: res.csrfTokenSource,
          tokenRequired: res.tokenRequired,
          heartbeatOk: true,
          reachable: true
        };
      }
    } catch (e) {
      if (!bestLogError) bestLogError = e instanceof Error ? e.message : String(e);
    }
  }

  if (bestLogResult) {
    const recommendedAction = !bestLogPidAlive
      ? "Keep Antigravity open and start a session to relaunch the language server."
      : "Keep Antigravity running and start/restart a session, then refresh.";
    const tokenHint = bestLogResult?.csrfToken
      ? "Token present but Heartbeat failed."
      : "Token missing from process args (or Heartbeat failed).";
    return {
      discovered: true,
      attachMethod: "log",
      discoveryPath: bestLogResult?.logPath ?? logCandidates[0]?.p,
      pid: bestLogResult?.pid ?? bestLogPid,
      pidAlive: bestLogPidAlive,
      httpPort: bestLogResult?.httpPort,
      httpsPort: bestLogResult?.httpsPort,
      csrfTokenPresent: Boolean(bestLogResult?.csrfToken),
      csrfTokenSource: bestLogResult?.csrfTokenSource ?? "none",
      tokenRequired: bestLogResult?.tokenRequired ?? true,
      heartbeatOk: false,
      reachable: false,
      recommendedAction,
      lastError: bestLogError,
      error: `${tokenHint} ${recommendedAction}${bestLogError ? ` (${bestLogError})` : ""}`
    };
  }

  // Fallback to legacy discovery file mechanism.
  const found = await findLatestAntigravityDiscovery();
  if (!found) {
    const recommendedAction = "Open Antigravity and start a session so logs/discovery are generated.";
    return {
      discovered: false,
      attachMethod: "legacy_discovery",
      csrfTokenSource: "none",
      recommendedAction,
      lastError: "No Antigravity log or discovery file found.",
      error: `No Antigravity log or discovery file found. ${recommendedAction}`
    };
  }

  const { discoveryPath, discovery } = found;
  const httpBaseUrl = discovery.httpPort ? `http://127.0.0.1:${discovery.httpPort}` : null;
  const httpsBaseUrl = discovery.httpsPort ? `https://127.0.0.1:${discovery.httpsPort}` : null;

  let reachable = false;
  if (httpBaseUrl) reachable = await probeAntigravityHeartbeat({ baseUrl: httpBaseUrl, csrfToken: discovery.csrfToken });
  if (!reachable && httpsBaseUrl) {
    const dispatcher = await getInsecureLocalhostDispatcher();
    reachable = await probeAntigravityHeartbeat({
      baseUrl: httpsBaseUrl,
      csrfToken: discovery.csrfToken,
      dispatcher: dispatcher ?? undefined
    });
  }

  const pidAlive = isProcessAlive(discovery.pid);
  const tokenRequired = reachable ? Boolean(discovery.csrfToken) : true;
  const recommendedAction = !pidAlive
    ? "Keep Antigravity open and start a session to relaunch the language server."
    : "Keep Antigravity running and start/restart a session, then refresh.";

  let lastError: string | undefined;
  if (!reachable) {
    lastError = !pidAlive
      ? "Antigravity discovery is stale (language server pid not running)."
      : "Antigravity discovery found but language server not reachable.";
  }

  return {
    discovered: true,
    attachMethod: "legacy_discovery",
    discoveryPath,
    pid: discovery.pid,
    pidAlive,
    httpPort: discovery.httpPort,
    httpsPort: discovery.httpsPort,
    csrfTokenPresent: Boolean(discovery.csrfToken),
    csrfTokenSource: classifyCsrfTokenSource({ discoveryToken: discovery.csrfToken }).source,
    tokenRequired,
    heartbeatOk: reachable,
    reachable,
    recommendedAction,
    ...(lastError ? { lastError, error: `${lastError} ${recommendedAction}` } : {})
  };
}

export async function resolveAntigravityRpcTarget(discovery?: AntigravityDiscovery | null): Promise<{
  baseUrl: string;
  csrfToken: string;
  dispatcher?: unknown;
}> {
  // Prefer log-based attach if available.
  const logCandidates = await listCandidateAntigravityLogFiles();
  for (const c of logCandidates) {
    try {
      const res = await tryResolveAntigravityFromLogFile(c.p);
      if (!res.heartbeatOk) continue;
      return { baseUrl: res.baseUrl, csrfToken: res.csrfToken, ...(res.dispatcher ? { dispatcher: res.dispatcher } : {}) };
    } catch {
      // try next
    }
  }

  if (!discovery) {
    throw new Error("Antigravity is not discoverable. Open Antigravity and start a session to launch the language server.");
  }

  const body = { metadata: {} };

  // Legacy discovery fallback.
  if (discovery.httpPort) {
    const httpBaseUrl = `http://127.0.0.1:${discovery.httpPort}`;
    try {
      await connectUnaryJson({
        baseUrl: httpBaseUrl,
        serviceTypeName: SERVICE,
        methodName: "Heartbeat",
        csrfToken: discovery.csrfToken,
        body,
        timeoutMs: 1500
      });
      return { baseUrl: httpBaseUrl, csrfToken: discovery.csrfToken };
    } catch {
      // fall through
    }
  }

  if (discovery.httpsPort) {
    const httpsBaseUrl = `https://127.0.0.1:${discovery.httpsPort}`;
    const dispatcher = await getInsecureLocalhostDispatcher();
    try {
      await connectUnaryJson({
        baseUrl: httpsBaseUrl,
        serviceTypeName: SERVICE,
        methodName: "Heartbeat",
        csrfToken: discovery.csrfToken,
        dispatcher: dispatcher ?? undefined,
        body,
        timeoutMs: 1500
      });
      return { baseUrl: httpsBaseUrl, csrfToken: discovery.csrfToken, dispatcher: dispatcher ?? undefined };
    } catch {
      // fall through
    }
  }

  // Best-effort fallback: prefer http if present.
  const baseUrl = discovery.httpPort
    ? `http://127.0.0.1:${discovery.httpPort}`
    : `https://127.0.0.1:${discovery.httpsPort}`;
  const dispatcher = baseUrl.startsWith("https://") ? (await getInsecureLocalhostDispatcher()) ?? undefined : undefined;
  return { baseUrl, csrfToken: discovery.csrfToken, dispatcher };
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
  const target = await resolveAntigravityRpcTarget(found?.discovery ?? null);
  const baseUrl = target.baseUrl;
  const trajRes = await connectUnaryJson<any>({
    baseUrl,
    serviceTypeName: SERVICE,
    methodName: "GetCascadeTrajectory",
    csrfToken: target.csrfToken,
    dispatcher: target.dispatcher,
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
    csrfToken: target.csrfToken,
    dispatcher: target.dispatcher,
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
    const target = await resolveAntigravityRpcTarget(found.discovery);
    const baseUrl = target.baseUrl;

    const res = await connectUnaryJson<any>({
      baseUrl,
      serviceTypeName: SERVICE,
      methodName: "GetAllCascadeTrajectories",
      csrfToken: target.csrfToken,
      dispatcher: target.dispatcher,
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
