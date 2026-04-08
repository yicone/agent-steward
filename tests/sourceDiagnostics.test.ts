import { describe, expect, it } from "vitest";

import { formatSourceDiagnostics } from "../src/lib/parse/sourceDiagnostics";
import type { SourcesStatus } from "../src/lib/types";

describe("formatSourceDiagnostics", () => {
  it("renders attach evidence for unreachable sources", () => {
    const status: SourcesStatus = {
      antigravity: {
        discovered: true,
        attachMethod: "log",
        discoveryPath: "/tmp/Antigravity.log",
        pid: 123,
        pidAlive: false,
        csrfTokenPresent: false,
        csrfTokenSource: "none",
        tokenRequired: true,
        heartbeatOk: false,
        lastError: "probe failed",
        recommendedAction: "restart session"
      },
      windsurf: {
        attached: false,
        attachMethod: "log",
        logPath: "/tmp/Windsurf.log",
        pid: 456,
        pidAlive: false,
        port: 8787,
        csrfTokenPresent: false,
        csrfTokenSource: "none",
        tokenRequired: true,
        heartbeatOk: false,
        lastError: "missing token",
        recommendedAction: "set override"
      },
      codex: {
        sessionsFound: false,
        sessionsDir: "/home/user/.codex/sessions",
        error: "No session files found"
      }
    };

    const text = formatSourceDiagnostics(status);
    expect(text).toContain("- attachMethod: log");
    expect(text).toContain("- path: /tmp/Antigravity.log");
    expect(text).toContain("- pid: 123 (alive=false)");
    expect(text).toContain("- csrf: present=false, source=none, required=true");
    expect(text).toContain("- recommendedAction: restart session");
    expect(text).toContain("- path: /tmp/Windsurf.log");
    expect(text).toContain("- lastError: missing token");
    expect(text).toContain("- sessionsFound: false");
    expect(text).toContain("- sessionsDir: /home/user/.codex/sessions");
  });
});
