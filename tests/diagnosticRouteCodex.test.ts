import { afterEach, describe, expect, it, vi } from "vitest";

const readConfigMock = vi.hoisted(() => vi.fn());
const buildDiagnosticExportMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/config", () => ({
  readConfig: (...args: unknown[]) => readConfigMock(...args)
}));

vi.mock("@/lib/server/diagnosticExport", () => ({
  buildDiagnosticExport: (...args: unknown[]) => buildDiagnosticExportMock(...args)
}));

import { GET } from "@/app/api/conversations/[source]/[id]/diagnostic/route";

afterEach(() => {
  vi.restoreAllMocks();
  readConfigMock.mockReset();
  buildDiagnosticExportMock.mockReset();
});

describe("GET /api/conversations/[source]/[id]/diagnostic (codex)", () => {
  it("passes rootId through to diagnostic export building for Codex", async () => {
    const config = {
      schemaVersion: 1,
      roots: [],
      windsurf: {},
      ui: { defaultSource: "codex", sortOrder: "mtime_desc" }
    };
    readConfigMock.mockResolvedValue({ config });
    buildDiagnosticExportMock.mockResolvedValue({
      schemaVersion: 1,
      generatedAt: "2026-03-18T00:00:00.000Z",
      source: "codex",
      cascadeId: "session-1",
      codex: {
        filePath: "/tmp/root-2/session-1.jsonl",
        rawLines: [],
        truncated: false,
        returnedLines: 0,
        totalLines: 0
      }
    });

    const response = await GET(
      new Request("http://localhost/api/conversations/codex/session-1/diagnostic?rootId=root-2"),
      {
        params: { source: "codex", id: "session-1" }
      }
    );

    expect(response.status).toBe(200);
    expect(buildDiagnosticExportMock).toHaveBeenCalledWith({
      source: "codex",
      cascadeId: "session-1",
      rootId: "root-2",
      config,
      windsurf: {
        allSteps: undefined,
        maxSteps: undefined
      }
    });
  });
});
