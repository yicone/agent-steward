import { describe, expect, it } from "vitest";

import { buildProviderProjection, PROVIDER_PROJECTION_CAPABILITIES } from "@/lib/server/providerProjections";
import type { WorkPackage } from "@/lib/workContinuity";

const pkg = {
  schemaVersion: "work-package/v1",
  id: "package-1",
  workItemId: "work-1",
  createdAt: "2026-09-20T00:00:00.000Z",
  workItem: { goal: { value: "Continue the parser", confidence: "verified" }, progress: [{ value: "Run regression tests", kind: "next", confidence: "verified" }] },
  validation: { status: "ready_with_warnings", checks: [], warnings: ["Review one unresolved question."], missing: [] },
} as unknown as WorkPackage;

describe("provider projections", () => {
  it("keeps provider capability boundaries explicit", () => {
    for (const provider of ["codex", "cursor", "windsurf", "antigravity"] as const) {
      const projection = buildProviderProjection(provider, pkg);
      expect(projection.format).toBe("text/markdown");
      expect(projection.capability.consumption).toBe("manual");
      expect(projection.capability.sessionInjection).toBe("unsupported");
      expect(projection.content).toContain(`Target provider: ${provider}`);
      expect(projection.content).toContain("Continue the parser");
    }
    expect(PROVIDER_PROJECTION_CAPABILITIES.cursor.entryInstruction).toContain("Cursor");
  });
});
