import { NextResponse } from "next/server";

import { readConfig, writeConfig } from "@/lib/server/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { path, config } = await readConfig();
  return NextResponse.json({ path, config });
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  const { path, config } = await writeConfig(body?.config ?? body);
  return NextResponse.json({ path, config });
}
