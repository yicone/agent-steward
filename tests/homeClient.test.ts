import { describe, expect, it } from "vitest";

import { buildSessionBackupRequest, resolveRestoredSelection, supportsSessionSourceCopy } from "@/components/HomeClient";
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
