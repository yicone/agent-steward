import { describe, expect, it } from "vitest";

import { extractCsrfTokenMatchFromCommand } from "../src/lib/parse/commandLine";
import { getWindsurfRecommendedAction, inferWindsurfTokenRequired } from "../src/lib/parse/windsurfStatus";

describe("extractCsrfTokenMatchFromCommand", () => {
  it("classifies flag-based token discovery as ps_args", () => {
    expect(extractCsrfTokenMatchFromCommand("language_server --csrf_token 11111111-1111-1111-1111-111111111111")).toEqual({
      token: "11111111-1111-1111-1111-111111111111",
      source: "ps_args"
    });
  });

  it("classifies env-based token discovery as ps_env", () => {
    expect(extractCsrfTokenMatchFromCommand("WINDSURF_CSRF_TOKEN=22222222-2222-2222-2222-222222222222 language_server")).toEqual({
      token: "22222222-2222-2222-2222-222222222222",
      source: "ps_env"
    });
  });
});

describe("inferWindsurfTokenRequired", () => {
  it("returns false when heartbeat succeeds without token", () => {
    expect(
      inferWindsurfTokenRequired({
        heartbeatOk: true,
        heartbeatWithoutToken: true,
        csrfTokenPresent: false
      })
    ).toBe(false);
  });

  it("returns true when heartbeat requires token", () => {
    expect(
      inferWindsurfTokenRequired({
        heartbeatOk: true,
        heartbeatWithoutToken: false,
        csrfTokenPresent: true
      })
    ).toBe(true);
  });

  it("returns undefined when both probes fail but token exists", () => {
    expect(
      inferWindsurfTokenRequired({
        heartbeatOk: false,
        heartbeatWithoutToken: false,
        csrfTokenPresent: true
      })
    ).toBeUndefined();
  });

  it("returns true when both probes fail and token is missing", () => {
    expect(
      inferWindsurfTokenRequired({
        heartbeatOk: false,
        heartbeatWithoutToken: false,
        csrfTokenPresent: false
      })
    ).toBe(true);
  });
});

describe("getWindsurfRecommendedAction", () => {
  it("maps attached status to healthy action", () => {
    expect(getWindsurfRecommendedAction({ attached: true, tokenRequired: false })).toBe("Connection healthy.");
  });

  it("maps tokenRequired=true to running-process guidance", () => {
    expect(getWindsurfRecommendedAction({ attached: false, tokenRequired: true })).toContain("running process");
  });

  it("maps tokenRequired=false to session restart guidance", () => {
    expect(getWindsurfRecommendedAction({ attached: false, tokenRequired: false })).toContain("Windsurf");
  });

  it("maps tokenRequired=undefined to invalid/expired-token guidance", () => {
    expect(getWindsurfRecommendedAction({ attached: false, tokenRequired: undefined })).toContain("Windsurf");
  });
});
