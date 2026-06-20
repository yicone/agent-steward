import { describe, expect, it } from "vitest";

import { belongsToProjectRoot, normalizeComparablePath } from "@/lib/server/projectRootFilter";

describe("projectRootFilter", () => {
  describe("normalizeComparablePath", () => {
    it("removes trailing slashes", () => {
      expect(normalizeComparablePath("/tmp/demo/")).toBe("/tmp/demo");
    });

    it("resolves home directory abbreviation", () => {
      expect(normalizeComparablePath("~/demo").startsWith("/")).toBe(true);
      expect(normalizeComparablePath("~/demo").endsWith("/demo")).toBe(true);
    });
  });

  describe("belongsToProjectRoot", () => {
    it("returns true when no project root is provided", () => {
      expect(belongsToProjectRoot("/tmp/demo/session", null)).toBe(true);
      expect(belongsToProjectRoot("/tmp/demo/session", undefined)).toBe(true);
    });

    it("returns false when cwd is missing", () => {
      expect(belongsToProjectRoot(undefined, "/tmp/demo")).toBe(false);
    });

    it("matches exact project root", () => {
      expect(belongsToProjectRoot("/tmp/demo", "/tmp/demo")).toBe(true);
    });

    it("matches a child directory of the project root", () => {
      expect(belongsToProjectRoot("/tmp/demo/subdir", "/tmp/demo")).toBe(true);
    });

    it("does not match a sibling directory", () => {
      expect(belongsToProjectRoot("/tmp/demo-other", "/tmp/demo")).toBe(false);
    });

    it("does not match a prefix that is not a child path", () => {
      expect(belongsToProjectRoot("/tmp/demo2", "/tmp/demo")).toBe(false);
    });
  });
});
