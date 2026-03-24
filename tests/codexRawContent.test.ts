import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCodexConversation, getCodexRawContent } from "../src/lib/server/codex";
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
  it("prefers the selected Codex root when duplicate session ids exist", async () => {
    const rootA = path.join(tmpDir, "sessions-a");
    const rootB = path.join(tmpDir, "sessions-b");
    await fs.mkdir(rootA, { recursive: true });
    await fs.mkdir(rootB, { recursive: true });
    await fs.writeFile(
      path.join(rootA, "shared.jsonl"),
      `${JSON.stringify({ type: "user_message", item: { content: "from-a" } })}\n`
    );
    await fs.writeFile(
      path.join(rootB, "shared.jsonl"),
      `${JSON.stringify({ type: "user_message", item: { content: "from-b" } })}\n`
    );

    const config = makeConfig([
      { id: "r1", source: "codex", path: rootA, enabled: true },
      { id: "r2", source: "codex", path: rootB, enabled: true }
    ]);

    const raw = await getCodexRawContent("shared", config, { preferredRootId: "r2" });
    const conversation = await getCodexConversation("shared", config, { preferredRootId: "r2" });

    expect(raw.filePath).toBe(path.join(rootB, "shared.jsonl"));
    expect(raw.rawLines).toEqual([{ type: "user_message", item: { content: "from-b" } }]);
    expect(conversation.events[0]?.text).toContain("from-b");
  });

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

  it("rebuilds a stale session-path cache entry when the selected file has moved", async () => {
    const rootDir = path.join(tmpDir, "sessions");
    const firstDir = path.join(rootDir, "2026", "03", "19");
    const secondDir = path.join(rootDir, "2026", "03", "20");
    await fs.mkdir(firstDir, { recursive: true });
    await fs.writeFile(
      path.join(firstDir, "moving.jsonl"),
      `${JSON.stringify({ type: "user_message", item: { content: "first" } })}\n`
    );

    const config = makeConfig([{ id: "r1", source: "codex", path: rootDir, enabled: true }]);
    const first = await getCodexConversation("moving", config);
    expect(first.events[0]?.text).toContain("first");

    await fs.rm(firstDir, { recursive: true, force: true });
    await fs.mkdir(secondDir, { recursive: true });
    await fs.writeFile(
      path.join(secondDir, "moving.jsonl"),
      `${JSON.stringify({ type: "user_message", item: { content: "second" } })}\n`
    );

    const second = await getCodexConversation("moving", config);
    expect(second.events[0]?.text).toContain("second");
  });

  it("surfaces permission errors while validating a cached session path", async () => {
    const rootDir = path.join(tmpDir, "sessions");
    await fs.mkdir(rootDir, { recursive: true });
    const filePath = path.join(rootDir, "locked.jsonl");
    await fs.writeFile(
      filePath,
      `${JSON.stringify({ type: "user_message", item: { content: "locked" } })}\n`
    );

    const config = makeConfig([{ id: "r1", source: "codex", path: rootDir, enabled: true }]);
    const first = await getCodexConversation("locked", config);
    expect(first.events[0]?.text).toContain("locked");

    const originalStat = fs.stat.bind(fs);
    const statSpy = vi.spyOn(fs, "stat").mockImplementation(async (targetPath) => {
      if (targetPath === filePath) {
        const err = new Error("permission denied") as NodeJS.ErrnoException;
        err.code = "EACCES";
        throw err;
      }
      return originalStat(targetPath);
    });

    try {
      await expect(getCodexConversation("locked", config)).rejects.toThrow(
        "Permission denied reading Codex session: locked."
      );
    } finally {
      statSpy.mockRestore();
    }
  });

  it("treats cached non-file paths as stale and re-resolves the session path", async () => {
    const rootDir = path.join(tmpDir, "sessions");
    const firstDir = path.join(rootDir, "old");
    const secondDir = path.join(rootDir, "new");
    await fs.mkdir(firstDir, { recursive: true });
    await fs.writeFile(
      path.join(firstDir, "session.jsonl"),
      `${JSON.stringify({ type: "user_message", item: { content: "first-location" } })}\n`
    );

    const config = makeConfig([{ id: "r1", source: "codex", path: rootDir, enabled: true }]);
    const first = await getCodexConversation("session", config);
    expect(first.events[0]?.text).toContain("first-location");

    await fs.rm(path.join(firstDir, "session.jsonl"));
    await fs.mkdir(path.join(firstDir, "session.jsonl"), { recursive: true });
    await fs.mkdir(secondDir, { recursive: true });
    await fs.writeFile(
      path.join(secondDir, "session.jsonl"),
      `${JSON.stringify({ type: "user_message", item: { content: "second-location" } })}\n`
    );

    const second = await getCodexConversation("session", config);
    expect(second.events[0]?.text).toContain("second-location");
  });
});
