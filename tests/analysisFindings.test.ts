import { describe, expect, it } from "vitest";

import {
  applyAnalysisFilters,
  buildAssetsHandoffFromAnalysisRoute,
  buildFiltersFromAnalysisHandoff,
  createAnalysisFindingSeeds,
  deriveAnalysisSurfaceState,
  normalizeAnalysisFinding,
  resolveAnalysisFindingSelection,
  resolveAnalysisSessionRootId,
  summarizeAnalysisFindings,
} from "@/lib/analysisFindings";

describe("normalizeAnalysisFinding", () => {
  it("keeps missing finding metadata explicit", () => {
    expect(
      normalizeAnalysisFinding({
        id: "finding-1",
        title: "Unknown issue",
      })
    ).toMatchObject({
      id: "finding-1",
      title: "Unknown issue",
      issueClass: "unknown",
      severity: "unknown",
      status: "unknown",
      affectedObjectType: "unknown",
      affectedObjectLabel: "Affected object unavailable.",
      whyItMatters: "Impact explanation unavailable.",
      evidence: [],
      routes: [],
    });
  });

  it("normalizes unsupported values to unknown", () => {
    const finding = normalizeAnalysisFinding({
      id: "finding-2",
      title: "Unsupported issue",
      issueClass: "latency",
      severity: "critical",
      status: "triaged",
      affectedObjectType: "database",
    });

    expect(finding.issueClass).toBe("unknown");
    expect(finding.severity).toBe("unknown");
    expect(finding.status).toBe("unknown");
    expect(finding.affectedObjectType).toBe("unknown");
  });
});

describe("analysis finding seeds and filters", () => {
  it("provides bounded local findings across route targets and unknown cases", () => {
    const findings = createAnalysisFindingSeeds();

    expect(findings.length).toBeGreaterThan(4);
    expect(findings.some((finding) => finding.severity === "high")).toBe(true);
    expect(findings.some((finding) => finding.issueClass === "preservation")).toBe(true);
    expect(findings.some((finding) => finding.issueClass === "unknown")).toBe(true);
    expect(findings.some((finding) => finding.routes.some((route) => route.target === "assets"))).toBe(true);
    expect(findings.some((finding) => finding.routes.some((route) => route.target === "sessions"))).toBe(true);
    expect(findings.some((finding) => finding.routes.some((route) => route.target === "backup"))).toBe(true);
  });

  it("filters by issue class, severity, object type, and status", () => {
    const findings = createAnalysisFindingSeeds();
    const filtered = applyAnalysisFilters(findings, {
      issueClass: "conflict",
      severity: "high",
      objectType: "asset",
      status: "open",
    });

    expect(filtered.map((finding) => finding.id)).toEqual(["finding-conflicted-skill"]);
  });

  it("summarizes high severity and preservation-sensitive findings", () => {
    const summary = summarizeAnalysisFindings(createAnalysisFindingSeeds());

    expect(summary.total).toBeGreaterThan(0);
    expect(summary.highSeverity).toBeGreaterThan(0);
    expect(summary.preservationSensitive).toBeGreaterThan(0);
    expect(summary.issueClassCounts.conflict).toBeGreaterThan(0);
  });
});

describe("analysis handoff state derivation", () => {
  it("builds filters from handoff while preserving fallback status", () => {
    expect(
      buildFiltersFromAnalysisHandoff(
        {
          origin: "assets",
          subtitle: "Review conflicted asset.",
          issueClass: "conflict",
          objectType: "asset",
        },
        {
          issueClass: "all",
          severity: "all",
          objectType: "all",
          status: "watching",
        }
      )
    ).toEqual({
      issueClass: "conflict",
      severity: "all",
      objectType: "asset",
      status: "watching",
    });
  });

  it("selects by finding id when routed context is still valid", () => {
    const findings = createAnalysisFindingSeeds();
    const filtered = applyAnalysisFilters(findings, {
      issueClass: "conflict",
      severity: "all",
      objectType: "all",
      status: "open",
    });

    expect(
      resolveAnalysisFindingSelection(filtered, {
        origin: "overview",
        subtitle: "Review conflicts.",
        issueClass: "conflict",
        findingId: "finding-conflicted-skill",
      })?.id
    ).toBe("finding-conflicted-skill");
  });

  it("selects by affected asset or session evidence", () => {
    const findings = createAnalysisFindingSeeds();

    expect(
      resolveAnalysisFindingSelection(findings, {
        origin: "assets",
        subtitle: "Review skill conflict.",
        assetId: "asset-skill-global-generated",
      })?.id
    ).toBe("finding-conflicted-skill");

    expect(
      resolveAnalysisFindingSelection(findings, {
        origin: "sessions",
        subtitle: "Review session failure.",
        sessionId: "session-command-antigravity-4",
      })?.id
    ).toBe("finding-preserve-before-migration");
  });

  it("selects by session with source-aware matching for precise identity", () => {
    const findings = createAnalysisFindingSeeds();

    // Matches when source aligns with evidence
    expect(
      resolveAnalysisFindingSelection(findings, {
        origin: "sessions",
        subtitle: "Review session evidence.",
        sessionId: "session-command-antigravity-4",
        source: "antigravity",
      })?.id
    ).toBe("finding-preserve-before-migration");

    // Cross-source: same sessionId but different source should not match
    // (the finding has source: "antigravity", handoff has source: "windsurf")
    expect(
      resolveAnalysisFindingSelection(findings, {
        origin: "sessions",
        subtitle: "Cross-source session check.",
        sessionId: "session-command-antigravity-4",
        source: "windsurf",
      })
    ).toBeNull();
  });

  it("degrades stale finding references to null while filters can remain valid", () => {
    const findings = createAnalysisFindingSeeds();
    const filtered = applyAnalysisFilters(findings, {
      issueClass: "stale",
      severity: "all",
      objectType: "all",
      status: "open",
    });

    expect(
      resolveAnalysisFindingSelection(filtered, {
        origin: "assets",
        subtitle: "Review stale asset.",
        issueClass: "stale",
        findingId: "missing-finding",
      })
    ).toBeNull();
    expect(filtered.length).toBeGreaterThan(0);
  });

  it("derives loading, empty, selected, and issue-heavy states", () => {
    const findings = createAnalysisFindingSeeds();
    const lowFindings = applyAnalysisFilters(findings, {
      issueClass: "provenance",
      severity: "low",
      objectType: "all",
      status: "resolved",
    });
    const highFindings = applyAnalysisFilters(findings, {
      issueClass: "preservation",
      severity: "all",
      objectType: "all",
      status: "open",
    });

    expect(deriveAnalysisSurfaceState({ isLoading: true, filteredFindings: findings, selectedFindingId: null })).toBe("loading");
    expect(deriveAnalysisSurfaceState({ isLoading: false, filteredFindings: [], selectedFindingId: null })).toBe("empty");
    expect(
      deriveAnalysisSurfaceState({
        isLoading: false,
        filteredFindings: lowFindings,
        selectedFindingId: "finding-project-rule-active",
      })
    ).toBe("selected");
    expect(deriveAnalysisSurfaceState({ isLoading: false, filteredFindings: highFindings, selectedFindingId: null })).toBe("issue-heavy");
  });

  it("builds bounded Assets handoff from an analysis route", () => {
    const finding = createAnalysisFindingSeeds().find((item) => item.id === "finding-conflicted-skill");
    const route = finding?.routes.find((item) => item.target === "assets");

    expect(finding).toBeTruthy();
    expect(route).toBeTruthy();
    expect(buildAssetsHandoffFromAnalysisRoute(route!, finding!)).toMatchObject({
      origin: "analysis",
      subtype: "skill",
      status: "conflicted",
      assetId: "asset-skill-global-generated",
      issueLabel: "Conflict",
    });
  });

  it("preserves routed session root id only for matching session context", () => {
    const handoff = {
      origin: "sessions" as const,
      subtitle: "Review selected session evidence.",
      sessionId: "session-command-antigravity-4",
      source: "antigravity" as const,
      rootId: "root-a",
    };

    expect(
      resolveAnalysisSessionRootId({
        handoff,
        sessionId: "session-command-antigravity-4",
        source: "antigravity",
      })
    ).toBe("root-a");

    expect(
      resolveAnalysisSessionRootId({
        handoff,
        sessionId: "session-command-antigravity-4",
        source: "antigravity",
        explicitRootId: "explicit-root",
      })
    ).toBe("explicit-root");

    expect(
      resolveAnalysisSessionRootId({
        handoff,
        sessionId: "other-session",
        source: "antigravity",
      })
    ).toBeUndefined();
  });
});
