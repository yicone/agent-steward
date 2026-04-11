import { describe, expect, it } from "vitest";

import {
  buildAssetsHandoffFromAnalysis,
  buildAssetsHandoffFromOverview,
  buildAssetsHandoffFromSession,
  buildExternalSessionSelection,
  resolveInitialProjectShellPage,
} from "@/components/ProjectShellClient";

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
    expect(
      buildAssetsHandoffFromSession({
        sessionId: "session-1",
        source: "codex",
        rootId: "root-a",
        subtype: "rule",
      })
    ).toMatchObject({
      origin: "sessions",
      sessionId: "session-1",
      sessionSource: "codex",
      sessionRootId: "root-a",
      subtype: "rule",
    });
  });

  it("builds an overview handoff with scope and object context", () => {
    expect(
      buildAssetsHandoffFromOverview({
        subtitle: "Review project rules.",
        subtype: "rule",
        scope: "project",
        assetId: "asset-rule-project-codex",
      })
    ).toMatchObject({
      origin: "overview",
      subtitle: "Review project rules.",
      subtype: "rule",
      scope: "project",
      assetId: "asset-rule-project-codex",
    });
  });

  it("builds an analysis handoff that preserves issue framing", () => {
    expect(
      buildAssetsHandoffFromAnalysis({
        subtitle: "Review conflicted skill.",
        subtype: "skill",
        status: "conflicted",
        assetId: "asset-skill-global-generated",
        issueLabel: "conflicted asset",
      })
    ).toMatchObject({
      origin: "analysis",
      subtype: "skill",
      status: "conflicted",
      assetId: "asset-skill-global-generated",
      issueLabel: "conflicted asset",
    });
  });
});
