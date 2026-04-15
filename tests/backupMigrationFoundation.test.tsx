import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  BackupMigrationFoundation,
  buildBulkConfirmationDetails,
  resolveInitialBulkSelections,
  OperationResultPanel,
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

describe("BackupMigrationFoundation", () => {
  it("renders idle workflow selector without unimplemented workflows", () => {
    const html = renderBackupMigrationFoundation(null);

    expect(html).toContain("Backup / Migration");
    expect(html).toContain("Choose a bounded workflow below.");
    expect(html).toContain("Start Session Backup");
    expect(html).toContain("Start Bulk Session Backup");
    expect(html).toContain("Start Import Backup");
    expect(html).toContain("Start Validate Package");
    expect(html).toContain("does not support migration preview, project bundle packaging, vendor-runtime restore, or cloud sync");
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

  it("degrades vague asset handoff to idle selector instead of opening a broken workflow", () => {
    const html = renderBackupMigrationFoundation({
      origin: "assets",
      subtitle: "Prepare bounded backup or migration work for skill assets.",
      assetId: "asset-skill-global-generated",
      assetSubtype: "skill",
      continueLabel: "Workflow execution belongs to Backup / Migration.",
      returnLabel: "Return to Assets for object-level review.",
    });

    expect(html).toContain("routed workflow");
    expect(html).toContain("from assets");
    expect(html).toContain("Choose a bounded workflow below.");
    expect(html).not.toContain("Select Session");
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
});
