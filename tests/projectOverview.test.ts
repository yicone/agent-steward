import { describe, expect, it } from "vitest";

import { normalizeAnalysisFinding } from "@/lib/analysisFindings";
import { normalizeContextAsset } from "@/lib/contextAssets";
import { deriveProjectOverviewSummary } from "@/lib/projectOverview";

describe("deriveProjectOverviewSummary", () => {
  it("derives the default governance summary from shipped foundation seeds", () => {
    const summary = deriveProjectOverviewSummary();

    expect(summary.state).toBe("issue");
    expect(summary.identity.evidenceLabel).toContain("Derived from local project evidence");
    expect(summary.contextSnapshot.map((cue) => cue.id)).toEqual(["sessions", "assets", "analysis", "backup"]);
    expect(summary.inEffectAssets.length).toBeGreaterThan(0);
    expect(summary.recentSessions).toEqual([]);
    expect(summary.attentionItems[0]).toMatchObject({
      severity: "high",
      issueClass: "preservation",
    });
  });

  it("does not fabricate counts or lists when providers are unavailable", () => {
    const summary = deriveProjectOverviewSummary({
      assets: null,
      findings: null,
      sessions: null,
      backupWorkflows: null,
    });

    expect(summary.state).toBe("no-project-context");
    expect(summary.contextSnapshot.every((cue) => cue.status === "unknown")).toBe(true);
    expect(summary.contextSnapshot.every((cue) => cue.value === "Unknown")).toBe(true);
    expect(summary.inEffectAssets).toEqual([]);
    expect(summary.recentSessions).toEqual([]);
    expect(summary.attentionItems).toEqual([]);
  });

  it("uses explicit zero states without inventing sessions, assets, findings, or workflows", () => {
    const summary = deriveProjectOverviewSummary({
      assets: [],
      findings: [],
      sessions: [],
      backupWorkflows: [],
    });

    expect(summary.state).toBe("no-project-context");
    expect(summary.contextSnapshot).toEqual([
      expect.objectContaining({ id: "sessions", value: "0 sessions", status: "empty" }),
      expect.objectContaining({ id: "assets", value: "0 assets", status: "empty" }),
      expect.objectContaining({ id: "analysis", value: "0 findings", status: "empty" }),
      expect.objectContaining({ id: "backup", value: "0 workflows", status: "empty" }),
    ]);
    expect(summary.quickActions.map((action) => action.id)).toEqual([
      "review-sessions",
      "inspect-assets",
      "review-analysis",
    ]);
  });

  it("caps in-effect assets, recent sessions, attention items, and quick actions", () => {
    const assets = Array.from({ length: 5 }, (_, index) =>
      normalizeContextAsset({
        id: `asset-${index}`,
        title: `Asset ${index}`,
        subtype: "rule",
        scope: "project",
        status: "active",
        usage: { state: "in_effect", summary: "In effect." },
      })
    );
    const findings = Array.from({ length: 5 }, (_, index) =>
      normalizeAnalysisFinding({
        id: `finding-${index}`,
        title: `Finding ${index}`,
        issueClass: "stale",
        severity: "medium",
        status: "open",
        affectedObjectType: "asset",
        affectedObjectLabel: `Asset ${index}`,
        whyItMatters: "Needs review.",
      })
    );
    const sessions = Array.from({ length: 5 }, (_, index) => ({
      id: `session-${index}`,
      source: "codex" as const,
      title: `Session ${index}`,
    }));

    const summary = deriveProjectOverviewSummary({
      assets,
      findings,
      sessions,
      limits: {
        inEffectAssets: 2,
        recentSessions: 2,
        attentionItems: 2,
        quickActions: 4,
      },
    });

    expect(summary.inEffectAssets).toHaveLength(2);
    expect(summary.recentSessions).toHaveLength(2);
    expect(summary.attentionItems).toHaveLength(2);
    expect(summary.quickActions).toHaveLength(4);
  });

  it("uses stable issue prioritization by severity, status, issue class, and title", () => {
    const summary = deriveProjectOverviewSummary({
      assets: [],
      sessions: [],
      findings: [
        normalizeAnalysisFinding({
          id: "low",
          title: "Low stale item",
          issueClass: "stale",
          severity: "low",
          status: "open",
          affectedObjectType: "asset",
          affectedObjectLabel: "Low",
          whyItMatters: "Low priority.",
        }),
        normalizeAnalysisFinding({
          id: "high-conflict",
          title: "Conflicted skill",
          issueClass: "conflict",
          severity: "high",
          status: "watching",
          affectedObjectType: "asset",
          affectedObjectLabel: "Skill",
          whyItMatters: "High priority conflict.",
          routes: [
            {
              target: "assets",
              label: "Open affected asset",
              assetId: "asset-skill-global-generated",
              assetSubtype: "skill",
              assetStatus: "conflicted",
            },
          ],
        }),
        normalizeAnalysisFinding({
          id: "high-preservation",
          title: "Preserve backup evidence",
          issueClass: "preservation",
          severity: "high",
          status: "open",
          affectedObjectType: "backup",
          affectedObjectLabel: "Backup",
          whyItMatters: "High priority preservation issue.",
        }),
      ],
    });

    expect(summary.attentionItems.map((item) => item.id)).toEqual([
      "finding:high-preservation",
      "finding:high-conflict",
      "finding:low",
    ]);
    expect(summary.attentionItems.map((item) => item.status)).toEqual(["open", "watching", "open"]);
  });

  it("does not let resolved findings suppress current asset issue cues", () => {
    const summary = deriveProjectOverviewSummary({
      sessions: [],
      assets: [
        normalizeContextAsset({
          id: "asset-still-stale",
          title: "Still stale rule",
          subtype: "rule",
          scope: "project",
          status: "stale",
          usage: { state: "in_effect", summary: "Still needs review." },
        }),
      ],
      findings: [
        normalizeAnalysisFinding({
          id: "resolved-stale-rule",
          title: "Resolved stale rule",
          issueClass: "stale",
          severity: "medium",
          status: "resolved",
          affectedObjectType: "asset",
          affectedObjectLabel: "Still stale rule",
          whyItMatters: "Old resolved finding.",
          routes: [
            {
              target: "assets",
              label: "Open affected asset",
              assetId: "asset-still-stale",
              assetSubtype: "rule",
              assetStatus: "stale",
            },
          ],
        }),
      ],
    });

    expect(summary.attentionItems).toEqual([
      expect.objectContaining({
        id: "asset:asset-still-stale",
        issueClass: "stale",
        status: "open",
      }),
    ]);
  });

  it("keeps module route descriptors compact and scoped to owning pages", () => {
    const summary = deriveProjectOverviewSummary({
      sessions: [
        {
          id: "session-1",
          source: "codex",
          rootId: "root-a",
          title: "Codex session 1",
        },
      ],
    });

    expect(summary.contextSnapshot.map((cue) => cue.route.target)).toEqual([
      "sessions",
      "assets",
      "analysis",
      "backup",
    ]);
    expect(summary.inEffectAssets[0]?.route).toMatchObject({
      target: "assets",
      module: "in-effect-assets",
      assetId: "asset-rule-project-codex",
    });
    expect(summary.recentSessions[0]?.route).toMatchObject({
      target: "sessions",
      module: "recent-sessions",
      sessionId: expect.any(String),
      source: expect.any(String),
    });
    expect(summary.attentionItems[0]?.route.target).toBe("backup");
    expect(summary.attentionItems[0]?.route).not.toHaveProperty("migrationPreviewTargetContext");
  });

  it("keeps quick actions on accepted workflow identities only", () => {
    const summary = deriveProjectOverviewSummary({
      assets: [],
      findings: [],
      sessions: [],
      backupWorkflows: ["import-backup", "validate-package", "project-bundle"],
      limits: { quickActions: 10 },
    });

    expect(summary.quickActions.map((action) => action.id)).toEqual([
      "review-sessions",
      "inspect-assets",
      "review-analysis",
      "workflow:import-backup",
      "workflow:validate-package",
      "workflow:project-bundle",
    ]);
    expect(summary.quickActions.filter((action) => action.route.target === "backup").map((action) => action.route.workflowType)).toEqual([
      "import-backup",
      "validate-package",
      "project-bundle",
    ]);
  });
});
