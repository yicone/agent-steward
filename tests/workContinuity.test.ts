import { describe, expect, it } from "vitest";

import {
  WORK_ITEM_SCHEMA_VERSION,
  WORK_PACKAGE_SCHEMA_VERSION,
  assertValidWorkItemTransition,
  canonicalJson,
  normalizeRelativePath,
  validateWorkItem,
  type WorkItem,
} from "../src/lib/workContinuity";
import { createProjectionEnvelope, sha256Canonical } from "../src/lib/server/workContinuityHash";

function makeWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    schemaVersion: WORK_ITEM_SCHEMA_VERSION,
    id: "work-1",
    project: { rootPath: "./project" },
    goal: { value: "Fix the bug", confidence: "observed" },
    status: "captured",
    createdAt: "2026-09-19T01:00:00+00:00",
    updatedAt: "2026-09-19T01:00:00Z",
    ...overrides,
  };
}

describe("work continuity contracts", () => {
  it("defines versioned schemas and lifecycle semantics", () => {
    expect(WORK_ITEM_SCHEMA_VERSION).toBe("work-item/v1");
    expect(WORK_PACKAGE_SCHEMA_VERSION).toBe("work-package/v1");
    expect(() => assertValidWorkItemTransition("active", "ready-to-handoff")).not.toThrow();
    expect(() => assertValidWorkItemTransition("completed", "active")).toThrow();
    expect(() => validateWorkItem(makeWorkItem())).not.toThrow();
  });

  it("canonicalizes key order, timestamps, and relative paths", () => {
    const one = { b: "2026-09-19T01:00:00+00:00", a: { path: "./src\\index.ts" } };
    const two = { a: { path: "src/index.ts" }, b: "2026-09-19T01:00:00.000Z" };
    expect(canonicalJson(one)).toBe(canonicalJson(two));
    expect(sha256Canonical(one)).toBe(sha256Canonical(two));
    expect(normalizeRelativePath("a/./b\\c")).toBe("a/b/c");
    expect(() => normalizeRelativePath("../../secret")).toThrow();
  });

  it("ties provider projections to the canonical hash", () => {
    const projection = createProjectionEnvelope({ provider: "codex", canonicalHash: "abc", content: "# handoff" });
    expect(projection.canonicalHash).toBe("abc");
    expect(projection.hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
