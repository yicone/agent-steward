import type { Source } from "@/lib/types";

/** Versioned, provider-neutral contracts for the continuity layer. */
export const WORK_ITEM_SCHEMA_VERSION = "work-item/v1" as const;
export const WORK_PACKAGE_SCHEMA_VERSION = "work-package/v1" as const;

export type WorkItemSchemaVersion = typeof WORK_ITEM_SCHEMA_VERSION;
export type WorkPackageSchemaVersion = typeof WORK_PACKAGE_SCHEMA_VERSION;

export type WorkItemLifecycle =
  | "captured"
  | "organized"
  | "active"
  | "blocked"
  | "ready-to-handoff"
  | "completed"
  | "archived";

export const WORK_ITEM_LIFECYCLE_VALUES: readonly WorkItemLifecycle[] = [
  "captured",
  "organized",
  "active",
  "blocked",
  "ready-to-handoff",
  "completed",
  "archived",
] as const;

export type HandoffOutcome =
  | "created"
  | "confirmed"
  | "failed"
  | "cancelled"
  | "expired"
  | "superseded";

export const HANDOFF_OUTCOME_VALUES: readonly HandoffOutcome[] = [
  "created",
  "confirmed",
  "failed",
  "cancelled",
  "expired",
  "superseded",
] as const;

export type Confidence = "verified" | "observed" | "inferred" | "stale" | "missing" | "unknown";
export const CONFIDENCE_VALUES: readonly Confidence[] = [
  "verified",
  "observed",
  "inferred",
  "stale",
  "missing",
  "unknown",
] as const;

export type ContextAttribution =
  | "observed available"
  | "explicitly referenced"
  | "user attached"
  | "unknown influence";

export const CONTEXT_ATTRIBUTION_VALUES: readonly ContextAttribution[] = [
  "observed available",
  "explicitly referenced",
  "user attached",
  "unknown influence",
] as const;

export type ConfidenceValue<T = unknown> = {
  value?: T;
  confidence: Confidence;
  source?: string;
  observedAt?: string;
  note?: string;
};

export type ProjectReference = {
  id?: string;
  name?: string;
  rootPath: string;
  worktreePath?: string;
  repository?: string;
  branch?: string;
  commit?: string;
};

export type WorkItemGoal = ConfidenceValue<string> & { value: string; text?: string };

export type WorkItemProgress = ConfidenceValue<string> & {
  value: string;
  kind?: "completed" | "current" | "next";
};

export type WorkItemDecision = ConfidenceValue<string> & { id: string; value: string };
export type WorkItemQuestion = ConfidenceValue<string> & { id: string; value: string };

export type EvidenceReference = {
  id: string;
  kind: "session" | "file" | "command" | "event" | "backup" | "other";
  source?: string;
  locator: string;
  embedded?: boolean;
  confidence?: Confidence;
  observedAt?: string;
};

export type WorkSessionReference = {
  id: string;
  source: Source | string;
  sessionId: string;
  rootId?: string;
  locator?: string;
  title?: string;
  attachedAt: string;
  confidence: Confidence;
};

export type ContextEntry = {
  id: string;
  name?: string;
  source: string;
  scope: string;
  observedAt: string;
  provenance?: string;
  confidence: Confidence;
  attribution: ContextAttribution;
  locator?: string;
  status?: string;
};

export type WorkArtifact = {
  id: string;
  kind?: string;
  path?: string;
  locator?: string;
  label?: string;
  confidence?: Confidence;
};

export type HandoffHistoryEntry = {
  id: string;
  workItemId?: string;
  packageId?: string;
  packageHash?: string;
  schemaVersion?: WorkPackageSchemaVersion;
  source?: { provider?: Source | string; sessionId?: string };
  target?: { provider?: Source | string; sessionId?: string };
  project?: ProjectReference;
  createdAt: string;
  actor?: string;
  method?: "manual" | "observed" | "automated";
  outcome: HandoffOutcome;
  failureReason?: string;
  missingInformation?: string[];
};

export type RepositoryState = {
  rootPath?: string;
  worktreePath?: string;
  branch?: string;
  commit?: string;
  dirty?: boolean;
  untracked?: string[];
  observedAt?: string;
  confidence?: Confidence;
};

export type WorkItem = {
  schemaVersion: WorkItemSchemaVersion;
  id: string;
  project: ProjectReference;
  goal: WorkItemGoal;
  status: WorkItemLifecycle;
  createdAt: string;
  updatedAt: string;
  version?: number;
  currentAgent?: Source | string;
  progress?: WorkItemProgress[];
  decisions?: WorkItemDecision[];
  openQuestions?: WorkItemQuestion[];
  evidence?: EvidenceReference[];
  /** Explicitly associated provider sessions; evidence remains independently bounded. */
  sessions?: WorkSessionReference[];
  context?: ContextEntry[];
  artifacts?: WorkArtifact[];
  repositoryState?: RepositoryState;
  handoffs?: HandoffHistoryEntry[];
  /** Bounded source evidence, deliberately distinct from raw provider copies. */
  sessionEvidence?: SessionEvidenceSnapshot;
  sessionEvidenceSnapshots?: SessionEvidenceSnapshot[];
  [key: string]: unknown;
};

export type SessionEvidenceSnapshot = {
  schemaVersion: "session-record/v1";
  sessionId: string;
  source: Source;
  sourceRef?: { kind: string; locator: string; snapshotTime?: string };
  capturedAt: string;
  identity?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  events: Array<Record<string, unknown>>;
  truncated?: boolean;
  originalEventCount?: number;
  byteLength?: number;
};

export type ValidationCheck = {
  id: string;
  status: "pass" | "warning" | "block" | "unknown";
  detail?: string;
  confidence?: Confidence;
};

export type ValidationManifest = {
  status?: "ready" | "ready_with_warnings" | "blocked";
  checks: ValidationCheck[];
  warnings?: string[];
  missing?: string[];
};

export type RedactionManifest = {
  count: number;
  rules?: string[];
  sources?: string[];
};

export type WorkPackage = {
  schemaVersion: WorkPackageSchemaVersion;
  id: string;
  workItemId: string;
  createdAt: string;
  target?: { provider?: Source | string; profile?: string };
  workItem: WorkItem;
  summary?: Record<string, unknown>;
  context?: ContextEntry[];
  evidence?: EvidenceReference[];
  repositoryState?: RepositoryState;
  validation: ValidationManifest;
  redaction?: RedactionManifest;
  canonicalHash?: string;
  projections?: Record<string, { hash?: string; content?: string; format?: string }>;
  [key: string]: unknown;
};

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function isValidWorkItemId(id: unknown): id is string {
  return typeof id === "string" && ID_PATTERN.test(id);
}

export function validateWorkItemId(id: string): void {
  if (!isValidWorkItemId(id)) throw new Error(`Invalid workItemId: ${id}`);
}

export function isLifecycle(value: unknown): value is WorkItemLifecycle {
  return typeof value === "string" && (WORK_ITEM_LIFECYCLE_VALUES as readonly string[]).includes(value);
}

export function isConfidence(value: unknown): value is Confidence {
  return typeof value === "string" && (CONFIDENCE_VALUES as readonly string[]).includes(value);
}

export function isHandoffOutcome(value: unknown): value is HandoffOutcome {
  return typeof value === "string" && (HANDOFF_OUTCOME_VALUES as readonly string[]).includes(value);
}

export function isContextAttribution(value: unknown): value is ContextAttribution {
  return typeof value === "string" && (CONTEXT_ATTRIBUTION_VALUES as readonly string[]).includes(value);
}

/** Session termination and handoff events do not imply completion. */
const ALLOWED_TRANSITIONS: Record<WorkItemLifecycle, readonly WorkItemLifecycle[]> = {
  captured: ["captured", "organized", "active", "archived"],
  organized: ["organized", "active", "blocked", "ready-to-handoff", "archived"],
  active: ["active", "blocked", "ready-to-handoff", "completed", "archived"],
  blocked: ["blocked", "active", "ready-to-handoff", "archived"],
  "ready-to-handoff": ["ready-to-handoff", "active", "blocked", "completed", "archived"],
  completed: ["completed", "archived"],
  archived: ["archived", "active"],
};

export function canTransitionWorkItemStatus(from: WorkItemLifecycle, to: WorkItemLifecycle): boolean {
  return isLifecycle(from) && isLifecycle(to) && ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertValidWorkItemTransition(from: WorkItemLifecycle, to: WorkItemLifecycle): void {
  if (!canTransitionWorkItemStatus(from, to)) {
    throw new Error(`Invalid Work Item lifecycle transition: ${from} -> ${to}`);
  }
}

function assertIsoTimestamp(value: unknown, field: string): void {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be an ISO timestamp`);
  }
}

export function validateContextEntry(entry: ContextEntry): void {
  if (!entry.id || !entry.source || !entry.scope) throw new Error("Context entry requires id, source, and scope");
  assertIsoTimestamp(entry.observedAt, "Context entry observedAt");
  if (!isConfidence(entry.confidence)) throw new Error(`Invalid context confidence: ${entry.confidence}`);
  if (!isContextAttribution(entry.attribution)) throw new Error(`Invalid context attribution: ${entry.attribution}`);
}

export function validateWorkItem(workItem: WorkItem): void {
  if (workItem.schemaVersion !== WORK_ITEM_SCHEMA_VERSION) throw new Error(`Unsupported Work Item schema version: ${workItem.schemaVersion}`);
  validateWorkItemId(workItem.id);
  if (!isLifecycle(workItem.status)) throw new Error(`Invalid Work Item status: ${workItem.status}`);
  if (!workItem.project || typeof workItem.project.rootPath !== "string" || !workItem.project.rootPath) throw new Error("Work Item project.rootPath is required");
  if (!workItem.goal || typeof workItem.goal.value !== "string" || !workItem.goal.value.trim()) throw new Error("Work Item goal is required");
  if (!isConfidence(workItem.goal.confidence)) throw new Error(`Invalid Work Item goal confidence: ${workItem.goal.confidence}`);
  assertIsoTimestamp(workItem.createdAt, "Work Item createdAt");
  assertIsoTimestamp(workItem.updatedAt, "Work Item updatedAt");
  for (const context of workItem.context ?? []) validateContextEntry(context);
  for (const handoff of workItem.handoffs ?? []) {
    if (!handoff.id || !isHandoffOutcome(handoff.outcome)) throw new Error("Invalid Work Item handoff entry");
    assertIsoTimestamp(handoff.createdAt, "Handoff createdAt");
  }
}

export function validateWorkPackage(pkg: WorkPackage): void {
  if (pkg.schemaVersion !== WORK_PACKAGE_SCHEMA_VERSION) throw new Error(`Unsupported Work Package schema version: ${pkg.schemaVersion}`);
  validateWorkItemId(pkg.id);
  validateWorkItemId(pkg.workItemId);
  assertIsoTimestamp(pkg.createdAt, "Work Package createdAt");
  if (!pkg.workItem || pkg.workItem.id !== pkg.workItemId) throw new Error("Work Package workItem does not match workItemId");
  validateWorkItem(pkg.workItem);
  if (!pkg.validation || !Array.isArray(pkg.validation.checks)) throw new Error("Work Package validation manifest is required");
}

// Descriptive aliases used by API and migration callers.
export const validateWorkItemSchema = validateWorkItem;
export const validateWorkPackageSchema = validateWorkPackage;

export function normalizeTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid timestamp: ${value}`);
  return parsed.toISOString();
}

export function normalizeRelativePath(value: string): string {
  if (typeof value !== "string") throw new Error("Path must be a string");
  const normalized = value.replaceAll("\\", "/");
  if (normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) return normalized;
  const parts = normalized.split("/").filter((part) => part.length > 0 && part !== ".");
  const result: string[] = [];
  for (const part of parts) {
    if (part === "..") {
      if (result.length === 0) throw new Error(`Path escapes project root: ${value}`);
      result.pop();
    } else result.push(part);
  }
  return result.join("/");
}

export const normalizePath = normalizeRelativePath;

export type NormalizedSourceReference = {
  kind?: string;
  locator: string;
  snapshotTime?: string;
};

export function normalizeSourceReference(reference: NormalizedSourceReference): NormalizedSourceReference {
  return {
    ...reference,
    locator: normalizeRelativePath(reference.locator),
    ...(reference.snapshotTime ? { snapshotTime: normalizeTimestamp(reference.snapshotTime) } : {}),
  };
}

function normalizeForCanonical(value: unknown, key?: string): unknown {
  if (typeof value === "string") {
    // Normalize explicit timestamp fields and ISO-looking values. The latter
    // keeps semantically identical records stable even when an adapter uses a
    // provider-specific key (for example `created` instead of `createdAt`).
    if ((key && /(?:At|Time|Timestamp|Date)$/.test(key)) || /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      try { return normalizeTimestamp(value); } catch { /* retain non-date strings */ }
    }
    if (key && /(?:path|Path|locator|Locator)$/.test(key)) {
      try { return normalizeRelativePath(value); } catch { /* retain absolute paths */ }
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((entry) => normalizeForCanonical(entry));
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return Object.keys(object).sort().reduce<Record<string, unknown>>((result, objectKey) => {
      const child = object[objectKey];
      if (child !== undefined) result[objectKey] = normalizeForCanonical(child, objectKey);
      return result;
    }, {});
  }
  return value;
}

export function canonicalizeJson(value: unknown): unknown {
  return normalizeForCanonical(value);
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalizeJson(value));
}

export const serializeCanonicalJson = canonicalJson;
