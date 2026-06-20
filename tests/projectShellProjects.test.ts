import { describe, expect, it } from "vitest";

import { buildProjectKey, buildShellProject, dedupeShellProjects, normalizeProjectRootIdentity } from "@/lib/projectShellProjects";

describe("projectShellProjects", () => {
  it("normalizes root identity into a canonical project key", () => {
    expect(normalizeProjectRootIdentity("/tmp/demo/")) .toBe("/tmp/demo");
    expect(buildProjectKey("/tmp/demo")).toBe("/tmp/demo");
  });

  it("builds shell project identity from a root path", () => {
    expect(buildShellProject("/tmp/demo-project")).toEqual({
      projectKey: "/tmp/demo-project",
      projectName: "demo-project",
      boundaryCue: "/tmp/demo-project",
      rootPath: "/tmp/demo-project",
    });
  });

  it("dedupes equivalent root paths by canonical project key", () => {
    expect(dedupeShellProjects(["/tmp/demo", "/tmp/demo/"])).toEqual([
      {
        projectKey: "/tmp/demo",
        projectName: "demo",
        boundaryCue: "/tmp/demo",
        rootPath: "/tmp/demo",
      },
    ]);
  });
});
