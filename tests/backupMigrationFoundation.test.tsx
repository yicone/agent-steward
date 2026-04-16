import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  BackupMigrationFoundation,
  buildBulkConfirmationDetails,
  resolveInitialBulkSelections,
  resolveInitialProjectBundleSessionSelections,
  OperationResultPanel,
  resolveMigrationPreviewInvalidWorkflowState,
  ValidationPanel,
} from "@/components/BackupMigrationFoundation";
import type { BackupMigrationHandoff } from "@/lib/backupMigration";

function renderBackupMigrationFoundation(handoff: BackupMigrationHandoff | null) {
  return renderToStaticMarkup(
    <BackupMigrationFoundation
      handoff={handoff}
      onNavigateOverview={vi.fn()}
      onNavigateSessions={vi.fn()}
    />
  );
}

function renderValidationPanel() {
  return renderToStaticMarkup(
    <ValidationPanel
      result={{
        status: "invalid",
        items: [
          {
            id: "session-1-warning",
            label: "session-1 — Source-copy readiness",
            severity: "warning",
            detail: "Source copy is unavailable for this selected session.",
          },
          {
            id: "session-2-block",
            label: "session-2 — Canonical record availability",
            severity: "block",
            detail: "Canonical record is missing.",
          },
        ],
      }}
    />
  );
}

function renderOperationResultPanel() {
  return renderToStaticMarkup(
    <OperationResultPanel
      result={{
        id: "op-bulk-1",
        workflowType: "bulk-session-backup",
        status: "success-with-warnings",
        timestamp: "2026-04-15T12:00:00Z",
        summary: "Backed up 1 of 2 selected sessions.",
        sessionCount: 2,
        sourceCopySummary: "Source copy requested for 1 of 2 selected sessions.",
        sessionResults: [
          {
            sessionId: "session-1",
            source: "codex",
            rootId: "root-a",
            status: "success",
            summary: "Session session-1 backed up successfully.",
            backupId: "backup-1",
          },
          {
            sessionId: "session-2",
            source: "windsurf",
            status: "failed",
            summary: "Session session-2 backup failed.",
            error: "Canonical record could not be read.",
          },
        ],
      }}
      onNewWorkflow={vi.fn()}
    />
  );
}

function renderMigrationPreviewResultPanel() {
  return renderToStaticMarkup(
    <OperationResultPanel
      result={{
        id: "op-preview-1",
        workflowType: "migration-preview",
        status: "preview-with-concerns",
        timestamp: "2026-04-15T13:00:00Z",
        summary: "Preview only: 2 reusable context assets checked — 1 portable, 1 degraded, 0 unsupported, 0 blocked.",
        previewSourceContext: { product: "codex", kind: "context-asset" },
        previewTargetContext: { profile: "reusable-context-assets" },
        previewScope: { kind: "assets", itemRefs: ["asset-rule-project-codex", "asset-memory-user-windsurf"] },
        previewCounts: { portable: 1, degraded: 1, unsupported: 0, blocked: 0 },
        previewItems: [
          {
            id: "assets:asset-rule-project-codex",
            label: "asset-rule-project-codex",
            scopeKind: "assets",
            sourceRef: "asset-rule-project-codex",
            classification: "portable",
            detail: "Preview only: asset-rule-project-codex maps cleanly into Reusable context assets with recognized metadata.",
          },
          {
            id: "assets:asset-memory-user-windsurf",
            label: "asset-memory-user-windsurf",
            scopeKind: "assets",
            sourceRef: "asset-memory-user-windsurf",
            classification: "degraded",
            detail: "Preview only: asset-memory-user-windsurf can be represented in Reusable context assets, but fidelity or contextual detail will be reduced.",
            repairTarget: "assets",
          },
        ],
      }}
      onNewWorkflow={vi.fn()}
      onReconfigurePreview={vi.fn()}
    />
  );
}

function renderMigrationPreviewBlockerResultPanel() {
  return renderToStaticMarkup(
    <OperationResultPanel
      result={{
        id: "op-preview-blocked",
        workflowType: "migration-preview",
        status: "preview-with-blockers",
        timestamp: "2026-04-15T13:00:00Z",
        summary: "Preview only: 1 reusable context asset checked — 0 portable, 0 degraded, 0 unsupported, 1 blocked.",
        previewSourceContext: { product: "codex", kind: "context-asset" },
        previewTargetContext: { profile: "reusable-context-assets" },
        previewScope: { kind: "assets", itemRefs: ["missing-asset-ref"] },
        previewCounts: { portable: 0, degraded: 0, unsupported: 0, blocked: 1 },
        previewItems: [
          {
            id: "assets:missing-asset-ref",
            label: "missing-asset-ref",
            scopeKind: "assets",
            sourceRef: "missing-asset-ref",
            classification: "blocked",
            detail: "Preview only: missing-asset-ref is blocked because canonical data, provenance, or required source detail is incomplete.",
            repairTarget: "assets",
          },
        ],
      }}
      onNewWorkflow={vi.fn()}
      onReconfigurePreview={vi.fn()}
    />
  );
}

describe("BackupMigrationFoundation", () => {
  it("keeps invalid migration preview validation on the owning input step", () => {
    expect(resolveMigrationPreviewInvalidWorkflowState({ sourceContext: {} })).toBe("selection");
    expect(resolveMigrationPreviewInvalidWorkflowState({ sourceContext: { product: "codex" } })).toBe("selection");
    expect(resolveMigrationPreviewInvalidWorkflowState({ sourceContext: { product: "codex", kind: "session-evidence" } })).toBe("configuration");
  });

  it("renders idle workflow selector including migration preview", () => {
    const html = renderBackupMigrationFoundation(null);

    expect(html).toContain("Backup / Migration");
    expect(html).toContain("Choose a bounded workflow below.");
    expect(html).toContain("Start Session Backup");
    expect(html).toContain("Start Bulk Session Backup");
    expect(html).toContain("Start Import Backup");
    expect(html).toContain("Start Validate Package");
    expect(html).toContain("Start Migration Preview");
    expect(html).toContain("Start Project Bundle");
    expect(html).toContain("does not support migration apply, vendor-runtime restore, or cloud sync");
  });

  it("renders routed session-backup workflow with prefilling context", () => {
    const html = renderBackupMigrationFoundation({
      origin: "sessions",
      subtitle: "Back up session session-1 from Sessions.",
      workflowType: "session-backup",
      sessionId: "session-1",
      source: "codex",
      rootId: "root-a",
      continueLabel: "Use the session backup workflow to preserve this session record.",
      returnLabel: "Return to the originating session for evidence review.",
    });

    expect(html).toContain("routed workflow");
    expect(html).toContain("from sessions");
    expect(html).toContain("Session Backup");
    expect(html).toContain("Selection");
    expect(html).toContain("session-1");
    expect(html).toContain("Pre-filled from routed handoff.");
  });

  it("opens migration preview from asset-routed handoff with explicit scope but editable missing fields", () => {
    const html = renderBackupMigrationFoundation({
      origin: "assets",
      subtitle: "Preview bounded migration scope for skill assets starting from asset-skill-global-generated.",
      workflowType: "migration-preview",
      assetId: "asset-skill-global-generated",
      assetSubtype: "skill",
      continueLabel: "Only explicit asset source and scope context are prefilled here. Source and target remain editable if they were not supplied by the route.",
      returnLabel: "Return to Assets for object-level review.",
      migrationPreviewSourceContext: {
        kind: "context-asset",
        label: "asset-skill-global-generated",
      },
      migrationPreviewScope: {
        kind: "assets",
        itemRefs: ["asset-skill-global-generated"],
      },
    });

    expect(html).toContain("routed workflow");
    expect(html).toContain("from assets");
    expect(html).toContain("Migration Preview");
    expect(html).toContain("Select Source Context");
    expect(html).toContain("asset-skill-global-generated");
    expect(html).toContain("Source still required");
  });

  it("renders overview-routed migration-preview workflow as a direct routed entry", () => {
    const html = renderBackupMigrationFoundation({
      origin: "overview",
      subtitle: "Start a bounded migration preview workflow from Project Overview.",
      workflowType: "migration-preview",
      continueLabel: "Workflow execution belongs to Backup / Migration.",
      returnLabel: "Return to Project Overview.",
      migrationPreviewSourceContext: {
        kind: "project-overview",
      },
    });

    expect(html).toContain("from overview");
    expect(html).toContain("Migration Preview");
    expect(html).toContain("Select Source Context");
    expect(html).not.toContain("Choose a bounded workflow below.");
  });

  it("renders overview-routed validate-package workflow as a direct routed entry", () => {
    const html = renderBackupMigrationFoundation({
      origin: "overview",
      subtitle: "Start a bounded package validation workflow from Project Overview.",
      workflowType: "validate-package",
      continueLabel: "Workflow execution belongs to Backup / Migration.",
      returnLabel: "Return to Project Overview.",
    });

    expect(html).toContain("from overview");
    expect(html).toContain("Validate Package");
    expect(html).toContain("Select Package");
    expect(html).not.toContain("Choose a bounded workflow below.");
  });

  it("renders routed bulk-session-backup workflow with preselected sessions", () => {
    const html = renderBackupMigrationFoundation({
      origin: "sessions",
      subtitle: "Back up 2 selected sessions from Sessions.",
      workflowType: "bulk-session-backup",
      sessions: [
        { sessionId: "session-1", source: "codex", rootId: "root-a" },
        { sessionId: "session-2", source: "windsurf" },
      ],
      continueLabel: "Use the bulk session backup workflow to preserve the selected session set.",
      returnLabel: "Return to Sessions for evidence review.",
    });

    expect(html).toContain("Bulk Session Backup");
    expect(html).toContain("Select Sessions");
    expect(html).toContain("session-1");
    expect(html).toContain("session-2");
    expect(html).toContain("Pre-selected from routed handoff.");
  });

  it("renders routed project-bundle workflow without skipping selection", () => {
    const html = renderBackupMigrationFoundation({
      origin: "assets",
      subtitle: "Open Project Bundle with skill asset context starting from asset-skill-global-generated.",
      workflowType: "project-bundle",
      projectBundleScopeHint: "skill asset scope",
      projectBundleObjectRefs: ["asset-skill-global-generated"],
      continueLabel: "Assets may prefill explicit object references and compact hints only. Final bundle composition still happens in Backup / Migration.",
      returnLabel: "Return to Assets for object-level review.",
    });

    expect(html).toContain("Project Bundle");
    expect(html).toContain("Select Bundle Scope");
    expect(html).toContain("Final bundle composition still happens");
    expect(html).toContain("No explicit sessions listed yet");
  });

});

describe("BackupMigrationFoundation helpers", () => {
  it("resolves initial bulk selections from routed handoff sessions", () => {
    expect(
      resolveInitialBulkSelections({
        origin: "sessions",
        subtitle: "Back up 2 selected sessions from Sessions.",
        workflowType: "bulk-session-backup",
        sessions: [
          { sessionId: "session-1", source: "codex", rootId: "root-a" },
          { sessionId: "session-1", source: "codex", rootId: "root-a" },
          { sessionId: "session-2", source: "windsurf" },
        ],
      })
    ).toEqual([
      { sessionId: "session-1", source: "codex", rootId: "root-a", includeSourceCopy: false, unresolvedReason: undefined },
      { sessionId: "session-2", source: "windsurf", rootId: undefined, includeSourceCopy: false, unresolvedReason: undefined },
    ]);
  });

  it("resolves initial project bundle sessions from routed handoff", () => {
    expect(
      resolveInitialProjectBundleSessionSelections({
        origin: "analysis",
        subtitle: "Bundle context from analysis.",
        workflowType: "project-bundle",
        sessionId: "session-1",
        source: "codex",
        rootId: "root-a",
      })
    ).toEqual([
      { sessionId: "session-1", source: "codex", rootId: "root-a", includeSourceCopy: false, unresolvedReason: undefined },
    ]);
  });

  it("builds bulk confirmation details with count, warning count, and execution semantics", () => {
    const details = buildBulkConfirmationDetails({
      selections: [
        { sessionId: "session-1", source: "codex", includeSourceCopy: true },
        { sessionId: "session-2", source: "windsurf" },
      ],
      validationResult: {
        status: "valid-with-warnings",
        items: [{ id: "warning-1", label: "Source-copy readiness", severity: "warning", detail: "Unavailable for session-2." }],
        warningCount: 1,
      },
    });

    expect(details.selectedCount).toBe(2);
    expect(details.warningCount).toBe(1);
    expect(details.sourceCopySummary).toContain("1 of 2 selected sessions");
    expect(details.executionSemantics).toContain("existing session-backup behavior once per selected session");
  });
});

describe("BackupMigrationFoundation panels", () => {
  it("renders blocked and warning validation items for bulk selection", () => {
    const html = renderValidationPanel();

    expect(html).toContain("Validation");
    expect(html).toContain("invalid");
    expect(html).toContain("Source-copy readiness");
    expect(html).toContain("Canonical record availability");
  });

  it("renders partial-failure bulk result details with per-session rows", () => {
    const html = renderOperationResultPanel();

    expect(html).toContain("Operation Result");
    expect(html).toContain("Backed up 1 of 2 selected sessions.");
    expect(html).toContain("Per-session results");
    expect(html).toContain("backup-1");
    expect(html).toContain("Canonical record could not be read.");
  });

  it("renders migration preview result details and preview-only messaging", () => {
    const html = renderMigrationPreviewResultPanel();

    expect(html).toContain("Preview only.");
    expect(html).toContain("Preview context");
    expect(html).toContain("Reusable context assets");
    expect(html).toContain("Preview item detail");
    expect(html).toContain("asset-memory-user-windsurf");
    expect(html).toContain("Return to scope configuration");
    expect(html).toContain("No runtime restore or apply.");
    expect(html).not.toContain("Imported or backed-up sessions are product-readable only");
  });

  it("renders migration preview blocker status explicitly", () => {
    const html = renderMigrationPreviewBlockerResultPanel();

    expect(html).toContain("preview-with-blockers");
    expect(html).toContain("blocked");
    expect(html).toContain("missing-asset-ref");
  });

  it("renders project bundle result details with package identity and unresolved refs", () => {
    const html = renderToStaticMarkup(
      <OperationResultPanel
        result={{
          id: "op-bundle-1",
          workflowType: "project-bundle",
          status: "success-with-warnings",
          timestamp: "2026-04-16T13:00:00Z",
          summary: "Project bundle project-bundle-1 generated with 3 member references.",
          packageId: "project-bundle-1",
          filePath: "/tmp/project-bundle-1.bundle.json",
          memberCount: 3,
          projectBundleValidationSummary: {
            warningCount: 1,
            blockerCount: 0,
            selectedCategoryCount: 7,
            selectedSessionCount: 1,
            resolvedReferenceCount: 2,
            unresolvedReferenceCount: 1,
          },
          projectBundleMemberInventory: [
            { category: "sessions", selected: true, includedCount: 1, status: "warning", detail: "1 member reference included." },
          ],
          projectBundleMemberReferences: [
            {
              id: "sessions:codex:session-1",
              category: "sessions",
              label: "session-1",
              referenceType: "session-backup-package",
              referenceId: "codex:session-1",
              status: "missing-package",
              detail: "No existing session backup package is available.",
              snapshot: { id: "session-1", label: "session-1", category: "sessions" },
            },
          ],
        }}
        onNewWorkflow={vi.fn()}
      />
    );

    expect(html).toContain("project-bundle-1");
    expect(html).toContain("/tmp/project-bundle-1.bundle.json");
    expect(html).toContain("Bundle member inventory");
    expect(html).toContain("missing-package");
    expect(html).toContain("No restore or apply in foundation v1.");
  });
});
