import type { Source } from "@/lib/types";

// ── Workflow types ──────────────────────────────────────────────────────────

export const BACKUP_WORKFLOW_TYPES = ["session-backup", "import-backup", "validate-package"] as const;
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
