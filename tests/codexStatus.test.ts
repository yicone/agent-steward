import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getCodexStatus } from "../src/lib/server/codex";
import type { AppConfig, RootConfig } from "../src/lib/types";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "asm-codex-status-"));
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

/** Returns true when POSIX permission checks are enforced (not root, not Windows). */
function posixPermissionsEnforced(): boolean {
  if (process.platform === "win32") return false;
  if (typeof process.getuid !== "function") return false;
  if (process.getuid() === 0) return false;
  return true;
}

describe("getCodexStatus", () => {
  /* ---- no / disabled roots ---- */

  it("returns error when no Codex roots are configured at all", async () => {
    const config = makeConfig([
      { id: "ag1", source: "antigravity", path: tmpDir, enabled: true }
    ]);
    const result = await getCodexStatus(config);
    expect(result.sessionsFound).toBe(false);
    expect(result.error).toMatch(/No Codex roots configured/);
  });

  it("returns error when Codex roots exist but all are disabled", async () => {
    const sessDir = path.join(tmpDir, "sessions");
    await fs.mkdir(sessDir);
    const config = makeConfig([
      { id: "r1", source: "codex", path: sessDir, enabled: false }
    ]);
    const result = await getCodexStatus(config);
    expect(result.sessionsFound).toBe(false);
    expect(result.error).toMatch(/No Codex roots are enabled/);
  });

  /* ---- missing / misconfigured path ---- */

  it("returns error when sessions directory does not exist", async () => {
    const nonExistent = path.join(tmpDir, "does-not-exist");
    const config = makeConfig([
      { id: "r1", source: "codex", path: nonExistent, enabled: true }
    ]);
    const result = await getCodexStatus(config);
    expect(result.sessionsFound).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("returns error when configured path points to a file, not a directory", async () => {
    const filePath = path.join(tmpDir, "session.jsonl");
    await fs.writeFile(filePath, "{}");
    const config = makeConfig([
      { id: "r1", source: "codex", path: filePath, enabled: true }
    ]);
    const result = await getCodexStatus(config);
    expect(result.sessionsFound).toBe(false);
    expect(result.error).toMatch(/not a directory/i);
  });

  /* ---- sessions found ---- */

  it("returns sessionsFound=true with sessionsDir when flat .jsonl files exist", async () => {
    const sessDir = path.join(tmpDir, "sessions");
    await fs.mkdir(sessDir);
    await fs.writeFile(path.join(sessDir, "abc123.jsonl"), "{}");
    const config = makeConfig([
      { id: "r1", source: "codex", path: sessDir, enabled: true }
    ]);
    const result = await getCodexStatus(config);
    expect(result.sessionsFound).toBe(true);
    expect(result.sessionsDir).toBe(sessDir);
  });

  it("returns sessionsFound=true when .jsonl files exist in nested YYYY/MM/DD subdirectories", async () => {
    const sessDir = path.join(tmpDir, "sessions-nested");
    await fs.mkdir(path.join(sessDir, "2025", "03", "14"), { recursive: true });
    await fs.writeFile(path.join(sessDir, "2025", "03", "14", "sess.jsonl"), "{}");
    const config = makeConfig([
      { id: "r1", source: "codex", path: sessDir, enabled: true }
    ]);
    const result = await getCodexStatus(config);
    expect(result.sessionsFound).toBe(true);
    expect(result.sessionsDir).toBe(sessDir);
  });

  /* ---- empty directory ---- */

  it("returns error when sessions directory is empty", async () => {
    const sessDir = path.join(tmpDir, "empty-sessions");
    await fs.mkdir(sessDir);
    const config = makeConfig([
      { id: "r1", source: "codex", path: sessDir, enabled: true }
    ]);
    const result = await getCodexStatus(config);
    expect(result.sessionsFound).toBe(false);
    expect(result.error).toMatch(/No session files found/);
  });

  /* ---- multi-root short-circuit ---- */

  it("skips empty first root and returns sessions from second root", async () => {
    const emptyDir = path.join(tmpDir, "empty");
    const fullDir = path.join(tmpDir, "full");
    await fs.mkdir(emptyDir);
    await fs.mkdir(fullDir);
    await fs.writeFile(path.join(fullDir, "sess.jsonl"), "{}");

    const config = makeConfig([
      { id: "r1", source: "codex", path: emptyDir, enabled: true },
      { id: "r2", source: "codex", path: fullDir, enabled: true }
    ]);
    const result = await getCodexStatus(config);
    expect(result.sessionsFound).toBe(true);
    expect(result.sessionsDir).toBe(fullDir);
  });

  it("skips missing first root and returns sessions from second root", async () => {
    const nonExistent = path.join(tmpDir, "missing");
    const fullDir = path.join(tmpDir, "full2");
    await fs.mkdir(fullDir);
    await fs.writeFile(path.join(fullDir, "sess.jsonl"), "{}");

    const config = makeConfig([
      { id: "r1", source: "codex", path: nonExistent, enabled: true },
      { id: "r2", source: "codex", path: fullDir, enabled: true }
    ]);
    const result = await getCodexStatus(config);
    expect(result.sessionsFound).toBe(true);
    expect(result.sessionsDir).toBe(fullDir);
  });

  it("returns sessionsDir of first root when no sessions found across all roots", async () => {
    const dir1 = path.join(tmpDir, "empty1");
    const dir2 = path.join(tmpDir, "empty2");
    await fs.mkdir(dir1);
    await fs.mkdir(dir2);

    const config = makeConfig([
      { id: "r1", source: "codex", path: dir1, enabled: true },
      { id: "r2", source: "codex", path: dir2, enabled: true }
    ]);
    const result = await getCodexStatus(config);
    expect(result.sessionsFound).toBe(false);
    // sessionsDir falls back to the first-checked directory
    expect(result.sessionsDir).toBe(dir1);
  });

  /* ---- permission errors ---- */

  it("reports permission-denied error when sessions directory cannot be read", async () => {
    const sessDir = path.join(tmpDir, "noperm-sessions");
    await fs.mkdir(sessDir);
    await fs.chmod(sessDir, 0o000);

    const config = makeConfig([
      { id: "r1", source: "codex", path: sessDir, enabled: true }
    ]);
    const result = await getCodexStatus(config);

    if (posixPermissionsEnforced()) {
      expect(result.sessionsFound).toBe(false);
      expect(result.error).toMatch(/Permission denied/i);
    } else {
      // Windows / root: permission check may be bypassed — just confirm no crash
      expect(typeof result.sessionsFound).toBe("boolean");
    }

    await fs.chmod(sessDir, 0o755);
  });

  it("still finds sessions in readable sibling dirs even when one nested dir is unreadable", async () => {
    const sessDir = path.join(tmpDir, "partial-sessions");
    const readableDir = path.join(sessDir, "readable");
    const unreadableDir = path.join(sessDir, "unreadable");
    await fs.mkdir(readableDir, { recursive: true });
    await fs.mkdir(unreadableDir, { recursive: true });
    await fs.writeFile(path.join(readableDir, "sess.jsonl"), "{}");
    await fs.chmod(unreadableDir, 0o000);

    const config = makeConfig([
      { id: "r1", source: "codex", path: sessDir, enabled: true }
    ]);
    const result = await getCodexStatus(config);

    if (posixPermissionsEnforced()) {
      // Sessions in the readable sibling should still be discovered
      expect(result.sessionsFound).toBe(true);
    } else {
      expect(typeof result.sessionsFound).toBe("boolean");
    }

    await fs.chmod(unreadableDir, 0o755);
  });

  it("reports subdirectory-unreadable error when no sessions found and a nested dir has no read permission", async () => {
    const sessDir = path.join(tmpDir, "partial-no-sessions");
    const unreadableDir = path.join(sessDir, "unreadable");
    await fs.mkdir(unreadableDir, { recursive: true });
    await fs.chmod(unreadableDir, 0o000);

    const config = makeConfig([
      { id: "r1", source: "codex", path: sessDir, enabled: true }
    ]);
    const result = await getCodexStatus(config);

    if (posixPermissionsEnforced()) {
      expect(result.sessionsFound).toBe(false);
      expect(result.error).toMatch(/Cannot read some subdirectories/i);
    } else {
      expect(typeof result.sessionsFound).toBe("boolean");
    }

    await fs.chmod(unreadableDir, 0o755);
  });
});
