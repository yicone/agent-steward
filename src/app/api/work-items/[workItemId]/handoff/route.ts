import { NextResponse } from "next/server";

import { readWorkItem } from "@/lib/server/workItemStore";
import { createWorkPackage, preflightWorkPackage, recordHandoffOutcome, type HandoffOptions } from "@/lib/server/workPackageService";
import { isHandoffOutcome, type HandoffHistoryEntry } from "@/lib/workContinuity";
import { isProjectionProvider } from "@/lib/server/providerProjections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { workItemId: string } };

function options(body: Record<string, unknown>): HandoffOptions {
  const targetProvider = body.targetProvider ?? "codex";
  if (!isProjectionProvider(targetProvider)) throw new Error(`Unsupported target provider: ${String(targetProvider)}`);
  return {
    targetProvider,
    includeEvidence: body.includeEvidence === true,
    includeRawContent: body.includeRawContent === true,
    redactPaths: body.redactPaths !== false,
    truncateContent: body.truncateContent !== false,
    maxContentBytes: typeof body.maxContentBytes === "number" ? body.maxContentBytes : undefined,
  };
}

export async function POST(req: Request, { params }: Params) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_REQUEST", title: "Invalid request" }, { status: 400 }); }
  try {
    const workItem = await readWorkItem(params.workItemId);
    const mode = body.mode === "create" || body.mode === "record-outcome" ? body.mode : "preflight";
    if (mode === "preflight") return NextResponse.json({ preflight: await preflightWorkPackage(workItem, options(body)) });
    if (mode === "create") {
      const created = await createWorkPackage(params.workItemId, options(body));
      return NextResponse.json({ packageId: created.package.id, canonicalHash: created.package.canonicalHash, validation: created.package.validation, targetProvider: created.package.target?.provider, paths: { markdown: created.markdownPath, json: created.jsonPath, codex: created.codexPath, provider: created.providerPath } }, { status: 201 });
    }
    if (!body.outcome || typeof body.outcome !== "object") return NextResponse.json({ error: "outcome is required", code: "INVALID_OUTCOME", title: "Invalid handoff outcome" }, { status: 400 });
    const candidate = body.outcome as Partial<HandoffHistoryEntry>;
    if (typeof candidate.id !== "string" || !candidate.id.trim() || typeof candidate.createdAt !== "string" || Number.isNaN(Date.parse(candidate.createdAt)) || !isHandoffOutcome(candidate.outcome) || candidate.outcome === "created" || typeof candidate.packageId !== "string" || !candidate.packageId || typeof candidate.packageHash !== "string" || !candidate.packageHash) {
      return NextResponse.json({ error: "outcome requires id, packageId, packageHash, createdAt, and a supported post-creation outcome", code: "INVALID_OUTCOME", title: "Invalid handoff outcome" }, { status: 400 });
    }
    const created = workItem.handoffs?.find((entry) => entry.outcome === "created" && entry.packageId === candidate.packageId);
    if (!created || !created.packageHash || created.packageHash !== candidate.packageHash) {
      return NextResponse.json({ error: "outcome does not match a package created for this Work Item", code: "INVALID_OUTCOME", title: "Invalid handoff outcome" }, { status: 400 });
    }
    if (candidate.target?.provider && candidate.target.provider !== created.target?.provider) {
      return NextResponse.json({ error: "outcome target does not match the created package", code: "INVALID_OUTCOME", title: "Invalid handoff outcome" }, { status: 400 });
    }
    const outcome: HandoffHistoryEntry = {
      id: candidate.id.trim(),
      workItemId: workItem.id,
      packageId: created.packageId,
      packageHash: created.packageHash,
      schemaVersion: created.schemaVersion,
      target: created.target,
      project: workItem.project,
      createdAt: new Date(candidate.createdAt).toISOString(),
      method: "manual",
      outcome: candidate.outcome,
      ...(candidate.failureReason ? { failureReason: candidate.failureReason } : {}),
      ...(candidate.missingInformation ? { missingInformation: candidate.missingInformation } : {}),
    };
    await recordHandoffOutcome(params.workItemId, outcome);
    return NextResponse.json({ recorded: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Handoff failed", code: "HANDOFF_FAILED", title: "Handoff failed" }, { status: 400 });
  }
}
