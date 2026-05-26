import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import Database from "better-sqlite3";

import type { AppConfig, ConversationFile, ConversationMeta, SourcesStatus, TrajectoryEvent, TrajectorySummary } from "@/lib/types";
import { expandHome } from "@/lib/server/paths";
import { abbreviateHome, fileUriToPath } from "@/lib/server/trajectoryMeta";

const CURSOR_DEFAULT_USER_ROOT = "~/Library/Application Support/Cursor/User";
const CURSOR_COMPOSER_KEY_PREFIX = "composerData:";
const CURSOR_WORKSPACE_USER_KEY = "src.vs.platform.reactivestorage.browser.reactiveStorageServiceImpl.persistentStorage.workspaceUser";

type CursorComposerHeader = {
  bubbleId?: string;
  type?: number;
  serverBubbleId?: string;
};

type CursorBubble = {
  bubbleId: string;
  type: number; // 1 = user, 2 = assistant
  text: string;
  isThought?: boolean;
  capabilityType?: number;
};

type CursorTodo = {
  text?: string;
  done?: boolean;
  status?: string;
};

type CursorSummaryEnvelope = {
  summary?: {
    summary?: string;
  };
};

type CursorContext = {
  cursorRules?: Array<{ filename?: string; addedWithoutMention?: boolean }>;
  cursorCommands?: Array<{ command?: string }>;
  fileSelections?: Array<{ uri?: { external?: string; path?: string; fsPath?: string } }>;
  folderSelections?: Array<{ uri?: { external?: string; path?: string; fsPath?: string } }>;
  externalLinks?: string[];
};

type CursorComposerRecord = {
  _v?: number;
  composerId: string;
  name?: string;
  subtitle?: string;
  text?: string;
  status?: string;
  createdAt?: number;
  lastUpdatedAt?: number;
  latestConversationSummary?: CursorSummaryEnvelope;
  fullConversationHeadersOnly?: CursorComposerHeader[];
  todos?: CursorTodo[];
  context?: CursorContext;
};

type CursorWorkspaceEntry = {
  workspaceId: string;
  workspacePath?: string;
  userStatePath: string;
};

type CursorComposerListEntry = {
  key: string;
  record: CursorComposerRecord;
  sizeBytes: number;
};

type CursorRootResolution = {
  rootPath: string;
  globalStateDbPath: string;
  workspaceStoragePath: string;
};

function resolveCursorRoot(rootPathInput: string): CursorRootResolution {
  const rootPath = expandHome(rootPathInput);
  if (rootPath.endsWith(`${path.sep}workspaceStorage`)) {
    const userRoot = path.dirname(rootPath);
    return {
      rootPath,
      globalStateDbPath: path.join(userRoot, "globalStorage", "state.vscdb"),
      workspaceStoragePath: rootPath,
    };
  }

  if (rootPath.endsWith(`${path.sep}globalStorage`)) {
    const userRoot = path.dirname(rootPath);
    return {
      rootPath,
      globalStateDbPath: path.join(rootPath, "state.vscdb"),
      workspaceStoragePath: path.join(userRoot, "workspaceStorage"),
    };
  }

  if (rootPath.endsWith("state.vscdb")) {
    const globalStoragePath = path.dirname(rootPath);
    const userRoot = path.dirname(globalStoragePath);
    return {
      rootPath,
      globalStateDbPath: rootPath,
      workspaceStoragePath: path.join(userRoot, "workspaceStorage"),
    };
  }

  return {
    rootPath,
    globalStateDbPath: path.join(rootPath, "globalStorage", "state.vscdb"),
    workspaceStoragePath: path.join(rootPath, "workspaceStorage"),
  };
}

function openReadonlySqlite(dbPath: string): Database.Database {
  return new Database(dbPath, { readonly: true, fileMustExist: true });
}

function normalizeTimestamp(value?: number): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  try {
    return new Date(value).toISOString();
  } catch {
    return undefined;
  }
}

function normalizeCursorComposerRecord(value: unknown): CursorComposerRecord | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.composerId !== "string" || raw.composerId.trim() === "") return null;
  return {
    _v: typeof raw._v === "number" ? raw._v : undefined,
    composerId: raw.composerId,
    name: typeof raw.name === "string" ? raw.name.trim() || undefined : undefined,
    subtitle: typeof raw.subtitle === "string" ? raw.subtitle.trim() || undefined : undefined,
    text: typeof raw.text === "string" ? raw.text : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : undefined,
    lastUpdatedAt: typeof raw.lastUpdatedAt === "number" ? raw.lastUpdatedAt : undefined,
    latestConversationSummary: typeof raw.latestConversationSummary === "object" && raw.latestConversationSummary
      ? (raw.latestConversationSummary as CursorSummaryEnvelope)
      : undefined,
    fullConversationHeadersOnly: Array.isArray(raw.fullConversationHeadersOnly)
      ? raw.fullConversationHeadersOnly as CursorComposerHeader[]
      : undefined,
    todos: Array.isArray(raw.todos) ? raw.todos as CursorTodo[] : undefined,
    context: typeof raw.context === "object" && raw.context ? raw.context as CursorContext : undefined,
  };
}

function readCursorComposerRows(globalStateDbPath: string): CursorComposerListEntry[] {
  let db: Database.Database | null = null;
  try {
    db = openReadonlySqlite(globalStateDbPath);
    const rows = db.prepare(
      "SELECT key, CAST(value AS TEXT) AS value_text, length(value) AS size_bytes FROM cursorDiskKV WHERE key LIKE 'composerData:%'"
    ).all() as Array<{ key: string; value_text: string; size_bytes: number }>;

    return rows
      .map((row) => {
        try {
          const parsed = JSON.parse(row.value_text);
          const record = normalizeCursorComposerRecord(parsed);
          if (!record) return null;
          return {
            key: row.key,
            record,
            sizeBytes: Number(row.size_bytes) || row.value_text.length,
          } satisfies CursorComposerListEntry;
        } catch {
          return null;
        }
      })
      .filter((row): row is CursorComposerListEntry => row !== null);
  } finally {
    db?.close();
  }
}

function readCursorBubbles(dbPath: string, composerId: string, headers: CursorComposerHeader[]): CursorBubble[] {
  if (headers.length === 0) return [];
  let db: Database.Database | null = null;
  try {
    db = openReadonlySqlite(dbPath);
    const bubbles: CursorBubble[] = [];
    for (const header of headers) {
      const bid = header.bubbleId;
      if (!bid) continue;
      const rows = db.prepare(
        "SELECT CAST(value AS TEXT) AS value_text FROM cursorDiskKV WHERE key = ?"
      ).all(`bubbleId:${composerId}:${bid}`) as Array<{ value_text: string }>;
      if (rows.length === 0) continue;
      try {
        const raw = JSON.parse(rows[0].value_text);
        const btype = typeof raw.type === "number" ? raw.type : 0;
        const text = typeof raw.text === "string" ? raw.text.trim() : "";
        const isThought = Boolean(raw.isThought);
        const capabilityType = typeof raw.capabilityType === "number" ? raw.capabilityType : undefined;
        // Skip tool-call infrastructure bubbles (empty assistant turns used for tool dispatch)
        if (btype === 2 && !text && !isThought) continue;
        bubbles.push({ bubbleId: bid, type: btype, text, isThought, capabilityType });
      } catch {
        // skip unparseable bubble
      }
    }
    return bubbles;
  } finally {
    db?.close();
  }
}

async function readWorkspaceEntries(workspaceStoragePath: string): Promise<CursorWorkspaceEntry[]> {
  let dirents: Array<{ name: string; isDirectory(): boolean }> = [];
  try {
    dirents = await fs.readdir(workspaceStoragePath, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: CursorWorkspaceEntry[] = [];
  for (const dirent of dirents) {
    if (!dirent.isDirectory()) continue;
    const workspaceId = dirent.name;
    const workspaceDir = path.join(workspaceStoragePath, workspaceId);
    const workspaceJsonPath = path.join(workspaceDir, "workspace.json");
    let workspacePath: string | undefined;
    try {
      const raw = JSON.parse(await fs.readFile(workspaceJsonPath, "utf-8")) as { folder?: string };
      const filePath = typeof raw.folder === "string" ? fileUriToPath(raw.folder) : null;
      workspacePath = filePath ? abbreviateHome(filePath) : undefined;
    } catch {
      workspacePath = undefined;
    }
    results.push({
      workspaceId,
      workspacePath,
      userStatePath: path.join(workspaceDir, "state.vscdb"),
    });
  }

  return results;
}

function inferWorkspacePathFromContext(context?: CursorContext): string | undefined {
  const fileCandidates = [
    ...(context?.fileSelections ?? []),
    ...(context?.folderSelections ?? []),
  ];
  for (const item of fileCandidates) {
    const uri = item?.uri;
    const p = typeof uri?.external === "string"
      ? fileUriToPath(uri.external)
      : typeof uri?.fsPath === "string"
        ? uri.fsPath
        : typeof uri?.path === "string"
          ? uri.path
          : null;
    if (!p) continue;
    const statPath = p.includes(".") ? path.dirname(p) : p;
    return abbreviateHome(statPath);
  }
  return undefined;
}

function extractSummaryText(record: CursorComposerRecord): string | undefined {
  const raw = record.latestConversationSummary?.summary?.summary?.trim();
  if (!raw) return undefined;

  // Format 1: Cursor AI conversation-context format
  //   "Summary of the conversation so far:\n...\n<previous_user_message>...\n<previous_assistant_message>..."
  // Extract the last assistant message text as the most useful human-readable snippet.
  if (raw.startsWith("Summary of the conversation")) {
    const assistantMatches = [...raw.matchAll(/<previous_assistant_message>([\s\S]*?)<\/previous_assistant_message>/gi)];
    if (assistantMatches.length > 0) {
      return assistantMatches[assistantMatches.length - 1][1].trim();
    }
    // No closed tags — grab everything after the last <previous_assistant_message>
    const lastOpen = raw.lastIndexOf("<previous_assistant_message>");
    if (lastOpen !== -1) {
      return raw.slice(lastOpen + "<previous_assistant_message>".length).trim();
    }
    return undefined;
  }

  // Format 2: <summary>...</summary> wrapper (may be truncated — closing tag absent)
  const withClose = /^<summary>\s*([\s\S]*?)\s*<\/summary>$/i.exec(raw);
  if (withClose) return withClose[1].trim();
  const openOnly = /^<summary>\s*([\s\S]+)/i.exec(raw);
  if (openOnly) return openOnly[1].trim();

  return raw;
}

function buildTitle(record: CursorComposerRecord): string {
  return record.name?.trim() || record.subtitle?.trim() || record.composerId;
}

function buildCursorEvents(
  record: CursorComposerRecord,
  workspacePath: string | undefined,
  bubbles: CursorBubble[]
): TrajectoryEvent[] {
  const createdAt = normalizeTimestamp(record.createdAt);
  const updatedAt = normalizeTimestamp(record.lastUpdatedAt) ?? createdAt;
  const events: TrajectoryEvent[] = [];
  let index = 0;

  if (bubbles.length > 0) {
    // Full transcript from bubble store
    for (const bubble of bubbles) {
      if (!bubble.text) continue;
      const role = bubble.type === 1 ? "user" : "assistant";
      events.push({
        id: `${record.composerId}:bubble:${bubble.bubbleId}`,
        index: index++,
        source: "cursor",
        kind: role,
        stepType: `cursor.${role}`,
        title: role === "user" ? "User" : "Assistant",
        text: bubble.text,
        createdAt,
        completedAt: updatedAt,
        cwd: workspacePath,
      });
    }
  } else {
    // Fallback: summary only
    const summaryText = extractSummaryText(record);
    if (summaryText) {
      events.push({
        id: `${record.composerId}:summary`,
        index: index++,
        source: "cursor",
        kind: "assistant",
        stepType: "cursor.summary",
        title: "Conversation summary",
        text: summaryText,
        createdAt,
        completedAt: updatedAt,
        cwd: workspacePath,
      });
    }
  }

  if (events.length === 0) {
    events.push({
      id: `${record.composerId}:placeholder`,
      index: 0,
      source: "cursor",
      kind: "status",
      stepType: "cursor.placeholder",
      title: buildTitle(record),
      text: "Cursor session metadata is present, but no detailed transcript content was recoverable from the validated local store.",
      createdAt,
      completedAt: updatedAt,
      cwd: workspacePath,
      status: record.status,
    });
  }

  return events;
}

function buildCursorSummary(events: TrajectoryEvent[]): TrajectorySummary {
  return {
    totalSteps: events.length,
    renderedEvents: events.length,
    userCount: events.filter((event) => event.kind === "user").length,
    assistantCount: events.filter((event) => event.kind === "assistant").length,
    thoughtCount: events.filter((event) => event.kind === "thought").length,
    toolCount: events.filter((event) => event.kind === "tool").length,
    commandCount: events.filter((event) => event.kind === "command").length,
    subagentCount: events.filter((event) => event.kind === "subagent").length,
    errorCount: events.filter((event) => event.status?.toUpperCase().includes("ERROR")).length,
  };
}

function buildCursorMarkdown(
  record: CursorComposerRecord,
  workspacePath: string | undefined,
  bubbles: CursorBubble[]
): string {
  const lines: string[] = [];
  lines.push(`# ${buildTitle(record)}`);
  lines.push("");

  const createdAt = normalizeTimestamp(record.createdAt);
  const updatedAt = normalizeTimestamp(record.lastUpdatedAt);
  const context = record.context;
  const metaLines: string[] = [];
  metaLines.push(`- **Source:** Cursor`);
  metaLines.push(`- **Session ID:** ${record.composerId}`);
  metaLines.push(`- **Status:** ${record.status ?? "unknown"}`);
  if (workspacePath) metaLines.push(`- **Workspace:** ${workspacePath}`);
  if (createdAt) metaLines.push(`- **Created:** ${createdAt}`);
  if (updatedAt) metaLines.push(`- **Updated:** ${updatedAt}`);
  if (context) {
    const cursorRules = (context.cursorRules ?? []).map((item) => item.filename).filter((value): value is string => Boolean(value));
    if (cursorRules.length > 0) metaLines.push(`- **Cursor rules:** ${cursorRules.join(", ")}`);
  }
  lines.push("## Session metadata");
  lines.push("");
  lines.push(...metaLines);
  lines.push("");

  if (bubbles.length > 0) {
    lines.push("## Conversation");
    lines.push("");
    for (const bubble of bubbles) {
      if (!bubble.text) continue;
      const label = bubble.type === 1 ? "**User**" : "**Assistant**";
      lines.push(`### ${label}`);
      lines.push("");
      lines.push(bubble.text);
      lines.push("");
    }
  } else {
    const summary = extractSummaryText(record);
    if (summary) {
      lines.push("## Conversation summary");
      lines.push("");
      lines.push(summary);
      lines.push("");
    } else {
      lines.push("> *No conversation content was recoverable from the validated local store.*");
      lines.push("");
    }
  }

  return lines.join("\n");
}

async function buildWorkspacePathByComposerId(workspaceStoragePath: string): Promise<Map<string, string>> {
  const workspaceEntries = await readWorkspaceEntries(workspaceStoragePath);
  const out = new Map<string, string>();

  for (const entry of workspaceEntries) {
    let db: Database.Database | null = null;
    try {
      db = openReadonlySqlite(entry.userStatePath);
      const rows = db.prepare(
        "SELECT CAST(value AS TEXT) AS value_text FROM ItemTable WHERE key = 'composer.composerData'"
      ).all() as Array<{ value_text: string }>;
      for (const row of rows) {
        try {
          const parsed = JSON.parse(row.value_text) as {
            selectedComposerIds?: string[];
            lastFocusedComposerIds?: string[];
            allComposers?: Array<{ composerId?: string }>;
          };
          const ids = [
            ...(Array.isArray(parsed.selectedComposerIds) ? parsed.selectedComposerIds : []),
            ...(Array.isArray(parsed.lastFocusedComposerIds) ? parsed.lastFocusedComposerIds : []),
            // newer Cursor schema stores full list in allComposers
            ...(Array.isArray(parsed.allComposers)
              ? parsed.allComposers.map((c) => (typeof c?.composerId === "string" ? c.composerId : null)).filter((id): id is string => Boolean(id))
              : []),
          ];
          for (const id of ids) {
            if (typeof id === "string" && id && entry.workspacePath && !out.has(id)) {
              out.set(id, entry.workspacePath);
            }
          }
        } catch {
          // ignore malformed workspace row
        }
      }
    } catch {
      // ignore unreadable workspace state db
    } finally {
      db?.close();
    }
  }

  return out;
}

function firstAvailableCursorRoot(config: AppConfig): string {
  const configured = config.roots.find((root) => root.source === "cursor")?.path;
  return configured ?? CURSOR_DEFAULT_USER_ROOT;
}

function hasComposerContent(record: CursorComposerRecord): boolean {
  if (record.name?.trim()) return true;
  if (record.latestConversationSummary) return true;
  if (record.fullConversationHeadersOnly && record.fullConversationHeadersOnly.length > 0) return true;
  return false;
}

export async function listCursorConversationFiles(root: { id: string; path: string; enabled: boolean }): Promise<ConversationFile[]> {
  const resolved = resolveCursorRoot(root.path);
  const entries = readCursorComposerRows(resolved.globalStateDbPath);
  return entries
    .filter((entry) => hasComposerContent(entry.record))
    .map((entry) => ({
      id: entry.record.composerId,
      source: "cursor",
      rootId: root.id,
      path: `${resolved.globalStateDbPath}#${entry.key}`,
      sizeBytes: entry.sizeBytes,
      mtimeMs: entry.record.lastUpdatedAt ?? entry.record.createdAt ?? 0,
    } satisfies ConversationFile));
}

export async function getCursorTrajectoryMetaMap(config: AppConfig): Promise<Record<string, ConversationMeta>> {
  const rootPath = firstAvailableCursorRoot(config);
  const resolved = resolveCursorRoot(rootPath);
  const workspacePathByComposerId = await buildWorkspacePathByComposerId(resolved.workspaceStoragePath);
  const entries = readCursorComposerRows(resolved.globalStateDbPath);
  const out: Record<string, ConversationMeta> = {};

  for (const entry of entries) {
    const record = entry.record;
    const inferredWorkspace = workspacePathByComposerId.get(record.composerId) ?? inferWorkspacePathFromContext(record.context);
    out[record.composerId] = {
      title: buildTitle(record),
      ...(inferredWorkspace ? { cwd: inferredWorkspace } : {}),
    };
  }

  return out;
}

export async function getCursorConversation(id: string, config: AppConfig): Promise<{
  markdown: string;
  events: TrajectoryEvent[];
  summary: TrajectorySummary;
  locator: string;
  workspacePath?: string;
}> {
  const rootPath = firstAvailableCursorRoot(config);
  const resolved = resolveCursorRoot(rootPath);
  const workspacePathByComposerId = await buildWorkspacePathByComposerId(resolved.workspaceStoragePath);
  const entries = readCursorComposerRows(resolved.globalStateDbPath);
  const match = entries.find((entry) => entry.record.composerId === id);
  if (!match) {
    throw new Error(`Cursor session not found: ${id}. The session may have been deleted or the configured Cursor root is incomplete.`);
  }

  const workspacePath = workspacePathByComposerId.get(id) ?? inferWorkspacePathFromContext(match.record.context);
  const bubbles = readCursorBubbles(
    resolved.globalStateDbPath,
    match.record.composerId,
    match.record.fullConversationHeadersOnly ?? []
  );
  const events = buildCursorEvents(match.record, workspacePath, bubbles);
  return {
    markdown: buildCursorMarkdown(match.record, workspacePath, bubbles),
    events,
    summary: buildCursorSummary(events),
    locator: `${resolved.globalStateDbPath}#${match.key}`,
    ...(workspacePath ? { workspacePath } : {}),
  };
}

export async function getCursorRawContent(id: string, config: AppConfig): Promise<{
  dbPath: string;
  key: string;
  workspacePath?: string;
  record: CursorComposerRecord;
}> {
  const rootPath = firstAvailableCursorRoot(config);
  const resolved = resolveCursorRoot(rootPath);
  const workspacePathByComposerId = await buildWorkspacePathByComposerId(resolved.workspaceStoragePath);
  const entries = readCursorComposerRows(resolved.globalStateDbPath);
  const match = entries.find((entry) => entry.record.composerId === id);
  if (!match) throw new Error(`Cursor session not found: ${id}`);

  const workspacePath = workspacePathByComposerId.get(id) ?? inferWorkspacePathFromContext(match.record.context);
  return {
    dbPath: resolved.globalStateDbPath,
    key: match.key,
    ...(workspacePath ? { workspacePath } : {}),
    record: match.record,
  };
}

export async function getCursorStatus(config: AppConfig): Promise<SourcesStatus["cursor"]> {
  const cursorRoots = config.roots.filter((root) => root.source === "cursor");
  const enabledRoots = cursorRoots.filter((root) => root.enabled);
  if (enabledRoots.length === 0) {
    return {
      sessionsFound: false,
      error: cursorRoots.length === 0
        ? "No Cursor roots configured. Add a root pointing to ~/Library/Application Support/Cursor/User in Settings."
        : "No Cursor roots are enabled. Enable a Cursor root in Settings.",
      recommendedAction: "Configure and enable a Cursor root in Settings.",
    };
  }

  let lastError: string | undefined;
  for (const root of enabledRoots) {
    const resolved = resolveCursorRoot(root.path);
    try {
      await fs.stat(resolved.globalStateDbPath);
      const entries = readCursorComposerRows(resolved.globalStateDbPath);
      if (entries.length > 0) {
        return {
          sessionsFound: true,
          storagePath: resolved.globalStateDbPath,
          sessionCount: entries.length,
        };
      }
      lastError = `No Cursor composer sessions found in ${resolved.globalStateDbPath}. Open Cursor composer/agent chats to create local session state.`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    sessionsFound: false,
    storagePath: enabledRoots[0] ? resolveCursorRoot(enabledRoots[0].path).globalStateDbPath : undefined,
    error: lastError,
    recommendedAction: "Open Cursor and start or revisit a composer/agent chat so local session state is written, then refresh.",
  };
}
