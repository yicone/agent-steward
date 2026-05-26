import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AssetsFoundation } from "@/components/AssetsFoundation";
import { normalizeContextAsset, type AssetsHandoff } from "@/lib/contextAssets";
import type { ProjectEvidenceProviderResult } from "@/lib/projectEvidenceProvider";

function renderAssetsFoundation(handoff: AssetsHandoff | null, projectEvidence?: ProjectEvidenceProviderResult | null) {
  return renderToStaticMarkup(
    <AssetsFoundation
      handoff={handoff}
      projectEvidence={projectEvidence}
      loadingDelayMs={0}
      onOpenAnalysis={vi.fn()}
      onOpenBackup={vi.fn()}
      onOpenOverview={vi.fn()}
      onOpenSession={vi.fn()}
    />
  );
}

function createProviderResult(input: Partial<ProjectEvidenceProviderResult>): ProjectEvidenceProviderResult {
  return {
    provider: "project-evidence-provider-v1",
    status: "available",
    rootLabel: "repository root",
    evidenceSource: "repo-local",
    items: [],
    assets: [],
    diagnostics: [],
    ...input,
  };
}

describe("AssetsFoundation", () => {
  it("renders selected asset state with an accessible selected inventory row", () => {
    const html = renderAssetsFoundation({
      origin: "overview",
      subtitle: "Review project-scoped rules that are currently in effect.",
      subtype: "rule",
      scope: "project",
      assetId: "asset-rule-project-codex",
    });

    expect(html).toContain("routed context");
    expect(html).toContain("Project coding rules");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Selected asset: Project coding rules");
    expect(html).toContain("In-Effect / Usage");
    expect(html).toContain("Governance Health");
    expect(html).toContain("healthy");
    expect(html).toContain("route owner: Sessions");
  });

  it("renders routed-in empty state without fake inventory rows", () => {
    const html = renderAssetsFoundation({
      origin: "analysis",
      subtitle: "Review missing project-scoped skill.",
      subtype: "skill",
      scope: "project",
      issueLabel: "missing routed asset",
    });

    expect(html).toContain("No reusable assets match the current subtype and filter context.");
    expect(html).toContain("No reusable assets currently match the routed context.");
    expect(html).not.toContain("OpenSpec apply helper skill");
  });

  it("renders issue state with a bounded route to Analysis", () => {
    const html = renderAssetsFoundation({
      origin: "analysis",
      subtitle: "Review conflicted skill.",
      subtype: "skill",
      status: "conflicted",
      assetId: "asset-skill-global-generated",
      issueLabel: "conflicted asset",
    });

    expect(html).toContain("issue state");
    expect(html).toContain("OpenSpec apply helper skill");
    expect(html).toContain("Route to Analysis");
    expect(html).toContain("Route to Analysis: review usage context");
    expect(html).toContain("issue class: conflict");
    expect(html).toContain("multiple local copies or interpretations disagree");
    expect(html).toContain("Route to Backup / Migration: preview scope");
    expect(html).not.toContain("Repair");
    expect(html).not.toContain("Sync");
    expect(html).not.toContain("Deploy");
    expect(html).not.toContain("Restore");
  });

  it("keeps session handoff as origin context rather than stale object selection", () => {
    const html = renderAssetsFoundation({
      origin: "sessions",
      subtitle: "Review reusable assets suggested by the selected session.",
      subtype: "rule",
      sessionId: "session-that-is-not-an-asset-id",
    });

    expect(html).toContain("routed context");
    expect(html).not.toContain("The original object could not be selected.");
  });

  it("renders governance issue counts and foundation data cue", () => {
    const html = renderAssetsFoundation(null);

    expect(html).toContain("Foundation data cue");
    expect(html).toContain("not a complete live project scan");
    expect(html).toContain("Warning issues");
    expect(html).toContain("Freshness");
    expect(html).toContain("Conflict");
    expect(html).toContain("Orphaned");
    expect(html).toContain("Unknown");
    expect(html).toContain("does not prove every local runtime has been scanned");
  });

  it("renders stale routed object degradation without fabricating replacement selection", () => {
    const html = renderAssetsFoundation({
      origin: "overview",
      subtitle: "Review stale project memory.",
      subtype: "memory",
      status: "stale",
      assetId: "missing-memory",
      issueLabel: "stale memory",
    });

    expect(html).toContain("The original object could not be selected.");
    expect(html).toContain("stale memory");
    expect(html).not.toContain('aria-pressed="true"');
  });

  it("renders a Project Overview route for selected unknown assets", () => {
    const html = renderAssetsFoundation({
      origin: "overview",
      subtitle: "Review unknown imported fragment.",
      subtype: "unknown",
      status: "unknown",
      assetId: "asset-unknown-imported-1",
      issueLabel: "unknown metadata",
    });

    expect(html).toContain("route owner: Project Overview");
    expect(html).toContain("Route to Project Overview: review governance context");
  });

  it("renders provider-backed inventory instead of seed rows", () => {
    const html = renderAssetsFoundation(null, createProviderResult({
      assets: [
        normalizeContextAsset({
          id: "asset-project-evidence-agents-md",
          title: "Agents",
          subtype: "rule",
          scope: "project",
          source: "codex",
          status: "active",
          provenance: "AGENTS.md (repo-local)",
          usage: { state: "in_effect", summary: "Repo-local rule evidence." },
        }),
      ],
    }));

    expect(html).toContain("Repo-local evidence");
    expect(html).toContain("Agents");
    expect(html).toContain("AGENTS.md (repo-local)");
    expect(html).not.toContain("Project coding rules");
    expect(html).not.toContain("Foundation data cue");
  });

  it("renders empty provider state without seed fallback rows", () => {
    const html = renderAssetsFoundation(null, createProviderResult({ status: "empty" }));

    expect(html).toContain("Repo-local evidence zero state");
    expect(html).toContain("0");
    expect(html).toContain("No reusable assets match the current subtype and filter context.");
    expect(html).not.toContain("Project coding rules");
  });

  it("keeps unavailable provider fallback labeled and diagnostics visible", () => {
    const html = renderAssetsFoundation(null, createProviderResult({
      status: "unavailable",
      diagnostics: [
        {
          id: "project-evidence-diagnostic-unreadable-agents-md",
          kind: "unreadable",
          severity: "warning",
          path: "AGENTS.md",
          message: "Provider could not read this repo-local allowlisted evidence file.",
        },
      ],
    }));

    expect(html).toContain("Provider unavailable fallback");
    expect(html).toContain("Project coding rules");
    expect(html).toContain("Provider diagnostics");
    expect(html).toContain("unreadable: AGENTS.md");
  });
});
