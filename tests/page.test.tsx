import { describe, expect, it } from "vitest";

import { deriveInitialProjectShellPage } from "@/lib/projectShellNavigation";

describe("server-derived shell entry page", () => {
  it("opens Continue on a clean root", () => {
    expect(deriveInitialProjectShellPage()).toBe("continue");
  });

  it("preserves Work Item and Session deep links", () => {
    expect(deriveInitialProjectShellPage({ workItemId: "work-1" })).toBe("work");
    expect(deriveInitialProjectShellPage({ source: "codex", id: "session-1" })).toBe("sessions");
  });
});
