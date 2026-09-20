import { describe, expect, it } from "vitest";

import { reduceHandoffFlowState, type HandoffPreflight } from "@/components/HandoffFlow";

const preflight: HandoffPreflight = { status: "ready_with_warnings", checks: [{ id: "goal", status: "pass" }], warnings: ["Git state unavailable"], missing: [] };

describe("handoff flow state", () => {
  it("moves from options to preflight and preserves warnings", () => {
    const next = reduceHandoffFlowState({ stage: "options", busy: true }, { type: "preflight", preflight });
    expect(next.stage).toBe("preflight");
    expect(next.preflight?.warnings).toEqual(["Git state unavailable"]);
    expect(next.busy).toBe(false);
  });

  it("moves to a created package result", () => {
    const next = reduceHandoffFlowState({ stage: "preflight", busy: false, preflight }, { type: "create", result: { packageId: "pkg-1", canonicalHash: "abc" } });
    expect(next.stage).toBe("result");
    expect(next.result?.canonicalHash).toBe("abc");
  });

  it("keeps the current stage when a request fails", () => {
    const next = reduceHandoffFlowState({ stage: "preflight", busy: true, preflight }, { type: "error", error: "blocked" });
    expect(next.stage).toBe("preflight");
    expect(next.error).toBe("blocked");
    expect(next.busy).toBe(false);
  });
});
