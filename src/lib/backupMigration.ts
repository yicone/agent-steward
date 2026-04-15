import type { Source } from "@/lib/types";

// ── Workflow types ──────────────────────────────────────────────────────────

export const BACKUP_WORKFLOW_TYPES = ["session-backup", "bulk-session-backup", "import-backup", "validate-package", "migration-preview"] as const;
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

export const MIGRATION_PREVIEW_SOURCE_PRODUCTS = ["antigravity", "windsurf", "codex", "imported", "generated"] as const;
export type MigrationPreviewSourceProduct = (typeof MIGRATION_PREVIEW_SOURCE_PRODUCTS)[number];

export const MIGRATION_PREVIEW_SOURCE_KINDS = ["session-evidence", "context-asset", "analysis-context", "project-overview"] as const;
export type MigrationPreviewSourceKind = (typeof MIGRATION_PREVIEW_SOURCE_KINDS)[number];

export const MIGRATION_PREVIEW_TARGET_PROFILES = ["session-backup-package", "reusable-context-assets", "project-context-subset"] as const;
export type MigrationPreviewTargetProfile = (typeof MIGRATION_PREVIEW_TARGET_PROFILES)[number];

export const MIGRATION_PREVIEW_SCOPE_KINDS = ["sessions", "assets", "project-context"] as const;
export type MigrationPreviewScopeKind = (typeof MIGRATION_PREVIEW_SCOPE_KINDS)[number];

export const MIGRATION_PREVIEW_CLASSIFICATIONS = ["portable", "degraded", "unsupported", "blocked"] as const;
export type MigrationPreviewClassification = (typeof MIGRATION_PREVIEW_CLASSIFICATIONS)[number];

export const MIGRATION_PREVIEW_AGGREGATE_STATUSES = ["preview-clear", "preview-with-concerns", "preview-with-blockers"] as const;
export type MigrationPreviewAggregateStatus = (typeof MIGRATION_PREVIEW_AGGREGATE_STATUSES)[number];

export type MigrationPreviewSourceContext = {
  product?: MigrationPreviewSourceProduct;
  kind?: MigrationPreviewSourceKind;
  label?: string;
};

export type MigrationPreviewTargetContext = {
  profile?: MigrationPreviewTargetProfile;
  label?: string;
};

export type MigrationPreviewScope = {
  kind?: MigrationPreviewScopeKind;
  itemRefs: string[];
  label?: string;
};

export type MigrationPreviewRepairTarget = "sessions" | "assets" | "analysis" | "overview";

export type MigrationPreviewItem = {
  id: string;
  label: string;
  scopeKind: MigrationPreviewScopeKind;
  sourceRef: string;
  classification: MigrationPreviewClassification;
  detail: string;
  repairTarget?: MigrationPreviewRepairTarget;
  repairLabel?: string;
};

export type MigrationPreviewAggregateCounts = Record<MigrationPreviewClassification, number>;

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
export type OperationResultStatus = BackupOperationStatus | MigrationPreviewAggregateStatus;

export type BackupOperationResult = {
  id: string;
  workflowType: BackupWorkflowType;
  status: OperationResultStatus;
  timestamp: string;
  summary: string;
  backupId?: string;
  sessionCount?: number;
  warnings?: string[];
  sourceCopySummary?: string;
  sessionResults?: BulkSessionExecutionResult[];
  previewSourceContext?: MigrationPreviewSourceContext;
  previewTargetContext?: MigrationPreviewTargetContext;
  previewScope?: MigrationPreviewScope;
  previewCounts?: MigrationPreviewAggregateCounts;
  previewItems?: MigrationPreviewItem[];
  issueLabel?: string;
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
  migrationPreviewSourceContext?: MigrationPreviewSourceContext;
  migrationPreviewTargetContext?: MigrationPreviewTargetContext;
  migrationPreviewScope?: MigrationPreviewScope;
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
  {
    type: "migration-preview",
    label: "Migration Preview",
    description: "Preview only: compare explicit source, target, and bounded scope before any migration action.",
    stepsLabel: ["Select source", "Configure preview", "Validate", "Result"],
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
    "migration-preview": "Migration Preview",
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
    case "migration-preview":
      return ["selection", "configuration", "validation", "result"];
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

// ── Migration preview formatting and helper functions ───────────────────────

export function formatMigrationPreviewSourceProductLabel(product: MigrationPreviewSourceProduct): string {
  if (product === "antigravity") return "Antigravity";
  if (product === "windsurf") return "Windsurf";
  if (product === "codex") return "Codex";
  return product.charAt(0).toUpperCase() + product.slice(1);
}

export function formatMigrationPreviewSourceKindLabel(kind: MigrationPreviewSourceKind): string {
  const labels: Record<MigrationPreviewSourceKind, string> = {
    "session-evidence": "Session evidence",
    "context-asset": "Reusable context asset",
    "analysis-context": "Analysis context",
    "project-overview": "Project overview",
  };
  return labels[kind];
}

export function formatMigrationPreviewTargetProfileLabel(profile: MigrationPreviewTargetProfile): string {
  const labels: Record<MigrationPreviewTargetProfile, string> = {
    "session-backup-package": "Session backup package",
    "reusable-context-assets": "Reusable context assets",
    "project-context-subset": "Project-context subset",
  };
  return labels[profile];
}

export function formatMigrationPreviewScopeLabel(kind: MigrationPreviewScopeKind): string {
  const labels: Record<MigrationPreviewScopeKind, string> = {
    sessions: "Sessions",
    assets: "Reusable context assets",
    "project-context": "Project-context subset",
  };
  return labels[kind];
}

export function formatMigrationPreviewClassificationLabel(classification: MigrationPreviewClassification): string {
  const labels: Record<MigrationPreviewClassification, string> = {
    portable: "Portable",
    degraded: "Degraded",
    unsupported: "Unsupported",
    blocked: "Blocked",
  };
  return labels[classification];
}

export function normalizeMigrationPreviewScope(scope?: MigrationPreviewScope | null): MigrationPreviewScope {
  const itemRefs = Array.from(new Set((scope?.itemRefs ?? []).map((item) => item.trim()).filter(Boolean)));

  return {
    kind: scope?.kind,
    itemRefs,
    label: scope?.label?.trim() || undefined,
  };
}

export function deriveMigrationPreviewValidationResult(input: {
  sourceContext?: MigrationPreviewSourceContext | null;
  targetContext?: MigrationPreviewTargetContext | null;
  scope?: MigrationPreviewScope | null;
}): BackupValidationResult {
  const normalizedScope = normalizeMigrationPreviewScope(input.scope);
  const items: BackupValidationItem[] = [];

  if (!input.sourceContext?.product || !input.sourceContext?.kind) {
    items.push({
      id: "v-preview-source-required",
      label: "Source context",
      severity: "block",
      detail: "Explicit source context is required before preview. Choose the source product and source context type.",
    });
  } else {
    items.push({
      id: "v-preview-source-ok",
      label: "Source context",
      severity: "ok",
      detail: `${formatMigrationPreviewSourceProductLabel(input.sourceContext.product)} / ${formatMigrationPreviewSourceKindLabel(input.sourceContext.kind)} is explicitly selected for preview.`,
    });
  }

  if (!input.targetContext?.profile) {
    items.push({
      id: "v-preview-target-required",
      label: "Target context",
      severity: "block",
      detail: "Explicit target context is required before preview. Choose the target profile to compare against.",
    });
  } else {
    items.push({
      id: "v-preview-target-ok",
      label: "Target context",
      severity: "ok",
      detail: `${formatMigrationPreviewTargetProfileLabel(input.targetContext.profile)} is selected as the preview target.`,
    });
  }

  if (!normalizedScope.kind) {
    items.push({
      id: "v-preview-scope-required",
      label: "Preview scope",
      severity: "block",
      detail: "A bounded preview scope is required before preview. Choose sessions, reusable context assets, or a project-context subset.",
    });
  } else if (normalizedScope.itemRefs.length === 0) {
    items.push({
      id: "v-preview-scope-empty",
      label: "Preview scope",
      severity: "warning",
      detail: `No previewable ${formatMigrationPreviewScopeLabel(normalizedScope.kind).toLowerCase()} are currently listed. Return to scope configuration to continue.`,
    });
  } else {
    items.push({
      id: "v-preview-scope-ok",
      label: "Preview scope",
      severity: "ok",
      detail: `${normalizedScope.itemRefs.length} ${formatMigrationPreviewScopeLabel(normalizedScope.kind).toLowerCase()} selected for preview-only classification.`,
    });
  }

  return deriveValidationResult(items);
}

function deriveMigrationPreviewRepairTarget(scopeKind: MigrationPreviewScopeKind, sourceKind?: MigrationPreviewSourceKind): MigrationPreviewRepairTarget {
  if (scopeKind === "sessions") return "sessions";
  if (scopeKind === "assets") return "assets";
  if (sourceKind === "analysis-context") return "analysis";
  return "overview";
}

function deriveMigrationPreviewClassification(input: {
  scopeKind: MigrationPreviewScopeKind;
  sourceRef: string;
  targetProfile: MigrationPreviewTargetProfile;
}): MigrationPreviewClassification {
  const normalizedRef = input.sourceRef.trim().toLowerCase();
  const isBlocked = ["missing", "orphaned", "unresolved", "unknown-imported", "unavailable"].some((token) => normalizedRef.includes(token));
  const isUnsupported = ["unsupported", "skill"].some((token) => normalizedRef.includes(token)) ||
    (input.targetProfile === "session-backup-package" && input.scopeKind === "assets" && normalizedRef.includes("command"));
  const isDegraded = ["stale", "memory", "project-context"].some((token) => normalizedRef.includes(token)) ||
    input.scopeKind === "project-context" ||
    input.targetProfile === "project-context-subset";

  if (isBlocked) return "blocked";
  if (isUnsupported) return "unsupported";
  if (isDegraded) return "degraded";
  return "portable";
}

export function classifyMigrationPreviewItem(input: {
  sourceContext: MigrationPreviewSourceContext;
  targetContext: MigrationPreviewTargetContext;
  scopeKind: MigrationPreviewScopeKind;
  sourceRef: string;
}): MigrationPreviewItem {
  const normalizedRef = input.sourceRef.trim();
  const repairTarget = deriveMigrationPreviewRepairTarget(input.scopeKind, input.sourceContext.kind);
  const targetProfile = input.targetContext.profile;

  if (!targetProfile) {
    return {
      id: `${input.scopeKind}:${normalizedRef}`,
      label: normalizedRef,
      scopeKind: input.scopeKind,
      sourceRef: normalizedRef,
      classification: "blocked",
      detail: `Preview only: ${normalizedRef} is blocked because the target profile is incomplete and the migration preview cannot classify its destination.`,
      repairTarget,
      repairLabel: `Inspect in ${repairTarget}`,
    };
  }

  const classification = deriveMigrationPreviewClassification({
    scopeKind: input.scopeKind,
    sourceRef: normalizedRef,
    targetProfile,
  });
  const targetLabel = formatMigrationPreviewTargetProfileLabel(targetProfile);

  return {
    id: `${input.scopeKind}:${normalizedRef}`,
    label: normalizedRef,
    scopeKind: input.scopeKind,
    sourceRef: normalizedRef,
    classification,
    detail:
      classification === "portable"
        ? `Preview only: ${normalizedRef} maps cleanly into ${targetLabel} with recognized metadata.`
        : classification === "degraded"
          ? `Preview only: ${normalizedRef} can be represented in ${targetLabel}, but fidelity or contextual detail will be reduced.`
          : classification === "unsupported"
            ? `Preview only: ${normalizedRef} has no supported mapping into ${targetLabel} in this bounded preview.`
            : `Preview only: ${normalizedRef} is blocked because canonical data, provenance, or required source detail is incomplete.`,
    repairTarget,
    repairLabel: classification === "portable" ? undefined : `Inspect in ${repairTarget}`,
  };
}

export function deriveMigrationPreviewCounts(items: MigrationPreviewItem[]): MigrationPreviewAggregateCounts {
  return items.reduce<MigrationPreviewAggregateCounts>(
    (counts, item) => {
      counts[item.classification] += 1;
      return counts;
    },
    {
      portable: 0,
      degraded: 0,
      unsupported: 0,
      blocked: 0,
    }
  );
}

export function deriveMigrationPreviewAggregateStatus(items: MigrationPreviewItem[]): MigrationPreviewAggregateStatus {
  if (items.length === 0) return "preview-with-concerns";
  const counts = deriveMigrationPreviewCounts(items);
  if (counts.unsupported > 0 || counts.blocked > 0) return "preview-with-blockers";
  if (counts.degraded > 0) return "preview-with-concerns";
  return "preview-clear";
}

export function buildMigrationPreviewItems(input: {
  sourceContext: MigrationPreviewSourceContext;
  targetContext: MigrationPreviewTargetContext;
  scope: MigrationPreviewScope;
}): MigrationPreviewItem[] {
  const normalizedScope = normalizeMigrationPreviewScope(input.scope);
  if (!normalizedScope.kind) return [];

  return normalizedScope.itemRefs.map((sourceRef) =>
    classifyMigrationPreviewItem({
      sourceContext: input.sourceContext,
      targetContext: input.targetContext,
      scopeKind: normalizedScope.kind!,
      sourceRef,
    })
  );
}

export function createMigrationPreviewSummary(input: {
  scope: MigrationPreviewScope;
  counts: MigrationPreviewAggregateCounts;
}): string {
  const normalizedScope = normalizeMigrationPreviewScope(input.scope);
  const scopeLabel = normalizedScope.kind ? formatMigrationPreviewScopeLabel(normalizedScope.kind).toLowerCase() : "items";
  const total = Object.values(input.counts).reduce((sum, count) => sum + count, 0);

  return `Preview only: ${total} ${scopeLabel} checked — ${input.counts.portable} portable, ${input.counts.degraded} degraded, ${input.counts.unsupported} unsupported, ${input.counts.blocked} blocked.`;
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

let operationCounter = 0;

export function createOperationResult(input: {
  workflowType: BackupWorkflowType;
  status: OperationResultStatus;
  summary: string;
  backupId?: string;
  sessionCount?: number;
  warnings?: string[];
  sourceCopySummary?: string;
  sessionResults?: BulkSessionExecutionResult[];
  previewSourceContext?: MigrationPreviewSourceContext;
  previewTargetContext?: MigrationPreviewTargetContext;
  previewScope?: MigrationPreviewScope;
  previewCounts?: MigrationPreviewAggregateCounts;
  previewItems?: MigrationPreviewItem[];
  issueLabel?: string;
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
    previewSourceContext: input.previewSourceContext,
    previewTargetContext: input.previewTargetContext,
    previewScope: input.previewScope,
    previewCounts: input.previewCounts,
    previewItems: input.previewItems,
    issueLabel: input.issueLabel,
  };
}

export function createMigrationPreviewOperationResult(input: {
  sourceContext: MigrationPreviewSourceContext;
  targetContext: MigrationPreviewTargetContext;
  scope: MigrationPreviewScope;
  items: MigrationPreviewItem[];
  issueLabel?: string;
}): BackupOperationResult {
  const counts = deriveMigrationPreviewCounts(input.items);
  return createOperationResult({
    workflowType: "migration-preview",
    status: deriveMigrationPreviewAggregateStatus(input.items),
    summary: createMigrationPreviewSummary({ scope: input.scope, counts }),
    previewSourceContext: input.sourceContext,
    previewTargetContext: input.targetContext,
    previewScope: normalizeMigrationPreviewScope(input.scope),
    previewCounts: counts,
    previewItems: input.items,
    issueLabel: input.issueLabel,
  });
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

export function addRecentOperation(
  operations: RecentOperation[],
  operation: RecentOperation,
  maxCount = 20
): RecentOperation[] {
  return [operation, ...operations].slice(0, maxCount);
}

export function resolveWorkflowFromHandoff(
  handoff: BackupMigrationHandoff | null
): BackupWorkflowType | null {
  if (!handoff) return null;

  if (handoff.workflowType && BACKUP_WORKFLOW_TYPES.includes(handoff.workflowType)) {
    return handoff.workflowType;
  }

  if (handoff.migrationPreviewSourceContext || handoff.migrationPreviewTargetContext || handoff.migrationPreviewScope) {
    return "migration-preview";
  }
  if ((handoff.sessions?.length ?? 0) > 1) return "bulk-session-backup";
  if (handoff.sessionId) return "session-backup";
  if (handoff.origin === "overview") return null;
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
    handoff.migrationPreviewSourceContext?.product ?? "no-preview-source-product",
    handoff.migrationPreviewSourceContext?.kind ?? "no-preview-source-kind",
    handoff.migrationPreviewTargetContext?.profile ?? "no-preview-target-profile",
    handoff.migrationPreviewScope?.kind ?? "no-preview-scope-kind",
    handoff.migrationPreviewScope?.itemRefs?.join("|") ?? "no-preview-scope-items",
    handoff.subtitle,
  ].join(":");
}
