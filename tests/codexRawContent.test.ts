import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getCodexRawContent } from "../src/lib/server/codex";
import type { AppConfig, RootConfig } from "../src/lib/types";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "asm-codex-raw-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function makeConfig(roots: RootConfig[]): AppConfig {
  return {
    schemaVersion: 1,
    roots,
    windsurf: {},
    ui: { defaultSource: "codex", sortOrder: "mtime_desc" }
  };
}

describe("getCodexRawContent", () => {
  it("returns exact totalLines for non-truncated files", async () => {
    const rootDir = path.join(tmpDir, "sessions");
    await fs.mkdir(rootDir, { recursive: true });
    const filePath = path.join(rootDir, "session.jsonl");
    await fs.writeFile(filePath, '{"a":1}\n\n{"b":2}\n');

    const result = await getCodexRawContent(
      "session",
      makeConfig([{ id: "r1", source: "codex", path: rootDir, enabled: true }])
    );

    expect(result.filePath).toBe(filePath);
    expect(result.truncated).toBe(false);
    expect(result.totalLines).toBe(3);
    expect(result.returnedLines).toBe(2);
    expect(result.rawLines).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("omits totalLines when output is truncated at the raw-line cap", async () => {
    const rootDir = path.join(tmpDir, "sessions");
    await fs.mkdir(rootDir, { recursive: true });
    const filePath = path.join(rootDir, "big-session.jsonl");
    const lines = Array.from({ length: 5001 }, (_, i) => JSON.stringify({ index: i })).join("\n");
    await fs.writeFile(filePath, `${lines}\n`);

    const result = await getCodexRawContent(
      "big-session",
      makeConfig([{ id: "r1", source: "codex", path: rootDir, enabled: true }])
    );

    expect(result.filePath).toBe(filePath);
    expect(result.truncated).toBe(true);
    expect(result.returnedLines).toBe(5000);
    expect(result.totalLines).toBeUndefined();
    expect(result.rawLines).toHaveLength(5000);
  });
});
