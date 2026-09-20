import type { ProjectEvidenceProviderResult } from "@/lib/projectEvidenceProvider";
import type { SessionRecord } from "@/lib/sessionRecord";
import type {
  Confidence,
  ConfidenceValue,
  ContextAttribution,
  ContextEntry,
  EvidenceReference,
  RepositoryState,
  WorkItemProgress
} from "@/lib/workContinuity";

const MAX_TEXT = 600;
const MAX_ITEMS = 40;
const MAX_CONTEXT_ITEMS = 100;

export type ProjectSnapshot = {
  rootPath?: string;
  projectRoot?: string;
  worktreePath?: string;
  name?: string;
  repository?: string;
  branch?: string;
  commit?: string;
  gitBranch?: string;
  gitCommit?: string;
  dirty?: boolean;
  worktreeClean?: boolean;
  untracked?: string[];
  untrackedFiles?: string[];
  observedAt?: string;
  evidenceProvider?: ProjectEvidenceProviderResult;
  projectEvidence?: ProjectEvidenceProviderResult;
};

export type InferredField<T> = ConfidenceValue<T> & { value?: T; attribution?: ContextAttribution };

export type InferredError = InferredField<string> & { id: string; kind: "error" };
export type InferredFileReference = InferredField<string> & { id: string; kind: "file"; locator: string };
export type InferredCommandReference = InferredField<string> & { id: string; kind: "command"; locator: string };

export type WorkItemInference = {
  goal: InferredField<string>;
  progress: Array<WorkItemProgress & { attribution: ContextAttribution }>;
  errors: InferredError[];
  fileReferences: InferredFileReference[];
  commandReferences: InferredCommandReference[];
  evidence: EvidenceReference[];
  repositoryState: RepositoryState;
  context: ContextEntry[];
  warnings: string[];
};

function bounded(value: unknown, max = MAX_TEXT): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

function observedAt(record: SessionRecord, fallback?: string): string {
  return record.timestamps.capturedAt || fallback || new Date(0).toISOString();
}

function field<T>(value: T | undefined, confidence: Confidence, record: SessionRecord, note?: string): InferredField<T> {
  return {
    ...(value === undefined ? {} : { value }),
    confidence,
    attribution: "explicitly referenced",
    source: `session:${record.session.source}/${record.session.id}`,
    observedAt: observedAt(record),
    ...(note ? { note } : {})
  };
}

function stableId(prefix: string, value: string, index: number): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  return `${prefix}-${index + 1}-${slug || "item"}`;
}

function eventText(record: SessionRecord): string {
  return record.events.map((event) => {
    const text = typeof event.text === "string" ? event.text : "";
    const output = typeof event.output === "string" ? event.output : "";
    return `${text}\n${output}`;
  }).join("\n");
}

function inferGoal(record: SessionRecord): InferredField<string> {
  const firstUser = record.events.find((event) => event.kind === "user" && bounded(event.text));
  const title = bounded(record.session.title);
  if (firstUser?.text) return field(bounded(firstUser.text), "inferred", record, "Candidate extracted from the first user event; confirm before handoff.");
  if (title) return field(title, "observed", record, "Derived from provider session metadata; confirm before handoff.");
  return field(undefined, "missing", record, "The source did not provide a usable goal or title.");
}

function inferProgress(record: SessionRecord): Array<WorkItemProgress & { attribution: ContextAttribution }> {
  const result: Array<WorkItemProgress & { attribution: ContextAttribution }> = [];
  const assistants = record.events.filter((event) => event.kind === "assistant").slice(-MAX_ITEMS);
  const user = record.events.filter((event) => event.kind === "user").slice(-MAX_ITEMS);
  const completed = assistants
    .map((event) => bounded(event.text))
    .filter((text): text is string => typeof text === "string" && /\b(done|completed|fixed|implemented|finished|resolved|passed)\b/i.test(text));
  if (completed.length > 0) {
    result.push({ value: completed.at(-1)!, confidence: "inferred", attribution: "explicitly referenced", kind: "completed", source: `session:${record.session.id}`, observedAt: observedAt(record) });
  }
  const current = bounded(assistants.at(-1)?.text);
  if (current && !completed.includes(current)) {
    result.push({ value: current, confidence: "observed", attribution: "observed available", kind: "current", source: `session:${record.session.id}`, observedAt: observedAt(record) });
  }
  const next = user
    .map((event) => bounded(event.text))
    .filter((text): text is string => typeof text === "string" && /\b(next|then|also|after that|please)\b/i.test(text));
  if (next.length > 0) {
    result.push({ value: next.at(-1)!, confidence: "inferred", attribution: "explicitly referenced", kind: "next", source: `session:${record.session.id}`, observedAt: observedAt(record) });
  }
  return result.slice(0, 3);
}

function inferErrors(record: SessionRecord): InferredError[] {
  return record.events
    .filter((event) => event.title === "Error" || event.status?.toUpperCase().includes("ERROR") || (event.exitCode !== undefined && event.exitCode !== 0))
    .slice(0, MAX_ITEMS)
    .map((event, index) => {
      const message = bounded(event.text ?? event.output ?? event.title) ?? "Unknown source error";
      return {
        id: stableId("error", message, index),
        kind: "error" as const,
        value: message,
        confidence: "observed" as const,
        attribution: "observed available" as const,
        source: `session:${record.session.source}/${record.session.id}#${event.id}`,
        observedAt: event.completedAt ?? event.createdAt ?? observedAt(record)
      };
    });
}

function inferReferences(record: SessionRecord): { files: InferredFileReference[]; commands: InferredCommandReference[] } {
  const files: InferredFileReference[] = [];
  const commands: InferredCommandReference[] = [];
  const seenFiles = new Set<string>();
  const seenCommands = new Set<string>();
  for (const event of record.events.slice(0, MAX_ITEMS * 2)) {
    const command = bounded(event.commandLine, 300);
    if (command && !seenCommands.has(command)) {
      seenCommands.add(command);
      commands.push({ id: stableId("command", command, commands.length), kind: "command", locator: command, value: command, confidence: "observed", attribution: "observed available", source: `session:${record.session.id}#${event.id}`, observedAt: event.completedAt ?? event.createdAt ?? observedAt(record) });
    }
    const text = typeof event.text === "string" ? event.text : "";
    const candidates = [
      ...(typeof event.cwd === "string" ? [event.cwd] : []),
      ...(text.match(/(?:^|\s)((?:\.\/|\.\.\/|\/)[\w./-]+|[\w.-]+\/(?:[\w.-]+\/)*[\w.-]+\.[A-Za-z0-9]+)/g) ?? [])
    ];
    for (const raw of candidates) {
      const value = bounded(raw, 260);
      if (!value || value.includes(" ") || seenFiles.has(value) || (!value.includes("/") && !/\.[A-Za-z0-9]{1,8}$/.test(value))) continue;
      seenFiles.add(value);
      files.push({ id: stableId("file", value, files.length), kind: "file", locator: value, value, confidence: "observed", attribution: "observed available", source: `session:${record.session.id}#${event.id}`, observedAt: event.completedAt ?? event.createdAt ?? observedAt(record) });
      if (files.length >= MAX_ITEMS) break;
    }
  }
  return { files, commands };
}

function inferRepository(record: SessionRecord, snapshot: ProjectSnapshot): RepositoryState {
  const rootPath = snapshot.rootPath ?? snapshot.projectRoot ?? record.session.cwd;
  const dirty = snapshot.dirty ?? (snapshot.worktreeClean === undefined ? undefined : !snapshot.worktreeClean);
  const untracked = snapshot.untracked ?? snapshot.untrackedFiles;
  return {
    ...(rootPath ? { rootPath } : {}),
    ...(snapshot.worktreePath ? { worktreePath: snapshot.worktreePath } : {}),
    ...(snapshot.branch ?? snapshot.gitBranch ?? record.session.gitBranch ? { branch: snapshot.branch ?? snapshot.gitBranch ?? record.session.gitBranch } : {}),
    ...(snapshot.commit ?? snapshot.gitCommit ? { commit: snapshot.commit ?? snapshot.gitCommit } : {}),
    ...(dirty === undefined ? {} : { dirty }),
    ...(untracked ? { untracked: untracked.slice(0, MAX_ITEMS) } : {}),
    observedAt: snapshot.observedAt ?? observedAt(record),
    confidence: snapshot.rootPath || snapshot.projectRoot ? "observed" : "unknown"
  };
}

function inferContext(record: SessionRecord, snapshot: ProjectSnapshot): ContextEntry[] {
  const provider = snapshot.evidenceProvider ?? snapshot.projectEvidence;
  const text = eventText(record);
  const context: ContextEntry[] = [];
  if (provider) {
    const items = (provider.items ?? []).slice(0, MAX_CONTEXT_ITEMS);
    for (const item of items) {
      const explicitlyReferenced = typeof item.path === "string" && text.includes(item.path);
      const attribution: ContextAttribution = explicitlyReferenced ? "explicitly referenced" : "observed available";
      context.push({
        id: item.id,
        name: item.title,
        source: item.source === "unknown" ? "repo-local" : item.source,
        scope: "project",
        observedAt: observedAt(record),
        provenance: `${item.path} (${item.evidenceSource})`,
        confidence: explicitlyReferenced ? "observed" : "observed",
        attribution,
        locator: item.path,
        status: item.status
      });
    }
  }
  // Runtime/global agent assets are intentionally not claimed as influential:
  // the repo-local provider cannot observe them.
  context.push({
    id: `context-unknown-global-${record.session.source}`,
    name: `${record.session.source} global runtime context`,
    source: record.session.source,
    scope: "global",
    observedAt: observedAt(record),
    provenance: "provider cannot observe global runtime assets",
    confidence: "unknown",
    attribution: "unknown influence",
    status: "unobservable"
  });
  return context;
}

export function inferWorkItem(input: { record: SessionRecord; project?: ProjectSnapshot; projectSnapshot?: ProjectSnapshot; evidenceProvider?: ProjectEvidenceProviderResult }): WorkItemInference;
export function inferWorkItem(record: SessionRecord, project?: ProjectSnapshot, evidenceProvider?: ProjectEvidenceProviderResult): WorkItemInference;
export function inferWorkItem(
  inputOrRecord: SessionRecord | { record: SessionRecord; project?: ProjectSnapshot; projectSnapshot?: ProjectSnapshot; evidenceProvider?: ProjectEvidenceProviderResult },
  positionalProject?: ProjectSnapshot,
  positionalEvidenceProvider?: ProjectEvidenceProviderResult
): WorkItemInference {
  const input = "record" in inputOrRecord
    ? inputOrRecord
    : { record: inputOrRecord, project: positionalProject, evidenceProvider: positionalEvidenceProvider };
  const snapshot: ProjectSnapshot = {
    ...(input.projectSnapshot ?? input.project ?? {}),
    ...(input.evidenceProvider ? { evidenceProvider: input.evidenceProvider } : {})
  };
  const refs = inferReferences(input.record);
  const errors = inferErrors(input.record);
  const evidence: EvidenceReference[] = [
    { id: `evidence-session-${input.record.session.id}`, kind: "session", source: input.record.session.source, locator: input.record.sourceRef.locator, embedded: false, confidence: "observed", observedAt: observedAt(input.record) },
    ...errors.map((error) => ({ id: error.id, kind: "event" as const, source: error.source, locator: error.id, embedded: false, confidence: error.confidence, observedAt: error.observedAt }))
  ];
  return {
    goal: inferGoal(input.record),
    progress: inferProgress(input.record),
    errors,
    fileReferences: refs.files,
    commandReferences: refs.commands,
    evidence,
    repositoryState: inferRepository(input.record, snapshot),
    context: inferContext(input.record, snapshot),
    warnings: [
      "Inferred goal and progress require user confirmation before handoff.",
      ...(snapshot.evidenceProvider?.status === "unavailable" ? ["Project evidence provider was unavailable."] : [])
    ]
  };
}

export const inferWorkItemCandidate = inferWorkItem;
export const extractWorkItemInference = inferWorkItem;
export const inferWorkItemFromSession = inferWorkItem;
export const buildWorkItemInference = inferWorkItem;

export default inferWorkItem;
