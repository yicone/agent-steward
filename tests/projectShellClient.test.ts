import { describe, expect, it } from "vitest";

import { buildExternalSessionSelection, resolveInitialProjectShellPage } from "@/components/ProjectShellClient";

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
