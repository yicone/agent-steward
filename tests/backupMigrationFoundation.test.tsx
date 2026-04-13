import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { BackupMigrationFoundation } from "@/components/BackupMigrationFoundation";
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

describe("BackupMigrationFoundation", () => {
  it("renders idle workflow selector without unimplemented workflows", () => {
    const html = renderBackupMigrationFoundation(null);

    expect(html).toContain("Backup / Migration");
    expect(html).toContain("Choose a bounded workflow below.");
    expect(html).toContain("Start Session Backup");
    expect(html).toContain("Start Import Backup");
    expect(html).toContain("Start Validate Package");
    expect(html).toContain("does not support bulk backup, migration execution, project bundle packaging");
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
});
