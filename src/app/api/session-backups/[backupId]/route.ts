import { NextResponse } from "next/server";

import { classifySessionBackupError } from "@/lib/sessionBackupDiagnostics";
import { readSessionBackupPackage } from "@/lib/server/sessionBackupService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: { backupId: string } }) {
  const { backupId } = ctx.params;
  if (!backupId || typeof backupId !== "string") {
    return NextResponse.json({
      error: "Missing/invalid backupId",
      code: "INVALID_REQUEST",
      title: "Invalid request",
      hint: "Choose a backup ID from the managed backup store before verifying."
    }, { status: 400 });
  }

  try {
    const pkg = await readSessionBackupPackage(backupId);
    return NextResponse.json({
      backupId: pkg.manifest.backupId,
      verified: true,
      manifest: pkg.manifest,
      sessions: pkg.records.map((record) => ({
        sessionId: record.session.id,
        source: record.session.source,
        title: record.session.title,
        cwd: record.session.cwd,
        eventCount: record.events.length
      }))
    });
  } catch (error) {
    const diagnostic = classifySessionBackupError(error, "BACKUP_VERIFY_FAILED");
    return NextResponse.json({
      error: diagnostic.message,
      code: diagnostic.code,
      title: diagnostic.title,
      ...(diagnostic.hint ? { hint: diagnostic.hint } : {}),
      verified: false
    }, { status: diagnostic.code === "BACKUP_NOT_FOUND" ? 404 : 400 });
  }
}
