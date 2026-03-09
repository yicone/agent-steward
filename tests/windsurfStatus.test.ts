import { describe, expect, it } from "vitest";

import { getWindsurfRecommendedAction, inferWindsurfTokenRequired } from "../src/lib/parse/windsurfStatus";

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

  it("maps tokenRequired=true to override guidance", () => {
    expect(getWindsurfRecommendedAction({ attached: false, tokenRequired: true })).toContain("token override");
  });

  it("maps tokenRequired=false to session restart guidance", () => {
    expect(getWindsurfRecommendedAction({ attached: false, tokenRequired: false })).toContain("start/restart");
  });

  it("maps tokenRequired=undefined to invalid/expired-token guidance", () => {
    expect(getWindsurfRecommendedAction({ attached: false, tokenRequired: undefined })).toContain("invalid or expired");
  });
});
