import "server-only";

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import type { AppConfig, ChatMessage, SourcesStatus, TrajectoryEvent, TrajectorySummary } from "@/lib/types";
import { extractCsrfTokenFromCommand } from "@/lib/parse/commandLine";
import { classifyCsrfTokenSource } from "@/lib/parse/tokenSource";
import { getHeartbeatFailureSummary, getSessionRestartAction } from "@/lib/parse/connectionDiagnostics";
import { getWindsurfRecommendedAction, inferWindsurfTokenRequired } from "@/lib/parse/windsurfStatus";
import { summarizeTrajectoryEvents } from "@/lib/parse/trajectory";
import { extractLatestWindsurfStartInfoFromLog } from "@/lib/parse/windsurfLog";
import { normalizeWindsurfStepsToMessages, normalizeWindsurfStepsToTrajectoryEvents } from "@/lib/parse/windsurfSteps";
import { connectUnaryJson } from "@/lib/server/connect";
import { buildMetaMapFromTrajectorySummaries } from "@/lib/server/trajectoryMeta";

const execFileAsync = promisify(execFile);
const SERVICE = "exa.language_server_pb.LanguageServerService";

type WindsurfConnection = {
  logPath: string;
  pid: number;
  port: number;
  csrfToken: string;
};

async function probeWindsurfHeartbeat(params: { baseUrl: string; csrfToken?: string }): Promise<boolean> {
  try {
    await connectUnaryJson({
      baseUrl: params.baseUrl,
      serviceTypeName: SERVICE,
      methodName: "Heartbeat",
      csrfToken: params.csrfToken,
      body: { metadata: {} },
      timeoutMs: 1200
    });
    return true;
  } catch {
    return false;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function listLogsDirsByMtime(): Promise<string[]> {
  const logsRoot = path.join(os.homedir(), "Library", "Application Support", "Windsurf", "logs");
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

async function findLatestWindsurfLogFile(): Promise<string | null> {
  const logDirs = await listLogsDirsByMtime();
  // Some Windsurf log session folders may exist without containing the extension host logs
  // (e.g. created during startup). Scan all available session folders; in practice the
  // count is small (timestamped folders).
  const scanDirs = logDirs;
  const candidates: Array<{ p: string; mtimeMs: number }> = [];

  for (const logsDir of scanDirs) {
    let windowDirents: Array<{ name: string; isDirectory(): boolean }> = [];
    try {
      windowDirents = await fs.readdir(logsDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const d of windowDirents) {
      if (!d.isDirectory()) continue;
      if (!d.name.startsWith("window")) continue;
      const p = path.join(logsDir, d.name, "exthost", "codeium.windsurf", "Windsurf.log");
      try {
        const st = await fs.stat(p);
        if (st.isFile()) candidates.push({ p, mtimeMs: st.mtimeMs });
      } catch {
        // ignore
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);

  // Prefer the newest candidate whose latest start pid is still alive.
  let newestWithStartInfo: string | null = null;
  for (const c of candidates) {
    const logText = await fs.readFile(c.p, "utf-8").catch(() => "");
    const startInfo = extractLatestWindsurfStartInfoFromLog(logText);
    if (!startInfo) continue;
    if (!newestWithStartInfo) newestWithStartInfo = c.p;
    if (isProcessAlive(startInfo.pid)) return c.p;
  }

  // Fall back to the newest candidate that at least contains pid/port.
  return newestWithStartInfo ?? candidates[0]?.p ?? null;
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

async function resolveWindsurfConnection(config: AppConfig): Promise<WindsurfConnection> {
  const logPath = await findLatestWindsurfLogFile();
  if (!logPath) throw new Error("Windsurf log not found. Open Windsurf and start a Cascade session.");

  const logText = await fs.readFile(logPath, "utf-8").catch(() => "");
  const startInfo = extractLatestWindsurfStartInfoFromLog(logText);
  if (!startInfo) throw new Error("Failed to parse Windsurf language server pid/port from log.");
  if (!isProcessAlive(startInfo.pid)) {
    throw new Error("Windsurf language server is not running. Keep Windsurf open and start a Cascade session.");
  }

  const cmd = await readProcessCommandLine(startInfo.pid);
  const tokenFromPs = cmd ? extractCsrfTokenFromCommand(cmd) : null;
  const csrfToken = tokenFromPs ?? (config.windsurf.csrfTokenOverride?.trim() || "");

  // If we cannot extract a token, try to proceed without it. Some builds/configurations may
  // allow local-only calls without the header; probing avoids breaking the UX unnecessarily.
  if (!csrfToken) {
    const baseUrl = `http://127.0.0.1:${startInfo.port}`;
    const ok = await probeWindsurfHeartbeat({ baseUrl });
    if (!ok) throw new Error("Missing Windsurf CSRF token. Use Settings -> Windsurf token override as fallback.");
  }

  return { logPath, pid: startInfo.pid, port: startInfo.port, csrfToken };
}

export async function getWindsurfStatus(config: AppConfig): Promise<SourcesStatus["windsurf"]> {
  const logPath = await findLatestWindsurfLogFile();
  if (!logPath) {
    const recommendedAction = "Open Windsurf and start a Cascade session.";
    return {
      attached: false,
      attachMethod: "log",
      csrfTokenSource: "none",
      recommendedAction,
      lastError: "Windsurf log not found.",
      error: `Windsurf log not found. ${recommendedAction}`
    };
  }

  const logText = await fs.readFile(logPath, "utf-8").catch(() => "");
  const startInfo = extractLatestWindsurfStartInfoFromLog(logText);
  if (!startInfo) {
    const recommendedAction = "Start a Cascade session in Windsurf so pid/port are logged.";
    return {
      attached: false,
      attachMethod: "log",
      logPath,
      csrfTokenSource: "none",
      recommendedAction,
      lastError: "Failed to parse pid/port from Windsurf.log.",
      error: `Failed to parse pid/port from Windsurf.log. ${recommendedAction}`
    };
  }

  const pidAlive = isProcessAlive(startInfo.pid);
  if (!pidAlive) {
    const recommendedAction = getSessionRestartAction({ appName: "Windsurf", sessionName: "Cascade session", pidAlive: false });
    return {
      attached: false,
      attachMethod: "log",
      logPath,
      pid: startInfo.pid,
      pidAlive,
      port: startInfo.port,
      csrfTokenSource: "none",
      recommendedAction,
      lastError: "Windsurf language server is not running.",
      error: `Windsurf language server is not running. ${recommendedAction}`
    };
  }

  const cmd = await readProcessCommandLine(startInfo.pid);
  const tokenFromPs = cmd ? extractCsrfTokenFromCommand(cmd) : null;
  const overrideToken = config.windsurf.csrfTokenOverride?.trim() || null;
  const tokenInfo = classifyCsrfTokenSource({ tokenFromPs, overrideToken });
  const csrfToken = tokenInfo.token;
  const csrfTokenSource = tokenInfo.source === "discovery_file" ? "none" : tokenInfo.source;

  const baseUrl = `http://127.0.0.1:${startInfo.port}`;
  let heartbeatWithToken = false;
  let heartbeatWithoutToken = false;

  if (csrfToken) heartbeatWithToken = await probeWindsurfHeartbeat({ baseUrl, csrfToken });
  heartbeatWithoutToken = await probeWindsurfHeartbeat({ baseUrl });

  const heartbeatOk = heartbeatWithToken || heartbeatWithoutToken;
  const attached = heartbeatOk;
  // Keep token inference centralized and unit-tested to avoid flip-flop regressions in remediation routing.
  const tokenRequired = inferWindsurfTokenRequired({
    heartbeatOk,
    heartbeatWithoutToken,
    csrfTokenPresent: Boolean(csrfToken)
  });

  let lastError: string | undefined;
  if (!attached) {
    lastError = getHeartbeatFailureSummary({ appName: "Windsurf", csrfTokenPresent: Boolean(csrfToken) });
  }

  const recommendedAction = getWindsurfRecommendedAction({ attached, tokenRequired });

  return {
    attached,
    attachMethod: "log",
    logPath,
    pid: startInfo.pid,
    pidAlive,
    port: startInfo.port,
    csrfTokenPresent: Boolean(csrfToken),
    csrfTokenSource,
    tokenRequired,
    heartbeatOk,
    recommendedAction,
    ...(lastError
      ? {
          lastError,
          error: `${lastError} ${recommendedAction}`
        }
      : {})
  };
}

export async function getWindsurfChat(params: {
  config: AppConfig;
  cascadeId: string;
  stepOffset: number;
  includeCleared?: boolean;
}): Promise<{ messages: ChatMessage[]; nextStepOffset: number; numTotalSteps?: number }> {
  const { steps, nextStepOffset, numTotalSteps } = await getWindsurfStepChunk(params);
  const messages = normalizeWindsurfStepsToMessages(steps, { includeCleared: params.includeCleared });

  return {
    messages,
    nextStepOffset,
    numTotalSteps
  };
}

export async function getWindsurfTrajectory(params: {
  config: AppConfig;
  cascadeId: string;
  stepOffset: number;
  includeCleared?: boolean;
}): Promise<{ events: TrajectoryEvent[]; summary: TrajectorySummary; nextStepOffset: number; numTotalSteps?: number }> {
  const { steps, nextStepOffset, numTotalSteps } = await getWindsurfStepChunk(params);
  const { events } = normalizeWindsurfStepsToTrajectoryEvents(steps, { includeCleared: params.includeCleared });
  const totalSteps = typeof numTotalSteps === "number" ? numTotalSteps : nextStepOffset;
  const summary = summarizeTrajectoryEvents(events, totalSteps);
  return {
    events,
    summary,
    nextStepOffset,
    numTotalSteps
  };
}

async function getWindsurfStepChunk(params: {
  config: AppConfig;
  cascadeId: string;
  stepOffset: number;
  includeCleared?: boolean;
}): Promise<{ steps: unknown[]; nextStepOffset: number; numTotalSteps?: number }> {
  const { config, cascadeId, stepOffset } = params;
  const conn = await resolveWindsurfConnection(config);
  const baseUrl = `http://127.0.0.1:${conn.port}`;
  const csrfToken = conn.csrfToken;

  let numTotalSteps: number | undefined;
  try {
    const t = await connectUnaryJson<any>({
      baseUrl,
      serviceTypeName: SERVICE,
      methodName: "GetCascadeTrajectory",
      csrfToken,
      body: { cascadeId }
    });
    if (typeof t?.numTotalSteps === "number") numTotalSteps = t.numTotalSteps;
  } catch {
    // Optional
  }

  const stepsRes = await connectUnaryJson<any>({
    baseUrl,
    serviceTypeName: SERVICE,
    methodName: "GetCascadeTrajectorySteps",
    csrfToken,
    body: { cascadeId, stepOffset, verbosity: "CLIENT_TRAJECTORY_VERBOSITY_PROD_UI" }
  });

  const steps: unknown[] = Array.isArray(stepsRes?.steps) ? stepsRes.steps : [];
  return {
    steps,
    nextStepOffset: stepOffset + steps.length,
    numTotalSteps
  };
}

export async function getWindsurfTrajectoryMetaMap(config: AppConfig): Promise<Record<string, { title?: string; cwd?: string }>> {
  let conn: WindsurfConnection;
  try {
    conn = await resolveWindsurfConnection(config);
  } catch {
    return {};
  }

  const baseUrl = `http://127.0.0.1:${conn.port}`;
  const res = await connectUnaryJson<any>({
    baseUrl,
    serviceTypeName: SERVICE,
    methodName: "GetAllCascadeTrajectories",
    csrfToken: conn.csrfToken,
    body: {}
  });

  const mapObj = res?.trajectorySummaries ?? res?.trajectory_summaries;
  if (!mapObj || typeof mapObj !== "object") return {};

  return buildMetaMapFromTrajectorySummaries(mapObj as Record<string, any>);
}

export async function getWindsurfDiagnosticBundle(params: {
  config: AppConfig;
  cascadeId: string;
  allSteps: boolean;
  maxSteps?: number;
}): Promise<{
  logPath: string;
  pid: number;
  port: number;
  csrfTokenPresent: true;
  getCascadeTrajectoryResponse: unknown;
  getCascadeTrajectoryStepsPages: Array<{ stepOffset: number; response: unknown }>;
  numTotalSteps?: number;
  truncated: boolean;
}> {
  const { config, cascadeId, allSteps } = params;
  const maxSteps = Math.min(Math.max(params.maxSteps ?? 5000, 1), 50_000);

  const conn = await resolveWindsurfConnection(config);
  const baseUrl = `http://127.0.0.1:${conn.port}`;

  const getCascadeTrajectoryResponse = await connectUnaryJson<any>({
    baseUrl,
    serviceTypeName: SERVICE,
    methodName: "GetCascadeTrajectory",
    csrfToken: conn.csrfToken,
    body: { cascadeId }
  });

  const numTotalSteps = typeof getCascadeTrajectoryResponse?.numTotalSteps === "number" ? getCascadeTrajectoryResponse.numTotalSteps : undefined;

  const getCascadeTrajectoryStepsPages: Array<{ stepOffset: number; response: unknown }> = [];
  let stepOffset = 0;
  let totalSteps = 0;
  let truncated = false;

  const maxPages = 1000;
  const targetSteps = maxSteps;

  for (let page = 0; page < maxPages; page += 1) {
    if (typeof numTotalSteps === "number" && stepOffset >= numTotalSteps) break;
    if (totalSteps >= targetSteps) break;

    const res = await connectUnaryJson<any>({
      baseUrl,
      serviceTypeName: SERVICE,
      methodName: "GetCascadeTrajectorySteps",
      csrfToken: conn.csrfToken,
      body: { cascadeId, stepOffset, verbosity: "CLIENT_TRAJECTORY_VERBOSITY_PROD_UI" }
    });

    const steps: unknown[] = Array.isArray(res?.steps) ? res.steps : [];
    if (steps.length === 0) {
      getCascadeTrajectoryStepsPages.push({ stepOffset, response: res });
      break;
    }

    const remaining = targetSteps - totalSteps;
    if (steps.length > remaining) {
      truncated = true;
      const trimmed = { ...(res ?? {}), steps: steps.slice(0, remaining) };
      getCascadeTrajectoryStepsPages.push({ stepOffset, response: trimmed });
      totalSteps += remaining;
      break;
    }

    getCascadeTrajectoryStepsPages.push({ stepOffset, response: res });
    totalSteps += steps.length;
    stepOffset += steps.length;

    if (!allSteps) break;
  }

  if (allSteps) {
    if (typeof numTotalSteps === "number") truncated = truncated || totalSteps < numTotalSteps;
    else truncated = truncated || totalSteps >= maxSteps;
  } else {
    truncated = false;
  }

  return {
    logPath: conn.logPath,
    pid: conn.pid,
    port: conn.port,
    csrfTokenPresent: true,
    getCascadeTrajectoryResponse,
    getCascadeTrajectoryStepsPages,
    ...(typeof numTotalSteps === "number" ? { numTotalSteps } : {}),
    truncated
  };
}
