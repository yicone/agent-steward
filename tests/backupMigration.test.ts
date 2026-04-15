import { describe, expect, it } from "vitest";

import {
  addRecentOperation,
  buildBulkSessionValidationResult,
  buildMigrationPreviewItems,
  buildPackageValidationItems,
  buildBackupHandoffInstanceKey,
  buildSessionBackupExecutionRequest,
  canProceedFromValidation,
  createMigrationPreviewOperationResult,
  createBulkOperationSummary,
  createOperationResult,
  dedupeSessionSelections,
  deriveAggregateOperationStatus,
  deriveMigrationPreviewAggregateStatus,
  deriveMigrationPreviewValidationResult,
  deriveValidationResult,
  formatWorkflowStateLabel,
  formatMigrationPreviewClassificationLabel,
  formatWorkflowTypeLabel,
  getNextState,
  getPreviousState,
  getStepsForWorkflow,
  getWorkflowDescriptor,
  isTerminalState,
  normalizeBackupId,
  resolveWorkflowFromHandoff,
  validateBackupPackageRemote,
  BACKUP_WORKFLOW_TYPES,
  type BackupMigrationHandoff,
  type BackupValidationItem,
} from "@/lib/backupMigration";

describe("getWorkflowDescriptor", () => {
  it("returns the correct descriptor for each workflow type", () => {
    for (const type of BACKUP_WORKFLOW_TYPES) {
      const descriptor = getWorkflowDescriptor(type);
      expect(descriptor.type).toBe(type);
      expect(descriptor.label).toBeTruthy();
      expect(descriptor.description).toBeTruthy();
      expect(descriptor.stepsLabel.length).toBeGreaterThan(0);
    }
  });

  it("retains migration preview metadata when provided", () => {
    const result = createOperationResult({
      workflowType: "migration-preview",
      status: "preview-with-concerns",
      summary: "Preview only: 2 assets checked.",
      previewSourceContext: { product: "codex", kind: "context-asset" },
      previewTargetContext: { profile: "reusable-context-assets" },
      previewScope: { kind: "assets", itemRefs: ["asset-1", "asset-2"] },
      previewCounts: { portable: 1, degraded: 1, unsupported: 0, blocked: 0 },
    });

    expect(result.workflowType).toBe("migration-preview");
    expect(result.status).toBe("preview-with-concerns");
    expect(result.previewScope?.itemRefs).toEqual(["asset-1", "asset-2"]);
    expect(result.previewCounts?.degraded).toBe(1);
  });
});

describe("migration preview model tests", () => {
  it("returns the correct workflow label for migration-preview", () => {
    expect(formatWorkflowTypeLabel("migration-preview")).toBe("Migration Preview");
  });

  it("returns the correct steps for migration-preview", () => {
    expect(getStepsForWorkflow("migration-preview")).toEqual(["selection", "configuration", "validation", "result"]);
  });

  it("builds invalid preview validation when explicit fields are missing", () => {
    const result = deriveMigrationPreviewValidationResult({
      sourceContext: {},
      targetContext: {},
      scope: { itemRefs: [] },
    });

    expect(result.status).toBe("invalid");
    expect(result.items.map((item) => item.label)).toEqual(["Source context", "Target context", "Preview scope"]);
  });

  it("builds warning preview validation when scope kind exists but no items are listed", () => {
    const result = deriveMigrationPreviewValidationResult({
      sourceContext: { product: "codex", kind: "context-asset" },
      targetContext: { profile: "reusable-context-assets" },
      scope: { kind: "assets", itemRefs: [] },
    });

    expect(result.status).toBe("valid-with-warnings");
    expect(result.items.some((item) => item.id === "v-preview-scope-empty")).toBe(true);
  });

  it("classifies preview items with blocked precedence over degraded and unsupported", () => {
    const items = buildMigrationPreviewItems({
      sourceContext: { product: "windsurf", kind: "context-asset" },
      targetContext: { profile: "reusable-context-assets" },
      scope: {
        kind: "assets",
        itemRefs: ["asset-memory-user-windsurf", "asset-skill-global-generated", "asset-command-project-antigravity", "missing-asset-ref"],
      },
    });

    expect(items.map((item) => item.classification)).toEqual(["degraded", "unsupported", "portable", "blocked"]);
    expect(formatMigrationPreviewClassificationLabel(items[0]!.classification)).toBe("Degraded");
  });

  it("derives blocker aggregate status when any preview item is unsupported or blocked", () => {
    const items = buildMigrationPreviewItems({
      sourceContext: { product: "codex", kind: "context-asset" },
      targetContext: { profile: "reusable-context-assets" },
      scope: { kind: "assets", itemRefs: ["asset-skill-global-generated"] },
    });

    expect(deriveMigrationPreviewAggregateStatus(items)).toBe("preview-with-blockers");
  });

  it("creates migration preview operation results with preview-only summary metadata", () => {
    const items = buildMigrationPreviewItems({
      sourceContext: { product: "codex", kind: "context-asset" },
      targetContext: { profile: "reusable-context-assets" },
      scope: { kind: "assets", itemRefs: ["asset-rule-project-codex", "asset-memory-user-windsurf"] },
    });

    const result = createMigrationPreviewOperationResult({
      sourceContext: { product: "codex", kind: "context-asset" },
      targetContext: { profile: "reusable-context-assets" },
      scope: { kind: "assets", itemRefs: ["asset-rule-project-codex", "asset-memory-user-windsurf"] },
      items,
      issueLabel: "asset migration review",
    });

    expect(result.status).toBe("preview-with-concerns");
    expect(result.summary).toContain("Preview only");
    expect(result.previewItems).toHaveLength(2);
    expect(result.issueLabel).toBe("asset migration review");
  });

  it("resolves migration-preview workflow from handoff", () => {
    const handoff: BackupMigrationHandoff = {
      origin: "analysis",
      subtitle: "Migration preview for stale memory.",
      workflowType: "migration-preview",
      migrationPreviewSourceContext: { product: "windsurf", kind: "analysis-context" },
      migrationPreviewTargetContext: { profile: "reusable-context-assets" },
      migrationPreviewScope: { kind: "assets", itemRefs: ["asset-memory-user-windsurf"] },
    };

    expect(resolveWorkflowFromHandoff(handoff)).toBe("migration-preview");
  });
});

describe("formatWorkflowTypeLabel", () => {
  it("returns a human-readable label", () => {
    expect(formatWorkflowTypeLabel("session-backup")).toBe("Session Backup");
    expect(formatWorkflowTypeLabel("bulk-session-backup")).toBe("Bulk Session Backup");
    expect(formatWorkflowTypeLabel("import-backup")).toBe("Import Backup");
    expect(formatWorkflowTypeLabel("validate-package")).toBe("Validate Package");
    expect(formatWorkflowTypeLabel("migration-preview")).toBe("Migration Preview");
  });
});

describe("formatWorkflowStateLabel", () => {
  it("returns a human-readable label for each state", () => {
    expect(formatWorkflowStateLabel("idle")).toBe("Idle");
    expect(formatWorkflowStateLabel("execution")).toBe("Executing…");
    expect(formatWorkflowStateLabel("result")).toBe("Result");
    expect(formatWorkflowStateLabel("failed")).toBe("Failed");
  });
});

describe("getStepsForWorkflow", () => {
  it("returns steps for session-backup", () => {
    const steps = getStepsForWorkflow("session-backup");
    expect(steps).toEqual(["selection", "configuration", "validation", "confirmation", "execution", "result"]);
  });

  it("returns steps for bulk-session-backup", () => {
    const steps = getStepsForWorkflow("bulk-session-backup");
    expect(steps).toEqual(["selection", "configuration", "validation", "confirmation", "execution", "result"]);
  });

  it("returns steps for import-backup", () => {
    const steps = getStepsForWorkflow("import-backup");
    expect(steps).toEqual(["selection", "validation", "confirmation", "execution", "result"]);
  });

  it("returns steps for validate-package", () => {
    const steps = getStepsForWorkflow("validate-package");
    expect(steps).toEqual(["selection", "validation", "result"]);
  });

  it("returns steps for migration-preview", () => {
    const steps = getStepsForWorkflow("migration-preview");
    expect(steps).toEqual(["selection", "configuration", "validation", "result"]);
  });
});

describe("getNextState / getPreviousState", () => {
  it("advances through session-backup states", () => {
    expect(getNextState("session-backup", "selection")).toBe("configuration");
    expect(getNextState("session-backup", "configuration")).toBe("validation");
    expect(getNextState("session-backup", "result")).toBeNull();
  });

  it("retreats through session-backup states", () => {
    expect(getPreviousState("session-backup", "configuration")).toBe("selection");
    expect(getPreviousState("session-backup", "selection")).toBeNull();
  });

  it("returns null for unknown states", () => {
    expect(getNextState("session-backup", "idle")).toBeNull();
    expect(getPreviousState("session-backup", "idle")).toBeNull();
  });
});

describe("isTerminalState", () => {
  it("identifies result and failed as terminal", () => {
    expect(isTerminalState("result")).toBe(true);
    expect(isTerminalState("failed")).toBe(true);
  });

  it("identifies non-terminal states", () => {
    expect(isTerminalState("idle")).toBe(false);
    expect(isTerminalState("selection")).toBe(false);
    expect(isTerminalState("execution")).toBe(false);
  });
});

describe("deriveValidationResult", () => {
  it("returns valid when all items are ok", () => {
    const items: BackupValidationItem[] = [
      { id: "v1", label: "Schema", severity: "ok", detail: "OK" },
      { id: "v2", label: "Integrity", severity: "ok", detail: "OK" },
    ];
    const result = deriveValidationResult(items);
    expect(result.status).toBe("valid");
  });

  it("returns valid-with-warnings when a warning is present", () => {
    const items: BackupValidationItem[] = [
      { id: "v1", label: "Schema", severity: "ok", detail: "OK" },
      { id: "v2", label: "Runtime", severity: "warning", detail: "No runtime restore" },
    ];
    const result = deriveValidationResult(items);
    expect(result.status).toBe("valid-with-warnings");
  });

  it("returns invalid when a block is present", () => {
    const items: BackupValidationItem[] = [
      { id: "v1", label: "Missing", severity: "block", detail: "No session" },
    ];
    const result = deriveValidationResult(items);
    expect(result.status).toBe("invalid");
  });

  it("prefers block over warning", () => {
    const items: BackupValidationItem[] = [
      { id: "v1", label: "Warning", severity: "warning", detail: "Warn" },
      { id: "v2", label: "Block", severity: "block", detail: "Block" },
    ];
    const result = deriveValidationResult(items);
    expect(result.status).toBe("invalid");
  });
});

describe("canProceedFromValidation", () => {
  it("allows proceeding for valid and valid-with-warnings", () => {
    expect(canProceedFromValidation({ status: "valid", items: [] })).toBe(true);
    expect(canProceedFromValidation({ status: "valid-with-warnings", items: [] })).toBe(true);
  });

  it("blocks proceeding for invalid", () => {
    expect(canProceedFromValidation({ status: "invalid", items: [] })).toBe(false);
  });
});

describe("createOperationResult", () => {
  it("creates a result with unique id and timestamp", () => {
    const result = createOperationResult({
      workflowType: "session-backup",
      status: "success",
      summary: "Session backed up.",
    });

    expect(result.id).toMatch(/^op-/);
    expect(result.workflowType).toBe("session-backup");
    expect(result.status).toBe("success");
    expect(result.summary).toBe("Session backed up.");
    expect(result.timestamp).toBeTruthy();
  });

  it("produces different ids for successive calls", () => {
    const r1 = createOperationResult({ workflowType: "session-backup", status: "success", summary: "A" });
    const r2 = createOperationResult({ workflowType: "import-backup", status: "failed", summary: "B" });
    expect(r1.id).not.toBe(r2.id);
  });

  it("retains bulk metadata when provided", () => {
    const result = createOperationResult({
      workflowType: "bulk-session-backup",
      status: "success-with-warnings",
      summary: "Backed up 2 of 3 selected sessions.",
      sessionCount: 3,
      sourceCopySummary: "Source copy requested for 1 of 3 selected sessions.",
      sessionResults: [
        {
          sessionId: "session-1",
          source: "codex",
          status: "success",
          summary: "Session session-1 backed up successfully.",
        },
      ],
    });

    expect(result.workflowType).toBe("bulk-session-backup");
    expect(result.sessionCount).toBe(3);
    expect(result.sourceCopySummary).toContain("Source copy requested");
    expect(result.sessionResults).toHaveLength(1);
  });
});

describe("bulk session backup helpers", () => {
  it("dedupes repeated session selections", () => {
    expect(
      dedupeSessionSelections([
        { sessionId: "session-1", source: "codex", rootId: "root-a" },
        { sessionId: "session-1", source: "codex", rootId: "root-a" },
        { sessionId: "session-2", source: "windsurf" },
      ])
    ).toEqual([
      { sessionId: "session-1", source: "codex", rootId: "root-a", includeSourceCopy: false, unresolvedReason: undefined },
      { sessionId: "session-2", source: "windsurf", rootId: undefined, includeSourceCopy: false, unresolvedReason: undefined },
    ]);
  });

  it("builds invalid validation result when no sessions are selected", () => {
    const result = buildBulkSessionValidationResult([]);
    expect(result.status).toBe("invalid");
    expect(result.selectedCount).toBe(0);
    expect(result.blockCount).toBe(1);
  });

  it("surfaces warnings and blocks per selected session", () => {
    const result = buildBulkSessionValidationResult([
      { sessionId: "session-1", source: "codex", includeSourceCopy: true },
      { sessionId: "session-2", source: "windsurf", includeSourceCopy: true },
      { sessionId: "", unresolvedReason: "Canonical record is missing." },
    ]);

    expect(result.status).toBe("invalid");
    expect(result.selectedCount).toBe(3);
    expect(result.warningCount).toBeGreaterThan(0);
    expect(result.blockCount).toBeGreaterThan(0);
    expect(result.sessionResults).toHaveLength(3);
  });

  it("derives aggregate success-with-warnings for mixed batch results", () => {
    expect(
      deriveAggregateOperationStatus([
        { sessionId: "session-1", status: "success", summary: "ok" },
        { sessionId: "session-2", status: "failed", summary: "failed" },
      ])
    ).toBe("success-with-warnings");
  });

  it("derives full failure when every session fails", () => {
    expect(
      deriveAggregateOperationStatus([
        { sessionId: "session-1", status: "failed", summary: "failed" },
        { sessionId: "session-2", status: "failed", summary: "failed" },
      ])
    ).toBe("failed");
  });

  it("creates aggregate batch summaries", () => {
    expect(
      createBulkOperationSummary([
        { sessionId: "session-1", status: "success", summary: "ok" },
        { sessionId: "session-2", status: "success", summary: "ok" },
      ])
    ).toContain("2 selected sessions successfully");

    expect(
      createBulkOperationSummary([
        { sessionId: "session-1", status: "success", summary: "ok" },
        { sessionId: "session-2", status: "failed", summary: "failed" },
      ])
    ).toContain("1 of 2 selected sessions");
  });
});

describe("buildSessionBackupExecutionRequest", () => {
  it("includes rootId and source-copy flag for codex when requested", () => {
    expect(
      buildSessionBackupExecutionRequest({
        source: "codex",
        sessionId: "session-1",
        rootId: "root-a",
        includeSourceCopy: true,
      })
    ).toEqual({
      source: "codex",
      sessionId: "session-1",
      rootId: "root-a",
      includeSourceCopy: true,
    });
  });

  it("drops unsupported source-copy requests for non-codex sources", () => {
    expect(
      buildSessionBackupExecutionRequest({
        source: "windsurf",
        sessionId: "session-2",
        rootId: "root-b",
        includeSourceCopy: true,
      })
    ).toEqual({
      source: "windsurf",
      sessionId: "session-2",
      rootId: "root-b",
    });
  });
});

describe("normalizeBackupId", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeBackupId("  backup-1  ")).toBe("backup-1");
    expect(normalizeBackupId("\nbackup-2\t")).toBe("backup-2");
  });
});

describe("buildPackageValidationItems", () => {
  it("returns blocking diagnostics when verify fails", () => {
    expect(
      buildPackageValidationItems({
        backupId: "missing-backup",
        responseOk: false,
        payload: {
          title: "Backup package not found",
          error: "The requested backup package could not be found in the managed backup store.",
          code: "BACKUP_NOT_FOUND",
          hint: "Check the backup ID and retry verification.",
        },
      })
    ).toEqual([
      {
        id: "v-package-invalid",
        label: "Backup package not found",
        severity: "block",
        detail: "The requested backup package could not be found in the managed backup store. Code: BACKUP_NOT_FOUND Check the backup ID and retry verification.",
      },
    ]);
  });

  it("returns validation-first success items when verify succeeds", () => {
    expect(
      buildPackageValidationItems({
        backupId: "backup-1",
        responseOk: true,
        payload: {
          backupId: "backup-1",
          verified: true,
          manifest: {
            schemaVersion: "session-backup/v1",
            createdBy: "agent-storage-manager",
          },
        },
      })
    ).toEqual([
      {
        id: "v-schema",
        label: "Schema version",
        severity: "ok",
        detail: "session-backup/v1 is supported.",
      },
      {
        id: "v-integrity",
        label: "Package integrity",
        severity: "ok",
        detail: "Backup backup-1 passed manifest and record verification.",
      },
      {
        id: "v-provenance",
        label: "Provenance",
        severity: "ok",
        detail: "Created by agent-storage-manager.",
      },
      {
        id: "v-no-runtime",
        label: "No vendor-runtime restore",
        severity: "warning",
        detail: "Import restores product-readable state only. Sessions will not reopen inside a third-party agent runtime.",
      },
    ]);
  });
});

describe("validateBackupPackageRemote", () => {
  it("returns a blocking validation item when remote verification reports a missing package", async () => {
    const fetchMock = async () =>
      ({
        ok: false,
        json: async () => ({
          title: "Backup not found",
          error: "The requested backup package could not be found in the managed backup store.",
          code: "BACKUP_NOT_FOUND",
          hint: "Check the backup ID and retry verification.",
        }),
      }) as Response;

    await expect(validateBackupPackageRemote(fetchMock as typeof fetch, " bad-package-id ")).resolves.toEqual([
      {
        id: "v-package-invalid",
        label: "Backup not found",
        severity: "block",
        detail: "The requested backup package could not be found in the managed backup store. Code: BACKUP_NOT_FOUND Check the backup ID and retry verification.",
      },
    ]);
  });

  it("returns a blocking validation item when the verification request itself fails", async () => {
    const fetchMock = async () => {
      throw new Error("network down");
    };

    await expect(validateBackupPackageRemote(fetchMock as typeof fetch, "backup-1")).resolves.toEqual([
      {
        id: "v-verify-request-failed",
        label: "Package verification request failed",
        severity: "block",
        detail: "Unable to verify backup backup-1. network down",
      },
    ]);
  });
});

describe("addRecentOperation", () => {
  it("prepends the new operation", () => {
    const first = createOperationResult({ workflowType: "session-backup", status: "success", summary: "First" });
    const second = createOperationResult({ workflowType: "import-backup", status: "success", summary: "Second" });

    const list = addRecentOperation([first], second);
    expect(list[0]!.summary).toBe("Second");
    expect(list[1]!.summary).toBe("First");
  });

  it("respects maxCount", () => {
    const ops = Array.from({ length: 5 }, (_, i) =>
      createOperationResult({ workflowType: "session-backup", status: "success", summary: `Op ${i}` })
    );
    const newOp = createOperationResult({ workflowType: "session-backup", status: "success", summary: "New" });

    const list = addRecentOperation(ops, newOp, 3);
    expect(list.length).toBe(3);
    expect(list[0]!.summary).toBe("New");
  });
});

describe("resolveWorkflowFromHandoff", () => {
  it("returns null for null handoff", () => {
    expect(resolveWorkflowFromHandoff(null)).toBeNull();
  });

  it("returns the explicit workflowType when present", () => {
    const handoff: BackupMigrationHandoff = {
      origin: "analysis",
      subtitle: "Test",
      workflowType: "import-backup",
    };
    expect(resolveWorkflowFromHandoff(handoff)).toBe("import-backup");
  });

  it("infers session-backup when sessionId is present", () => {
    const handoff: BackupMigrationHandoff = {
      origin: "sessions",
      subtitle: "Test",
      sessionId: "session-1",
      source: "codex",
    };
    expect(resolveWorkflowFromHandoff(handoff)).toBe("session-backup");
  });

  it("infers bulk-session-backup when routed sessions are present", () => {
    const handoff: BackupMigrationHandoff = {
      origin: "sessions",
      subtitle: "Bulk backup routed from Sessions.",
      sessions: [
        { sessionId: "session-1", source: "codex" },
        { sessionId: "session-2", source: "windsurf" },
      ],
    };
    expect(resolveWorkflowFromHandoff(handoff)).toBe("bulk-session-backup");
  });

  it("infers session-backup from preservation finding", () => {
    const handoff: BackupMigrationHandoff = {
      origin: "analysis",
      subtitle: "Test",
      findingId: "finding-1",
      preservationWarning: "Preserve first",
    };
    expect(resolveWorkflowFromHandoff(handoff)).toBe("session-backup");
  });

  it("returns null for overview without explicit workflow", () => {
    const handoff: BackupMigrationHandoff = {
      origin: "overview",
      subtitle: "Test",
    };
    expect(resolveWorkflowFromHandoff(handoff)).toBeNull();
  });
});

describe("buildBackupHandoffInstanceKey", () => {
  it("returns stable key for null handoff", () => {
    expect(buildBackupHandoffInstanceKey(null)).toBe("backup:no-handoff");
  });

  it("changes when handoff context changes", () => {
    const first = buildBackupHandoffInstanceKey({
      origin: "sessions",
      subtitle: "Test",
      sessionId: "session-1",
      source: "codex",
    });
    const second = buildBackupHandoffInstanceKey({
      origin: "analysis",
      subtitle: "Test",
      findingId: "finding-1",
    });

    expect(first).not.toBe(second);
  });

  it("changes when bulk routed session sets change", () => {
    const first = buildBackupHandoffInstanceKey({
      origin: "sessions",
      subtitle: "Bulk backup routed from Sessions.",
      workflowType: "bulk-session-backup",
      sessions: [{ sessionId: "session-1", source: "codex" }],
    });
    const second = buildBackupHandoffInstanceKey({
      origin: "sessions",
      subtitle: "Bulk backup routed from Sessions.",
      workflowType: "bulk-session-backup",
      sessions: [{ sessionId: "session-2", source: "codex" }],
    });

    expect(first).not.toBe(second);
  });

  it("changes when session root changes", () => {
    const first = buildBackupHandoffInstanceKey({
      origin: "sessions",
      subtitle: "Test",
      sessionId: "session-1",
      source: "codex",
      rootId: "root-a",
    });
    const second = buildBackupHandoffInstanceKey({
      origin: "sessions",
      subtitle: "Test",
      sessionId: "session-1",
      source: "codex",
      rootId: "root-b",
    });

    expect(first).not.toBe(second);
  });
});
