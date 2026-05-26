import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { classifySessionBackupError } from "@/lib/sessionBackupDiagnostics";
import { toSessionRecord } from "@/lib/sessionRecordMapper";
import { readConfig } from "@/lib/server/config";
import { getAntigravityConversation } from "@/lib/server/antigravity";
import { getCodexConversation, getCodexRawContent, validateRootId } from "@/lib/server/codex";
import { getCursorConversation } from "@/lib/server/cursor";
import { getTrajectoryMetaMapCached } from "@/lib/server/metaCache";
import { writeSessionBackupPackage } from "@/lib/server/sessionBackupService";
import { getWindsurfTrajectory } from "@/lib/server/windsurf";
import type { ConversationMeta, Source, TrajectoryContent, TrajectoryEvent, TrajectorySummary } from "@/lib/types";

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

async function loadWindsurfTrajectoryContent(config: Awaited<ReturnType<typeof readConfig>>["config"], sessionId: string): Promise<TrajectoryContent> {
  const allEvents: TrajectoryEvent[] = [];
  let nextOffset = 0;
  let totalSteps: number | undefined;

  while (true) {
    const page = await getWindsurfTrajectory({
      config,
      cascadeId: sessionId,
      stepOffset: nextOffset
    });
    allEvents.push(...page.events);
    totalSteps = page.numTotalSteps;
    nextOffset = page.nextStepOffset;
    if (page.events.length === 0) break;
    if (typeof totalSteps === "number" && nextOffset >= totalSteps) break;
  }

  const summary: TrajectorySummary =
    allEvents.length > 0 || typeof totalSteps === "number"
      ? {
          totalSteps: totalSteps ?? allEvents.length,
          renderedEvents: allEvents.length,
          userCount: allEvents.filter((event) => event.kind === "user").length,
          assistantCount: allEvents.filter((event) => event.kind === "assistant").length,
          thoughtCount: allEvents.filter((event) => event.kind === "thought").length,
          toolCount: allEvents.filter((event) => event.kind === "tool").length,
          commandCount: allEvents.filter((event) => event.kind === "command").length,
          subagentCount: allEvents.filter((event) => event.kind === "subagent").length,
          errorCount: allEvents.filter((event) => event.title === "Error" || event.status?.includes("ERROR") || event.exitCode !== undefined && event.exitCode !== 0).length
        }
      : {
          totalSteps: 0,
          renderedEvents: 0,
          userCount: 0,
          assistantCount: 0,
          thoughtCount: 0,
          toolCount: 0,
          commandCount: 0,
          subagentCount: 0,
          errorCount: 0
        };

  return {
    kind: "trajectory",
    source: "windsurf",
    events: allEvents,
    summary,
    ...(typeof totalSteps === "number" ? { numTotalSteps: totalSteps } : {})
  };
}

function summarizeImportedRecords(records: ReturnType<typeof toSessionRecord>[]) {
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
    const rootId = validateRootId(body.rootId ?? null);
    const metaMap: Record<string, ConversationMeta> = await getTrajectoryMetaMapCached({ source: body.source, config }).catch(
      (): Record<string, ConversationMeta> => ({})
    );
    const meta = metaMap[body.sessionId] ?? {};

    let content: TrajectoryContent;
    let sourceLocator: string;

    if (body.source === "antigravity") {
      const conversation = await getAntigravityConversation(body.sessionId);
      content = {
        kind: "trajectory",
        source: "antigravity",
        markdown: conversation.markdown,
        events: conversation.events,
        summary: conversation.summary
      };
      sourceLocator = `antigravity:cascade/${body.sessionId}`;
    } else if (body.source === "codex") {
      const conversation = await getCodexConversation(body.sessionId, config, { preferredRootId: rootId });
      const raw = await getCodexRawContent(body.sessionId, config, { preferredRootId: rootId });
      content = {
        kind: "trajectory",
        source: "codex",
        events: conversation.events,
        summary: conversation.summary
      };
      sourceLocator = raw.filePath;
    } else if (body.source === "cursor") {
      if (body.includeSourceCopy) {
        return NextResponse.json(
          {
            error: `includeSourceCopy is not implemented for source: ${body.source}`,
            code: "SOURCE_COPY_UNSUPPORTED",
            title: "Source copy unavailable",
            hint: "Cursor currently supports metadata-backed preservation only in v1."
          },
          { status: 501 }
        );
      }
      const cursor = await getCursorConversation(body.sessionId, config);
      content = {
        kind: "trajectory",
        source: "cursor",
        events: cursor.events,
        summary: cursor.summary
      };
      sourceLocator = cursor.locator;
    } else {
      if (body.includeSourceCopy) {
        return NextResponse.json(
          {
            error: `includeSourceCopy is not implemented for source: ${body.source}`,
            code: "SOURCE_COPY_UNSUPPORTED",
            title: "Source copy unavailable",
            hint: "Only Codex currently supports copy-only source preservation in v1."
          },
          { status: 501 }
        );
      }
      content = await loadWindsurfTrajectoryContent(config, body.sessionId);
      sourceLocator = `windsurf:cascade/${body.sessionId}`;
    }

    const record = toSessionRecord({
      sessionId: body.sessionId,
      source: body.source,
      sourceRef: {
        kind: body.source === "codex" ? "file" : body.source === "cursor" ? "sqlite" : "runtime_rpc",
        locator: sourceLocator
      },
      content,
      meta,
      session: {
        ...(rootId ? { rootId } : {})
      }
    });

    const sourceCopies =
      body.includeSourceCopy && body.source === "codex"
        ? [
            {
              sessionId: body.sessionId,
              relativePath: path.basename(sourceLocator),
              content: await fs.readFile(sourceLocator)
            }
          ]
        : undefined;

    const written = await writeSessionBackupPackage({
      records: [record],
      ...(sourceCopies ? { sourceCopies } : {})
    });
    return NextResponse.json({
      backupId: written.manifest.backupId,
      manifest: written.manifest,
      sessions: summarizeImportedRecords(written.records)
    });
  } catch (error) {
    const diagnostic = classifySessionBackupError(error, "BACKUP_CREATE_FAILED");
    return NextResponse.json({
      error: diagnostic.message,
      code: diagnostic.code,
      title: diagnostic.title,
      ...(diagnostic.hint ? { hint: diagnostic.hint } : {})
    }, { status: 502 });
  }
}
