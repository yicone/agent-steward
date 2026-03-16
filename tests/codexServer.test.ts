import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { collectJsonlFiles, getCodexStatus, hasJsonlFile } from "../src/lib/server/codex";
import type { AppConfig } from "../src/lib/types";

let tmpDir: string;


function makeConfig(roots: AppConfig["roots"]): AppConfig {
  return {
    schemaVersion: 1,
    roots,
    windsurf: {},
    ui: { defaultSource: "codex", sortOrder: "mtime_desc" }
  };
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "asm-codex-test-"));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("collectJsonlFiles", () => {
  it("scans current directory when maxDepth=0", async () => {
    await fs.writeFile(path.join(tmpDir, "a.jsonl"), "{}\n");
    await fs.mkdir(path.join(tmpDir, "nested"));
    await fs.writeFile(path.join(tmpDir, "nested", "b.jsonl"), "{}\n");

    const files = await collectJsonlFiles(tmpDir, 0);
    expect(files.map((f) => path.basename(f.path))).toEqual(["a.jsonl"]);
  });

  it("supports path-only collection when includeStats=false", async () => {
    await fs.writeFile(path.join(tmpDir, "a.jsonl"), "{}\n");
    const files = await collectJsonlFiles(tmpDir, 1, { includeStats: false });
    expect(files[0]?.path).toContain("a.jsonl");
    expect(files[0]).not.toHaveProperty("mtimeMs");
    expect(files[0]).not.toHaveProperty("sizeBytes");
  });
});

describe("getCodexStatus", () => {
  it("returns sessionsFound when any enabled root contains jsonl", async () => {
    const emptyRoot = path.join(tmpDir, "empty");
    const sessionsRoot = path.join(tmpDir, "sessions");
    await fs.mkdir(emptyRoot);
    await fs.mkdir(path.join(sessionsRoot, "2026", "03", "16"), { recursive: true });
    await fs.writeFile(path.join(sessionsRoot, "2026", "03", "16", "rollout-1.jsonl"), "{}\n");

    const config = makeConfig([
      { id: "c1", source: "codex", path: emptyRoot, enabled: true },
      { id: "c2", source: "codex", path: sessionsRoot, enabled: true }
    ]);

    const status = await getCodexStatus(config);
    expect(status.sessionsFound).toBe(true);
    expect(status.sessionsDir).toBe(sessionsRoot);
  });

  it("surfaces unreadable status errors from strict traversal", async () => {
    const root = path.join(tmpDir, "sessions");
    await fs.mkdir(root);

    const readdirSpy = vi.spyOn(fs, "readdir").mockImplementation(async (p: fs.PathLike) => {
      if (String(p) === root) {
        const err = new Error("EACCES: permission denied");
        (err as NodeJS.ErrnoException).code = "EACCES";
        throw err;
      }
      return [] as never;
    });

    const config = makeConfig([{ id: "c1", source: "codex", path: root, enabled: true }]);

    const status = await getCodexStatus(config);
    expect(status.sessionsFound).toBe(false);
    expect(status.error).toContain("unreadable");
    expect(status.error).toContain(root);
    expect(readdirSpy).toHaveBeenCalled();
  });

  it("hasJsonlFile early-exit helper finds nested jsonl", async () => {
    await fs.mkdir(path.join(tmpDir, "a", "b"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "a", "b", "x.jsonl"), "{}\n");
    await fs.writeFile(path.join(tmpDir, "a", "b", "y.jsonl"), "{}\n");

    const found = await hasJsonlFile(tmpDir, 5, { strict: true });
    expect(found).toBe(true);
  });
});
