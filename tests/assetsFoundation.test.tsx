import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AssetsFoundation } from "@/components/AssetsFoundation";
import type { AssetsHandoff } from "@/lib/contextAssets";

function renderAssetsFoundation(handoff: AssetsHandoff | null) {
  return renderToStaticMarkup(
    <AssetsFoundation
      handoff={handoff}
      loadingDelayMs={0}
      onOpenAnalysis={vi.fn()}
      onOpenBackup={vi.fn()}
      onOpenSession={vi.fn()}
    />
  );
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
    expect(html).toContain("Open Analysis");
    expect(html).toContain("Review in Analysis");
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
});
