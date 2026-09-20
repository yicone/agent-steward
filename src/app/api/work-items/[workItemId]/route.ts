import { NextResponse } from "next/server";

import { attachSessionRecord, readWorkItem, updateWorkItem } from "@/lib/server/workItemStore";
import { loadSessionRecord } from "@/lib/server/sessionRecordLoader";
import { readConfig } from "@/lib/server/config";
import { validateWorkItemId, type WorkItemLifecycle } from "@/lib/workContinuity";
import type { Source } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { workItemId: string } };

function isSource(value: unknown): value is Source {
  return value === "antigravity" || value === "windsurf" || value === "codex" || value === "cursor";
}

export async function GET(_req: Request, { params }: Params) {
  try { validateWorkItemId(params.workItemId); return NextResponse.json({ workItem: await readWorkItem(params.workItemId) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Work Item not found", code: "WORK_ITEM_NOT_FOUND", title: "Work Item unavailable" }, { status: 404 }); }
}

export async function PATCH(req: Request, { params }: Params) {
  let body: { expectedVersion?: number; expectedUpdatedAt?: string; organize?: boolean; goal?: string; status?: WorkItemLifecycle; nextStep?: string; openQuestions?: string[]; decisions?: string[]; attachSession?: { source?: Source; sessionId?: string; rootId?: string } };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_REQUEST", title: "Invalid request" }, { status: 400 }); }
  try {
    const current = await readWorkItem(params.workItemId);
    if (body.attachSession) {
      if (typeof body.attachSession.sessionId !== "string" || !body.attachSession.sessionId.trim() || !isSource(body.attachSession.source)) {
        return NextResponse.json({ error: "attachSession requires source and sessionId", code: "INVALID_SESSION", title: "Invalid Session attachment" }, { status: 400 });
      }
      if (body.goal || body.status || body.organize || body.nextStep || body.openQuestions || body.decisions) {
        return NextResponse.json({ error: "Attach a Session separately from other Work Item updates", code: "INVALID_REQUEST", title: "Invalid Work Item update" }, { status: 400 });
      }
      const { config } = await readConfig();
      const sessionId = body.attachSession.sessionId.trim();
      const loaded = await loadSessionRecord({ config, source: body.attachSession.source, sessionId, rootId: body.attachSession.rootId });
      const workItem = await attachSessionRecord(params.workItemId, {
        id: `session-${body.attachSession.source}-${sessionId}`,
        source: body.attachSession.source,
        sessionId,
        rootId: body.attachSession.rootId,
        locator: loaded.record.sourceRef.locator,
        title: loaded.record.session.title,
        attachedAt: new Date().toISOString(),
        confidence: "observed",
      }, loaded.record);
      return NextResponse.json({ workItem });
    }
    const patch: Record<string, unknown> = {};
    if (body.goal?.trim()) patch.goal = { ...current.goal, value: body.goal.trim(), confidence: "verified", source: "user", observedAt: new Date().toISOString() };
    if (body.organize) patch.status = "organized";
    else if (body.status) patch.status = body.status;
    if (body.nextStep?.trim()) patch.progress = [...(current.progress ?? []).filter((item) => item.kind !== "next"), { value: body.nextStep.trim(), kind: "next", confidence: "verified", source: "user", observedAt: new Date().toISOString() }];
    if (body.openQuestions) patch.openQuestions = body.openQuestions.map((value, index) => ({ id: `question-${index + 1}`, value, confidence: "verified", source: "user", observedAt: new Date().toISOString() }));
    if (body.decisions) patch.decisions = body.decisions.map((value, index) => ({ id: `decision-${index + 1}`, value, confidence: "verified", source: "user", observedAt: new Date().toISOString() }));
    const workItem = await updateWorkItem(params.workItemId, patch, { expectedVersion: body.expectedVersion, expectedUpdatedAt: body.expectedUpdatedAt });
    return NextResponse.json({ workItem });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update Work Item";
    return NextResponse.json({ error: message, code: /conflict/i.test(message) ? "WORK_ITEM_CONFLICT" : "WORK_ITEM_UPDATE_FAILED", title: "Work Item update failed" }, { status: /conflict/i.test(message) ? 409 : 400 });
  }
}
