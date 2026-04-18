import { describe, expect, it } from "vitest";

import { resolveRestoredSelection } from "@/components/HomeClient";
import {
  buildAnalysisFoundationInstanceKey,
  buildAnalysisHandoffFromAssets,
  buildAnalysisHandoffFromOverview,
  buildAnalysisHandoffFromSession,
  buildAssetsHandoffFromAnalysis,
  buildAssetsFoundationInstanceKey,
  buildAssetsHandoffFromOverview,
  buildAssetsHandoffFromSession,
  buildBackupHandoffFromAnalysis,
  buildBackupHandoffFromAssets,
  buildBackupHandoffFromOverview,
  buildBackupHandoffFromSessions,
  buildExternalSessionSelection,
  resolveInitialProjectShellPage,
  stripSessionViewerSearchParams,
} from "@/components/ProjectShellClient";
import { resolveRoutedWorkflowState } from "@/lib/backupMigration";

describe("resolveInitialProjectShellPage", () => {
  it("opens project overview for a root URL", () => {
    expect(resolveInitialProjectShellPage("")).toBe("overview");
  });

  it("opens sessions when a session deep link is present", () => {
    expect(resolveInitialProjectShellPage("?source=codex&id=session-1&rootId=root-a")).toBe("sessions");
  });

  it("opens sessions when a source-scoped URL is present", () => {
    expect(resolveInitialProjectShellPage("?source=windsurf")).toBe("sessions");
  });
});

describe("stripSessionViewerSearchParams", () => {
  it("removes session viewer deep-link params when leaving sessions", () => {
    expect(
      stripSessionViewerSearchParams(
        "?source=antigravity&id=session-1&rootId=root-a&expanded=group-1&row=row-1&inspector=event"
      )
    ).toBe("");
  });

  it("preserves unrelated query params", () => {
    expect(
      stripSessionViewerSearchParams(
        "?foo=bar&source=codex&id=session-2&includeCleared=1&baz=qux"
      )
    ).toBe("?foo=bar&baz=qux");
  });

  it("leaves already-clean search strings untouched", () => {
    expect(stripSessionViewerSearchParams("?foo=bar")).toBe("?foo=bar");
  });
});

describe("buildAssetsFoundationInstanceKey", () => {
  it("changes when routed handoff context changes", () => {
    const first = buildAssetsFoundationInstanceKey({
      origin: "sessions",
      subtitle: "Review session asset.",
      subtype: "rule",
      sessionId: "session-1",
    });
    const second = buildAssetsFoundationInstanceKey({
      origin: "overview",
      subtitle: "Review project asset.",
      subtype: "rule",
      scope: "project",
      assetId: "asset-rule-project-codex",
    });

    expect(first).not.toBe(second);
  });

  it("changes when routed source context changes", () => {
    const first = buildAssetsFoundationInstanceKey({
      origin: "overview",
      subtitle: "Review project rules.",
      subtype: "rule",
      source: "codex",
    });
    const second = buildAssetsFoundationInstanceKey({
      origin: "overview",
      subtitle: "Review project rules.",
      subtype: "rule",
      source: "windsurf",
    });

    expect(first).not.toBe(second);
  });

  it("keeps a stable non-routed key for normal browsing", () => {
    expect(buildAssetsFoundationInstanceKey(null)).toBe("assets:no-handoff");
  });
});

describe("resolveRestoredSelection", () => {
  it("falls back to id-only matching when url rootId is stale", () => {
    const restored = resolveRestoredSelection(
      [
        {
          id: "session-1",
          rootId: "root-a",
        } as any,
      ],
      "session-1",
      "stale-root"
    );

    expect(restored.match).toMatchObject({ id: "session-1", rootId: "root-a" });
    expect(restored.effectiveRootId).toBe("root-a");
    expect(JSON.parse(restored.selectedKey)).toEqual({ rootId: "root-a", id: "session-1" });
  });
});

describe("buildExternalSessionSelection", () => {
  it("keeps the global search selection payload explicit", () => {
    expect(
      buildExternalSessionSelection({
        requestId: 3,
        sessionId: "session-1",
        source: "codex",
        rootId: "root-a",
      })
    ).toEqual({
      requestId: 3,
      sessionId: "session-1",
      source: "codex",
      rootId: "root-a",
    });
  });

  it("omits absent root ids", () => {
    expect(
      buildExternalSessionSelection({
        requestId: 4,
        sessionId: "session-2",
        source: "antigravity",
      })
    ).toEqual({
      requestId: 4,
      sessionId: "session-2",
      source: "antigravity",
    });
  });
});

describe("assets handoff builders", () => {
  it("builds a bounded session handoff without carrying viewer-local state", () => {
    const handoff = buildAssetsHandoffFromSession({
      sessionId: "session-1",
      subtype: "rule",
    });

    expect(handoff).toMatchObject({
      origin: "sessions",
      sessionId: "session-1",
      subtype: "rule",
    });
    expect(handoff).not.toHaveProperty("source");
    expect(handoff).not.toHaveProperty("rootId");
  });

  it("builds an overview handoff with scope and object context", () => {
    const handoff = buildAssetsHandoffFromOverview({
      subtitle: "Review project rules.",
      subtype: "rule",
      scope: "project",
      status: "active",
      assetId: "asset-rule-project-codex",
      issueLabel: "in-effect rule",
    });

    expect(handoff).toMatchObject({
      origin: "overview",
      subtitle: "Review project rules.",
      subtype: "rule",
      scope: "project",
      status: "active",
      assetId: "asset-rule-project-codex",
      issueLabel: "in-effect rule",
    });
    expect(Object.keys(handoff).sort()).toEqual([
      "assetId",
      "continueLabel",
      "issueLabel",
      "origin",
      "returnLabel",
      "scope",
      "status",
      "subtitle",
      "subtype",
    ]);
    expect(handoff).not.toHaveProperty("summary");
    expect(handoff).not.toHaveProperty("workflowType");
    expect(handoff).not.toHaveProperty("operations");
  });

  it("builds an analysis handoff that preserves issue framing", () => {
    const handoff = buildAssetsHandoffFromAnalysis({
      subtitle: "Review conflicted skill.",
      subtype: "skill",
      status: "conflicted",
      assetId: "asset-skill-global-generated",
      issueLabel: "conflicted asset",
    });

    expect(handoff).toMatchObject({
      origin: "analysis",
      subtype: "skill",
      status: "conflicted",
      assetId: "asset-skill-global-generated",
      issueLabel: "conflicted asset",
    });
    expect(Object.keys(handoff).sort()).toEqual([
      "assetId",
      "continueLabel",
      "issueLabel",
      "origin",
      "returnLabel",
      "status",
      "subtitle",
      "subtype",
    ]);
    expect(handoff).not.toHaveProperty("findings");
    expect(handoff).not.toHaveProperty("evidence");
    expect(handoff).not.toHaveProperty("mutationInstructions");
  });
});

describe("analysis handoff builders", () => {
  it("builds an Assets to Analysis handoff with issue and object context", () => {
    expect(
      buildAnalysisHandoffFromAssets({
        issueLabel: "conflicted asset",
        assetId: "asset-skill-global-generated",
        subtype: "skill",
        status: "conflicted",
      })
    ).toMatchObject({
      origin: "assets",
      issueClass: "conflict",
      objectType: "asset",
      assetId: "asset-skill-global-generated",
      assetSubtype: "skill",
      issueLabel: "conflicted asset",
    });
  });

  it("builds a Project Overview to Analysis handoff without carrying overview state", () => {
    expect(
      buildAnalysisHandoffFromOverview({
        subtitle: "Review preservation-sensitive findings.",
        issueClass: "preservation",
        severity: "high",
        objectType: "backup",
        findingId: "finding-preserve-before-migration",
      })
    ).toMatchObject({
      origin: "overview",
      issueClass: "preservation",
      severity: "high",
      objectType: "backup",
      findingId: "finding-preserve-before-migration",
    });
  });

  it("builds a Sessions to Analysis handoff without carrying transcript state", () => {
    expect(
      buildAnalysisHandoffFromSession({
        sessionId: "session-command-antigravity-4",
        source: "antigravity",
        rootId: "root-a",
      })
    ).toMatchObject({
      origin: "sessions",
      issueClass: "preservation",
      sessionId: "session-command-antigravity-4",
      source: "antigravity",
      rootId: "root-a",
    });
  });
});

describe("buildAnalysisFoundationInstanceKey", () => {
  it("changes when routed Analysis context changes", () => {
    const first = buildAnalysisFoundationInstanceKey({
      origin: "assets",
      subtitle: "Review conflicted asset.",
      issueClass: "conflict",
      objectType: "asset",
      assetId: "asset-skill-global-generated",
    });
    const second = buildAnalysisFoundationInstanceKey({
      origin: "sessions",
      subtitle: "Review session evidence.",
      issueClass: "preservation",
      objectType: "session",
      sessionId: "session-command-antigravity-4",
      source: "antigravity",
      rootId: "root-a",
    });

    expect(first).not.toBe(second);
  });

  it("changes when routed session root context changes", () => {
    const first = buildAnalysisFoundationInstanceKey({
      origin: "sessions",
      subtitle: "Review session evidence.",
      issueClass: "preservation",
      objectType: "session",
      sessionId: "session-command-antigravity-4",
      source: "antigravity",
      rootId: "root-a",
    });
    const second = buildAnalysisFoundationInstanceKey({
      origin: "sessions",
      subtitle: "Review session evidence.",
      issueClass: "preservation",
      objectType: "session",
      sessionId: "session-command-antigravity-4",
      source: "antigravity",
      rootId: "root-b",
    });

    expect(first).not.toBe(second);
  });

  it("keeps a stable non-routed key for normal Analysis browsing", () => {
    expect(buildAnalysisFoundationInstanceKey(null)).toBe("analysis:no-handoff");
  });
});

describe("backup handoff builders", () => {
  it("builds a sessions handoff with session identity and workflow type", () => {
    const handoff = buildBackupHandoffFromSessions({
      sessionId: "session-1",
      source: "codex",
      rootId: "root-a",
    });

    expect(handoff).toMatchObject({
      origin: "sessions",
      workflowType: "session-backup",
      sessionId: "session-1",
      source: "codex",
      rootId: "root-a",
    });
    expect(handoff.subtitle).toContain("session-1");
  });

  it("builds a sessions handoff for explicit multi-session selection", () => {
    const handoff = buildBackupHandoffFromSessions({
      sessions: [
        { sessionId: "session-1", source: "codex", rootId: "root-a" },
        { sessionId: "session-2", source: "windsurf" },
      ],
    });

    expect(handoff).toMatchObject({
      origin: "sessions",
      workflowType: "bulk-session-backup",
      sessions: [
        { sessionId: "session-1", source: "codex", rootId: "root-a" },
        { sessionId: "session-2", source: "windsurf" },
      ],
    });
    expect(handoff.subtitle).toContain("2 selected sessions");
  });

  it("builds an assets handoff without carrying asset-viewer state", () => {
    const handoff = buildBackupHandoffFromAssets({
      assetId: "asset-skill-global-generated",
      subtype: "skill",
    });

    expect(handoff).toMatchObject({
      origin: "assets",
      assetId: "asset-skill-global-generated",
      assetSubtype: "skill",
      workflowType: "migration-preview",
      migrationPreviewSourceContext: {
        kind: "context-asset",
        label: "asset-skill-global-generated",
      },
      migrationPreviewScope: {
        kind: "assets",
        itemRefs: ["asset-skill-global-generated"],
      },
    });
    expect(handoff).not.toHaveProperty("migrationPreviewTargetContext");
  });

  it("builds an assets project-bundle handoff with explicit refs only", () => {
    const handoff = buildBackupHandoffFromAssets({
      assetId: "asset-skill-global-generated",
      subtype: "skill",
      workflowType: "project-bundle",
    });

    expect(handoff).toMatchObject({
      origin: "assets",
      workflowType: "project-bundle",
      assetId: "asset-skill-global-generated",
      assetSubtype: "skill",
      projectBundleObjectRefs: ["asset-skill-global-generated"],
      projectBundleScopeHint: "skill asset scope",
    });
    expect(handoff).not.toHaveProperty("migrationPreviewTargetContext");
  });

  it("keeps preservation-oriented analysis backup handoff on session backup", () => {
    const handoff = buildBackupHandoffFromAnalysis({
      findingId: "finding-preserve-before-migration",
      title: "Preserve session evidence before migration cleanup",
      preservationWarning: "Preserve before risky migration or cleanup work.",
      routeLabel: "Preserve in Backup / Migration",
    });

    expect(handoff).toMatchObject({
      origin: "analysis",
      workflowType: "session-backup",
      findingId: "finding-preserve-before-migration",
      preservationWarning: "Preserve before risky migration or cleanup work.",
    });
    expect(handoff.subtitle).toContain("Preserve in Backup / Migration");
  });

  it("builds an analysis migration-preview handoff when the route asks for preview", () => {
    const handoff = buildBackupHandoffFromAnalysis({
      findingId: "finding-preserve-before-migration",
      title: "Preserve session evidence before migration cleanup",
      preservationWarning: "Preview before risky migration or cleanup work.",
      routeLabel: "Preview migration compatibility",
      backupWorkflowType: "migration-preview",
    });

    expect(handoff).toMatchObject({
      origin: "analysis",
      workflowType: "migration-preview",
      findingId: "finding-preserve-before-migration",
      preservationWarning: "Preview before risky migration or cleanup work.",
      migrationPreviewSourceContext: {
        kind: "analysis-context",
        label: "Preserve session evidence before migration cleanup",
      },
    });
    expect(handoff.subtitle).toContain("Preview migration compatibility");
  });

  it("builds an analysis project-bundle handoff without auto-deciding composition", () => {
    const handoff = buildBackupHandoffFromAnalysis({
      findingId: "finding-conflicted-skill",
      title: "Conflicted OpenSpec helper skill",
      routeLabel: "Bundle project context",
      backupWorkflowType: "project-bundle",
    });

    expect(handoff).toMatchObject({
      origin: "analysis",
      workflowType: "project-bundle",
      findingId: "finding-conflicted-skill",
      issueLabel: "Conflicted OpenSpec helper skill",
      projectBundleObjectRefs: ["finding-conflicted-skill"],
    });
    expect(handoff.subtitle).toContain("Bundle project context");
  });

  it("builds an overview handoff with an explicit workflow type", () => {
    const handoff = buildBackupHandoffFromOverview("import-backup");

    expect(handoff).toMatchObject({
      origin: "overview",
      workflowType: "import-backup",
    });
    expect(handoff).not.toHaveProperty("sessionId");
    expect(handoff.subtitle).toContain("import workflow");
  });

  it("builds an overview handoff that preserves routed issue context", () => {
    const handoff = buildBackupHandoffFromOverview("session-backup", {
      findingId: "finding-preserve-before-migration",
      issueLabel: "Preserve session evidence before migration cleanup",
    });

    expect(handoff).toMatchObject({
      origin: "overview",
      workflowType: "session-backup",
      findingId: "finding-preserve-before-migration",
      issueLabel: "Preserve session evidence before migration cleanup",
    });
    expect(handoff.subtitle).toContain("Preserve session evidence before migration cleanup");
    expect(handoff.continueLabel).toContain("routed issue cue");
  });

  it("builds an overview handoff for bulk session backup without invented sessions", () => {
    const handoff = buildBackupHandoffFromOverview("bulk-session-backup");

    expect(handoff).toMatchObject({
      origin: "overview",
      workflowType: "bulk-session-backup",
    });
    expect(handoff).not.toHaveProperty("sessionId");
    expect(handoff).not.toHaveProperty("sessions");
    expect(handoff.subtitle).toContain("bulk session backup workflow");
  });

  it("builds an overview handoff for migration preview without inventing target or scope", () => {
    const handoff = buildBackupHandoffFromOverview("migration-preview");

    expect(handoff).toMatchObject({
      origin: "overview",
      workflowType: "migration-preview",
      migrationPreviewSourceContext: {
        kind: "project-overview",
      },
    });
    expect(handoff).not.toHaveProperty("migrationPreviewTargetContext");
    expect(handoff).not.toHaveProperty("migrationPreviewScope");
    expect(handoff.subtitle).toContain("migration preview workflow");
  });

  it("builds an overview handoff for project bundle without inventing member refs", () => {
    const handoff = buildBackupHandoffFromOverview("project-bundle");

    expect(handoff).toMatchObject({
      origin: "overview",
      workflowType: "project-bundle",
      projectBundleScopeHint: "overview-routed project context",
    });
    expect(handoff).not.toHaveProperty("sessions");
    expect(handoff).not.toHaveProperty("projectBundleObjectRefs");
    expect(handoff.subtitle).toContain("project bundle workflow");
  });

  it("builds an overview project-bundle handoff with explicit finding refs only when routed", () => {
    const handoff = buildBackupHandoffFromOverview("project-bundle", {
      findingId: "finding-conflicted-skill",
      issueLabel: "Conflicted OpenSpec helper skill",
    });

    expect(handoff).toMatchObject({
      origin: "overview",
      workflowType: "project-bundle",
      findingId: "finding-conflicted-skill",
      issueLabel: "Conflicted OpenSpec helper skill",
      projectBundleObjectRefs: ["finding-conflicted-skill"],
    });
  });

  it("keeps overview-routed migration preview on selection when only partial source context is provided", () => {
    const handoff = buildBackupHandoffFromOverview("migration-preview");

    expect(resolveRoutedWorkflowState("migration-preview", handoff)).toBe("selection");
  });

  it("keeps asset-routed migration preview on selection when target context is still missing", () => {
    const handoff = buildBackupHandoffFromAssets({
      assetId: "asset-skill-global-generated",
      subtype: "skill",
    });

    expect(resolveRoutedWorkflowState("migration-preview", handoff)).toBe("selection");
  });

  it("keeps analysis-routed migration preview on selection when source product is still missing", () => {
    const handoff = buildBackupHandoffFromAnalysis({
      findingId: "finding-preserve-before-migration",
      title: "Preserve session evidence before migration cleanup",
      routeLabel: "Preview migration compatibility",
      backupWorkflowType: "migration-preview",
    });

    expect(resolveRoutedWorkflowState("migration-preview", handoff)).toBe("selection");
  });

  it("keeps project-bundle routed handoff on selection instead of fabricating deeper continuity", () => {
    const handoff = buildBackupHandoffFromAnalysis({
      findingId: "finding-conflicted-skill",
      title: "Conflicted OpenSpec helper skill",
      routeLabel: "Bundle project context",
      backupWorkflowType: "project-bundle",
    });

    expect(resolveRoutedWorkflowState("project-bundle", handoff)).toBe("selection");
  });
});
