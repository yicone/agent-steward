import { describe, expect, it } from "vitest";

import { resolveRestoredSelection } from "@/components/HomeClient";
import {
  buildAssetsHandoffFromAnalysis,
  buildAssetsFoundationInstanceKey,
  buildAssetsHandoffFromOverview,
  buildAssetsHandoffFromSession,
  buildExternalSessionSelection,
  resolveInitialProjectShellPage,
  stripSessionViewerSearchParams,
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
