import { describe, expect, it } from "vitest";

import {
  applyContextAssetFilters,
  buildFiltersFromAssetsHandoff,
  createContextAssetSeeds,
  deriveContextAssetGovernanceHealth,
  deriveAssetsSurfaceState,
  normalizeContextAsset,
  resolveContextAssetSelection,
  summarizeContextAssets,
} from "@/lib/contextAssets";

describe("normalizeContextAsset", () => {
  it("keeps missing metadata explicit instead of inferring values silently", () => {
    expect(
      normalizeContextAsset({
        id: "asset-1",
        title: "Imported fragment",
      })
    ).toMatchObject({
      id: "asset-1",
      title: "Imported fragment",
      subtype: "unknown",
      source: "unknown",
      status: "unknown",
      scope: "unknown",
      provenance: "Provenance unavailable.",
      usage: {
        state: "unknown",
        summary: "In-effect data unavailable.",
      },
    });
  });

  it("preserves unknown subtype rather than assigning a default subtype", () => {
    expect(
      normalizeContextAsset({
        id: "asset-2",
        title: "Unclassified asset",
        subtype: "note",
      }).subtype
    ).toBe("unknown");
  });
});

describe("context asset seeds and filters", () => {
  it("provides bounded local assets across normal, issue, and unknown cases", () => {
    const assets = createContextAssetSeeds();
    expect(assets.length).toBeGreaterThan(4);
    expect(assets.some((asset) => asset.status === "stale")).toBe(true);
    expect(assets.some((asset) => asset.status === "conflicted")).toBe(true);
    expect(assets.some((asset) => asset.subtype === "unknown")).toBe(true);
  });

  it("filters by subtype, scope, source, and status", () => {
    const assets = createContextAssetSeeds();
    const filtered = applyContextAssetFilters(assets, {
      subtype: "memory",
      scope: "project",
      source: "codex",
      status: "active",
    });

    expect(filtered.map((asset) => asset.id)).toEqual(["asset-memory-project-codex"]);
  });

  it("summarizes issue and in-effect counts for the filtered inventory", () => {
    const assets = createContextAssetSeeds();
    const summary = summarizeContextAssets(assets);

    expect(summary.total).toBe(assets.length);
    expect(summary.inEffect).toBeGreaterThan(0);
    expect(summary.issueCount).toBeGreaterThan(0);
    expect(summary.governanceIssueCounts.freshness).toBe(1);
    expect(summary.governanceIssueCounts.conflict).toBe(1);
    expect(summary.governanceIssueCounts.orphaned).toBe(1);
    expect(summary.governanceIssueCounts.unknown).toBe(1);
  });
});

describe("context asset governance health", () => {
  it("maps active in-effect assets to healthy", () => {
    const health = deriveContextAssetGovernanceHealth(
      normalizeContextAsset({
        id: "active-in-effect",
        title: "Active rule",
        status: "active",
        usage: {
          state: "in_effect",
          summary: "Applied by project instructions.",
        },
      })
    );

    expect(health).toMatchObject({
      severity: "healthy",
      issueClass: "none",
    });
    expect(health.explanation).toContain("currently in effect");
  });

  it("maps active assets without usage proof to informational", () => {
    const health = deriveContextAssetGovernanceHealth(
      normalizeContextAsset({
        id: "active-unknown",
        title: "Active memory",
        status: "active",
        usage: {
          state: "unknown",
          summary: "Usage provider unavailable.",
        },
      })
    );

    expect(health.severity).toBe("informational");
    expect(health.issueClass).toBe("none");
    expect(health.inEffectExplanation).toContain("will not infer");
  });

  it("maps stale, conflicted, and orphaned assets to warning issue classes", () => {
    expect(deriveContextAssetGovernanceHealth(normalizeContextAsset({ id: "stale", title: "Stale", status: "stale" }))).toMatchObject({
      severity: "warning",
      issueClass: "freshness",
    });
    expect(deriveContextAssetGovernanceHealth(normalizeContextAsset({ id: "conflict", title: "Conflict", status: "conflicted" }))).toMatchObject({
      severity: "warning",
      issueClass: "conflict",
      recommendedRoute: {
        owner: "Analysis",
      },
    });
    expect(deriveContextAssetGovernanceHealth(normalizeContextAsset({ id: "orphan", title: "Orphan", status: "orphaned" }))).toMatchObject({
      severity: "warning",
      issueClass: "orphaned",
    });
  });

  it("keeps unknown health explicit and non-blocking", () => {
    const health = deriveContextAssetGovernanceHealth(
      normalizeContextAsset({
        id: "unknown",
        title: "Unknown",
      })
    );

    expect(health).toMatchObject({
      severity: "unknown",
      issueClass: "unknown",
      recommendedRoute: {
        owner: "Project Overview",
      },
    });
    expect(health.explanation).toContain("will not classify");
  });
});

describe("assets handoff state derivation", () => {
  it("uses handoff filters while preserving explicit scope and status", () => {
    expect(
      buildFiltersFromAssetsHandoff({
        origin: "overview",
        subtitle: "Inspect stale memory.",
        subtype: "memory",
        scope: "project",
        status: "stale",
      }, null)
    ).toEqual({
      subtype: "memory",
      scope: "project",
      source: "all",
      status: "stale",
    });
  });

  it("selects an asset from a routed object id when it is still valid", () => {
    const assets = createContextAssetSeeds();
    const filtered = applyContextAssetFilters(assets, {
      subtype: "rule",
      scope: "project",
      source: "all",
      status: "all",
    });

    expect(
      resolveContextAssetSelection(filtered, {
        origin: "overview",
        subtitle: "Review in-effect rules.",
        subtype: "rule",
        scope: "project",
        assetId: "asset-rule-project-codex",
      })?.id
    ).toBe("asset-rule-project-codex");
  });

  it("degrades stale handoff selection while preserving still-valid filters", () => {
    const assets = createContextAssetSeeds();
    const filtered = applyContextAssetFilters(assets, {
      subtype: "memory",
      scope: "all",
      source: "all",
      status: "stale",
    });

    expect(
      resolveContextAssetSelection(filtered, {
        origin: "analysis",
        subtitle: "Review stale asset.",
        subtype: "memory",
        status: "stale",
        assetId: "missing-asset",
        issueLabel: "stale asset",
      })
    ).toBeNull();
    expect(filtered.length).toBeGreaterThan(0);
  });

  it("does not treat the origin session id as an asset selector", () => {
    const assets = createContextAssetSeeds();
    const filtered = applyContextAssetFilters(assets, {
      subtype: "rule",
      scope: "project",
      source: "all",
      status: "all",
    });

    expect(
      resolveContextAssetSelection(filtered, {
        origin: "sessions",
        subtitle: "Review reusable assets suggested by the selected session.",
        subtype: "rule",
        sessionId: "session-rule-codex-1",
      })
    ).toBeNull();
  });

  it("derives empty, selected, and issue states without replacing the page backbone", () => {
    const assets = createContextAssetSeeds();
    const ruleAssets = applyContextAssetFilters(assets, {
      subtype: "rule",
      scope: "project",
      source: "all",
      status: "active",
    });
    const memoryAssets = applyContextAssetFilters(assets, {
      subtype: "memory",
      scope: "all",
      source: "all",
      status: "all",
    });
    const issueAssets = applyContextAssetFilters(assets, {
      subtype: "skill",
      scope: "all",
      source: "all",
      status: "all",
    });

    expect(deriveAssetsSurfaceState({ isLoading: true, filteredAssets: memoryAssets, selectedAssetId: null })).toBe("loading");
    expect(deriveAssetsSurfaceState({ isLoading: false, filteredAssets: [], selectedAssetId: null })).toBe("empty");
    expect(
      deriveAssetsSurfaceState({
        isLoading: false,
        filteredAssets: ruleAssets,
        selectedAssetId: "asset-rule-project-codex",
      })
    ).toBe("selected");
    expect(deriveAssetsSurfaceState({ isLoading: false, filteredAssets: issueAssets, selectedAssetId: null })).toBe("issue");
  });
});
