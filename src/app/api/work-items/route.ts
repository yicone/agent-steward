import path from "node:path";

import { NextResponse } from "next/server";

import { createWorkItem, listWorkItems } from "@/lib/server/workItemStore";
import { loadSessionRecord } from "@/lib/server/sessionRecordLoader";
import { readConfig } from "@/lib/server/config";
import { getProjectEvidenceProviderResult } from "@/lib/server/projectEvidenceProvider";
import { normalizeComparablePath } from "@/lib/server/projectRootFilter";
import { inferWorkItem } from "@/lib/workItemInference";
import { WORK_ITEM_SCHEMA_VERSION, type WorkItem } from "@/lib/workContinuity";
import type { Source } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSource(value: unknown): value is Source {
  return value === "antigravity" || value === "windsurf" || value === "codex" || value === "cursor";
}

function allowedProjectRoot(input: string): string | null {
  const candidate = normalizeComparablePath(input);
  const configured = [process.cwd(), ...(process.env.AGENT_STEWARD_PROJECT_ROOTS ?? "").split(process.platform === "win32" ? ";" : ":")]
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeComparablePath);
  return configured.includes(candidate) ? candidate : null;
}

function requestError(error: string, hint: string, status = 400) {
  return NextResponse.json({ error, code: "INVALID_REQUEST", title: "Invalid request", hint }, { status });
}

export async function GET() {
  try {
    return NextResponse.json({ workItems: await listWorkItems() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to list Work Items", code: "WORK_ITEM_LIST_FAILED", title: "Work Items unavailable" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: {
    id?: string;
    projectRootPath?: string;
    projectName?: string;
    goal?: string;
    source?: Source;
    sessionId?: string;
    rootId?: string;
  };
  try { body = await req.json(); } catch { return requestError("Invalid JSON body", "Send a projectRootPath and goal, optionally with source and sessionId."); }
  if (!body.projectRootPath || typeof body.projectRootPath !== "string") return requestError("projectRootPath is required", "Choose one of the configured local project roots.");
  const rootPath = allowedProjectRoot(body.projectRootPath);
  if (!rootPath) return requestError("projectRootPath is not an allowed project root", "Use the current working root or a root configured in AGENT_STEWARD_PROJECT_ROOTS.");
  if (body.sessionId && !isSource(body.source)) return requestError("source is required for a Session-derived Work Item", "Choose a supported Session source.");
  if (!body.sessionId && (!body.goal || !body.goal.trim())) return requestError("goal is required for a manual Work Item", "Describe the work before organizing it.");

  try {
    let inferred;
    let loadedRecord;
    if (body.sessionId && body.source) {
      const { config } = await readConfig();
      loadedRecord = await loadSessionRecord({ config, source: body.source, sessionId: body.sessionId, rootId: body.rootId });
      const evidenceProvider = getProjectEvidenceProviderResult(rootPath);
      inferred = inferWorkItem({
        record: loadedRecord.record,
        project: { rootPath, name: body.projectName ?? path.basename(rootPath), evidenceProvider },
        evidenceProvider,
      });
    }
    const now = new Date().toISOString();
    const id = body.id?.trim() || `work-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const inferredGoal = inferred?.goal.value;
    const fallbackGoal = `Captured ${body.source ?? "agent"} session ${body.sessionId ?? "work"}`;
    const workItem: WorkItem = {
      schemaVersion: WORK_ITEM_SCHEMA_VERSION,
      id,
      project: { name: body.projectName ?? path.basename(rootPath), rootPath },
      goal: inferredGoal
        ? { ...inferred!.goal, value: inferredGoal }
        : body.goal?.trim()
          ? { value: body.goal.trim(), confidence: "observed", source: "user", observedAt: now }
          : { value: fallbackGoal, confidence: "missing", source: "agent-steward", observedAt: now, note: "The source did not provide a usable goal; confirm the goal before organizing." },
      status: "captured",
      createdAt: now,
      updatedAt: now,
      currentAgent: body.source,
      progress: inferred?.progress,
      evidence: inferred?.evidence,
      sessions: loadedRecord?.record ? [{
        id: `session-${body.source}-${body.sessionId}`,
        source: body.source!,
        sessionId: body.sessionId!,
        rootId: body.rootId ?? loadedRecord.record.session.rootId,
        locator: loadedRecord.record.sourceRef.locator,
        title: loadedRecord.record.session.title,
        attachedAt: now,
        confidence: "observed",
      }] : undefined,
      context: inferred?.context,
      repositoryState: inferred?.repositoryState,
      openQuestions: inferred?.warnings.map((warning, index) => ({ id: `question-${index + 1}`, value: warning, confidence: "inferred" as const, source: "agent-steward", observedAt: now })),
    };
    const saved = await createWorkItem(workItem, loadedRecord?.record ? { sessionRecord: loadedRecord.record } : undefined);
    return NextResponse.json({ workItem: saved }, { status: 201 });
  } catch (error) {
    console.error("[work-items] create failed", error);
    const message = error instanceof Error ? error.message : "Unable to create Work Item";
    const conflict = /already exists|conflict/i.test(message);
    const clientError = conflict || /invalid|requires|must be|not allowed/i.test(message);
    return NextResponse.json({ error: message, code: conflict ? "WORK_ITEM_CONFLICT" : clientError ? "INVALID_REQUEST" : "WORK_ITEM_CREATE_FAILED", title: "Work Item creation failed" }, { status: conflict ? 409 : clientError ? 400 : 502 });
  }
}
