import { afterEach, describe, expect, it, vi } from "vitest";

const readWorkItemMock = vi.hoisted(() => vi.fn());
const preflightMock = vi.hoisted(() => vi.fn());
const createPackageMock = vi.hoisted(() => vi.fn());
const recordOutcomeMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/workItemStore", () => ({ readWorkItem: (...args: unknown[]) => readWorkItemMock(...args) }));
vi.mock("@/lib/server/workPackageService", () => ({
  preflightWorkPackage: (...args: unknown[]) => preflightMock(...args),
  createWorkPackage: (...args: unknown[]) => createPackageMock(...args),
  recordHandoffOutcome: (...args: unknown[]) => recordOutcomeMock(...args),
}));

// @ts-ignore route modules are framework entrypoints
import { POST } from "@/app/api/work-items/[workItemId]/handoff/route";

afterEach(() => {
  readWorkItemMock.mockReset();
  preflightMock.mockReset();
  createPackageMock.mockReset();
  recordOutcomeMock.mockReset();
});

describe("handoff route", () => {
  it("runs a bounded preflight", async () => {
    readWorkItemMock.mockResolvedValue({ id: "work-1", project: { rootPath: process.cwd() } });
    preflightMock.mockResolvedValue({ status: "ready_with_warnings", checks: [], warnings: [], missing: [] });
    const response = await POST(new Request("http://localhost/api/work-items/work-1/handoff", {
      method: "POST",
      body: JSON.stringify({ mode: "preflight", includeEvidence: true }),
    }), { params: { workItemId: "work-1" } });
    expect(response.status).toBe(200);
    expect((await response.json()).preflight.status).toBe("ready_with_warnings");
    expect(preflightMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ includeEvidence: true, redactPaths: true }));
  });

  it("creates a package and returns its canonical identity", async () => {
    readWorkItemMock.mockResolvedValue({ id: "work-1" });
    createPackageMock.mockResolvedValue({
      package: { id: "package-1", canonicalHash: "sha256:abc", validation: { status: "ready" } },
      markdownPath: "/tmp/handoff.md",
      jsonPath: "/tmp/package.json",
      codexPath: "/tmp/codex.md",
    });
    const response = await POST(new Request("http://localhost/api/work-items/work-1/handoff", {
      method: "POST",
      body: JSON.stringify({ mode: "create", targetProvider: "codex" }),
    }), { params: { workItemId: "work-1" } });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      packageId: "package-1",
      canonicalHash: "sha256:abc",
      validation: { status: "ready" },
      paths: { markdown: "/tmp/handoff.md", json: "/tmp/package.json", codex: "/tmp/codex.md" },
    });
  });

  it("rejects unsupported target providers", async () => {
    readWorkItemMock.mockResolvedValue({ id: "work-1", project: { rootPath: process.cwd() } });
    const response = await POST(new Request("http://localhost/api/work-items/work-1/handoff", {
      method: "POST",
      body: JSON.stringify({ mode: "preflight", targetProvider: "unknown-provider" }),
    }), { params: { workItemId: "work-1" } });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("Unsupported target provider");
    expect(preflightMock).not.toHaveBeenCalled();
  });

  it("records an outcome only when it matches a package created for the Work Item", async () => {
    readWorkItemMock.mockResolvedValue({
      id: "work-1",
      project: { rootPath: process.cwd() },
      handoffs: [{
        id: "handoff-package-1",
        packageId: "package-1",
        packageHash: "sha256:abc",
        target: { provider: "codex" },
        createdAt: "2026-09-20T00:00:00.000Z",
        outcome: "created",
      }],
    });
    recordOutcomeMock.mockResolvedValue(undefined);
    const response = await POST(new Request("http://localhost/api/work-items/work-1/handoff", {
      method: "POST",
      body: JSON.stringify({ mode: "record-outcome", outcome: { id: "confirmed-1", packageId: "package-1", packageHash: "sha256:abc", target: { provider: "codex" }, createdAt: "2026-09-20T01:00:00.000Z", outcome: "confirmed" } }),
    }), { params: { workItemId: "work-1" } });

    expect(response.status).toBe(200);
    expect(recordOutcomeMock).toHaveBeenCalledWith("work-1", expect.objectContaining({ workItemId: "work-1", packageId: "package-1", packageHash: "sha256:abc", outcome: "confirmed" }));
  });

  it("rejects outcomes for unknown or mismatched packages", async () => {
    readWorkItemMock.mockResolvedValue({
      id: "work-1",
      project: { rootPath: process.cwd() },
      handoffs: [{ id: "handoff-package-1", packageId: "package-1", packageHash: "sha256:abc", createdAt: "2026-09-20T00:00:00.000Z", outcome: "created" }],
    });
    const response = await POST(new Request("http://localhost/api/work-items/work-1/handoff", {
      method: "POST",
      body: JSON.stringify({ mode: "record-outcome", outcome: { id: "confirmed-2", packageId: "package-2", packageHash: "sha256:forged", createdAt: "2026-09-20T01:00:00.000Z", outcome: "confirmed" } }),
    }), { params: { workItemId: "work-1" } });

    expect(response.status).toBe(400);
    expect(recordOutcomeMock).not.toHaveBeenCalled();
  });
});
