import "server-only";

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import type { AppConfig, ChatMessage, SourcesStatus, TrajectoryEvent, TrajectorySummary } from "@/lib/types";
import { extractCsrfTokenFromCommand, extractCsrfTokenMatchFromCommand } from "@/lib/parse/commandLine";
import { classifyCsrfTokenSource } from "@/lib/parse/tokenSource";
import { getHeartbeatFailureSummary, getSessionRestartAction } from "@/lib/parse/connectionDiagnostics";
import { inferWindsurfRecoverability } from "@/lib/parse/windsurfRecoverability";
import { getWindsurfRecommendedAction, inferWindsurfTokenRequired } from "@/lib/parse/windsurfStatus";
import { summarizeTrajectoryEvents } from "@/lib/parse/trajectory";
import { extractLatestWindsurfStartInfoFromLog } from "@/lib/parse/windsurfLog";
import { normalizeWindsurfStepsToMessages, normalizeWindsurfStepsToTrajectoryEvents } from "@/lib/parse/windsurfSteps";
import { ConnectUnaryError, connectUnaryJson } from "@/lib/server/connect";
import { platformPaths } from "@/lib/server/platform";
import { expandHome } from "@/lib/server/paths";
import { buildMetaMapFromTrajectorySummaries } from "@/lib/server/trajectoryMeta";

const execFileAsync = promisify(execFile);
const SERVICE = "exa.language_server_pb.LanguageServerService";

type WindsurfConnection = {
  logPath: string;
  pid: number;
  port: number;
  csrfToken: string;
};

type HeartbeatProbeResult = {
  ok: boolean;
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
};

function extractErrCodeMessage(err: unknown): { code?: string; message?: string } {
  if (!err || typeof err !== "object") return { message: String(err) };
  const anyErr = err as any;
  const cause = anyErr?.cause;
  const code = (cause?.code ?? anyErr?.code) as string | undefined;
  const message = (cause?.message ?? anyErr?.message) as string | undefined;
  return { ...(code ? { code } : {}), ...(message ? { message } : {}) };
}

function toWindsurfRpcError(err: unknown, cascadeId: string): Error {
  if (!(err instanceof ConnectUnaryError)) {
    return err instanceof Error ? err : new Error(String(err));
  }

  const bodyText = err.bodyText?.trim() ?? "";
  if (/trajectory not found/i.test(bodyText)) {
    return new Error(
      `Windsurf LS returned "trajectory not found" for session ${cascadeId}. The local .pb file was discovered, but the running Windsurf LS database does not have this trajectory anymore.`
    );
  }

  if (bodyText.length > 0) {
    return new Error(`${err.message}: ${bodyText}`);
  }

  return new Error(err.message);
}

function isInvalidCsrfToken(res: HeartbeatProbeResult | null | undefined): boolean {
  return res?.httpStatus === 401 && /invalid csrf token/i.test(res.errorMessage ?? "");
}

function isMissingCsrfToken(res: HeartbeatProbeResult | null | undefined): boolean {
  return res?.httpStatus === 401 && /missing csrf token/i.test(res.errorMessage ?? "");
}

async function getLegacyWindsurfRecoveryEvidence(cascadeId: string) {
  const pbPath = expandHome(`~/.codeium/cascade/${cascadeId}.pb`);
  const brainDir = expandHome(`~/.codeium/brain/${cascadeId}`);

  const pbStat = await fs.stat(pbPath).catch(() => null);
  const planText = await fs.readFile(path.join(brainDir, "plan.md"), "utf-8").catch(() => null);
  const planMetadataText = await fs.readFile(path.join(brainDir, "plan_metadata.pbtxt"), "utf-8").catch(() => null);

  let recoveredTitle: string | undefined;
  let recoveredCurrentGoal: string | undefined;
  if (planText) {
    const lines = planText.split(/\r?\n/);
    const headingLine = lines.find((line) => line.startsWith("# "));
    if (headingLine) recoveredTitle = headingLine.slice(2).trim() || undefined;

    const goalIndex = lines.findIndex((line) => /^##\s+Current Goal\s*$/i.test(line.trim()));
    if (goalIndex >= 0) {
      const goalLine = lines.slice(goalIndex + 1).find((line) => line.trim().length > 0);
      if (goalLine) recoveredCurrentGoal = goalLine.trim();
    }
  }

  return {
    localPb: pbStat
      ? {
          path: pbPath,
          sizeBytes: Number(pbStat.size),
          mtimeMs: Number(pbStat.mtimeMs)
        }
      : undefined,
    brainSidecar: planText || planMetadataText
      ? {
          path: brainDir,
          hasPlanMd: Boolean(planText),
          hasPlanMetadata: Boolean(planMetadataText),
          ...(recoveredTitle ? { recoveredTitle } : {}),
          ...(recoveredCurrentGoal ? { recoveredCurrentGoal } : {})
        }
      : undefined
  };
}

async function probeWindsurfHeartbeat(params: { baseUrl: string; csrfToken?: string }): Promise<HeartbeatProbeResult> {
  try {
    await connectUnaryJson({
      baseUrl: params.baseUrl,
      serviceTypeName: SERVICE,
      methodName: "Heartbeat",
      csrfToken: params.csrfToken,
      body: { metadata: {} },
      timeoutMs: 1200
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof ConnectUnaryError) {
      return {
        ok: false,
        httpStatus: e.status,
        errorMessage: e.bodyText?.trim()?.slice(0, 280) || e.message
      };
    }
    const { code, message } = extractErrCodeMessage(e);
    return { ok: false, ...(code ? { errorCode: code } : {}), ...(message ? { errorMessage: message } : {}) };
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
  const logsRoot = platformPaths.windsurfLogsRoot();
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
    const { stdout } = await execFileAsync("ps", ["eww", "-o", "command=", "-ww", "-p", String(pid)], { timeout: 2500 });
    const cmd = stdout?.trim();
    return cmd && cmd.length ? cmd : null;
  } catch {
    try {
      const { stdout } = await execFileAsync("ps", ["-o", "args=", "-ww", "-p", String(pid)], { timeout: 2500 });
      const cmd = stdout?.trim();
      return cmd && cmd.length ? cmd : null;
    } catch {
      return null;
    }
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
  const psTokenMatch = cmd ? extractCsrfTokenMatchFromCommand(cmd) : { token: null, source: "none" as const };
  const tokenFromPs = psTokenMatch.token;
  const overrideToken = config.windsurf.csrfTokenOverride?.trim() || null;
  const tokenInfo = classifyCsrfTokenSource({ tokenFromPs, tokenFromPsSource: psTokenMatch.source, overrideToken });
  const csrfToken = tokenInfo.token ?? "";

  const baseUrl = `http://127.0.0.1:${startInfo.port}`;
  const resWithToken = csrfToken ? await probeWindsurfHeartbeat({ baseUrl, csrfToken }) : { ok: false };
  const resWithoutToken = await probeWindsurfHeartbeat({ baseUrl });

  if (resWithToken.ok) return { logPath, pid: startInfo.pid, port: startInfo.port, csrfToken };
  if (resWithoutToken.ok) return { logPath, pid: startInfo.pid, port: startInfo.port, csrfToken: "" };

  if (resWithToken.errorCode === "EPERM" || resWithoutToken.errorCode === "EPERM") {
    throw new Error(
      "Local network access is blocked (EPERM connect to 127.0.0.1). Run agent-storage-manager outside the sandboxed environment, then refresh."
    );
  }

  if (!csrfToken) throw new Error("Missing Windsurf CSRF token. Use Settings -> Windsurf token override as fallback.");
  if (tokenInfo.source === "override") {
    if (isInvalidCsrfToken(resWithToken)) {
      throw new Error("Windsurf rejected the Settings override token (401 invalid CSRF token).");
    }
    throw new Error("Windsurf heartbeat probe failed with the Settings override token. Refresh the override token, then retry.");
  }
  if (isInvalidCsrfToken(resWithToken)) {
    throw new Error(`Windsurf rejected the ${tokenInfo.source === "ps_env" ? "running-process env" : "process-args"} CSRF token (401 invalid CSRF token). Restart a Cascade session, then refresh.`);
  }
  throw new Error(`Windsurf heartbeat probe failed with the ${tokenInfo.source === "ps_env" ? "running-process env" : "process-args"} CSRF token. Restart a Cascade session, then refresh.`);

  // unreachable
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
    const recommendedAction = getSessionRestartAction({
      appName: "Windsurf",
      sessionName: "Cascade session",
      pidAlive
    });
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
  const psTokenMatch = cmd ? extractCsrfTokenMatchFromCommand(cmd) : { token: null, source: "none" as const };
  const tokenFromPs = psTokenMatch.token;
  const overrideToken = config.windsurf.csrfTokenOverride?.trim() || null;
  const tokenInfo = classifyCsrfTokenSource({ tokenFromPs, tokenFromPsSource: psTokenMatch.source, overrideToken });
  const csrfToken = tokenInfo.token;
  const csrfTokenSource = tokenInfo.source;

  const baseUrl = `http://127.0.0.1:${startInfo.port}`;
  let heartbeatWithToken: HeartbeatProbeResult | null = null;
  let heartbeatWithoutToken: HeartbeatProbeResult | null = null;

  if (csrfToken) heartbeatWithToken = await probeWindsurfHeartbeat({ baseUrl, csrfToken });
  heartbeatWithoutToken = await probeWindsurfHeartbeat({ baseUrl });

  const heartbeatOk = Boolean(heartbeatWithToken?.ok || heartbeatWithoutToken?.ok);
  const attached = heartbeatOk;
  // Keep token inference centralized and unit-tested to avoid flip-flop regressions in remediation routing.
  const tokenRequired = inferWindsurfTokenRequired({
    heartbeatOk,
    heartbeatWithoutToken: Boolean(heartbeatWithoutToken?.ok),
    csrfTokenPresent: Boolean(csrfToken)
  });

  let lastError: string | undefined;
  if (!attached) {
    if (heartbeatWithToken?.errorCode === "EPERM" || heartbeatWithoutToken?.errorCode === "EPERM") {
      lastError = "Local network access blocked (EPERM connect to 127.0.0.1).";
    } else if (isInvalidCsrfToken(heartbeatWithToken)) {
      lastError = "Windsurf rejected the supplied CSRF token (401 invalid CSRF token).";
    } else if (!csrfToken && isMissingCsrfToken(heartbeatWithoutToken)) {
      lastError = "Missing Windsurf CSRF token (401 missing CSRF token).";
    } else {
      lastError = getHeartbeatFailureSummary({ appName: "Windsurf", csrfTokenPresent: Boolean(csrfToken) });
      const suffix = heartbeatWithToken?.httpStatus
        ? ` (with-token HTTP ${heartbeatWithToken.httpStatus})`
        : heartbeatWithoutToken?.httpStatus
          ? ` (no-token HTTP ${heartbeatWithoutToken.httpStatus})`
          : heartbeatWithToken?.errorCode
            ? ` (with-token ${heartbeatWithToken.errorCode})`
            : heartbeatWithoutToken?.errorCode
              ? ` (no-token ${heartbeatWithoutToken.errorCode})`
              : "";
      if (suffix) lastError += suffix;
    }
  }

  const recommendedAction =
    heartbeatWithToken?.errorCode === "EPERM" || heartbeatWithoutToken?.errorCode === "EPERM"
      ? "Run agent-storage-manager outside the sandboxed environment (needs localhost network access), then refresh."
      : isInvalidCsrfToken(heartbeatWithToken)
        ? "The override/auth UUID is not the live LS CSRF token. Restart Windsurf/Cascade and use the token from the running process if available."
      : getWindsurfRecommendedAction({ attached, tokenRequired });

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
  } catch (err) {
    if (err instanceof ConnectUnaryError && /trajectory not found/i.test(err.bodyText ?? "")) {
      throw toWindsurfRpcError(err, cascadeId);
    }
    // Optional
  }

  let stepsRes: any;
  try {
    stepsRes = await connectUnaryJson<any>({
      baseUrl,
      serviceTypeName: SERVICE,
      methodName: "GetCascadeTrajectorySteps",
      csrfToken,
      body: { cascadeId, stepOffset, verbosity: "CLIENT_TRAJECTORY_VERBOSITY_PROD_UI" }
    });
  } catch (err) {
    throw toWindsurfRpcError(err, cascadeId);
  }

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
  csrfTokenPresent: boolean;
  recoverability?: "ls_readable" | "partial" | "unavailable";
  localPb?: {
    path: string;
    sizeBytes: number;
    mtimeMs: number;
  };
  brainSidecar?: {
    path: string;
    hasPlanMd: boolean;
    hasPlanMetadata: boolean;
    recoveredTitle?: string;
    recoveredCurrentGoal?: string;
  };
  getCascadeTrajectoryResponse: unknown;
  getCascadeTrajectoryStepsPages: Array<{ stepOffset: number; response: unknown }>;
  numTotalSteps?: number;
  truncated: boolean;
}> {
  const { config, cascadeId, allSteps } = params;
  const maxSteps = Math.min(Math.max(params.maxSteps ?? 5000, 1), 50_000);

  const conn = await resolveWindsurfConnection(config);
  const baseUrl = `http://127.0.0.1:${conn.port}`;

  let getCascadeTrajectoryResponse: any;
  let trajectoryMissing = false;
  try {
    getCascadeTrajectoryResponse = await connectUnaryJson<any>({
      baseUrl,
      serviceTypeName: SERVICE,
      methodName: "GetCascadeTrajectory",
      csrfToken: conn.csrfToken,
      body: { cascadeId }
    });
  } catch (err) {
    if (err instanceof ConnectUnaryError && /trajectory not found/i.test(err.bodyText ?? "")) {
      trajectoryMissing = true;
      getCascadeTrajectoryResponse = {
        error: toWindsurfRpcError(err, cascadeId).message,
        bodyText: err.bodyText,
        status: err.status
      };
    } else {
      throw err;
    }
  }

  const recoveryEvidence = trajectoryMissing ? await getLegacyWindsurfRecoveryEvidence(cascadeId) : { localPb: undefined, brainSidecar: undefined };
  const recoverability = inferWindsurfRecoverability({
    trajectoryReadable: !trajectoryMissing,
    trajectoryMissing,
    hasSidecarEvidence: Boolean(recoveryEvidence.brainSidecar)
  });

  if (trajectoryMissing) {
    return {
      logPath: conn.logPath,
      pid: conn.pid,
      port: conn.port,
      csrfTokenPresent: Boolean(conn.csrfToken),
      ...(recoverability ? { recoverability } : {}),
      ...(recoveryEvidence.localPb ? { localPb: recoveryEvidence.localPb } : {}),
      ...(recoveryEvidence.brainSidecar ? { brainSidecar: recoveryEvidence.brainSidecar } : {}),
      getCascadeTrajectoryResponse,
      getCascadeTrajectoryStepsPages: [],
      truncated: false
    };
  }

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
    csrfTokenPresent: Boolean(conn.csrfToken),
    ...(recoverability ? { recoverability } : {}),
    getCascadeTrajectoryResponse,
    getCascadeTrajectoryStepsPages,
    ...(typeof numTotalSteps === "number" ? { numTotalSteps } : {}),
    truncated
  };
}
