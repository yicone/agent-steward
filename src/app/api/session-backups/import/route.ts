import { NextResponse } from "next/server";

import { classifySessionBackupError } from "@/lib/sessionBackupDiagnostics";
import { importSessionBackupPackage } from "@/lib/server/sessionBackupService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImportSessionBackupBody = {
  backupId?: string;
};

export async function POST(req: Request) {
  let body: ImportSessionBackupBody;
  try {
    body = (await req.json()) as ImportSessionBackupBody;
  } catch {
    return NextResponse.json({
      error: "Invalid JSON body",
      code: "INVALID_REQUEST",
      title: "Invalid request",
      hint: "Send a JSON body with backupId."
    }, { status: 400 });
  }

  if (!body.backupId || typeof body.backupId !== "string") {
    return NextResponse.json({
      error: "Missing/invalid backupId",
      code: "INVALID_REQUEST",
      title: "Invalid request",
      hint: "Choose a backup ID from the managed backup store before importing."
    }, { status: 400 });
  }

  try {
    const imported = await importSessionBackupPackage(body.backupId);
    return NextResponse.json({
      backupId: imported.manifest.backupId,
      importedAt: imported.importedAt,
      manifest: imported.manifest,
      sessions: imported.records.map((record) => ({
        sessionId: record.session.id,
        source: record.session.source,
        title: record.session.title,
        cwd: record.session.cwd,
        eventCount: record.events.length
      }))
    });
  } catch (error) {
    const diagnostic = classifySessionBackupError(error, "BACKUP_IMPORT_FAILED");
    return NextResponse.json({
      error: diagnostic.message,
      code: diagnostic.code,
      title: diagnostic.title,
      ...(diagnostic.hint ? { hint: diagnostic.hint } : {})
    }, { status: diagnostic.code === "BACKUP_NOT_FOUND" ? 404 : 400 });
  }
}
