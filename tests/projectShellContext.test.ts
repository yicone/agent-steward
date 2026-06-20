import { describe, expect, it } from "vitest";

import { getProjectShellContext } from "@/lib/server/projectShellContext";

describe("getProjectShellContext", () => {
  it("returns empty state when no roots are available", () => {
    const context = getProjectShellContext("");

    expect(context.projects).toEqual([]);
    expect(context.initialActiveProjectKey).toBe("");
    expect(context.projectEvidenceByProjectKey).toEqual({});
  });

  it("uses the default root as the active project when no extra roots are configured", () => {
    const context = getProjectShellContext("/tmp/demo-project");

    expect(context.projects).toHaveLength(1);
    expect(context.projects[0]).toEqual(
      expect.objectContaining({
        projectKey: "/tmp/demo-project",
        projectName: "demo-project",
        rootPath: "/tmp/demo-project",
      })
    );
    expect(context.initialActiveProjectKey).toBe("/tmp/demo-project");
    expect(context.projectEvidenceByProjectKey).toHaveProperty("/tmp/demo-project");
  });
});
