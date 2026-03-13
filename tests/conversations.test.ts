import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  _dirCache,
  detectDuplicates,
  listConversationFiles,
  probeAllRootsHealth,
  probeRootHealth
} from "../src/lib/server/conversations";
import type { ConversationFile, RootConfig } from "../src/lib/types";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "asm-conv-test-"));
  _dirCache.clear();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

/* ---------- listConversationFiles ---------- */

describe("listConversationFiles", () => {
  it("returns .pb files sorted by mtime desc", async () => {
    const rootDir = path.join(tmpDir, "root1");
    await fs.mkdir(rootDir);
    await fs.writeFile(path.join(rootDir, "aaa.pb"), "a");
    await fs.writeFile(path.join(rootDir, "bbb.pb"), "b");
    // touch bbb a second later to ensure ordering
    const bStat = await fs.stat(path.join(rootDir, "bbb.pb"));
    await fs.utimes(
      path.join(rootDir, "aaa.pb"),
      bStat.atime,
      new Date(bStat.mtimeMs - 1000)
    );

    const root: RootConfig = { id: "r1", source: "antigravity", path: rootDir, enabled: true };
    const items = await listConversationFiles({ roots: [root], source: "antigravity", limit: 10, offset: 0 });
    expect(items.length).toBe(2);
    expect(items[0].id).toBe("bbb");
    expect(items[1].id).toBe("aaa");
  });

  it("skips disabled roots", async () => {
    const rootDir = path.join(tmpDir, "root2");
    await fs.mkdir(rootDir);
    await fs.writeFile(path.join(rootDir, "x.pb"), "x");

    const root: RootConfig = { id: "r2", source: "antigravity", path: rootDir, enabled: false };
    const items = await listConversationFiles({ roots: [root], source: "antigravity", limit: 10, offset: 0 });
    expect(items.length).toBe(0);
  });

  it("respects pagination", async () => {
    const rootDir = path.join(tmpDir, "root3");
    await fs.mkdir(rootDir);
    for (let i = 0; i < 5; i++) {
      await fs.writeFile(path.join(rootDir, `sess${i}.pb`), `${i}`);
    }
    const root: RootConfig = { id: "r3", source: "windsurf", path: rootDir, enabled: true };
    const page = await listConversationFiles({ roots: [root], source: "windsurf", limit: 2, offset: 1 });
    expect(page.length).toBe(2);
  });

  it("uses cache on subsequent calls", async () => {
    const rootDir = path.join(tmpDir, "root-cache");
    await fs.mkdir(rootDir);
    await fs.writeFile(path.join(rootDir, "a.pb"), "a");

    const root: RootConfig = { id: "rc", source: "antigravity", path: rootDir, enabled: true };
    const first = await listConversationFiles({ roots: [root], source: "antigravity", limit: 10, offset: 0 });
    expect(first.length).toBe(1);
    expect(_dirCache.has("rc")).toBe(true);

    // add a file but DON'T change the dir mtime → cache should still return 1
    // We simulate this by reading from cache before TTL expires
    const second = await listConversationFiles({ roots: [root], source: "antigravity", limit: 10, offset: 0 });
    expect(second.length).toBe(1);
  });

  it("scans multiple roots in parallel", async () => {
    const dir1 = path.join(tmpDir, "mr1");
    const dir2 = path.join(tmpDir, "mr2");
    await fs.mkdir(dir1);
    await fs.mkdir(dir2);
    await fs.writeFile(path.join(dir1, "a.pb"), "a");
    await fs.writeFile(path.join(dir2, "b.pb"), "b");

    const roots: RootConfig[] = [
      { id: "m1", source: "antigravity", path: dir1, enabled: true },
      { id: "m2", source: "antigravity", path: dir2, enabled: true }
    ];
    const items = await listConversationFiles({ roots, source: "antigravity", limit: 10, offset: 0 });
    expect(items.length).toBe(2);
    expect(items.map((i) => i.id).sort()).toEqual(["a", "b"]);
  });
});

/* ---------- detectDuplicates ---------- */

describe("detectDuplicates", () => {
  it("returns empty for unique items", () => {
    const items: ConversationFile[] = [
      { id: "a", source: "antigravity", rootId: "r1", path: "/p/a.pb", sizeBytes: 10, mtimeMs: 1 },
      { id: "b", source: "antigravity", rootId: "r2", path: "/p/b.pb", sizeBytes: 10, mtimeMs: 2 }
    ];
    expect(detectDuplicates(items)).toEqual({});
  });

  it("detects duplicates across roots", () => {
    const items: ConversationFile[] = [
      { id: "same", source: "antigravity", rootId: "r1", path: "/p/same.pb", sizeBytes: 10, mtimeMs: 1 },
      { id: "same", source: "antigravity", rootId: "r2", path: "/q/same.pb", sizeBytes: 20, mtimeMs: 2 },
      { id: "unique", source: "antigravity", rootId: "r1", path: "/p/unique.pb", sizeBytes: 10, mtimeMs: 3 }
    ];
    const dups = detectDuplicates(items);
    expect(dups["same"]).toBeDefined();
    expect(dups["same"].sort()).toEqual(["r1", "r2"]);
    expect(dups["unique"]).toBeUndefined();
  });

  it("handles 3-way duplicates", () => {
    const items: ConversationFile[] = [
      { id: "x", source: "windsurf", rootId: "r1", path: "/a/x.pb", sizeBytes: 10, mtimeMs: 1 },
      { id: "x", source: "windsurf", rootId: "r2", path: "/b/x.pb", sizeBytes: 10, mtimeMs: 2 },
      { id: "x", source: "windsurf", rootId: "r3", path: "/c/x.pb", sizeBytes: 10, mtimeMs: 3 }
    ];
    const dups = detectDuplicates(items);
    expect(dups["x"].sort()).toEqual(["r1", "r2", "r3"]);
  });
});

/* ---------- probeRootHealth ---------- */

describe("probeRootHealth", () => {
  it("reports healthy for a valid directory with .pb files", async () => {
    const rootDir = path.join(tmpDir, "healthy");
    await fs.mkdir(rootDir);
    await fs.writeFile(path.join(rootDir, "a.pb"), "a");
    await fs.writeFile(path.join(rootDir, "b.pb"), "b");
    await fs.writeFile(path.join(rootDir, "c.txt"), "c"); // non-.pb

    const root: RootConfig = { id: "h1", source: "antigravity", path: rootDir, enabled: true };
    const health = await probeRootHealth(root);
    expect(health.status).toBe("healthy");
    expect(health.pbCount).toBe(2);
    expect(health.scanMs).toBeGreaterThanOrEqual(0);
    expect(health.error).toBeUndefined();
  });

  it("reports missing for nonexistent path", async () => {
    const root: RootConfig = { id: "m1", source: "antigravity", path: "/nonexistent/path/xyz", enabled: true };
    const health = await probeRootHealth(root);
    expect(health.status).toBe("missing");
    expect(health.pbCount).toBe(0);
    expect(health.error).toBe("Path does not exist");
  });

  it("reports missing when path is a file instead of directory", async () => {
    const filePath = path.join(tmpDir, "afile.txt");
    await fs.writeFile(filePath, "hello");

    const root: RootConfig = { id: "f1", source: "antigravity", path: filePath, enabled: true };
    const health = await probeRootHealth(root);
    expect(health.status).toBe("missing");
    expect(health.error).toBe("Path is not a directory");
  });

  it("reports unreadable for permission-denied directories", async () => {
    const rootDir = path.join(tmpDir, "noperm");
    await fs.mkdir(rootDir);
    await fs.writeFile(path.join(rootDir, "a.pb"), "a");
    await fs.chmod(rootDir, 0o000);

    const root: RootConfig = { id: "np", source: "antigravity", path: rootDir, enabled: true };
    const health = await probeRootHealth(root);
    // On some CI environments, running as root bypasses permissions
    if (process.getuid?.() === 0) {
      // Running as root — permission check is bypassed
      expect(["healthy", "unreadable"]).toContain(health.status);
    } else {
      expect(health.status).toBe("unreadable");
      expect(health.error).toBeDefined();
    }

    // Restore permissions for cleanup
    await fs.chmod(rootDir, 0o755);
  });
});

/* ---------- probeAllRootsHealth ---------- */

describe("probeAllRootsHealth", () => {
  it("probes all roots in parallel", async () => {
    const dir1 = path.join(tmpDir, "ph1");
    const dir2 = path.join(tmpDir, "ph2");
    await fs.mkdir(dir1);
    // dir2 doesn't exist → missing

    const roots: RootConfig[] = [
      { id: "p1", source: "antigravity", path: dir1, enabled: true },
      { id: "p2", source: "windsurf", path: dir2, enabled: true }
    ];
    const results = await probeAllRootsHealth(roots);
    expect(results.length).toBe(2);
    expect(results.find((r) => r.rootId === "p1")?.status).toBe("healthy");
    expect(results.find((r) => r.rootId === "p2")?.status).toBe("missing");
  });
});
