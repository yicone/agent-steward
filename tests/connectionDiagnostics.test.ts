import { describe, expect, it } from "vitest";

import { getHeartbeatFailureSummary, getSessionRestartAction } from "../src/lib/parse/connectionDiagnostics";

describe("getSessionRestartAction", () => {
  it("uses consistent relaunch guidance when pid is not alive", () => {
    expect(
      getSessionRestartAction({ appName: "Antigravity", sessionName: "session", pidAlive: false })
    ).toBe("Keep Antigravity open and start a session to relaunch the language server.");
  });

  it("uses consistent restart guidance when pid is alive", () => {
    expect(
      getSessionRestartAction({ appName: "Windsurf", sessionName: "Cascade session", pidAlive: true })
    ).toBe("Keep Windsurf running and start/restart a Cascade session, then refresh.");
  });
});

describe("getHeartbeatFailureSummary", () => {
  it("uses consistent probe-failed message when token exists", () => {
    expect(getHeartbeatFailureSummary({ appName: "Windsurf", csrfTokenPresent: true })).toBe(
      "Windsurf heartbeat probe failed with and without CSRF token."
    );
  });

  it("uses consistent missing-token message when token does not exist", () => {
    expect(getHeartbeatFailureSummary({ appName: "Antigravity", csrfTokenPresent: false })).toBe(
      "Missing Antigravity CSRF token and heartbeat probe failed without token."
    );
  });
});
