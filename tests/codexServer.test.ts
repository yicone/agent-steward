import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { collectJsonlFiles, getCodexStatus, getCodexTrajectoryMetaMap } from "../src/lib/server/codex";
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
  it("collects jsonl files recursively with stats", async () => {
    await fs.mkdir(path.join(tmpDir, "2026", "03", "16"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "2026", "03", "16", "session.jsonl"), "{}\n");
    await fs.mkdir(path.join(tmpDir, "nested"));
    await fs.writeFile(path.join(tmpDir, "nested", "b.jsonl"), "{}\n");

    const files = await collectJsonlFiles(tmpDir);
    expect(files.length).toBe(2);
    // Always includes stat info
    expect(files[0]).toHaveProperty("mtimeMs");
    expect(files[0]).toHaveProperty("sizeBytes");
  });

  it("skips unreadable subdirectories and records partial errors", async () => {
    await fs.mkdir(path.join(tmpDir, "good"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "good", "a.jsonl"), "{}\n");

    const origReaddir = fs.readdir;
    const readdirSpy = vi.spyOn(fs, "readdir").mockImplementation(async (p: unknown, ...args: unknown[]) => {
      if (String(p).endsWith("bad")) {
        const err = new Error("EACCES: permission denied");
        (err as NodeJS.ErrnoException).code = "EACCES";
        throw err;
      }
      return (origReaddir as Function).call(fs, p, ...args);
    });

    await fs.mkdir(path.join(tmpDir, "bad"), { recursive: true });
    const partialErrors: string[] = [];
    const files = await collectJsonlFiles(tmpDir, 5, { partialErrors });
    expect(files.length).toBe(1);
    expect(files[0]!.path).toContain("a.jsonl");
    expect(partialErrors.length).toBeGreaterThan(0);
    readdirSpy.mockRestore();
  });
});

describe("getCodexTrajectoryMetaMap", () => {
  it("extracts title and cwd from a normal session file", async () => {
    const sessionDir = path.join(tmpDir, "sessions", "2026", "04", "08");
    await fs.mkdir(sessionDir, { recursive: true });
    const lines = [
      JSON.stringify({ type: "session_meta", item: { id: "s1", cwd: "/Users/tr/Workspace/myapp", timestamp: "2026-04-08T00:00:00Z" } }),
      JSON.stringify({ type: "response_item", item: { type: "message", role: "user", content: [{ type: "input_text", text: "Fix the flaky test" }] } })
    ].join("\n") + "\n";
    await fs.writeFile(path.join(sessionDir, "rollout-test-001.jsonl"), lines);

    const config = makeConfig([{ id: "r1", source: "codex", path: path.join(tmpDir, "sessions"), enabled: true }]);
    const map = await getCodexTrajectoryMetaMap(config);
    expect(map["rollout-test-001"]?.title).toBe("Fix the flaky test");
    expect(map["rollout-test-001"]?.cwd).toBe("/Users/tr/Workspace/myapp");
  });

  it("skips injected context lines and returns the real user message as title", async () => {
    const sessionDir = path.join(tmpDir, "sessions", "2026", "04", "01");
    await fs.mkdir(sessionDir, { recursive: true });
    // Simulate the real Codex App layout: large session_meta, then injected context, then real user message
    const largeSessionMeta = JSON.stringify({
      type: "session_meta",
      item: { id: "s2", cwd: "/Users/tr/Workspace/proj", timestamp: "2026-04-01T00:00:00Z", base_instructions: "x".repeat(20_000) }
    });
    const injectedContext = JSON.stringify({
      type: "response_item",
      item: { type: "message", role: "user", content: [{ type: "input_text", text: "# AGENTS.md instructions for /Users/tr\n<INSTRUCTIONS>\nFollow the rules.\n</INSTRUCTIONS>" }] }
    });
    const realUserMsg = JSON.stringify({
      type: "response_item",
      item: { type: "message", role: "user", content: [{ type: "input_text", text: "Refactor the auth module" }] }
    });
    const lines = [largeSessionMeta, injectedContext, realUserMsg].join("\n") + "\n";
    await fs.writeFile(path.join(sessionDir, "rollout-test-002.jsonl"), lines);

    const config = makeConfig([{ id: "r2", source: "codex", path: path.join(tmpDir, "sessions"), enabled: true }]);
    const map = await getCodexTrajectoryMetaMap(config);
    expect(map["rollout-test-002"]?.title).toBe("Refactor the auth module");
    expect(map["rollout-test-002"]?.cwd).toBe("/Users/tr/Workspace/proj");
  });

  it("falls back to JSONL parsing for sessions with UUID in name when no external title sources are available", async () => {
    // Verifies that UUID extraction from session ID doesn't break JSONL fallback path
    const uuid = "00000000-0000-0000-0000-000000000099";
    const sessionId = `rollout-2026-04-08T19-42-24-${uuid}`;
    const sessionDir = path.join(tmpDir, "sessions", "2026", "04", "08");
    await fs.mkdir(sessionDir, { recursive: true });

    const lines = [
      JSON.stringify({ type: "session_meta", item: { id: uuid, cwd: "/Users/tr/Workspace/docs", timestamp: "2026-04-08T19:42:24Z" } }),
      JSON.stringify({ type: "response_item", item: { type: "message", role: "user", content: [{ type: "input_text", text: "Explain merge commit and fast-forward" }] } })
    ].join("\n") + "\n";
    await fs.writeFile(path.join(sessionDir, `${sessionId}.jsonl`), lines);

    const config = makeConfig([{ id: "r3", source: "codex", path: path.join(tmpDir, "sessions"), enabled: true }]);
    const map = await getCodexTrajectoryMetaMap(config);

    // session_index and SQLite are absent (test env) so JSONL fallback resolves the title
    expect(map[sessionId]?.title).toBe("Explain merge commit and fast-forward");
    expect(map[sessionId]?.cwd).toBe("/Users/tr/Workspace/docs");
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

  it("surfaces permission-denied error when root directory cannot be read", async () => {
    const root = path.join(tmpDir, "sessions");
    await fs.mkdir(root);
    await fs.chmod(root, 0o000);

    const config = makeConfig([{ id: "c1", source: "codex", path: root, enabled: true }]);
    const status = await getCodexStatus(config);

    // Restore before asserting so the afterEach cleanup can remove the directory
    await fs.chmod(root, 0o755);

    const isEnforced = process.getuid !== undefined && process.getuid() !== 0 && process.platform !== "win32";
    if (isEnforced) {
      expect(status.sessionsFound).toBe(false);
      expect(status.error).toMatch(/Permission denied/i);
      expect(status.error).toContain(root);
    } else {
      expect(typeof status.sessionsFound).toBe("boolean");
    }
  });
});
