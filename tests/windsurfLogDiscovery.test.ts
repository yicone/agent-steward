import { describe, expect, it, vi } from "vitest";

const fsMock = vi.hoisted(() => ({
  readdir: vi.fn(),
  stat: vi.fn(),
  readFile: vi.fn()
}));

const platformMock = vi.hoisted(() => ({
  windsurfLogsRoot: vi.fn(),
  devinLogsRoot: vi.fn()
}));

vi.mock("node:fs/promises", () => ({ default: fsMock }));
vi.mock("@/lib/server/platform", () => ({ platformPaths: platformMock }));

import { findLatestCascadeLogFile } from "../src/lib/server/windsurf";

describe("findLatestCascadeLogFile", () => {
  it("prefers the newest Devin.log when it has a live pid", async () => {
    platformMock.windsurfLogsRoot.mockReturnValue("/logs/windsurf");
    platformMock.devinLogsRoot.mockReturnValue("/logs/devin");

    const windsurfDir = "/logs/windsurf/20260621T100000";
    const devinDir = "/logs/devin/20260621T110000";
    const windsurfLog = "/logs/windsurf/20260621T100000/window1/exthost/codeium.windsurf/Windsurf.log";
    const devinLog = "/logs/devin/20260621T110000/window1/exthost/codeium.windsurf/Devin.log";

    const makeDirent = (name: string, dir = true) => ({ name, isDirectory: () => dir });

    fsMock.readdir.mockImplementation(async (p: unknown, options?: unknown) => {
      const str = String(p);
      const withFileTypes =
        options && typeof options === "object" && (options as { withFileTypes?: boolean }).withFileTypes;
      if (!withFileTypes) return [];
      if (str === "/logs/windsurf") return [makeDirent("20260621T100000")];
      if (str === "/logs/devin") return [makeDirent("20260621T110000")];
      if (str === windsurfDir) return [makeDirent("window1")];
      if (str === devinDir) return [makeDirent("window1")];
      return [];
    });

    fsMock.stat.mockImplementation(async (p: unknown) => {
      const str = String(p);
      const isFile = str.endsWith(".log");
      let mtimeMs = 0;
      if (str === windsurfDir || str === windsurfLog) mtimeMs = 1000;
      else if (str === devinDir || str === devinLog) mtimeMs = 2000;
      return { isFile: () => isFile, isDirectory: () => !isFile, mtimeMs };
    });

    fsMock.readFile.mockImplementation(async (p: unknown) => {
      const str = String(p);
      if (str === windsurfLog) {
        return "Starting language server process with pid 99999\nLanguage server listening on random port at 55555";
      }
      if (str === devinLog) {
        return "Starting language server process with pid 12345\nLanguage server listening on random port at 55556";
      }
      throw new Error("ENOENT");
    });

    const killSpy = vi.spyOn(process, "kill").mockImplementation((pid: number) => {
      if (pid === 12345) return true;
      throw new Error("ESRCH");
    });

    try {
      const result = await findLatestCascadeLogFile();
      expect(result).toBe(devinLog);
    } finally {
      killSpy.mockRestore();
    }
  });
});
