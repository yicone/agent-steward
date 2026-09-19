import { afterEach, describe, expect, it, vi } from "vitest";

const readWorkItemMock = vi.hoisted(() => vi.fn());
const updateWorkItemMock = vi.hoisted(() => vi.fn());
const attachSessionRecordMock = vi.hoisted(() => vi.fn());
const loadSessionRecordMock = vi.hoisted(() => vi.fn());
const readConfigMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/workItemStore", () => ({
  readWorkItem: (...args: unknown[]) => readWorkItemMock(...args),
  updateWorkItem: (...args: unknown[]) => updateWorkItemMock(...args),
  attachSessionRecord: (...args: unknown[]) => attachSessionRecordMock(...args),
}));
vi.mock("@/lib/server/sessionRecordLoader", () => ({ loadSessionRecord: (...args: unknown[]) => loadSessionRecordMock(...args) }));
vi.mock("@/lib/server/config", () => ({ readConfig: (...args: unknown[]) => readConfigMock(...args) }));

// @ts-ignore route modules are framework entrypoints
import { GET, PATCH } from "@/app/api/work-items/[workItemId]/route";

afterEach(() => {
  readWorkItemMock.mockReset();
  updateWorkItemMock.mockReset();
  attachSessionRecordMock.mockReset();
  loadSessionRecordMock.mockReset();
  readConfigMock.mockReset();
});

describe("work item detail route", () => {
  it("returns a work item", async () => {
    readWorkItemMock.mockResolvedValue({ id: "work-1", goal: { value: "Ship it" } });
    const response = await GET(new Request("http://localhost/api/work-items/work-1"), { params: { workItemId: "work-1" } });
    expect(response.status).toBe(200);
    expect((await response.json()).workItem.id).toBe("work-1");
  });

  it("organizes a goal with optimistic version fields", async () => {
    readWorkItemMock.mockResolvedValue({ id: "work-1", goal: { value: "Old", confidence: "inferred" }, version: 2 });
    updateWorkItemMock.mockResolvedValue({ id: "work-1", goal: { value: "New" }, status: "organized" });
    const response = await PATCH(new Request("http://localhost/api/work-items/work-1", {
      method: "PATCH",
      body: JSON.stringify({ goal: "New", organize: true, expectedVersion: 2 }),
    }), { params: { workItemId: "work-1" } });
    expect(response.status).toBe(200);
    expect(updateWorkItemMock).toHaveBeenCalledWith("work-1", expect.objectContaining({ status: "organized" }), { expectedVersion: 2, expectedUpdatedAt: undefined });
  });

  it("attaches a second bounded Session without carrying transcript state", async () => {
    readWorkItemMock.mockResolvedValue({ id: "work-1", project: { rootPath: process.cwd() }, sessions: [] });
    readConfigMock.mockResolvedValue({ config: { roots: [] } });
    loadSessionRecordMock.mockResolvedValue({ record: { session: { id: "session-2", source: "codex", title: "Second session", rootId: "root" }, sourceRef: { locator: "/tmp/session.jsonl" } } });
    attachSessionRecordMock.mockResolvedValue({ id: "work-1", sessions: [{ sessionId: "session-2" }] });
    const response = await PATCH(new Request("http://localhost/api/work-items/work-1", {
      method: "PATCH",
      body: JSON.stringify({ attachSession: { source: "codex", sessionId: "session-2", rootId: "root" } }),
    }), { params: { workItemId: "work-1" } });
    expect(response.status).toBe(200);
    expect(attachSessionRecordMock).toHaveBeenCalledWith("work-1", expect.objectContaining({ sessionId: "session-2", source: "codex" }), expect.anything());
  });
});
