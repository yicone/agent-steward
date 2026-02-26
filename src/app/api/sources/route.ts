import { NextResponse } from "next/server";

import type { SourcesStatus } from "@/lib/types";
import { readConfig } from "@/lib/server/config";
import { getAntigravityStatus } from "@/lib/server/antigravity";
import { getWindsurfStatus } from "@/lib/server/windsurf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { config } = await readConfig();

  let antigravity: SourcesStatus["antigravity"];
  try {
    antigravity = await getAntigravityStatus();
  } catch (e) {
    antigravity = { discovered: false, error: e instanceof Error ? e.message : String(e) };
  }

  let windsurf: SourcesStatus["windsurf"];
  try {
    windsurf = await getWindsurfStatus(config);
  } catch (e) {
    windsurf = { attached: false, error: e instanceof Error ? e.message : String(e) };
  }

  const status: SourcesStatus = { antigravity, windsurf };
  return NextResponse.json(status);
}
