import { afterEach, describe, expect, it, vi } from "vitest";

const listWorkItemsMock = vi.hoisted(() => vi.fn());
const createWorkItemMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/workItemStore", () => ({
  listWorkItems: (...args: unknown[]) => listWorkItemsMock(...args),
  createWorkItem: (...args: unknown[]) => createWorkItemMock(...args),
}));
vi.mock("@/lib/server/sessionRecordLoader", () => ({ loadSessionRecord: vi.fn() }));
vi.mock("@/lib/server/config", () => ({ readConfig: vi.fn() }));
vi.mock("@/lib/server/projectEvidenceProvider", () => ({ getProjectEvidenceProviderResult: vi.fn(() => undefined) }));
vi.mock("@/lib/workItemInference", () => ({ inferWorkItem: vi.fn() }));

// @ts-ignore route modules are framework entrypoints
import { GET, POST } from "@/app/api/work-items/route";

afterEach(() => {
  listWorkItemsMock.mockReset();
  createWorkItemMock.mockReset();
  vi.unstubAllEnvs();
});

describe("work item routes", () => {
  it("lists local work items", async () => {
    listWorkItemsMock.mockResolvedValue([{ id: "work-1" }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ workItems: [{ id: "work-1" }] });
  });

  it("creates a manual work item only under an allowed project root", async () => {
    createWorkItemMock.mockImplementation(async (item) => item);
    const response = await POST(new Request("http://localhost/api/work-items", {
      method: "POST",
      body: JSON.stringify({ projectRootPath: process.cwd(), goal: "Fix the parser" }),
    }));
    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.workItem.goal.value).toBe("Fix the parser");
    expect(createWorkItemMock).toHaveBeenCalledOnce();
  });

  it("rejects a root outside the configured allowlist", async () => {
    const response = await POST(new Request("http://localhost/api/work-items", {
      method: "POST",
      body: JSON.stringify({ projectRootPath: "/tmp/not-configured", goal: "Nope" }),
    }));
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_REQUEST");
  });
});
