import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import { getAntigravityConversation } from "@/lib/server/antigravity";
import { getCodexConversation, getCodexRawContent, validateRootId } from "@/lib/server/codex";
import { getCursorConversation } from "@/lib/server/cursor";
import { getTrajectoryMetaMapCached } from "@/lib/server/metaCache";
import { getWindsurfTrajectory } from "@/lib/server/windsurf";
import { toSessionRecord } from "@/lib/sessionRecordMapper";
import type { SessionRecord } from "@/lib/sessionRecord";
import type {
  AppConfig,
  ConversationMeta,
  Source,
  TrajectoryContent,
  TrajectoryEvent,
  TrajectorySummary
} from "@/lib/types";

/** Error thrown when a caller requests a source copy that the provider cannot produce. */
export class SessionSourceCopyUnsupportedError extends Error {
  readonly code = "SOURCE_COPY_UNSUPPORTED" as const;

  constructor(readonly source: Source) {
    super(`includeSourceCopy is not implemented for source: ${source}`);
    this.name = "SessionSourceCopyUnsupportedError";
  }
}

export type SessionSourceCopy = {
  sessionId: string;
  relativePath: string;
  content: Buffer;
};

export type LoadedSessionRecord = {
  record: SessionRecord;
  sourceCopies?: SessionSourceCopy[];
};

export type LoadSessionRecordInput = {
  config: AppConfig;
  source: Source;
  sessionId: string;
  rootId?: string | null;
  includeSourceCopy?: boolean;
};

function emptySummary(): TrajectorySummary {
  return {
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
}

async function loadWindsurfTrajectoryContent(config: AppConfig, sessionId: string): Promise<TrajectoryContent> {
  const allEvents: TrajectoryEvent[] = [];
  let nextOffset = 0;
  let totalSteps: number | undefined;

  // The runtime RPC is paged. Keep the same bounded behavior as the session
  // backup route and stop on an empty page or when the reported total is met.
  while (true) {
    const page = await getWindsurfTrajectory({ config, cascadeId: sessionId, stepOffset: nextOffset });
    allEvents.push(...page.events);
    totalSteps = page.numTotalSteps;
    nextOffset = page.nextStepOffset;
    if (page.events.length === 0) break;
    if (typeof totalSteps === "number" && nextOffset >= totalSteps) break;
  }

  const summary: TrajectorySummary = allEvents.length > 0 || typeof totalSteps === "number"
    ? {
        totalSteps: totalSteps ?? allEvents.length,
        renderedEvents: allEvents.length,
        userCount: allEvents.filter((event) => event.kind === "user").length,
        assistantCount: allEvents.filter((event) => event.kind === "assistant").length,
        thoughtCount: allEvents.filter((event) => event.kind === "thought").length,
        toolCount: allEvents.filter((event) => event.kind === "tool").length,
        commandCount: allEvents.filter((event) => event.kind === "command").length,
        subagentCount: allEvents.filter((event) => event.kind === "subagent").length,
        errorCount: allEvents.filter((event) =>
          event.title === "Error" || event.status?.includes("ERROR") || (event.exitCode !== undefined && event.exitCode !== 0)
        ).length
      }
    : emptySummary();

  return {
    kind: "trajectory",
    source: "windsurf",
    events: allEvents,
    summary,
    ...(typeof totalSteps === "number" ? { numTotalSteps: totalSteps } : {})
  };
}

function unsupportedCopyHint(source: Source): string {
  return source === "cursor"
    ? "Cursor currently supports metadata-backed preservation only in v1."
    : "Only Codex currently supports copy-only source preservation in v1.";
}

function assertConfiguredRoot(config: AppConfig, source: Source, rootId: string | undefined): void {
  if (!rootId || config.roots.length === 0) return;
  const root = config.roots.find((candidate) => candidate.id === rootId && candidate.source === source);
  if (!root) throw new Error(`Configured ${source} root not found: ${rootId}`);
  if (!root.enabled) throw new Error(`Configured ${source} root is disabled: ${rootId}`);
}

/**
 * Load one live provider session and normalize it to the portable
 * session-record/v1 representation. This function has no persistence side
 * effects; callers decide whether to write a backup or Work Item snapshot.
 */
export async function loadSessionRecord(input: LoadSessionRecordInput): Promise<LoadedSessionRecord> {
  if (!input.sessionId || typeof input.sessionId !== "string") {
    throw new Error("A valid sessionId is required.");
  }

  const rootId = validateRootId(input.rootId ?? null);
  assertConfiguredRoot(input.config, input.source, rootId);
  const metaMap: Record<string, ConversationMeta> = await getTrajectoryMetaMapCached({
    source: input.source,
    config: input.config
  }).catch(() => ({}));
  const meta = metaMap[input.sessionId] ?? {};

  let content: TrajectoryContent;
  let sourceLocator: string;
  let sourceRefKind: "file" | "sqlite" | "runtime_rpc";
  let sessionRootId = rootId;
  let cwd = meta.cwd;

  if (input.source === "antigravity") {
    if (input.includeSourceCopy) throw new SessionSourceCopyUnsupportedError(input.source);
    const conversation = await getAntigravityConversation(input.sessionId);
    content = {
      kind: "trajectory",
      source: "antigravity",
      markdown: conversation.markdown,
      events: conversation.events,
      summary: conversation.summary
    };
    sourceLocator = `antigravity:cascade/${input.sessionId}`;
    sourceRefKind = "runtime_rpc";
  } else if (input.source === "codex") {
    const conversation = await getCodexConversation(input.sessionId, input.config, { preferredRootId: rootId });
    const raw = await getCodexRawContent(input.sessionId, input.config, { preferredRootId: rootId });
    content = {
      kind: "trajectory",
      source: "codex",
      events: conversation.events,
      summary: conversation.summary
    };
    sourceLocator = raw.filePath;
    sourceRefKind = "file";
    sessionRootId = conversation.rootId ?? rootId;
  } else if (input.source === "cursor") {
    if (input.includeSourceCopy) throw new SessionSourceCopyUnsupportedError(input.source);
    const cursor = await getCursorConversation(input.sessionId, input.config);
    content = {
      kind: "trajectory",
      source: "cursor",
      events: cursor.events,
      summary: cursor.summary
    };
    sourceLocator = cursor.locator;
    sourceRefKind = "sqlite";
    cwd = cursor.workspacePath ?? cwd;
  } else {
    if (input.includeSourceCopy) throw new SessionSourceCopyUnsupportedError(input.source);
    content = await loadWindsurfTrajectoryContent(input.config, input.sessionId);
    sourceLocator = `windsurf:cascade/${input.sessionId}`;
    sourceRefKind = "runtime_rpc";
  }

  const record = toSessionRecord({
    sessionId: input.sessionId,
    source: input.source,
    sourceRef: {
      kind: sourceRefKind,
      locator: sourceLocator
    },
    content,
    meta: {
      ...meta,
      ...(cwd ? { cwd } : {})
    },
    session: {
      ...(sessionRootId ? { rootId: sessionRootId } : {})
    }
  });

  if (input.includeSourceCopy && input.source === "codex") {
    const sourcePath = path.resolve(sourceLocator);
    return {
      record,
      sourceCopies: [{
        sessionId: input.sessionId,
        relativePath: path.basename(sourcePath),
        content: await fs.readFile(sourcePath)
      }]
    };
  }

  return { record };
}

export function isSessionSourceCopyUnsupportedError(error: unknown): error is SessionSourceCopyUnsupportedError {
  return error instanceof SessionSourceCopyUnsupportedError
    || (Boolean(error) && typeof error === "object" && (error as { code?: unknown }).code === "SOURCE_COPY_UNSUPPORTED");
}

export function sessionSourceCopyUnsupportedHint(source: Source): string {
  return unsupportedCopyHint(source);
}

// Descriptive aliases keep the loader reusable from backup and Work Item
// callers without coupling either caller to a provider-specific name.
export const loadSessionRecordForBackup = loadSessionRecord;
export const loadSessionRecordForSession = loadSessionRecord;
