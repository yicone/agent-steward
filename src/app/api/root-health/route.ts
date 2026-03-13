import { NextResponse } from "next/server";

import { readConfig } from "@/lib/server/config";
import { probeAllRootsHealth } from "@/lib/server/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { config } = await readConfig();
  const health = await probeAllRootsHealth(config.roots);
  return NextResponse.json({ roots: health });
}
