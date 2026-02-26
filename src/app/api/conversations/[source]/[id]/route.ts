import { NextResponse } from "next/server";

import type { ConversationContent, Source } from "@/lib/types";
import { readConfig } from "@/lib/server/config";
import { getAntigravityMarkdown } from "@/lib/server/antigravity";
import { getWindsurfChat } from "@/lib/server/windsurf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSource(value: string): value is Source {
  return value === "antigravity" || value === "windsurf";
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

  try {
    if (source === "antigravity") {
      const markdown = await getAntigravityMarkdown(id);
      const out: ConversationContent = { kind: "markdown", markdown };
      return NextResponse.json(out);
    }

    const stepOffset = Math.max(Number(url.searchParams.get("stepOffset") ?? "0"), 0);
    const { config } = await readConfig();
    const chat = await getWindsurfChat({ config, cascadeId: id, stepOffset });
    const out: ConversationContent = {
      kind: "chat",
      messages: chat.messages,
      stepOffset: chat.nextStepOffset,
      numTotalSteps: chat.numTotalSteps
    };
    return NextResponse.json(out);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
