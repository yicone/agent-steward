import { describe, expect, it } from "vitest";

import {
  buildMetaMapFromTrajectorySummaries,
  extractMetaFromTrajectorySummary,
  extractTrajectoryIdFromTrajectorySummary
} from "../src/lib/server/trajectoryMeta";

describe("extractMetaFromTrajectorySummary", () => {
  it("extracts title and cwd", () => {
    const meta = extractMetaFromTrajectorySummary({
      summary: "Refining AI Icon Generation",
      trajectoryId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      workspaces: [{ workspaceFolderAbsoluteUri: "file:///Users/tr/Workspace/clipvibe" }]
    });
    expect(meta.title).toBe("Refining AI Icon Generation");
    expect(meta.cwd).toMatch(/^(~\/|\/Users\/tr\/)/);
  });

  it("extracts trajectoryId alias", () => {
    expect(
      extractTrajectoryIdFromTrajectorySummary({ trajectoryId: "11111111-2222-3333-4444-555555555555" })
    ).toBe("11111111-2222-3333-4444-555555555555");
  });

  it("builds a meta map for both cascadeId and trajectoryId", () => {
    const map = buildMetaMapFromTrajectorySummaries({
      "cascade-id-1": {
        summary: "Hello",
        trajectoryId: "traj-id-1",
        workspaces: [{ workspaceFolderAbsoluteUri: "file:///Users/tr/Workspace/foo" }]
      }
    });
    expect(map["cascade-id-1"]?.title).toBe("Hello");
    expect(map["traj-id-1"]?.title).toBe("Hello");
  });
});
