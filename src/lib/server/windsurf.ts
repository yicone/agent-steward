import "server-only";

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import type { AppConfig, ChatMessage, SourcesStatus } from "@/lib/types";
import { extractCsrfTokenFromCommand } from "@/lib/parse/commandLine";
import { extractLatestWindsurfStartInfoFromLog } from "@/lib/parse/windsurfLog";
import { normalizeWindsurfStepsToMessages } from "@/lib/parse/steps";
import { connectUnaryJson } from "@/lib/server/connect";
import { buildMetaMapFromTrajectorySummaries } from "@/lib/server/trajectoryMeta";

const execFileAsync = promisify(execFile);
const SERVICE = "exa.language_server_pb.LanguageServerService";

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

  // Pick the newest candidate that contains a pid/port start sequence.
  for (const c of candidates) {
    const logText = await fs.readFile(c.p, "utf-8").catch(() => "");
    if (extractLatestWindsurfStartInfoFromLog(logText)) return c.p;
  }
  return candidates[0]?.p ?? null;
}

async function readProcessCommandLine(pid: number): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("ps", ["-o", "command=", "-p", String(pid)], { timeout: 2500 });
    const cmd = stdout?.trim();
    return cmd && cmd.length ? cmd : null;
  } catch {
    return null;
  }
}

export async function getWindsurfStatus(config: AppConfig): Promise<SourcesStatus["windsurf"]> {
  const logPath = await findLatestWindsurfLogFile();
  if (!logPath) {
    return { attached: false, error: "Windsurf log not found. Open Windsurf and start a Cascade session." };
  }

  const logText = await fs.readFile(logPath, "utf-8").catch(() => "");
  const startInfo = extractLatestWindsurfStartInfoFromLog(logText);
  if (!startInfo) {
    return { attached: false, logPath, error: "Failed to parse pid/port from Windsurf.log." };
  }

  const cmd = await readProcessCommandLine(startInfo.pid);
  const tokenFromPs = cmd ? extractCsrfTokenFromCommand(cmd) : null;
  const csrfToken = tokenFromPs ?? (config.windsurf.csrfTokenOverride?.trim() || null);
  const error = csrfToken
    ? undefined
    : "Missing Windsurf CSRF token. Keep Windsurf running and ensure we can read the LS process args, or set a token override in Settings.";

  return {
    attached: Boolean(startInfo.port) && Boolean(csrfToken),
    logPath,
    pid: startInfo.pid,
    port: startInfo.port,
    csrfTokenPresent: Boolean(csrfToken),
    ...(error ? { error } : {})
  };
}

export async function getWindsurfChat(params: {
  config: AppConfig;
  cascadeId: string;
  stepOffset: number;
}): Promise<{ messages: ChatMessage[]; nextStepOffset: number; numTotalSteps?: number }> {
  const { config, cascadeId, stepOffset } = params;
  const logPath = await findLatestWindsurfLogFile();
  if (!logPath) throw new Error("Windsurf log not found. Open Windsurf and start a Cascade session.");

  const logText = await fs.readFile(logPath, "utf-8").catch(() => "");
  const startInfo = extractLatestWindsurfStartInfoFromLog(logText);
  if (!startInfo) throw new Error("Failed to parse Windsurf language server pid/port from log.");

  const cmd = await readProcessCommandLine(startInfo.pid);
  const tokenFromPs = cmd ? extractCsrfTokenFromCommand(cmd) : null;
  const csrfToken = tokenFromPs ?? (config.windsurf.csrfTokenOverride?.trim() || "");
  if (!csrfToken) throw new Error("Missing Windsurf CSRF token. Use Settings -> Windsurf token override as fallback.");

  const baseUrl = `http://127.0.0.1:${startInfo.port}`;

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
  const messages = normalizeWindsurfStepsToMessages(steps);

  return {
    messages,
    nextStepOffset: stepOffset + steps.length,
    numTotalSteps
  };
}

export async function getWindsurfTrajectoryMetaMap(config: AppConfig): Promise<Record<string, { title?: string; cwd?: string }>> {
  const logPath = await findLatestWindsurfLogFile();
  if (!logPath) return {};

  const logText = await fs.readFile(logPath, "utf-8").catch(() => "");
  const startInfo = extractLatestWindsurfStartInfoFromLog(logText);
  if (!startInfo) return {};

  const cmd = await readProcessCommandLine(startInfo.pid);
  const tokenFromPs = cmd ? extractCsrfTokenFromCommand(cmd) : null;
  const csrfToken = tokenFromPs ?? (config.windsurf.csrfTokenOverride?.trim() || "");
  if (!csrfToken) return {};

  const baseUrl = `http://127.0.0.1:${startInfo.port}`;
  const res = await connectUnaryJson<any>({
    baseUrl,
    serviceTypeName: SERVICE,
    methodName: "GetAllCascadeTrajectories",
    csrfToken,
    body: {}
  });

  const mapObj = res?.trajectorySummaries ?? res?.trajectory_summaries;
  if (!mapObj || typeof mapObj !== "object") return {};

  return buildMetaMapFromTrajectorySummaries(mapObj as Record<string, any>);
}
