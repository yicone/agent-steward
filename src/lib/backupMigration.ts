import type { Source } from "@/lib/types";

// ── Workflow types ──────────────────────────────────────────────────────────

export const BACKUP_WORKFLOW_TYPES = ["session-backup", "bulk-session-backup", "import-backup", "validate-package"] as const;
export type BackupWorkflowType = (typeof BACKUP_WORKFLOW_TYPES)[number];

export const BACKUP_WORKFLOW_STATES = [
  "idle",
  "selection",
  "configuration",
  "validation",
  "confirmation",
  "execution",
  "result",
  "failed",
] as const;
export type BackupWorkflowState = (typeof BACKUP_WORKFLOW_STATES)[number];

// ── Validation ──────────────────────────────────────────────────────────────

export type BackupValidationSeverity = "ok" | "warning" | "block";

export type BackupValidationItem = {
  id: string;
  label: string;
  severity: BackupValidationSeverity;
  detail: string;
};

export type BackupValidationResult = {
  status: "valid" | "valid-with-warnings" | "invalid";
  items: BackupValidationItem[];
  sessionResults?: BulkSessionValidationEntry[];
  selectedCount?: number;
  warningCount?: number;
  blockCount?: number;
};

export type BackupSessionSelection = {
  sessionId: string;
  source?: Source;
  rootId?: string;
  includeSourceCopy?: boolean;
  unresolvedReason?: string;
};

export type BulkSessionValidationEntry = {
  session: BackupSessionSelection;
  result: BackupValidationResult;
};

export type BackupPackageVerifySuccess = {
  backupId: string;
  verified: true;
  manifest?: {
    schemaVersion?: string;
    createdBy?: string;
  };
};

export type BackupPackageVerifyFailure = {
  verified?: false;
  error?: string;
  title?: string;
  hint?: string;
  code?: string;
};

export type BackupPackageVerifyResponse = BackupPackageVerifySuccess | BackupPackageVerifyFailure;

// ── Operation result ────────────────────────────────────────────────────────

export type BackupOperationStatus = "success" | "success-with-warnings" | "failed";

export type BackupOperationResult = {
  id: string;
  workflowType: BackupWorkflowType;
  status: BackupOperationStatus;
  timestamp: string;
  summary: string;
  backupId?: string;
  sessionCount?: number;
  warnings?: string[];
  sourceCopySummary?: string;
  sessionResults?: BulkSessionExecutionResult[];
};

export type BulkSessionExecutionResult = {
  sessionId: string;
  source?: Source;
  rootId?: string;
  status: BackupOperationStatus;
  summary: string;
  backupId?: string;
  warnings?: string[];
  error?: string;
};

export type SessionBackupExecutionRequest = {
  source: Source;
  sessionId: string;
  rootId?: string;
  includeSourceCopy?: boolean;
};

// ── Recent operations ───────────────────────────────────────────────────────

export type RecentOperation = BackupOperationResult;

// ── Handoff ─────────────────────────────────────────────────────────────────

export type BackupMigrationHandoffOrigin = "sessions" | "assets" | "analysis" | "overview";

export type BackupMigrationHandoff = {
  origin: BackupMigrationHandoffOrigin;
  subtitle: string;
  continueLabel?: string;
  returnLabel?: string;
  workflowType?: BackupWorkflowType;
  sessionId?: string;
  sessions?: BackupSessionSelection[];
  source?: Source;
  rootId?: string;
  assetId?: string;
  assetSubtype?: string;
  findingId?: string;
  preservationWarning?: string;
  issueLabel?: string;
};

// ── Workflow descriptor ─────────────────────────────────────────────────────

export type BackupWorkflowDescriptor = {
  type: BackupWorkflowType;
  label: string;
  description: string;
  stepsLabel: string[];
};

export const WORKFLOW_DESCRIPTORS: BackupWorkflowDescriptor[] = [
  {
    type: "session-backup",
    label: "Session Backup",
    description: "Create a preserved copy of a canonical session record. Source backup is an opt-in advanced option.",
    stepsLabel: ["Select session", "Configure", "Validate", "Confirm", "Execute", "Result"],
  },
  {
    type: "bulk-session-backup",
    label: "Bulk Session Backup",
    description: "Preserve an explicit set of selected sessions. Each selected session is validated independently before batch confirmation.",
    stepsLabel: ["Select sessions", "Configure", "Validate", "Confirm", "Execute", "Result"],
  },
  {
    type: "import-backup",
    label: "Import Backup",
    description: "Import an existing session-backup package. Validates schema, integrity, and provenance before acceptance.",
    stepsLabel: ["Select package", "Validate", "Confirm", "Execute", "Result"],
  },
  {
    type: "validate-package",
    label: "Validate Package",
    description: "Run trust and compatibility checks on a backup package without importing it.",
    stepsLabel: ["Select package", "Validate", "Result"],
  },
];

// ── Helper functions ────────────────────────────────────────────────────────

export function getWorkflowDescriptor(type: BackupWorkflowType): BackupWorkflowDescriptor {
  return WORKFLOW_DESCRIPTORS.find((d) => d.type === type) ?? WORKFLOW_DESCRIPTORS[0]!;
}

export function formatWorkflowTypeLabel(type: BackupWorkflowType): string {
  const labels: Record<BackupWorkflowType, string> = {
    "session-backup": "Session Backup",
    "bulk-session-backup": "Bulk Session Backup",
    "import-backup": "Import Backup",
    "validate-package": "Validate Package",
  };
  return labels[type];
}

export function formatWorkflowStateLabel(state: BackupWorkflowState): string {
  const labels: Record<BackupWorkflowState, string> = {
    idle: "Idle",
    selection: "Selection",
    configuration: "Configuration",
    validation: "Validation",
    confirmation: "Confirmation",
    execution: "Executing…",
    result: "Result",
    failed: "Failed",
  };
  return labels[state];
}

export function getStepsForWorkflow(type: BackupWorkflowType): BackupWorkflowState[] {
  switch (type) {
    case "session-backup":
    case "bulk-session-backup":
      return ["selection", "configuration", "validation", "confirmation", "execution", "result"];
    case "import-backup":
      return ["selection", "validation", "confirmation", "execution", "result"];
    case "validate-package":
      return ["selection", "validation", "result"];
  }
}

export function getNextState(
  workflowType: BackupWorkflowType,
  currentState: BackupWorkflowState
): BackupWorkflowState | null {
  const steps = getStepsForWorkflow(workflowType);
  const index = steps.indexOf(currentState);
  if (index < 0 || index >= steps.length - 1) return null;
  return steps[index + 1]!;
}

export function getPreviousState(
  workflowType: BackupWorkflowType,
  currentState: BackupWorkflowState
): BackupWorkflowState | null {
  const steps = getStepsForWorkflow(workflowType);
  const index = steps.indexOf(currentState);
  if (index <= 0) return null;
  return steps[index - 1]!;
}

export function isTerminalState(state: BackupWorkflowState): boolean {
  return state === "result" || state === "failed";
}

// ── Validation helpers ──────────────────────────────────────────────────────

export function deriveValidationResult(items: BackupValidationItem[]): BackupValidationResult {
  const hasBlock = items.some((item) => item.severity === "block");
  const hasWarning = items.some((item) => item.severity === "warning");

  return {
    status: hasBlock ? "invalid" : hasWarning ? "valid-with-warnings" : "valid",
    items,
  };
}

export function canProceedFromValidation(result: BackupValidationResult): boolean {
  return result.status !== "invalid";
}

export function normalizeSessionSelection(input: BackupSessionSelection): BackupSessionSelection {
  return {
    sessionId: input.sessionId.trim(),
    source: input.source,
    rootId: input.rootId?.trim() || undefined,
    includeSourceCopy: input.includeSourceCopy === true,
    unresolvedReason: input.unresolvedReason?.trim() || undefined,
  };
}

export function formatSessionSelectionLabel(selection: BackupSessionSelection): string {
  const normalized = normalizeSessionSelection(selection);
  const sourceLabel = normalized.source ?? "unknown-source";
  const sessionLabel = normalized.sessionId || "unresolved-session";
  return normalized.rootId ? `${sourceLabel}:${sessionLabel}:${normalized.rootId}` : `${sourceLabel}:${sessionLabel}`;
}

export function dedupeSessionSelections(selections: BackupSessionSelection[]): BackupSessionSelection[] {
  const seen = new Set<string>();
  const deduped: BackupSessionSelection[] = [];

  for (const selection of selections.map(normalizeSessionSelection)) {
    const key = formatSessionSelectionLabel(selection);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(selection);
  }

  return deduped;
}

export function summarizeSourceCopyConfiguration(selections: BackupSessionSelection[]): string {
  const normalized = dedupeSessionSelections(selections);
  const requestedCount = normalized.filter((selection) => selection.includeSourceCopy).length;

  if (normalized.length === 0 || requestedCount === 0) {
    return "Canonical record only. Source copy is not requested for this batch.";
  }

  return `Source copy requested for ${requestedCount} of ${normalized.length} selected session${normalized.length === 1 ? "" : "s"}.`;
}

function buildBulkValidationItemsForSelection(selection: BackupSessionSelection): BackupValidationItem[] {
  const normalized = normalizeSessionSelection(selection);
  const items: BackupValidationItem[] = [];

  if (!normalized.sessionId) {
    items.push({
      id: "v-session-id-missing",
      label: "Canonical record availability",
      severity: "block",
      detail: "This selected item has no canonical session ID. Remove it from the batch or repair the source selection.",
    });
  } else if (normalized.unresolvedReason) {
    items.push({
      id: "v-canonical-unavailable",
      label: "Canonical record availability",
      severity: "block",
      detail: normalized.unresolvedReason,
    });
  } else {
    items.push({
      id: "v-canonical-available",
      label: "Canonical record availability",
      severity: "ok",
      detail: `Canonical record for ${normalized.sessionId} is available for backup packaging.`,
    });
  }

  if (!normalized.source) {
    items.push({
      id: "v-provenance-missing",
      label: "Provenance",
      severity: "block",
      detail: "Source provenance is missing for this selected session. Remove it from the batch or route it again from Sessions with explicit source context.",
    });
  } else {
    items.push({
      id: "v-provenance-present",
      label: "Provenance",
      severity: "ok",
      detail: normalized.rootId
        ? `Source ${normalized.source} / root ${normalized.rootId} is traceable.`
        : `Source ${normalized.source} is traceable.`,
    });
  }

  if (normalized.includeSourceCopy) {
    if (normalized.source === "codex" && !normalized.unresolvedReason && normalized.sessionId) {
      items.push({
        id: "v-source-copy-ready",
        label: "Source-copy readiness",
        severity: "ok",
        detail: "Source copy can be requested for this Codex session backup.",
      });
    } else {
      items.push({
        id: "v-source-copy-unavailable",
        label: "Source-copy readiness",
        severity: "warning",
        detail: "Source copy remains opt-in and is unavailable for this selected session. The batch can continue with canonical-record backup only.",
      });
    }
  }

  return items;
}

export function buildBulkSessionValidationResult(selections: BackupSessionSelection[]): BackupValidationResult {
  const normalizedSelections = dedupeSessionSelections(selections);

  if (normalizedSelections.length === 0) {
    return {
      status: "invalid",
      items: [
        {
          id: "v-no-bulk-selection",
          label: "No sessions selected",
          severity: "block",
          detail: "Select one or more sessions before validation.",
        },
      ],
      sessionResults: [],
      selectedCount: 0,
      warningCount: 0,
      blockCount: 1,
    };
  }

  const sessionResults = normalizedSelections.map((selection) => {
    const items = buildBulkValidationItemsForSelection(selection);
    return {
      session: selection,
      result: deriveValidationResult(items),
    } satisfies BulkSessionValidationEntry;
  });

  const items = sessionResults.flatMap((entry) =>
    entry.result.items.map((item) => ({
      ...item,
      id: `${formatSessionSelectionLabel(entry.session)}:${item.id}`,
      label: `${entry.session.sessionId || "unresolved session"} — ${item.label}`,
    }))
  );
  const warningCount = items.filter((item) => item.severity === "warning").length;
  const blockCount = items.filter((item) => item.severity === "block").length;

  return {
    ...deriveValidationResult(items),
    sessionResults,
    selectedCount: normalizedSelections.length,
    warningCount,
    blockCount,
  };
}

export function getBlockedSessionSelections(result: BackupValidationResult): BackupSessionSelection[] {
  return (result.sessionResults ?? [])
    .filter((entry) => entry.result.status === "invalid")
    .map((entry) => entry.session);
}

export function deriveAggregateOperationStatus(results: BulkSessionExecutionResult[]): BackupOperationStatus {
  if (results.length === 0) return "failed";

  const successCount = results.filter((result) => result.status === "success").length;
  const failedCount = results.filter((result) => result.status === "failed").length;
  const warnedCount = results.filter((result) => result.status === "success-with-warnings").length;

  if (successCount === 0 && warnedCount === 0) return "failed";
  if (failedCount > 0 || warnedCount > 0) return "success-with-warnings";
  return "success";
}

export function createBulkOperationSummary(results: BulkSessionExecutionResult[]): string {
  const successCount = results.filter((result) => result.status !== "failed").length;
  const failedCount = results.filter((result) => result.status === "failed").length;

  if (results.length === 0 || successCount === 0) {
    return `Bulk session backup failed for ${results.length} selected session${results.length === 1 ? "" : "s"}.`;
  }

  if (failedCount > 0) {
    return `Backed up ${successCount} of ${results.length} selected session${results.length === 1 ? "" : "s"}.`;
  }

  return `Backed up ${results.length} selected session${results.length === 1 ? "" : "s"} successfully.`;
}

export function buildPackageValidationItems(input: {
  backupId: string;
  responseOk: boolean;
  payload: BackupPackageVerifySuccess | BackupPackageVerifyFailure;
}): BackupValidationItem[] {
  if (!input.responseOk) {
    const failure = input.payload as BackupPackageVerifyFailure;
    const title = failure.title ?? "Package validation failed";
    const detailParts = [failure.error ?? `Backup ${input.backupId} could not be verified.`];
    if (failure.code) detailParts.push(`Code: ${failure.code}`);
    if (failure.hint) detailParts.push(failure.hint);

    return [
      {
        id: "v-package-invalid",
        label: title,
        severity: "block",
        detail: detailParts.join(" "),
      },
    ];
  }

  const success = input.payload as BackupPackageVerifySuccess;

  return [
    {
      id: "v-schema",
      label: "Schema version",
      severity: "ok",
      detail: `${success.manifest?.schemaVersion ?? "session-backup/v1"} is supported.`,
    },
    {
      id: "v-integrity",
      label: "Package integrity",
      severity: "ok",
      detail: `Backup ${input.backupId} passed manifest and record verification.`,
    },
    {
      id: "v-provenance",
      label: "Provenance",
      severity: "ok",
      detail: success.manifest?.createdBy
        ? `Created by ${success.manifest.createdBy}.`
        : "Backup provenance is present and readable.",
    },
    {
      id: "v-no-runtime",
      label: "No vendor-runtime restore",
      severity: "warning",
      detail: "Import restores product-readable state only. Sessions will not reopen inside a third-party agent runtime.",
    },
  ];
}

// ── Operation result helpers ────────────────────────────────────────────────

let operationCounter = 0;

export function createOperationResult(input: {
  workflowType: BackupWorkflowType;
  status: BackupOperationStatus;
  summary: string;
  backupId?: string;
  sessionCount?: number;
  warnings?: string[];
  sourceCopySummary?: string;
  sessionResults?: BulkSessionExecutionResult[];
}): BackupOperationResult {
  operationCounter += 1;
  return {
    id: `op-${Date.now()}-${operationCounter}`,
    workflowType: input.workflowType,
    status: input.status,
    timestamp: new Date().toISOString(),
    summary: input.summary,
    backupId: input.backupId,
    sessionCount: input.sessionCount,
    warnings: input.warnings,
    sourceCopySummary: input.sourceCopySummary,
    sessionResults: input.sessionResults,
  };
}

export function buildSessionBackupExecutionRequest(input: {
  source: Source;
  sessionId: string;
  rootId?: string | null;
  includeSourceCopy: boolean;
}): SessionBackupExecutionRequest {
  const request: SessionBackupExecutionRequest = {
    source: input.source,
    sessionId: input.sessionId,
  };

  if (input.rootId) {
    request.rootId = input.rootId;
  }

  if (input.source === "codex" && input.includeSourceCopy) {
    request.includeSourceCopy = true;
  }

  return request;
}

export function normalizeBackupId(input: string): string {
  return input.trim();
}

export async function validateBackupPackageRemote(
  fetchImpl: typeof fetch,
  backupId: string
): Promise<BackupValidationItem[]> {
  const targetBackupId = normalizeBackupId(backupId);

  if (!targetBackupId) {
    return [
      {
        id: "v-no-pkg",
        label: "No package selected",
        severity: "block",
        detail: "Choose a backup package to import.",
      },
    ];
  }

  try {
    const response = await fetchImpl(`/api/session-backups/${encodeURIComponent(targetBackupId)}`, {
      method: "GET",
    });
    const payload = (await response.json().catch(() => ({ error: "Unknown verification error" }))) as BackupPackageVerifyResponse;
    return buildPackageValidationItems({
      backupId: targetBackupId,
      responseOk: response.ok,
      payload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [
      {
        id: "v-verify-request-failed",
        label: "Package verification request failed",
        severity: "block",
        detail: `Unable to verify backup ${targetBackupId}. ${message}`,
      },
    ];
  }
}

// ── Recent operations ───────────────────────────────────────────────────────

export function addRecentOperation(
  operations: RecentOperation[],
  operation: RecentOperation,
  maxCount = 20
): RecentOperation[] {
  return [operation, ...operations].slice(0, maxCount);
}

// ── Handoff consumption ─────────────────────────────────────────────────────

export function resolveWorkflowFromHandoff(
  handoff: BackupMigrationHandoff | null
): BackupWorkflowType | null {
  if (!handoff) return null;

  if (handoff.workflowType && BACKUP_WORKFLOW_TYPES.includes(handoff.workflowType)) {
    return handoff.workflowType;
  }

  // Infer from context
  if ((handoff.sessions?.length ?? 0) > 1) return "bulk-session-backup";
  if (handoff.sessionId) return "session-backup";
  if (handoff.origin === "overview") return null; // overview routes to selector
  if (handoff.findingId && handoff.preservationWarning) return "session-backup";

  return null;
}

export function buildBackupHandoffInstanceKey(handoff: BackupMigrationHandoff | null): string {
  if (!handoff) return "backup:no-handoff";

  return [
    "backup",
    handoff.origin,
    handoff.workflowType ?? "no-workflow",
    handoff.sessionId ?? "no-session",
    handoff.sessions?.map(formatSessionSelectionLabel).join("|") ?? "no-sessions",
    handoff.source ?? "no-source",
    handoff.rootId ?? "no-root",
    handoff.assetId ?? "no-asset",
    handoff.assetSubtype ?? "no-asset-subtype",
    handoff.findingId ?? "no-finding",
    handoff.issueLabel ?? "no-issue",
    handoff.preservationWarning ?? "no-preservation-warning",
    handoff.subtitle,
  ].join(":");
}
