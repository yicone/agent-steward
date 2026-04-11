import { describe, expect, it } from "vitest";

import {
  applyContextAssetFilters,
  buildFiltersFromAssetsHandoff,
  createContextAssetSeeds,
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
      scope: "project",
      source: "unknown",
      status: "unknown",
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
