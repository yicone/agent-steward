import { NextResponse } from "next/server";

import type { Source } from "@/lib/types";
import { readConfig } from "@/lib/server/config";
import { buildDiagnosticExport } from "@/lib/server/diagnosticExport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSource(value: string): value is Source {
  return value === "antigravity" || value === "windsurf" || value === "codex";
}

function safeFilename(value: string): string {
  return value.replaceAll(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180);
}

export async function GET(req: Request, ctx: { params: { source: string; id: string } }) {
  const { source, id } = ctx.params;
  if (!isSource(source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const url = new URL(req.url);
  const rootId = url.searchParams.get("rootId") ?? undefined;
  const allSteps = url.searchParams.get("allSteps");
  const maxStepsParam = url.searchParams.get("maxSteps");
  const maxSteps = maxStepsParam ? Number(maxStepsParam) : undefined;

  try {
    const { config } = await readConfig();
    const payload = await buildDiagnosticExport({
      source,
      cascadeId: id,
      rootId,
      config,
      windsurf: {
        allSteps: allSteps === null ? undefined : allSteps !== "0" && allSteps !== "false",
        maxSteps: typeof maxSteps === "number" && Number.isFinite(maxSteps) ? maxSteps : undefined
      }
    });

    const ts = payload.generatedAt.replaceAll(/[:.]/g, "-");
    const filename = safeFilename(`diagnostic_${source}_${id}_${ts}.json`);

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
