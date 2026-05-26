import { NextResponse } from "next/server";

import type { Source } from "@/lib/types";
import { searchSessions } from "@/lib/server/searchIndex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSource(value: string | null): value is Source {
  return value === "antigravity" || value === "windsurf" || value === "codex" || value === "cursor";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const sourceParam = url.searchParams.get("source");
  const limitNum = Number(url.searchParams.get("limit") ?? "20");
  const limit = Number.isNaN(limitNum) ? 20 : Math.min(Math.max(limitNum, 1), 100);

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    let results = searchSessions(q, limit);
    if (sourceParam && isSource(sourceParam)) {
      results = results.filter((r) => r.source === sourceParam);
    }
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Search failed: ${message}` }, { status: 500 });
  }
}
