import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import {
  WORK_ITEM_SCHEMA_VERSION,
  assertValidWorkItemTransition,
  validateWorkItem,
  validateWorkItemId,
  type HandoffHistoryEntry,
  type SessionEvidenceSnapshot,
  type WorkSessionReference,
  type WorkItem,
} from "@/lib/workContinuity";
import { validateSessionRecord } from "@/lib/sessionBackup";
import type { SessionRecord } from "@/lib/sessionRecord";
import {
  getWorkItemRoot,
  getWorkItemsRoot,
} from "@/lib/server/paths";

const WORK_ITEM_FILE = "work-item.json";
const SESSION_EVIDENCE_FILE = "session-evidence.json";
const HANDOFFS_FILE = "handoffs.jsonl";
export const DEFAULT_SESSION_EVIDENCE_MAX_BYTES = 128 * 1024;

function resolvePathWithin(baseDir: string, relativePath: string): string {
  if (path.isAbsolute(relativePath)) throw new Error(`Work Item path must be relative: ${relativePath}`);
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, relativePath);
  const relative = path.relative(resolvedBase, resolvedTarget);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Work Item path escapes managed root: ${relativePath}`);
  }
  return resolvedTarget;
}

export function getWorkItemRootPath(): string {
  return getWorkItemsRoot();
}

export function getWorkItemDirPath(workItemId: string): string {
  validateWorkItemId(workItemId);
  return path.join(getWorkItemRootPath(), workItemId);
}

export const getWorkItemDir = getWorkItemDirPath;

export function getWorkItemPath(workItemId: string): string {
  return path.join(getWorkItemDirPath(workItemId), WORK_ITEM_FILE);
}

export const getWorkItemFilePath = getWorkItemPath;

export function getWorkItemEvidencePath(workItemId: string): string {
  return path.join(getWorkItemDirPath(workItemId), SESSION_EVIDENCE_FILE);
}

export function getWorkItemHandoffsPath(workItemId: string): string {
  return path.join(getWorkItemDirPath(workItemId), HANDOFFS_FILE);
}

async function writeAtomic(target: string, content: string | Buffer): Promise<void> {
  const directory = path.dirname(target);
  await fs.mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`);
  try {
    await fs.writeFile(temporary, content, { mode: 0o600 });
    await fs.rename(temporary, target);
  } finally {
    await fs.rm(temporary, { force: true }).catch(() => undefined);
  }
}

export async function ensureWorkItemRoot(): Promise<string> {
  const root = getWorkItemRootPath();
  await fs.mkdir(root, { recursive: true, mode: 0o700 });
  return root;
}

export async function ensureWorkItemDir(workItemId: string): Promise<string> {
  const directory = getWorkItemDirPath(workItemId);
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  return directory;
}

function parseJsonObject(raw: string, label: string): Record<string, unknown> {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch (error) {
    throw new Error(`Invalid ${label} JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`${label} must be a JSON object`);
  return parsed as Record<string, unknown>;
}

function toIso(value: string | undefined): string {
  return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : new Date().toISOString();
}

/**
 * Keep only bounded, normalized evidence. This is intentionally not a raw
 * provider source copy and can be used when the source later disappears.
 */
export function createSessionEvidenceSnapshot(
  record: SessionRecord,
  maxBytes = DEFAULT_SESSION_EVIDENCE_MAX_BYTES
): SessionEvidenceSnapshot {
  validateSessionRecord(record);
  if (!Number.isFinite(maxBytes) || maxBytes < 1024) throw new Error("maxBytes must be at least 1024");

  const identity = { ...record.session } as Record<string, unknown>;
  const sourceRef = { ...record.sourceRef };
  const summary = { ...record.summary } as Record<string, unknown>;
  const events = record.events.map((event) => {
    const compact: Record<string, unknown> = {
      id: event.id,
      index: event.index,
      source: event.source,
      kind: event.kind,
      stepType: event.stepType,
      title: event.title,
    };
    for (const key of ["executionId", "status", "text", "createdAt", "completedAt", "commandLine", "cwd", "exitCode", "output", "outputTruncated", "toolCalls", "subagent"]) {
      const value = (event as unknown as Record<string, unknown>)[key];
      if (value !== undefined) compact[key] = value;
    }
    return compact;
  });

  const snapshot: SessionEvidenceSnapshot = {
    schemaVersion: "session-record/v1",
    sessionId: record.session.id,
    source: record.session.source,
    sourceRef,
    capturedAt: toIso(record.timestamps.capturedAt),
    identity,
    summary,
    events,
    originalEventCount: events.length,
    truncated: false,
  };

  const bytes = () => Buffer.byteLength(JSON.stringify(snapshot), "utf8");
  while (events.length > 0 && bytes() > maxBytes) {
    events.pop();
    snapshot.truncated = true;
  }
  // An individual provider event can contain a very large tool payload. Once
  // all events are removed, retain only the stable session identity so the
  // evidence cache always honours its byte bound.
  if (bytes() > maxBytes) {
    snapshot.truncated = true;
    snapshot.events = [];
    snapshot.identity = { id: record.session.id, source: record.session.source };
    snapshot.summary = { totalSteps: record.summary.totalSteps, renderedEvents: record.summary.renderedEvents };
    delete snapshot.sourceRef;
  }
  snapshot.originalEventCount = record.events.length;
  snapshot.byteLength = bytes();
  return snapshot;
}

export async function writeSessionEvidenceSnapshot(
  workItemId: string,
  record: SessionRecord,
  maxBytes = DEFAULT_SESSION_EVIDENCE_MAX_BYTES
): Promise<SessionEvidenceSnapshot> {
  const snapshot = createSessionEvidenceSnapshot(record, maxBytes);
  await ensureWorkItemDir(workItemId);
  await writeAtomic(getWorkItemEvidencePath(workItemId), JSON.stringify(snapshot, null, 2));
  return snapshot;
}

function sessionEvidenceFileName(source: string, sessionId: string): string {
  const token = `${source}-${sessionId}`.replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 120);
  return `session-evidence-${token || "session"}.json`;
}

/** Attach one additional bounded session without replacing the Work Item's existing evidence. */
export async function attachSessionRecord(
  workItemId: string,
  session: WorkSessionReference,
  record: SessionRecord,
  maxEvidenceBytes = DEFAULT_SESSION_EVIDENCE_MAX_BYTES,
): Promise<WorkItem> {
  validateWorkItemId(workItemId);
  const current = await readWorkItem(workItemId);
  const existing = current.sessions ?? [];
  if (existing.some((item) => item.source === session.source && item.sessionId === session.sessionId)) {
    throw new Error(`Session is already attached: ${session.source}/${session.sessionId}`);
  }
  const snapshot = createSessionEvidenceSnapshot(record, maxEvidenceBytes);
  await ensureWorkItemDir(workItemId);
  await writeAtomic(path.join(getWorkItemDirPath(workItemId), sessionEvidenceFileName(session.source, session.sessionId)), JSON.stringify(snapshot, null, 2));
  const evidence = current.evidence ?? [];
  const evidenceId = `evidence-session-${session.source}-${session.sessionId}`.replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 120);
  const next: WorkItem = {
    ...current,
    sessions: [...existing, session],
    evidence: evidence.some((item) => item.id === evidenceId)
      ? evidence
      : [...evidence, { id: evidenceId, kind: "session", source: session.source, locator: session.locator ?? `${session.source}:${session.sessionId}`, embedded: false, confidence: session.confidence, observedAt: session.attachedAt }],
    sessionEvidence: current.sessionEvidence ?? snapshot,
    sessionEvidenceSnapshots: [...(current.sessionEvidenceSnapshots ?? (current.sessionEvidence ? [current.sessionEvidence] : [])), snapshot].slice(-8),
    version: (current.version ?? 1) + 1,
    updatedAt: new Date().toISOString(),
  };
  validateWorkItem(next);
  await writeAtomic(getWorkItemPath(workItemId), JSON.stringify(next, null, 2));
  return next;
}

export async function readSessionEvidenceSnapshot(workItemId: string): Promise<SessionEvidenceSnapshot | null> {
  validateWorkItemId(workItemId);
  try {
    const parsed = parseJsonObject(await fs.readFile(getWorkItemEvidencePath(workItemId), "utf8"), "session evidence");
    if (parsed.schemaVersion !== "session-record/v1") throw new Error(`Unsupported session evidence schema version: ${String(parsed.schemaVersion)}`);
    return parsed as unknown as SessionEvidenceSnapshot;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    throw error;
  }
}

export async function createWorkItem(workItem: WorkItem, options?: { sessionRecord?: SessionRecord; maxEvidenceBytes?: number }): Promise<WorkItem> {
  validateWorkItem(workItem);
  await ensureWorkItemRoot();
  const target = getWorkItemPath(workItem.id);
  try { await fs.access(target); throw new Error(`Work Item already exists: ${workItem.id}`); } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
  }
  const normalized: WorkItem = { ...workItem, version: workItem.version ?? 1, updatedAt: toIso(workItem.updatedAt), createdAt: toIso(workItem.createdAt) };
  await ensureWorkItemDir(normalized.id);
  if (options?.sessionRecord) {
    const snapshot = await writeSessionEvidenceSnapshot(normalized.id, options.sessionRecord, options.maxEvidenceBytes);
    normalized.sessionEvidence = snapshot;
    normalized.sessionEvidenceSnapshots = [snapshot];
    normalized.evidence = normalized.evidence?.some((item) => item.kind === "session")
      ? normalized.evidence
      : [...(normalized.evidence ?? []), { id: `evidence-session-${options.sessionRecord.session.source}-${options.sessionRecord.session.id}`, kind: "session", source: options.sessionRecord.session.source, locator: options.sessionRecord.sourceRef.locator, embedded: false, confidence: "observed", observedAt: snapshot.capturedAt }];
    normalized.sessions = normalized.sessions ?? [{ id: `session-${options.sessionRecord.session.source}-${options.sessionRecord.session.id}`, source: options.sessionRecord.session.source, sessionId: options.sessionRecord.session.id, rootId: options.sessionRecord.session.rootId, locator: options.sessionRecord.sourceRef.locator, title: options.sessionRecord.session.title, attachedAt: snapshot.capturedAt, confidence: "observed" }];
  }
  await writeAtomic(target, JSON.stringify(normalized, null, 2));
  return normalized;
}

export const saveWorkItem = createWorkItem;

export async function readWorkItem(workItemId: string): Promise<WorkItem> {
  const parsed = parseJsonObject(await fs.readFile(getWorkItemPath(workItemId), "utf8"), "Work Item");
  if (parsed.schemaVersion !== WORK_ITEM_SCHEMA_VERSION) throw new Error(`Unsupported Work Item schema version: ${String(parsed.schemaVersion)}`);
  validateWorkItem(parsed as unknown as WorkItem);
  return parsed as unknown as WorkItem;
}

export const loadWorkItem = readWorkItem;

export type WorkItemUpdateOptions = {
  expectedVersion?: number;
  expectedUpdatedAt?: string;
  sessionRecord?: SessionRecord;
  maxEvidenceBytes?: number;
};

export async function updateWorkItem(workItemId: string, patch: Partial<WorkItem>, options: WorkItemUpdateOptions = {}): Promise<WorkItem> {
  validateWorkItemId(workItemId);
  const current = await readWorkItem(workItemId);
  if (options.expectedVersion !== undefined && current.version !== options.expectedVersion) throw new Error("Work Item version conflict");
  if (options.expectedUpdatedAt !== undefined && current.updatedAt !== options.expectedUpdatedAt) throw new Error("Work Item updatedAt conflict");
  const next = { ...current, ...patch, id: current.id, schemaVersion: WORK_ITEM_SCHEMA_VERSION, version: (current.version ?? 1) + 1, updatedAt: new Date().toISOString() } as WorkItem;
  if (patch.status && patch.status !== current.status) assertValidWorkItemTransition(current.status, patch.status);
  validateWorkItem(next);
  if (options.sessionRecord) {
    next.sessionEvidence = await writeSessionEvidenceSnapshot(workItemId, options.sessionRecord, options.maxEvidenceBytes);
  }
  await writeAtomic(getWorkItemPath(workItemId), JSON.stringify(next, null, 2));
  return next;
}

export async function listWorkItems(): Promise<WorkItem[]> {
  let entries;
  try { entries = await fs.readdir(getWorkItemRootPath(), { withFileTypes: true }); } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return [];
    throw error;
  }
  const results: WorkItem[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !isSafeDirectoryName(entry.name)) continue;
    try { results.push(await readWorkItem(entry.name)); } catch { /* corrupt/unknown entries do not poison the list */ }
  }
  return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function isSafeDirectoryName(value: string): boolean {
  try { validateWorkItemId(value); return true; } catch { return false; }
}

export async function appendHandoffOutcome(workItemId: string, outcome: HandoffHistoryEntry): Promise<void> {
  validateWorkItemId(workItemId);
  if (!outcome.id || !outcome.outcome) throw new Error("Handoff outcome requires id and outcome");
  await ensureWorkItemDir(workItemId);
  const target = resolvePathWithin(getWorkItemDirPath(workItemId), HANDOFFS_FILE);
  await fs.appendFile(target, `${JSON.stringify(outcome)}\n`, { mode: 0o600 });
  const current = await readWorkItem(workItemId);
  const handoffs = [...(current.handoffs ?? []), { ...outcome, workItemId }];
  await writeAtomic(getWorkItemPath(workItemId), JSON.stringify({ ...current, handoffs, version: (current.version ?? 1) + 1, updatedAt: new Date().toISOString() }, null, 2));
}

export async function readHandoffOutcomes(workItemId: string): Promise<HandoffHistoryEntry[]> {
  validateWorkItemId(workItemId);
  try {
    const raw = await fs.readFile(getWorkItemHandoffsPath(workItemId), "utf8");
    return raw.split("\n").filter(Boolean).map((line) => JSON.parse(line) as HandoffHistoryEntry);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return [];
    throw error;
  }
}

export async function readWorkItemFile(workItemId: string, relativePath: string): Promise<Buffer> {
  validateWorkItemId(workItemId);
  return fs.readFile(resolvePathWithin(getWorkItemDirPath(workItemId), relativePath));
}

export async function writeWorkItemFile(workItemId: string, relativePath: string, content: string | Buffer): Promise<string> {
  validateWorkItemId(workItemId);
  const target = resolvePathWithin(getWorkItemDirPath(workItemId), relativePath);
  await ensureWorkItemDir(workItemId);
  await writeAtomic(target, content);
  return target;
}

// Kept for callers/tests that prefer a shorter root helper.
export const getWorkRootPath = getWorkItemRoot;
