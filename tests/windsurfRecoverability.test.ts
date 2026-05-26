import { describe, expect, it } from "vitest";

import { inferWindsurfRecoverability } from "../src/lib/parse/windsurfRecoverability";

describe("inferWindsurfRecoverability", () => {
  it("classifies readable trajectories as ls_readable", () => {
    expect(
      inferWindsurfRecoverability({
        trajectoryReadable: true,
        trajectoryMissing: false,
        hasSidecarEvidence: false
      })
    ).toBe("ls_readable");
  });

  it("classifies missing trajectories with sidecar evidence as partial", () => {
    expect(
      inferWindsurfRecoverability({
        trajectoryReadable: false,
        trajectoryMissing: true,
        hasSidecarEvidence: true
      })
    ).toBe("partial");
  });

  it("classifies missing trajectories without sidecar evidence as unavailable", () => {
    expect(
      inferWindsurfRecoverability({
        trajectoryReadable: false,
        trajectoryMissing: true,
        hasSidecarEvidence: false
      })
    ).toBe("unavailable");
  });

  it("returns undefined for non-readable non-missing failures", () => {
    expect(
      inferWindsurfRecoverability({
        trajectoryReadable: false,
        trajectoryMissing: false,
        hasSidecarEvidence: true
      })
    ).toBeUndefined();
  });
});
