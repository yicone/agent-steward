import { describe, expect, it } from "vitest";

import {
  buildSessionBackupRequest,
  resolveInitialSource,
  resolveRestoredSelection,
  shouldDeferSearchSelectionLoad,
  shouldResetViewerSelectionOnSourceChange,
  supportsSessionSourceCopy,
} from "@/components/HomeClient";
import type { ConversationListItem } from "@/lib/types";

function makeItem(overrides: Partial<ConversationListItem>): ConversationListItem {
  return {
    id: "session-1",
    source: "codex",
    rootId: "root-a",
    path: "/tmp/session-1.jsonl",
    sizeBytes: 128,
    mtimeMs: 1,
    ...overrides,
  };
}

describe("resolveRestoredSelection", () => {
  it("uses the matching rootId when the URL root is valid", () => {
    const items = [
      makeItem({ rootId: "root-a", path: "/tmp/root-a/session-1.jsonl" }),
      makeItem({ rootId: "root-b", path: "/tmp/root-b/session-1.jsonl" }),
    ];

    const result = resolveRestoredSelection(items, "session-1", "root-b");

    expect(result.effectiveRootId).toBe("root-b");
    expect(result.selectedKey).toBe(JSON.stringify({ rootId: "root-b", id: "session-1" }));
  });

  it("falls back to an id-only match when the URL rootId is stale", () => {
    const items = [
      makeItem({ rootId: "root-a", path: "/tmp/root-a/session-1.jsonl" }),
      makeItem({ rootId: "root-b", path: "/tmp/root-b/session-1.jsonl" }),
    ];

    const result = resolveRestoredSelection(items, "session-1", "missing-root");

    expect(result.effectiveRootId).toBe("root-a");
    expect(result.selectedKey).toBe(JSON.stringify({ rootId: "root-a", id: "session-1" }));
  });

  it("does not keep an invalid rootId when no matching item exists", () => {
    const result = resolveRestoredSelection([], "session-1", "missing-root");

    expect(result.effectiveRootId).toBeUndefined();
    expect(result.selectedKey).toBe(JSON.stringify({ rootId: "unknown", id: "session-1" }));
  });
});

describe("resolveInitialSource", () => {
  it("prefers external search selection over URL source and default source", () => {
    expect(
      resolveInitialSource({
        urlSource: "codex",
        externalSelectionSource: "windsurf",
        defaultSource: "antigravity",
      })
    ).toBe("windsurf");
  });

  it("prefers external search selection over default source", () => {
    expect(
      resolveInitialSource({
        externalSelectionSource: "codex",
        defaultSource: "antigravity",
      })
    ).toBe("codex");
  });

  it("falls back to default source when no URL or external selection exists", () => {
    expect(
      resolveInitialSource({
        defaultSource: "windsurf",
      })
    ).toBe("windsurf");
  });
});

describe("shouldResetViewerSelectionOnSourceChange", () => {
  it("keeps a freshly requested external selection during the initial sessions mount", () => {
    expect(
      shouldResetViewerSelectionOnSourceChange({
        source: "antigravity",
        externalSelectionRequestId: 7,
        pendingExternalSelectionRequestId: 7,
      })
    ).toBe(false);
  });

  it("keeps the pending selection across a cross-source switch", () => {
    expect(
      shouldResetViewerSelectionOnSourceChange({
        source: "codex",
        crossSourceSelection: "codex",
      })
    ).toBe(false);
  });

  it("does not reset while restoring the currently addressed URL session", () => {
    expect(
      shouldResetViewerSelectionOnSourceChange({
        source: "windsurf",
        urlId: "session-9",
        urlSource: "windsurf",
      })
    ).toBe(false);
  });

  it("resets normally when there is no pending external selection or matching URL restore", () => {
    expect(
      shouldResetViewerSelectionOnSourceChange({
        source: "antigravity",
        urlId: "session-9",
        urlSource: "codex",
      })
    ).toBe(true);
  });
});

describe("shouldDeferSearchSelectionLoad", () => {
  it("defers loading when the search result targets a different source", () => {
    expect(
      shouldDeferSearchSelectionLoad({
        currentSource: "antigravity",
        nextSource: "codex",
        itemCount: 200,
      })
    ).toBe(true);
  });

  it("defers loading on a fresh mount before the conversation list is ready", () => {
    expect(
      shouldDeferSearchSelectionLoad({
        currentSource: "antigravity",
        nextSource: "antigravity",
        itemCount: 0,
      })
    ).toBe(true);
  });

  it("loads immediately when the target source already matches and items exist", () => {
    expect(
      shouldDeferSearchSelectionLoad({
        currentSource: "codex",
        nextSource: "codex",
        itemCount: 12,
      })
    ).toBe(false);
  });
});

describe("supportsSessionSourceCopy", () => {
  it("supports source copy only for codex in v1", () => {
    expect(supportsSessionSourceCopy("codex")).toBe(true);
    expect(supportsSessionSourceCopy("antigravity")).toBe(false);
    expect(supportsSessionSourceCopy("windsurf")).toBe(false);
  });
});

describe("buildSessionBackupRequest", () => {
  it("includes codex rootId and opt-in source copy when supported", () => {
    const selectedItem = makeItem({ rootId: "root-b" });

    expect(
      buildSessionBackupRequest({
        source: "codex",
        sessionId: "session-1",
        selectedItem,
        includeSourceCopy: true,
      })
    ).toEqual({
      source: "codex",
      sessionId: "session-1",
      rootId: "root-b",
      includeSourceCopy: true,
    });
  });

  it("drops unsupported source-copy requests for non-codex sources", () => {
    expect(
      buildSessionBackupRequest({
        source: "windsurf",
        sessionId: "session-2",
        selectedItem: null,
        includeSourceCopy: true,
      })
    ).toEqual({
      source: "windsurf",
      sessionId: "session-2",
    });
  });
});
