import { NextResponse } from "next/server";

import { classifySessionBackupError } from "@/lib/sessionBackupDiagnostics";
import { readConfig } from "@/lib/server/config";
import {
  isSessionSourceCopyUnsupportedError,
  loadSessionRecord,
  sessionSourceCopyUnsupportedHint
} from "@/lib/server/sessionRecordLoader";
import { writeSessionBackupPackage } from "@/lib/server/sessionBackupService";
import type { SessionRecord } from "@/lib/sessionRecord";
import type { Source } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateSessionBackupBody = {
  source?: Source;
  sessionId?: string;
  rootId?: string;
  includeSourceCopy?: boolean;
};

function isSource(value: unknown): value is Source {
  return value === "antigravity" || value === "windsurf" || value === "codex" || value === "cursor";
}

function summarizeImportedRecords(records: SessionRecord[]) {
  return records.map((record) => ({
    sessionId: record.session.id,
    source: record.session.source,
    title: record.session.title,
    cwd: record.session.cwd,
    eventCount: record.events.length
  }));
}

export async function POST(req: Request) {
  let body: CreateSessionBackupBody;
  try {
    body = (await req.json()) as CreateSessionBackupBody;
  } catch {
    return NextResponse.json({
      error: "Invalid JSON body",
      code: "INVALID_REQUEST",
      title: "Invalid request",
      hint: "Send a JSON body with source and sessionId."
    }, { status: 400 });
  }

  if (!isSource(body.source) || !body.sessionId || typeof body.sessionId !== "string") {
    return NextResponse.json({
      error: "Missing/invalid source or sessionId",
      code: "INVALID_REQUEST",
      title: "Invalid request",
      hint: "Choose a supported source and a valid session ID before creating a backup."
    }, { status: 400 });
  }

  try {
    const { config } = await readConfig();
    const loaded = await loadSessionRecord({
      config,
      source: body.source,
      sessionId: body.sessionId,
      rootId: body.rootId,
      includeSourceCopy: body.includeSourceCopy
    });

    const written = await writeSessionBackupPackage({
      records: [loaded.record],
      ...(loaded.sourceCopies ? { sourceCopies: loaded.sourceCopies } : {})
    });
    return NextResponse.json({
      backupId: written.manifest.backupId,
      manifest: written.manifest,
      sessions: summarizeImportedRecords(written.records)
    });
  } catch (error) {
    if (isSessionSourceCopyUnsupportedError(error) && body.source) {
      return NextResponse.json(
        {
          error: `includeSourceCopy is not implemented for source: ${body.source}`,
          code: "SOURCE_COPY_UNSUPPORTED",
          title: "Source copy unavailable",
          hint: sessionSourceCopyUnsupportedHint(body.source)
        },
        { status: 501 }
      );
    }
    const diagnostic = classifySessionBackupError(error, "BACKUP_CREATE_FAILED");
    return NextResponse.json({
      error: diagnostic.message,
      code: diagnostic.code,
      title: diagnostic.title,
      ...(diagnostic.hint ? { hint: diagnostic.hint } : {})
    }, { status: 502 });
  }
}
